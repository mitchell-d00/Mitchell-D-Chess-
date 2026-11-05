#!/usr/bin/env python3
"""MIT: prepare frozen independent-engine experiments, from pilots to full matches.
External Fastchess and opponent executables must be installed independently.
"""
import argparse,base64,datetime,hashlib,json,math,os,platform,re,shlex,shutil,subprocess,sys
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
 payload={name:git('show',revision+':'+name) for name in ['index.html','scripts/uci.cjs','scripts/engine.cjs','validation/independent/openings.epd']}
 if args.openings:payload['validation/independent/openings.epd']=Path(args.openings).read_bytes()
 if not payload['validation/independent/openings.epd'].strip():raise ValueError('Opening file is empty')
 runtime={}
 if getattr(args,'environment',None):
  runtime=json.loads(Path(args.environment).read_text())
  if not isinstance(runtime,dict) or any(not isinstance(k,str) or not isinstance(v,str) for k,v in runtime.items()):raise ValueError('Runtime environment must be an object of string values')
  if any(k.startswith('MITCHELL_') for k in runtime):raise ValueError('Benchmark backend settings are pinned automatically; runtime environment cannot override MITCHELL_ variables')
 html=payload['index.html'];core=re.search(rb"var WASM_CORE_DATA = '([^']+)'",html)
 model=re.search(rb"var NNUE_MODEL = \{ hidden: (\d+), data: '([^']+)' \}",html)
 c=json.loads((ROOT/'validation/independent/campaign-config.json').read_text())
 c['createdUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat();c['testedRevision']=revision;c['runnerSourceRevision']=git('rev-parse','HEAD').decode().strip()
 c['node']=binaries['node'];c['nodeSha256']=sha(c['node']);c['nodeVersion']=subprocess.check_output([c['node'],'--version'],text=True,timeout=10).strip()
 c['fastchess']=binaries['fastchess'];c['fastchessSha256']=sha(c['fastchess']);c['fastchessVersion']=subprocess.check_output([c['fastchess'],'-version'],text=True,timeout=10).strip()
 c['environment']={**runtime,**({'MITCHELL_REQUIRE_WASM':'1','MITCHELL_WASM_MEMORY':'32','MITCHELL_EXACT_ENDGAMES':'0'} if core else {})};c['host']={'platform':platform.platform(),'logicalCpus':os.cpu_count(),'pythonVersion':platform.python_version()};c['concurrency']=args.concurrency;c['stopOnForfeit']=True
 c['engineIdentity']={'level':65,'backend':'wasm-required' if core else 'legacy-javascript','wasmMemoryMiB':32 if core else None,'wasmSha256':hashlib.sha256(base64.b64decode(core[1],validate=True)).hexdigest() if core else None,'modelSha256':hashlib.sha256(base64.b64decode(model[2],validate=True)).hexdigest() if model else None,'hidden':int(model[1]) if model else None}
 c.pop('ccrlReferenceDate',None)
 c.pop('previousFailedRun',None);c.pop('previousRunExcludedFromResults',None);c.pop('excludedPreflightOpponents',None)
 c['protocolReference']='validation/independent/results-58/campaign.json'
 for key,path in [('cpuQuota','/sys/fs/cgroup/cpu.max'),('memoryLimit','/sys/fs/cgroup/memory.max')]:
  if Path(path).exists():c['host'][key]=Path(path).read_text().strip()
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
   for filename,digest in item.get('additionalInputs',{}).items():
    if sha(filename)!=digest:raise ValueError('Opponent additional input changed: '+filename)
   c['opponents'][name]=item;c['batches'].append({'id':str(i+1).zfill(2)+'-opponent','opponent':name,'games':count,'openingStart':1})
  if count//2>len([x for x in payload['validation/independent/openings.epd'].splitlines() if x.strip()]):raise ValueError('Not enough distinct openings for declared colour pairs')
  c['expectedGames']=count*len(custom);c['purpose']=args.purpose or 'Independent competitive-opponent pilot';c['event']=args.purpose or 'Mitchell competitive-opponent pilot'
 c['timeControl']['movetimeSeconds']=args.move_seconds;c['timeControl']['equalTimeMarginMs']=args.margin_ms
 out.mkdir(parents=True,exist_ok=True);(out/'adapter').mkdir()
 for original,target in [('index.html','engine-under-test.html'),('scripts/uci.cjs','adapter/uci.cjs'),('scripts/engine.cjs','adapter/engine.cjs'),('validation/independent/openings.epd','openings.epd')]:
  (out/target).write_bytes(payload[original])
 c['html']=str(out/'engine-under-test.html');c['htmlSha256']=sha(c['html']);c['adapter']=str(out/'adapter/uci.cjs');c['adapterSha256']=sha(c['adapter']);c['openings']=str(out/'openings.epd');c['openingsSha256']=sha(c['openings'])
 c['helper']=str(out/'adapter/engine.cjs');c['helperSha256']=sha(c['helper'])
 c['engineSourceSha256']=hashlib.sha256(payload['index.html'].split(b'<script id="engine-src">',1)[1].split(b'</script>',1)[0]).hexdigest()
 c['runner']=str(out/'runner.py');(out/'runner.py').write_bytes((ROOT/'scripts/independent-campaign.py').read_bytes());c['runnerSha256']=sha(c['runner'])
 c['preparer']=str(out/'prepare-benchmark.py');(out/'prepare-benchmark.py').write_bytes(Path(__file__).read_bytes());c['preparerSha256']=sha(c['preparer'])
 path=out/'campaign.json';path.write_text(json.dumps(c,indent=2)+'\n');return path

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',required=True);p.add_argument('--purpose',help='Explicit campaign purpose/event label');p.add_argument('--fastchess',required=True);p.add_argument('--fruit');p.add_argument('--minimal');p.add_argument('--openings',help='Optional local EPD file, copied and hashed');p.add_argument('--opponents',help='JSON object of named external engines');p.add_argument('--environment',help='JSON file of non-secret opponent runtime variables, frozen in the protocol');p.add_argument('--games-per-opponent',type=int);p.add_argument('--move-seconds',type=float,default=1);p.add_argument('--margin-ms',type=int,default=250);p.add_argument('--node',default=shutil.which('node'));p.add_argument('--revision',default='HEAD');p.add_argument('--concurrency',type=int,choices=[1,2],default=2);args=p.parse_args()
 if not args.node:p.error('Node.js is required; provide --node')
 path=prepare(args);print('Prepared:',path);print('Run:',shlex.join([sys.executable,str(path.parent/'runner.py'),str(path)]));print('External runtime compatibility libraries, if needed, must be supplied by the caller environment.')
if __name__=='__main__':main()
