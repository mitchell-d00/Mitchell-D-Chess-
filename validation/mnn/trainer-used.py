#!/usr/bin/env python3
"""Original MIT training for Mitchell's MNN1 residual evaluator. Requires NumPy.
No downloaded weights, chess-engine libraries, external labels, or ML framework.
"""
import argparse, datetime, hashlib, json, os, struct
from pathlib import Path
os.environ.setdefault('OPENBLAS_NUM_THREADS','2')
os.environ.setdefault('OMP_NUM_THREADS','2')
import numpy as np

PIECES='PNBRQKpnbrqk'
def features(fen):
    white=[];black=[]
    for rank,row in enumerate(fen.split()[0].split('/')):
        file=0
        for ch in row:
            if ch.isdigit():file+=int(ch);continue
            channel=PIECES.index(ch);square=(7-rank)*8+file
            white.append(channel*64+square)
            black.append(((channel+6)%12)*64+(square^56));file+=1
    return white,black

def load_data(path):
    games=[json.loads(x) for x in path.read_text().splitlines() if x.strip()]
    groups={};rows={'train':[],'validation':[],'test':[]};seen=set();counts={}
    # Split on starting opening identity, not individual positions or games.
    for game in games:
        group=game['opening'];split='train' if group<35 else 'validation' if group<45 else 'test'
        root=' '.join(game['fen'].split()[:4])
        if root in groups and groups[root]!=split:raise ValueError('Repeated starting opening crosses splits')
        groups[root]=split
        for row in game['positions']:
            score=row['searchScore'];fen=row['fen'];fw,fb=features(fen)
            if row['depth']<3 or abs(score)>=99000 or len(fw)<=4:continue
            base=row['baseWhite'];white_score=score*(-1 if fen.split()[1]=='b' else 1)
            rows[split].append({'fen':fen,'white':fw,'black':fb,'base':base,'target':float(np.clip(white_score-base,-150,150))/150,'game':game['id'],'opening':group})
    # Remove repeated child positions from later splits using position identity
    # alone. No label or outcome participates in this leakage check.
    for split in ['train','validation','test']:
        retained=[]
        for row in rows[split]:
            key=' '.join(row['fen'].split()[:4])
            if key in seen:continue
            seen.add(key);retained.append(row)
        counts[split]={'eligible':len(rows[split]),'unique':len(retained)};rows[split]=retained
    if len(rows['train'])<500 or len(rows['validation'])<100 or len(rows['test'])<50:raise ValueError('Need >=500/100/50 unique train/validation/test positions')
    return games,rows,counts

def matrices(rows):
    a=np.zeros((len(rows),768),dtype=np.float32);b=np.zeros_like(a)
    for i,row in enumerate(rows):a[i,row['white']]=1;b[i,row['black']]=1
    return a,b,np.array([r['target'] for r in rows],dtype=np.float32)

def forward(a,b,weights):
    w,bias,out=weights;za=a@w+bias;zb=b@w+bias
    ha=np.clip(za,0,1);hb=np.clip(zb,0,1);raw=(ha-hb)@out
    return np.clip(raw,-1,1),za,zb,ha,hb,raw

def serialize(weights,hidden):
    w,bias,out=weights
    payload=np.concatenate([np.rint(bias*256),np.rint(w*256).ravel(),np.rint(out*150*256)])
    if np.any(np.abs(payload)>32767):raise ValueError('Quantization overflow')
    return struct.pack('<4s6H',b'MNN1',hidden,768,256,256,150,0)+payload.astype('<i2').tobytes()

