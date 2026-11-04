#!/usr/bin/env python3
"""MIT: prepare frozen independent-engine experiments, from pilots to full matches.
External Fastchess and opponent executables must be installed independently.
"""
import argparse,datetime,hashlib,json,math,os,platform,shlex,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def executable(value):
 p=Path(value).expanduser().resolve()
 if not p.is_file() or not os.access(p,os.X_OK):raise ValueError('Executable unavailable: '+str(p))
 return str(p)
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args])
def prepare(args):
 out=Path(args.out).expanduser().resolve()
 if out.exists() and any(out.iterdir()):raise ValueError('Output directory must be empty; existing results will not be overwritten')
 # Resolve and validate everything before creating the output.
 revision=git('rev-parse','--verify',args.revision+'^{commit}').decode().strip()
 custom=json.loads(Path(args.opponents).read_text()) if args.opponents else None
 if custom is not None and (not isinstance(custom,dict) or not custom):raise ValueError('Opponent specification must be a nonempty object')
 if custom is None and (not args.fruit or not args.minimal):raise ValueError('Provide --fruit and --minimal, or --opponents')
 if custom is None and args.games_per_opponent is not None:raise ValueError('--games-per-opponent requires --opponents')
 if not math.isfinite(args.move_seconds) or args.move_seconds<=0 or args.margin_ms<0:raise ValueError('Invalid time control')
 keys=['fastchess','node']+([] if custom is not None else ['fruit','minimal'])
 binaries={k:executable(getattr(args,k)) for k in keys}
 payload={name:((ROOT/name).read_bytes() if args.working_tree else git('show',revision+':'+name)) for name in ['index.html','scripts/uci.cjs','scripts/engine.cjs','validation/independent/openings.epd']}
 if args.openings:payload['validation/independent/openings.epd']=Path(args.openings).read_bytes()
 if not payload['validation/independent/openings.epd'].strip():raise ValueError('Opening file is empty')
 c=json.loads((ROOT/'validation/independent/campaign-config.json').read_text())
 c['createdUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat();c['testedRevision']=None if args.working_tree else revision;c['sourceBaseRevision']=git('rev-parse','HEAD').decode().strip() if args.working_tree else revision;c['workingTreeInputs']=args.working_tree;c['runnerSourceSha256']=sha(ROOT/'scripts/independent-campaign.py');c['runnerSourceRevision']=git('rev-parse','HEAD').decode().strip()
 c['node']=binaries['node'];c['nodeVersion']=subprocess.check_output([c['node'],'--version'],text=True,timeout=10).strip()
 c['fastchess']=binaries['fastchess'];c['fastchessVersion']=subprocess.check_output([c['fastchess'],'-version'],text=True,timeout=10).strip()
 c['environment']={};c['host']={'platform':platform.platform(),'logicalCpus':os.cpu_count(),'pythonVersion':platform.python_version()};c['concurrency']=args.concurrency;c['stopOnForfeit']=True
 c.pop('previousFailedRun',None);c.pop('previousRunExcludedFromResults',None);c.pop('excludedPreflightOpponents',None)
 c['protocolReference']='validation/independent/results-58/campaign.json'
 if custom is None:
  for name,key in [('Fruit2.1','fruit'),('MinimalChess0.6','minimal')]:
   c['opponents'][name]['command']=binaries[key];c['opponents'][name]['sha256']=sha(binaries[key])
 else:
  count=args.games_per_opponent if args.games_per_opponent is not None else 4
  if count<=0 or count%2:raise ValueError('Games per opponent must be positive and even')
  c['opponents']={};c['batches']=[]
  for i,(name,opponent) in enumerate(custom.items()):
   if not isinstance(opponent,dict) or not opponent.get('command'):raise ValueError('Each opponent needs command')
   item=dict(opponent);item['command']=executable(item['command']);item['sha256']=sha(item['command'])
   for field in ['arguments','options']:
    if not isinstance(item.get(field,[]),list) or not all(isinstance(x,str) for x in item.get(field,[])):raise ValueError(field+' must be a list of strings')
   c['opponents'][name]=item;c['batches'].append({'id':str(i+1).zfill(2)+'-opponent','opponent':name,'games':count,'openingStart':1})
  c['expectedGames']=count*len(custom);c['purpose']='Independent competitive-opponent pilot';c['event']='Mitchell competitive-opponent pilot'
 c['timeControl']['movetimeSeconds']=args.move_seconds;c['timeControl']['equalTimeMarginMs']=args.margin_ms
 out.mkdir(parents=True,exist_ok=True);(out/'adapter').mkdir()
 for original,target in [('index.html','engine-under-test.html'),('scripts/uci.cjs','adapter/uci.cjs'),('scripts/engine.cjs','adapter/engine.cjs'),('validation/independent/openings.epd','openings.epd')]:
  (out/target).write_bytes(payload[original])
 c['html']=str(out/'engine-under-test.html');c['htmlSha256']=sha(c['html']);c['adapter']=str(out/'adapter/uci.cjs');c['adapterSha256']=sha(c['adapter']);c['openings']=str(out/'openings.epd');c['openingsSha256']=sha(c['openings'])
 path=out/'campaign.json';path.write_text(json.dumps(c,indent=2)+'\n');return path

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',required=True);p.add_argument('--fastchess',required=True);p.add_argument('--fruit');p.add_argument('--minimal');p.add_argument('--working-tree',action='store_true',help='Freeze current local HTML/adapter instead of Git; manifest marks revision as uncommitted');p.add_argument('--openings',help='Optional local EPD file, copied and hashed');p.add_argument('--opponents',help='JSON object of named external engines');p.add_argument('--games-per-opponent',type=int);p.add_argument('--move-seconds',type=float,default=1);p.add_argument('--margin-ms',type=int,default=250);p.add_argument('--node',default=shutil.which('node'));p.add_argument('--revision',default='bdb5873406a2b3336523f3a19f16c4a1bc9ebd46');p.add_argument('--concurrency',type=int,choices=[1,2],default=2);args=p.parse_args()
 if not args.node:p.error('Node.js is required; provide --node')
 path=prepare(args);print('Prepared:',path);print('Run:',shlex.join([sys.executable,str(ROOT/'scripts/independent-campaign.py'),str(path)]));print('External runtime compatibility libraries, if needed, must be supplied by the caller environment.')
if __name__=='__main__':main()
