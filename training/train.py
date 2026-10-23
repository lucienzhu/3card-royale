"""Single-observation behavioral cloning; small shared MLP scores legal moves.

The first layer is W_obs * obs + W_action * candidate, equivalent to a linear
layer on their concatenation, computed without repeating the state projection.
No recurrence, history, search, reward learning, or private game state.
"""
import argparse
import json
from pathlib import Path
import time

import numpy as np
import torch
from torch import nn
from torch.utils.tensorboard import SummaryWriter


class PolicyMLP(nn.Module):
    def __init__(self, width, second=None):
        super().__init__()
        second = width // 2 if second is None else second
        self.hidden = (width, second)
        self.state = nn.Linear(336, width)
        self.action = nn.Linear(72, width, bias=False)
        self.head = nn.Sequential(nn.ReLU(), nn.Linear(width, second), nn.ReLU(), nn.Linear(second, 1))

    def forward(self, state, candidates):
        return self.head(self.state(state).unsqueeze(1) + self.action(candidates)).squeeze(-1)


def prepare(root):
    """Disk-backed ragged arrays keep collection/learning memory bounded."""
    dest = root / "prepared"; dest.mkdir(exist_ok=True)
    index_file = dest / "index.npz"
    if not index_file.exists():
        states, labels, games, phases, counts = [], [], [], [], []
        with (dest / "candidates.f16").open("wb") as stream:
            for path in sorted((root / "data").glob("*.npz")):
                with np.load(path) as z:
                    states.append(z["states"]); labels.append(z["labels"])
                    games.append(z["game_ids"]); phases.append(z["phases"])
                    counts.append(np.diff(z["offsets"]))
                    z["candidates"].tofile(stream)
        lengths = np.concatenate(counts)
        np.savez(index_file, states=np.concatenate(states).astype(np.float32), labels=np.concatenate(labels),
                 game_ids=np.concatenate(games), phases=np.concatenate(phases),
                 offsets=np.r_[0, np.cumsum(lengths)], counts=lengths)
    z = np.load(index_file)
    data = {k: z[k] for k in z.files}
    data["candidates"] = np.memmap(dest / "candidates.f16", dtype=np.float16, mode="r", shape=(int(data["offsets"][-1]), 72))
    return data


def batches(data, ids, batch_size, rng=None):
    ids = ids.copy()
    if rng is not None:
        rng.shuffle(ids)
    # Nearby lengths reduce padding; shuffle coarse buckets each epoch.
    chunks = [ids[i:i+batch_size*32] for i in range(0, len(ids), batch_size*32)]
    for chunk in chunks:
        chunk = chunk[np.argsort(data["counts"][chunk], kind="stable")]
        for offset in range(0, len(chunk), batch_size):
            ii = chunk[offset:offset+batch_size]; counts = data["counts"][ii]
            n = int(counts.max()); cs = np.zeros((len(ii), n, 72), np.float32)
            mask = np.arange(n)[None, :] < counts[:, None]
            for j, i in enumerate(ii):
                a, b = data["offsets"][i:i+2]
                cs[j, :b-a] = data["candidates"][a:b]
            yield (torch.from_numpy(data["states"][ii]), torch.from_numpy(cs),
                   torch.from_numpy(mask), torch.from_numpy(data["labels"][ii].astype(np.int64)), ii)


def epoch(model, data, ids, batch_size, optimizer=None, rng=None):
    model.train(optimizer is not None); loss_sum = correct = total = 0
    phase_total = np.zeros(3); phase_correct = np.zeros(3)
    with torch.set_grad_enabled(optimizer is not None):
        for state, cs, mask, labels, ii in batches(data, ids, batch_size, rng):
            logits = model(state, cs).masked_fill(~mask, -1e9)
            loss = nn.functional.cross_entropy(logits, labels)
            if optimizer is not None:
                optimizer.zero_grad(set_to_none=True); loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 5); optimizer.step()
            hits = (logits.argmax(-1) == labels).detach().numpy()
            total += len(ii); correct += int(hits.sum()); loss_sum += loss.item()*len(ii)
            for p in range(3):
                keep = data["phases"][ii] == p
                phase_total[p] += keep.sum(); phase_correct[p] += hits[keep].sum()
    return {"loss": loss_sum/total, "accuracy": correct/total,
            **{f"accuracy_{p}": float(a/max(1, n)) for p, a, n in zip(["attack", "defend", "swap"], phase_correct, phase_total)}}


