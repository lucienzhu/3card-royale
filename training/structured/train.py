"""Teacher-forced autoregressive policy. One target sequence per game decision."""
import argparse, gzip, json, hashlib, platform, sys, time
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.utils.tensorboard import SummaryWriter
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'python'))
from threecard_royale.actions import VOCAB, PAD, LENGTH

class TokenPolicy(nn.Module):
    def __init__(self):
        super().__init__()
        self.net=nn.Sequential(nn.Linear(336+LENGTH*(VOCAB+1),256),nn.ReLU(),nn.Linear(256,128),nn.ReLU(),nn.Linear(128,VOCAB))
    def forward(self,state,prefix):
        return self.net(torch.cat([state,prefix],dim=-1))


def load(path):
    states=[];games=[];sequences=[];masks=[];owner=[];position=[];labels=[]
    with gzip.open(path,'rt') as f:
        for line in f:
            r=json.loads(line);i=len(states);states.append(r['state']);games.append(r['game'])
            seq=r['tokens'];sequences.append(seq+[PAD]*(LENGTH-len(seq)))
            for j,valid in enumerate(r['masks']):
                mask=np.zeros(VOCAB,bool);mask[valid]=True
                assert mask[seq[j]]
                masks.append(mask);owner.append(i);position.append(j);labels.append(seq[j])
    return {'state':np.asarray(states,np.float32),'game':np.asarray(games),'sequence':np.asarray(sequences,np.int64),
            'mask':np.asarray(masks),'owner':np.asarray(owner),'position':np.asarray(position),'label':np.asarray(labels,np.int64)}


def batches(d,ids,rng=None):
    ids=ids.copy()
    if rng is not None:rng.shuffle(ids)
    for start in range(0,len(ids),1024):
        ii=ids[start:start+1024];own=d['owner'][ii];pos=d['position'][ii]
        seq=d['sequence'][own].copy();seq[np.arange(LENGTH)[None,:]>=pos[:,None]]=PAD
        p=np.eye(VOCAB+1,dtype=np.float32)[seq].reshape(len(ii),-1)
        yield (torch.from_numpy(d['state'][own]),torch.from_numpy(p),torch.from_numpy(d['mask'][ii]),torch.from_numpy(d['label'][ii]),torch.from_numpy((1/(d['sequence'][own]!=PAD).sum(1)).astype(np.float32)))


def epoch(model,d,ids,opt=None,rng=None):
    model.train(opt is not None);loss_sum=weight_sum=hits=total=0
    with torch.set_grad_enabled(opt is not None):
        for s,p,mask,label,weight in batches(d,ids,rng):
            logits=model(s,p).masked_fill(~mask,-1e9)
            losses=nn.functional.cross_entropy(logits,label,reduction='none')
            loss=(losses*weight).sum()/weight.sum()
            if opt:
                opt.zero_grad(set_to_none=True);loss.backward();nn.utils.clip_grad_norm_(model.parameters(),5);opt.step()
            loss_sum+=float((losses*weight).sum().detach());weight_sum+=float(weight.sum());hits+=int((logits.argmax(1)==label).sum());total+=len(label)
    return {'loss':loss_sum/weight_sum,'token_accuracy':hits/total}


def main():
    p=argparse.ArgumentParser();p.add_argument('--root',default='artifacts/structured-v2');p.add_argument('--epochs',type=int,default=40);args=p.parse_args()
    root=Path(args.root);torch.set_num_threads(4);torch.manual_seed(20261101);torch.use_deterministic_algorithms(True);rng=np.random.default_rng(20261101)
    d=load(root/'data.jsonl.gz');mods=d['game'][d['owner']]%10
    ids={'train':np.flatnonzero(mods>=2),'val':np.flatnonzero(mods==0),'test':np.flatnonzero(mods==1)}
    model=TokenPolicy();opt=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=.0001);writer=SummaryWriter(str(root/'tensorboard'))
    best=float('inf');best_epoch=0;history=[];start=time.monotonic()
    for e in range(1,args.epochs+1):
        tr=epoch(model,d,ids['train'],opt,rng);va=epoch(model,d,ids['val'])
        row={'epoch':e,'train':tr,'val':va,'seconds':round(time.monotonic()-start,2)};history.append(row)
        for split,m in [('train',tr),('val',va)]:
            for k,v in m.items():writer.add_scalar(k+'/'+split,v,e)
        writer.flush();print(json.dumps(row),flush=True)
        if va['loss']<best:
            best=va['loss'];best_epoch=e;torch.save(model.state_dict(),root/'best.pt')
        (root/'history.json').write_text(json.dumps(history,indent=2)+'\n')
    model.load_state_dict(torch.load(root/'best.pt',weights_only=True));model.eval();test=epoch(model,d,ids['test'])
    for k,v in test.items():writer.add_scalar(k+'/test',v,best_epoch)
    writer.close()
    dest=root/'policy.onnx'
    torch.onnx.export(model,(torch.zeros(1,336),torch.zeros(1,396)),str(dest),input_names=['state','prefix'],output_names=['logits'],dynamic_axes={k:{0:'batch'} for k in ['state','prefix','logits']},opset_version=17,dynamo=False)
    import onnx,onnxruntime as ort
    onnx.checker.check_model(onnx.load(dest));session=ort.InferenceSession(str(dest),providers=['CPUExecutionProvider'])
    error=0
    for s,pr,mask,labels,w in batches(d,ids['test'][:2048]):
        actual=session.run(None,{'state':s.numpy(),'prefix':pr.numpy()})[0]
        with torch.no_grad():expected=model(s,pr).numpy()
        error=max(error,float(np.max(np.abs(actual-expected))))
        assert np.array_equal(np.where(mask,actual,-1e9).argmax(1),np.where(mask,expected,-1e9).argmax(1))
    assert error<1e-4 and dest.stat().st_size<5_000_000
    report={'schema':'actions-v2','method':'behavioral-cloning / autoregressive teacher forcing','hidden':[256,128],'state':336,'prefix':396,'output':65,'max_tokens':6,'parameters':sum(x.numel() for x in model.parameters()),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'best_epoch':best_epoch,'val_loss':best,'test':test,'onnx_max_abs_error':error,'dataset_sha256':hashlib.sha256((root/'data.jsonl.gz').read_bytes()).hexdigest(),'python':platform.python_version(),'torch':torch.__version__,'numpy':np.__version__,'seed':20261101,'epochs':args.epochs}
    (root/'training.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
if __name__=='__main__':main()
