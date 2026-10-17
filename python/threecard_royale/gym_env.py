"""Single-player Gymnasium environment against a visible-information opponent.

Actions index the observation's candidate table; apply its action_mask. Game is
also a turn-based self-play API. Full saved states are never returned in info.
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from .core import Game, PHASES
from .policy import choose_action

MAX_ACTIONS, ACTION_DIM = 512, 72


class RoyaleEnv(gym.Env):
    metadata = {"render_modes": ["ansi"], "render_fps": 1}

    def __init__(
        self,
        episode="game",
        player=0,
        opponent=choose_action,
        max_steps=4096,
        max_internal_steps=10000,
        render_mode=None,
    ):
        if episode not in ("game", "match") or player not in (0, 1):
            raise ValueError("Invalid episode/player")
        if not callable(opponent) or max_steps < 1 or max_internal_steps < 1:
            raise ValueError("Invalid opponent/limits")
        if render_mode not in (None, "ansi"):
            raise ValueError('Use render_mode="ansi"')
        self.episode, self.player, self.opponent = episode, player, opponent
        self.max_steps, self.max_internal_steps = max_steps, max_internal_steps
        self.render_mode = render_mode
        self.action_space = spaces.Discrete(MAX_ACTIONS)
        self.observation_space = spaces.Dict(
            {
                "cards": spaces.MultiBinary((6, 52)),
                "meta": spaces.Box(0, 1, (24,), np.float32),
                "candidates": spaces.Box(0, 1, (MAX_ACTIONS, ACTION_DIM), np.float32),
                "action_mask": spaces.MultiBinary(MAX_ACTIONS),
            }
        )
        self.game = None
        self._done = True
        self.steps = 0
        self.internal_steps = 0

    def _terminal(self):
        return (
            self.game.s["phase"] == "match_over"
            or self.episode == "game"
            and self.game.s["phase"] == "game_over"
        )

    def _drive(self):
        # The guard also bounds custom opponents and no-damage loops.
        while not self._terminal() and self.game.actor != self.player:
            if self.internal_steps >= self.max_internal_steps:
                return True
            actor = self.game.actor
            if actor is None:
                action = self.game.legal_actions()[0]
            else:
                obs = self.game.observation(actor)
                action = self.opponent(obs, obs["legal_actions"])
            self.game.step(action)
            self.internal_steps += 1
        return self.internal_steps >= self.max_internal_steps and not self._terminal()

    def _obs(self):
        o = self.game.observation(self.player)
        cards = np.zeros((6, 52), np.int8)
        groups = [
            o["hand"],
            o["wounds"],
            o["enemy_wounds"],
            o["discard"],
            o["active"][self.player]["cards"] if o["active"][self.player] else [],
            (
                o["active"][1 - self.player]["cards"]
                if o["active"][1 - self.player]
                else []
            ),
        ]
        for i, cs in enumerate(groups):
            for c in cs:
                if c is not None:
                    cards[i, c] = 1
        meta = np.zeros(24, np.float32)
        meta[PHASES.index(o["phase"])] = 1
        meta[6:] = [
            o["levels"][0] / 14,
            o["levels"][1] / 14,
            o["flower_level"] / 14,
            min(len(o["wounds"]), 10) / 10,
            min(len(o["enemy_wounds"]), 10) / 10,
            o["enemy_hand_count"] / 8,
            o["deck_count"] / 52,
            len(o["discard"]) / 52,
            o["a_losses"][0] / 3,
            o["a_losses"][1] / 3,
            int(o["first"] == self.player),
            int(o["attacker"] == self.player),
            o["battle_index"],
            (o["pending"]["remaining"] if o["pending"] else 0) / 6,
            int(o["actor"] == self.player),
            min(o["round"], 1024) / 1024,
            min(o["game"], 1024) / 1024,
            int(self.episode == "match"),
        ]
        self._actions = o["legal_actions"]
        assert len(self._actions) <= MAX_ACTIONS
        candidates = np.zeros((MAX_ACTIONS, ACTION_DIM), np.float32)
        mask = np.zeros(MAX_ACTIONS, np.int8)
        for i, a in enumerate(self._actions):
            mask[i] = 1
            f = candidates[i]
            f[
                52
                + ["play", "swap", "stop_swaps", "advance", "next_game"].index(
                    a["type"]
                )
            ] = 1
            if a["type"] == "play":
                for c in a["cards"]:
                    f[c] = 1
                from .core import evaluate

                e = evaluate(a["cards"], o["flower_level"])
                f[67] = e["score"] / 6
                f[68] = e["kind"] / 6
                f[69] = e["rank_key"][0] / 14
                f[70] = len(a["cards"]) / 4
            if a["type"] == "swap":
                src = a["source"]
                c = o[src["zone"]][src["index"]]
                f[c] = 1
                f[57 + int(src["zone"] == "wounds")] = 1
                f[59] = src["index"] / 11
                t = a["target"]
                f[
                    (
                        60
                        if t["zone"] == "deck"
                        else (
                            61
                            if t["zone"] == "blind"
                            else 62 if t["who"] == self.player else 63
                        )
                    )
                ] = 1
                if t["zone"] not in ("deck", "blind"):
                    take = (
                        o[t["zone"]][t["index"]]
                        if t["who"] == self.player
                        else o["enemy_wounds"][t["index"]]
                    )
                    f[64] = (take % 13 + 2) / 14
                    f[65] = (take // 13) / 3
                    f[66] = take / 51
        return {
            "cards": cards,
            "meta": meta,
            "candidates": candidates,
            "action_mask": mask,
        }

    def _info(self, **extra):
        # All fields are public. No seed, RNG, stock order or hidden hand IDs.
        s = self.game.s
        return {
            "rules": "0.3.8",
            "episode": self.episode,
            "phase": s["phase"],
            "player": self.player,
            "actor": self.game.actor,
            "steps": self.steps,
            "internal_steps": self.internal_steps,
            **extra,
        }

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        options = {} if options is None else options
        unknown = set(options) - {"first", "levels"}
        if unknown:
            raise ValueError("Unknown reset options: " + str(unknown))
        core_seed = int(self.np_random.integers(0, 2**32, dtype=np.uint64))
        self.game = Game(core_seed, options.get("first"))
        self.steps = 0
        self.internal_steps = 0
        if "levels" in options:
            levels = options["levels"]
            if len(levels) != 2 or not all(
                type(l) is int and 2 <= l <= 14 for l in levels
            ):
                raise ValueError("levels must be two integers in 2..14")
            for p, l in zip(self.game.s["players"], levels):
                p["level"] = l
            self.game.s["flower_level"] = levels[self.game.s["first"]]
        truncated = self._drive()
        self._done = truncated or self._terminal()
        return self._obs(), self._info(
            reset_terminal=self._terminal(), reset_truncated=truncated
        )

    def step(self, action):
        if self._done:
            raise RuntimeError("Episode ended or not reset; call reset()")
        self.steps += 1
        valid = isinstance(action, (int, np.integer)) and 0 <= int(action) < len(
            self._actions
        )
        if valid:
            self.game.step(self._actions[int(action)])
            self.internal_steps += 1
        limited = self.internal_steps >= self.max_internal_steps
        if valid and not limited:
            limited = self._drive()
        terminated = self._terminal()
        truncated = not terminated and (limited or self.steps >= self.max_steps)
        self._done = terminated or truncated
        reward = (
            (1.0 if self.game.s["results"][-1]["winner"] == self.player else -1.0)
            if terminated
            else 0.0 if valid else -0.05
        )
        return (
            self._obs(),
            reward,
            bool(terminated),
            bool(truncated),
            self._info(invalid_action=not valid),
        )

    def action_masks(self):
        return self._obs()["action_mask"].astype(bool)

    def render(self):
        if self.game is None:
            return "Call reset() to deal."
        o = self.game.observation(self.player)
        return f"{o['phase']} | levels {o['levels']} | flower ♥{o['flower_level']} | hand {o['hand']} | wounds {o['wounds']} | rival {o['enemy_hand_count']} hidden cards, wounds {o['enemy_wounds']}"


if "ThreeCardRoyale-v0" not in gym.registry:
    gym.register("ThreeCardRoyale-v0", entry_point="threecard_royale.gym_env:RoyaleEnv")