def export(model, path):
    model.eval(); state = torch.zeros((1, 336)); candidates = torch.zeros((1, 64, 72))
    torch.onnx.export(model, (state, candidates), str(path), input_names=["state", "candidates"], output_names=["logits"],
                      dynamic_axes={"state": {0: "batch"}, "candidates": {0: "batch", 1: "actions"}, "logits": {0: "batch", 1: "actions"}},
                      opset_version=17, dynamo=False)
    import onnx
    onnx.checker.check_model(onnx.load(path))
    if path.stat().st_size >= 5_000_000:
        raise RuntimeError("Export exceeds 5 MB")


def main():
    p = argparse.ArgumentParser(); p.add_argument("--root", default="artifacts/nn-policy")
    sizes = p.add_mutually_exclusive_group()
    sizes.add_argument("--widths", default="64,128,256", help="Legacy W, W/2 models")
    sizes.add_argument("--hidden", type=int, nargs=2, metavar=("FIRST", "SECOND"), help="Explicit hidden layer sizes")
    p.add_argument("--epochs", type=int, default=10)
    p.add_argument("--batch-size", type=int, default=128); p.add_argument("--threads", type=int, default=4)
    args = p.parse_args(); torch.set_num_threads(args.threads); root = Path(args.root)
    architectures = [tuple(args.hidden)] if args.hidden else [(w, w//2) for w in map(int, args.widths.split(','))]
    if any(min(h) < 1 for h in architectures):
        p.error('Both hidden layers must have positive sizes')
    data = prepare(root); game_ids = data["game_ids"]
    train = np.flatnonzero(game_ids % 10 >= 2); val = np.flatnonzero(game_ids % 10 == 0)
    test = np.flatnonzero(game_ids % 10 == 1)
    models = root / "models"; models.mkdir(exist_ok=True)
    summary_file = root / "training.json"
    summary = json.loads(summary_file.read_text()) if summary_file.exists() else {"models": []}
    summary["split_samples"] = {"train": len(train), "val": len(val), "test": len(test)}
    for width, second in architectures:
        model_id = str(width) if second == width//2 else f'{width}x{second}'
        torch.manual_seed(20261024); rng = np.random.default_rng(20261024)
        model = PolicyMLP(width, second); optimizer = torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.0001)
        writer = SummaryWriter(str(root / "tensorboard" / f"mlp-{model_id}"))
        writer.add_text("architecture", f"Single observation + candidate → MLP {width}/{second} → action logit")
        history = []; best = float("inf"); started = time.monotonic()
        for e in range(1, args.epochs+1):
            tr = epoch(model, data, train, args.batch_size, optimizer, rng)
            va = epoch(model, data, val, args.batch_size)
            row = {"epoch": e, "train": tr, "val": va, "elapsed_s": round(time.monotonic()-started, 2)}
            history.append(row)
            for split, metrics in [("train", tr), ("val", va)]:
                for key, value in metrics.items(): writer.add_scalar(f"{key}/{split}", value, e)
            writer.flush()
            if va["loss"] < best:
                best = va["loss"]; torch.save({"id": model_id, "width": width, "hidden": [width, second], "state_dict": model.state_dict(), "epoch": e}, models / f"mlp-{model_id}.pt")
            print(json.dumps({"id": model_id, "hidden": [width, second], **row}), flush=True)
            (models / f"mlp-{model_id}-history.json").write_text(json.dumps(history, indent=2))
        checkpoint = torch.load(models / f"mlp-{model_id}.pt", weights_only=True)
        model.load_state_dict(checkpoint["state_dict"])
        export(model, models / f"mlp-{model_id}.onnx")
        # Test is reported once, after best-epoch selection using validation only.
        te = epoch(model, data, test, args.batch_size)
        for key, value in te.items(): writer.add_scalar(f"{key}/test", value, checkpoint["epoch"])
        writer.close()
        summary["models"] = [m for m in summary["models"] if str(m.get('id', m['width'])) != model_id]
        summary["models"].append({"id": model_id, "width": width, "hidden": [width, second], "params": sum(x.numel() for x in model.parameters()),
                                  "bytes": (models / f"mlp-{model_id}.onnx").stat().st_size,
                                  "best_epoch": checkpoint["epoch"], "val_loss": best, "test": te})
        summary["models"].sort(key=lambda m: m.get('hidden', [m['width'], m['width']//2]))
        summary_file.write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
