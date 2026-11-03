#!/usr/bin/env python3
"""Original MIT orchestration for external Fastchess; no engine/library is bundled.
Usage: python scripts/independent-campaign.py /path/to/campaign.json [--resume]
"""
import argparse, datetime, hashlib, json, math, os, random, re, signal, subprocess, time
from pathlib import Path

def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def save(path, value):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, indent=2) + '\n')
    temp.replace(path)
def games(path):
    if not path.exists(): return []
    result = []
    for block in re.split(r'(?=^\[Event )', path.read_text(errors='replace'), flags=re.M):
        tags = dict(re.findall(r'^\[(\w+) "([^"\n]*)"\]', block, flags=re.M))
        if tags.get('Result') not in ('1-0','0-1','1/2-1/2'): continue
        if 'Mitchell65' not in (tags.get('White'),tags.get('Black')): continue
        score = .5 if tags['Result']=='1/2-1/2' else float((tags['Result']=='1-0') == (tags.get('White')=='Mitchell65'))
        result.append({'score':score, 'round':tags.get('Round'), 'termination':tags.get('Termination','unknown'), 'fen':tags.get('FEN','startpos'), 'white':tags.get('White'), 'black':tags.get('Black')})
    return result

def summarize(config, root):
    by = {}
    for batch in config['batches']:
        opponent=batch['opponent']; entry=by.setdefault(opponent,{'planned':0,'wins':0,'draws':0,'losses':0,'forfeits':0,'completed':0,'normalResults':{'wins':0,'draws':0,'losses':0},'forfeitResults':{'wins':0,'draws':0,'losses':0},'pairs':[]})
        entry['planned']+=batch['games']; pairs={}
        for game in games(root/(batch['id']+'.pgn')):
            entry['completed']+=1; entry[{1:'wins',.5:'draws',0:'losses'}[game['score']]]+=1
            abnormal=game['termination'] not in ('normal','adjudication')
            if abnormal:entry['forfeits']+=1
            entry['forfeitResults' if abnormal else 'normalResults'][{1:'wins',.5:'draws',0:'losses'}[game['score']]]+=1
            # Group by opening as well as round; require a colour-reversed pair.
            pairs.setdefault((game['round'],game['fen']),[]).append(game)
        for pair in pairs.values():
            if len(pair)==2 and pair[0]['white']==pair[1]['black'] and not any(g['termination'] not in ('normal','adjudication') for g in pair):entry['pairs'].append(sum(g['score'] for g in pair)/2)
    for entry in by.values():
        n=entry['completed']; entry['scoreRate']=(entry['wins']+.5*entry['draws'])/n if n else None
        pair_scores=entry.pop('pairs'); entry['completedNormalPairs']=len(pair_scores)
        # Nonparametric paired bootstrap, descriptive only. No absolute Elo output.
        if len(pair_scores)>=10 and len(set(pair_scores))>1:
            rng=random.Random(20261103); means=sorted(sum(rng.choices(pair_scores,k=len(pair_scores)))/len(pair_scores) for _ in range(3000))
            entry['pairedScoreBootstrap95']=[means[74],means[2924]]
        else:entry['pairedScoreBootstrap95']=None
    return {'updatedUtc':utc(),'plannedGames':sum(b['games'] for b in config['batches']), 'completedGames':sum(x['completed'] for x in by.values()),'timeControl':config['timeControl'],'opponents':by,'ratingStatus':'Unrated. CCRL reference ratings and this different time control cannot be transferred directly.','notes':['PGNs are the authoritative game records. Forfeits are reported separately.','Bootstrap resamples whole colour-reversed normal-result pairs; no interval is given for very small or degenerate samples.']}

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('config'); parser.add_argument('--resume',action='store_true'); parser.add_argument('--summary-only',action='store_true'); args=parser.parse_args()
    source=Path(args.config).resolve(); config=json.loads(source.read_text());root=source.parent
    if args.summary_only:
        print(json.dumps(summarize(config,root),indent=2));return
    if sum(b['games'] for b in config['batches'])!=200:raise ValueError('Campaign must contain exactly 200 planned games')
    if any(b['games']%2 for b in config['batches']):raise ValueError('All batches must contain colour pairs')
    if not 1<=config.get('concurrency',1)<=2:raise ValueError('At most two simultaneous games on this host')
    if hashlib.sha256(Path(config['html']).read_bytes()).hexdigest()!=config['htmlSha256']:raise ValueError('Frozen engine hash changed')
    if hashlib.sha256(Path(config['adapter']).read_bytes()).hexdigest()!=config['adapterSha256']:raise ValueError('Frozen adapter hash changed')
    if hashlib.sha256(Path(config['openings']).read_bytes()).hexdigest()!=config['openingsSha256']:raise ValueError('Frozen opening file changed')
    for opponent in config['opponents'].values():
        if hashlib.sha256(Path(opponent['command']).read_bytes()).hexdigest()!=opponent['sha256']:raise ValueError('Opponent binary changed: '+opponent['command'])
    lock=root/'campaign.pid'
    if lock.exists():
        try:os.kill(int(lock.read_text()),0)
        except (ProcessLookupError,ValueError):pass
        else:raise RuntimeError('Campaign already running: '+lock.read_text())
    lock.write_text(str(os.getpid())); active={}; statuses={b['id']:'queued' for b in config['batches']};queued=list(config['batches']);stopping=False;stop_reason=None
    def request_stop(reason):
        nonlocal stopping,stop_reason
        if stopping:return
        stopping=True;stop_reason=reason
        for process,_,_ in active.values():
            try:process.send_signal(signal.SIGINT)
            except ProcessLookupError:pass
    def stop(signum,frame):request_stop('Interrupted by signal '+str(signum))
    signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
    env={**os.environ,**config.get('environment',{}),'MITCHELL_HTML':config['html']}
    try:
        while queued or active:
            while queued and len(active)<config.get('concurrency',1) and not stopping:
                batch=queued.pop(0); name=batch['id'];done=root/(name+'.done.json');state=root/(name+'.state.json')
                if args.resume and done.exists():statuses[name]='completed';continue
                if not args.resume and (state.exists() or (root/(name+'.pgn')).exists()):raise RuntimeError('Use --resume for existing results: '+name)
                if args.resume and state.exists():command=[config['fastchess'],'-config','file='+str(state),'outname='+str(state),'stats=true']
                else:
                    opponent=config['opponents'][batch['opponent']]
                    command=[config['fastchess'],'-engine','cmd='+config['node'],'args='+config['adapter'],'name=Mitchell65','option.Level=65','option.MoveOverhead=20','-engine','cmd='+opponent['command']]+opponent.get('arguments',[])+['name='+batch['opponent']]+opponent.get('options',[])
                    command+=['-each','proto=uci','st=1','timemargin=250','-rounds',str(batch['games']//2),'-games','2','-concurrency','1','-openings','file='+config['openings'],'format=epd','order=sequential','start='+str(batch['openingStart']),'-pgnout','file='+str(root/(name+'.pgn')),'nodes=true','nps=true','timeleft=true','-config','outname='+str(state),'-autosaveinterval','1','-recover','-event','Mitchell independent 200-game benchmark','-site','local shared Linux host']
                log=open(root/(name+'.log'),'a' if args.resume else 'w');process=subprocess.Popen(command,env=env,stdout=log,stderr=subprocess.STDOUT,cwd=root)
                active[name]=(process,log,batch);statuses[name]='running';save(root/(name+'.command.json'),{'startedUtc':utc(),'argv':command,'pid':process.pid})
            for name,(process,log,batch) in list(active.items()):
                code=process.poll()
                if code is None:continue
                log.close();actual=len(games(root/(name+'.pgn')));success=code==0 and actual==batch['games'];statuses[name]='completed' if success else 'failed'
                if success:save(root/(name+'.done.json'),{'finishedUtc':utc(),'games':actual,'exitCode':code})
                del active[name]
                if not success:request_stop('Batch '+name+' stopped: exit '+str(code)+', completed '+str(actual)+'/'+str(batch['games']))
            report=summarize(config,root)
            if config.get('stopOnForfeit',True) and any(x['forfeits'] for x in report['opponents'].values()):request_stop('Abnormal game termination detected; review PGNs before continuing')
            save(root/'summary.json',report);save(root/'status.json',{'updatedUtc':utc(),'pid':os.getpid(),'reason':stop_reason,'status':'stopping' if stopping else 'running' if active or queued else 'completed','batches':statuses,'completedGames':report['completedGames'],'plannedGames':200})
            if stopping and not active:break
            if active:time.sleep(5)
        final=summarize(config,root);save(root/'summary.json',final)
        if final['completedGames']!=200:
            save(root/'status.json',{'updatedUtc':utc(),'status':'paused','reason':stop_reason or 'Incomplete campaign','completedGames':final['completedGames'],'plannedGames':200,'batches':statuses})
            raise RuntimeError('Campaign paused before 200 completed games: '+str(stop_reason))
        save(root/'status.json',{'updatedUtc':utc(),'status':'completed','completedGames':200,'plannedGames':200,'batches':statuses});print(json.dumps(final),flush=True)
    finally:lock.unlink(missing_ok=True)
if __name__=='__main__':main()
