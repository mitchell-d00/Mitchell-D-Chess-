#!/usr/bin/env python3
"""Archive referee evidence, never third-party binaries or networks."""
import argparse, datetime, gzip, hashlib, importlib.util, json, shutil, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(data):return hashlib.sha256(data).hexdigest()
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('campaign');p.add_argument('out');p.add_argument('--runner-source');p.add_argument('--allow-incomplete',action='store_true');args=p.parse_args()
 source=Path(args.campaign).resolve();root=source.parent;out=Path(args.out).resolve()
 if out.exists():raise ValueError('Archive destination must not exist')
 config=json.loads(source.read_text());status=json.loads((root/'status.json').read_text())
 if status['status']!='completed' and not args.allow_incomplete:raise ValueError('Campaign is incomplete; use --allow-incomplete for a labelled checkpoint')
 runner=Path(args.runner_source or config.get('runner',''))
 if not runner.is_file():raise ValueError('Provide the exact runner source used in the campaign')
 if config.get('runnerSha256') and digest(runner.read_bytes())!=config['runnerSha256']:raise ValueError('Runner hash changed')
 spec=importlib.util.spec_from_file_location('campaign_archive',ROOT/'scripts/independent-campaign.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 out.mkdir(parents=True);logs={}
 selected=[source,root/'status.json',root/'openings.epd',*root.glob('*.pgn'),*root.glob('*.command.json'),*root.glob('*.state.json'),*root.glob('*.done.json')]
 for file in selected:
  raw=file.read_bytes()
  if file.suffix=='.pgn':
   # A concurrent append must settle before a snapshot is accepted.
   time.sleep(.02)
   if file.read_bytes()!=raw:raise ValueError('PGN changed during snapshot; retry into a new archive directory')
   if raw.strip() and raw.strip().split()[-1] not in (b'1-0',b'0-1',b'1/2-1/2'):raise ValueError('PGN ends with an unfinished record')
  if file.suffix=='.json':json.loads(raw)
  (out/file.name).write_bytes(raw)
 for file in root.glob('*.log'):
  raw=file.read_bytes();(out/(file.name+'.gz')).write_bytes(gzip.compress(raw,mtime=0));logs[file.name]=digest(raw)
 for file in sorted((root/'adapter').glob('*.cjs')):
  (out/'adapter').mkdir(exist_ok=True);shutil.copyfile(file,out/'adapter'/file.name)
 preparer=Path(config.get('preparer',root/'prepare-wasm-match.py'))
 if preparer.exists():
  if digest(preparer.read_bytes())!=config.get('preparerSha256'):raise ValueError('Preparer hash changed')
  shutil.copyfile(preparer,out/preparer.name)
 shutil.copyfile(runner,out/'runner.py')
 summary=module.summarize(config,out);(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
 complete=summary['completedGames']==summary['plannedGames'] and status['status']=='completed'
 snapshot={'createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'complete':complete,'completedGames':summary['completedGames'],'plannedGames':summary['plannedGames'],'testedRevision':config['testedRevision'],'htmlSha256':config['htmlSha256'],'uncompressedLogs':logs,'files':{str(f.relative_to(out)):digest(f.read_bytes()) for f in sorted(out.rglob('*')) if f.is_file()},'notes':['Static evidence snapshot, not live progress.','Third-party executables, libraries and models are intentionally not archived.','Reconstruct frozen HTML from testedRevision and verify htmlSha256.']}
 (out/'snapshot.json').write_text(json.dumps(snapshot,indent=2)+'\n');print(json.dumps({'complete':complete,'completed':summary['completedGames'],'planned':summary['plannedGames'],'archive':str(out)}))
if __name__=='__main__':main()