def quantized(rows,payload):
    magic,h,inputs,scale,out_scale,limit,reserved=struct.unpack('<4s6H',payload[:16]);q=np.frombuffer(payload[16:],dtype='<i2').astype(np.int32)
    bias=q[:h];emb=q[h:(inputs+1)*h].reshape(inputs,h);out=q[(inputs+1)*h:]
    result=[]
    for row in rows:
        aw=bias+emb[row['white']].sum(axis=0);ab=bias+emb[row['black']].sum(axis=0)
        total=int((np.clip(aw,0,scale).astype(np.int64)-np.clip(ab,0,scale).astype(np.int64))@out.astype(np.int64))
        value=int(np.sign(total)*np.floor(abs(total)/(scale*out_scale)+.5));result.append(max(-limit,min(limit,value)))
    return np.array(result,dtype=np.float64)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('data',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--hidden',type=int,default=32);p.add_argument('--epochs',type=int,default=80);p.add_argument('--seed',type=int,default=7181);p.add_argument('--manifest',type=Path);args=p.parse_args()
    if args.out.exists():raise ValueError('Refusing to overwrite a training run')
    if args.hidden<8 or args.hidden>128 or args.hidden%8 or args.epochs<1:raise ValueError('Invalid model/training dimensions')
    manifest_path=args.manifest or Path(str(args.data)+'.manifest.json')
    source_manifest=json.loads(manifest_path.read_text())
    if not source_manifest.get('teacher','').startswith('Mitchell classical'):raise ValueError('Expected original Mitchell self-play provenance')
    games,rows,counts=load_data(args.data);args.out.mkdir(parents=True)
    train=matrices(rows['train']);validation=matrices(rows['validation'])
    rng=np.random.default_rng(args.seed);h=args.hidden
    weights=[rng.normal(0,.04,(768,h)).astype(np.float32),np.full(h,.2,dtype=np.float32),rng.normal(0,.01,h).astype(np.float32)]
    first=[np.zeros_like(w) for w in weights];second=[np.zeros_like(w) for w in weights]
    best=[w.copy() for w in weights];best_loss=float('inf');best_epoch=0;step=0;history=[]
    for epoch in range(1,args.epochs+1):
        order=rng.permutation(len(train[2]))
        for start in range(0,len(order),128):
            idx=order[start:start+128];a,b,target=train[0][idx],train[1][idx],train[2][idx]
            prediction,za,zb,ha,hb,raw=forward(a,b,weights)
            # Robust search-residual fitting; exact same clipping as deployment.
            error=np.clip(prediction-target,-.25,.25)/len(idx);error*=np.abs(raw)<1
            grad_ha=error[:,None]*weights[2][None,:];grad_hb=-grad_ha
            grad_za=grad_ha*((za>0)&(za<1));grad_zb=grad_hb*((zb>0)&(zb<1))
            gradients=[a.T@grad_za+b.T@grad_zb,(grad_za+grad_zb).sum(axis=0),(ha-hb).T@error]
            step+=1
            for k in range(3):
                grad=gradients[k]+.0001*weights[k]
                first[k]=.9*first[k]+.1*grad;second[k]=.999*second[k]+.001*grad*grad
                weights[k]-=.002*(first[k]/(1-.9**step))/(np.sqrt(second[k]/(1-.999**step))+1e-8)
        train_loss=float(np.mean((forward(train[0],train[1],weights)[0]-train[2])**2))*22500
        val_loss=float(np.mean((forward(validation[0],validation[1],weights)[0]-validation[2])**2))*22500
        history.append({'epoch':epoch,'trainMseCp2':train_loss,'validationMseCp2':val_loss});print(json.dumps(history[-1]),flush=True)
        if val_loss<best_loss:best_loss=val_loss;best=[w.copy() for w in weights];best_epoch=epoch
        if epoch-best_epoch>=12:break
    payload=serialize(best,h);(args.out/'mitchell.mnn').write_bytes(payload)
    # Final-test metrics are computed after selection; test rows never enter the fit.
    metrics={}
    for split in ['train','validation','test']:
        prediction=quantized(rows[split],payload);target=np.array([r['target']*150 for r in rows[split]])
        metrics[split]={'positions':len(target),'baselineMseCp2':float(np.mean(target**2)),'quantizedMseCp2':float(np.mean((prediction-target)**2)),'maeCp':float(np.mean(np.abs(prediction-target)))}
    reference=[{'fen':row['fen'],'whiteCorrection':int(value)} for row,value in zip(rows['validation'][:256],quantized(rows['validation'][:256],payload))]
    (args.out/'reference.json').write_text(json.dumps(reference,indent=2)+'\n')
    report={'schema':'mitchell-neural-training-v1','createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'numpy':np.__version__,'seed':args.seed,'hidden':h,'architecture':f'768 shared sparse features -> {h} clipped activations per colour -> antisymmetric scalar residual','inputScale':256,'outputScale':256,'correctionLimitCp':150,'initialization':'Seeded random normal; no pretrained weights','teacher':'Mitchell classical search only; clipped search-score minus static-evaluation residual; no external-engine labels','objective':'Huber loss on normalized residual; original NumPy Adam implementation; validation-selected epoch; final-test metrics computed only after freeze','splitRule':'Opening indices 0..34 train,35..44 validation,45..49 final test; exact duplicate child positions removed across and within splits','dataSha256':hashlib.sha256(args.data.read_bytes()).hexdigest(),'sourceManifestSha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),'teacherHtmlSha256':source_manifest['htmlSha256'],'teacherMoveMs':source_manifest['ms'],'teacherSampleEvery':source_manifest['sampleEvery'],'trainerSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'modelSha256':hashlib.sha256(payload).hexdigest(),'modelBytes':len(payload),'games':len(games),'completedGames':sum(g['result']!='*' for g in games),'positionCounts':counts,'metrics':metrics,'bestEpoch':best_epoch,'history':history,'fitGatePassed':metrics['validation']['quantizedMseCp2']<metrics['validation']['baselineMseCp2'],'promotionStatus':'Not approved: fresh matches, final-test assessment, calibration and correctness checks remain necessary; no Elo claim.'}
    (args.out/'training.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['modelSha256','positionCounts','metrics','bestEpoch','fitGatePassed']}),flush=True)
if __name__=='__main__':main()
