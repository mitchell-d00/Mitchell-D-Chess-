#!/usr/bin/env python3
"""MIT: prepare a portable frozen copy of the recorded 200-game experiment.
External Fastchess and opponent executables must be installed independently.
"""
import argparse,datetime,hashlib,json,os,platform,shlex,shutil,subprocess,sys
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
 binaries={k:executable(getattr(args,k)) for k in ['fastchess','fruit','minimal','node']}
 payload={name:git('show',revision+':'+name) for name in ['index.html','scripts/uci.cjs','scripts/engine.cjs','validation/independent/openings.epd']}
 c=json.loads((ROOT/'validation/independent/campaign-config.json').read_text())
 c['createdUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat();c['testedRevision']=revision;c['runnerSourceRevision']=git('rev-parse','HEAD').decode().strip()
 c['node']=binaries['node'];c['nodeVersion']=subprocess.check_output([c['node'],'--version'],text=True,timeout=10).strip()
 c['fastchess']=binaries['fastchess'];c['fastchessVersion']=subprocess.check_output([c['fastchess'],'-version'],text=True,timeout=10).strip()
 c['environment']={};c['host']={'platform':platform.platform(),'logicalCpus':os.cpu_count(),'pythonVersion':platform.python_version()};c['concurrency']=args.concurrency;c['stopOnForfeit']=True
 c.pop('previousFailedRun',None);c.pop('previousRunExcludedFromResults',None);c.pop('excludedPreflightOpponents',None)
 c['protocolReference']='validation/independent/results-58/campaign.json'
 for name,key in [('Fruit2.1','fruit'),('MinimalChess0.6','minimal')]:
  c['opponents'][name]['command']=binaries[key];c['opponents'][name]['sha256']=sha(binaries[key])
 out.mkdir(parents=True,exist_ok=True);(out/'adapter').mkdir()
 for original,target in [('index.html','engine-under-test.html'),('scripts/uci.cjs','adapter/uci.cjs'),('scripts/engine.cjs','adapter/engine.cjs'),('validation/independent/openings.epd','openings.epd')]:
  (out/target).write_bytes(payload[original])
 c['html']=str(out/'engine-under-test.html');c['htmlSha256']=sha(c['html']);c['adapter']=str(out/'adapter/uci.cjs');c['adapterSha256']=sha(c['adapter']);c['openings']=str(out/'openings.epd');c['openingsSha256']=sha(c['openings'])
 path=out/'campaign.json';path.write_text(json.dumps(c,indent=2)+'\n');return path

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',required=True);p.add_argument('--fastchess',required=True);p.add_argument('--fruit',required=True);p.add_argument('--minimal',required=True);p.add_argument('--node',default=shutil.which('node'));p.add_argument('--revision',default='bdb5873406a2b3336523f3a19f16c4a1bc9ebd46');p.add_argument('--concurrency',type=int,choices=[1,2],default=2);args=p.parse_args()
 if not args.node:p.error('Node.js is required; provide --node')
 path=prepare(args);print('Prepared:',path);print('Run:',shlex.join([sys.executable,str(ROOT/'scripts/independent-campaign.py'),str(path)]));print('External runtime compatibility libraries, if needed, must be supplied by the caller environment.')
if __name__=='__main__':main()
