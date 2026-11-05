#!/usr/bin/env python3
"""MIT. Freeze adjacent-level screening or a targeted colour-paired comparison."""
import argparse,importlib.util,json,shlex,shutil,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prepare',ROOT/'scripts/prepare-benchmark.py');prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',required=True);p.add_argument('--fastchess',required=True);p.add_argument('--revision',default='HEAD');p.add_argument('--pairs',default='65:50',help='Comma-separated higher:lower levels, or adjacent');p.add_argument('--games',type=int,default=2);p.add_argument('--move-seconds',type=float,default=.1);p.add_argument('--concurrency',type=int,choices=[1,2],default=1);p.add_argument('--node',default=shutil.which('node'));a=p.parse_args()
 pairs=[(i,i-1) for i in range(2,66)] if a.pairs=='adjacent' else [tuple(map(int,x.split(':'))) for x in a.pairs.split(',')]
 if any(len(x)!=2 or not 1<=x[1]<x[0]<=65 for x in pairs):p.error('Pairs must be higher:lower levels in 1–65')
 if len(set(pairs))!=len(pairs):p.error('Duplicate pairs are not allowed')
 with tempfile.TemporaryDirectory() as td:
  opponents=Path(td)/'opponents.json';opponents.write_text(json.dumps({f'Level{hi}-vs-Level{lo}':{'command':a.node,'options':['option.Level='+str(lo),'option.MoveOverhead=20']} for hi,lo in pairs}))
  args=argparse.Namespace(out=a.out,revision=a.revision,opponents=str(opponents),games_per_opponent=a.games,fruit=None,minimal=None,move_seconds=a.move_seconds,margin_ms=250,fastchess=a.fastchess,node=a.node,concurrency=a.concurrency,openings=None,purpose='Colour-paired difficulty-level screening')
  file=prepare.prepare(args)
 c=json.loads(file.read_text());root=file.parent
 # The test adapter is separately pinned: historical HTML can still be screened.
 (root/'adapter/uci.cjs').write_bytes((ROOT/'scripts/uci.cjs').read_bytes());c['adapterSha256']=prepare.sha(c['adapter'])
 (root/'adapter/engine.cjs').write_bytes((ROOT/'scripts/engine.cjs').read_bytes());c['helperSha256']=prepare.sha(c['helper'])
 wrapper=root/'adapter/level-opponent.cjs';wrapper.write_text("process.env.MITCHELL_HTML=process.argv[2];require('./uci.cjs');\n")
 for (hi,lo),batch in zip(pairs,c['batches']):
  batch['candidateLevel']=hi;opponent=c['opponents'][batch['opponent']];opponent['arguments']=['args='+shlex.join([str(wrapper),c['html']])];opponent['additionalInputs']={str(f):prepare.sha(f) for f in [wrapper,Path(c['html']),Path(c['adapter']),Path(c['helper'])]}
 c['candidateName']='MitchellHigher';c['environment']={'MITCHELL_REQUIRE_LEVEL_BACKEND':'1','MITCHELL_WASM_MEMORY':'32','MITCHELL_EXACT_ENDGAMES':'0'}
 c['engineIdentity']['level']='per batch';c['engineIdentity']['backend']='asserted per-level routing';c['adapterSourceRevision']=prepare.git('rev-parse','HEAD').decode().strip()
 c['preparer']=str(root/'prepare-level-matches.py');Path(c['preparer']).write_bytes(Path(__file__).read_bytes());c['preparerSha256']=prepare.sha(c['preparer'])
 c['purposeNote']='Each row is higher versus lower level, colours reversed. Short screenings detect regressions but cannot prove every adjacent level is statistically stronger. No Elo is assigned.'
 file.write_text(json.dumps(c,indent=2)+'\n');print('Prepared:',file);print('Run:','python3',root/'runner.py',file)
if __name__=='__main__':main()
