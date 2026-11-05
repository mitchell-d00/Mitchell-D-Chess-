#!/usr/bin/env python3
"""MIT. Freeze a paired candidate-vs-baseline WASM match for external Fastchess.
Build each single-file HTML from its declared revision before invoking this tool.
Both players use the same frozen adapter and must actually return WASM results.
"""
import argparse, base64, hashlib, importlib.util, json, re, shlex, shutil, sys, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prepare',ROOT/'scripts/prepare-benchmark.py');prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
def main():
 p=argparse.ArgumentParser(description=__doc__)
 for name in ['candidate-html','baseline-html','baseline-revision','out','fastchess']:p.add_argument('--'+name,required=True)
 p.add_argument('--revision',default='HEAD',help='Candidate revision and shared adapter revision')
 p.add_argument('--games',type=int,default=40);p.add_argument('--move-seconds',type=float,default=.1);p.add_argument('--node',default=shutil.which('node'))
 a=p.parse_args();candidate=Path(a.candidate_html).resolve().read_bytes();baseline=Path(a.baseline_html).resolve().read_bytes()
 cores=[re.search(rb"var WASM_CORE_DATA = '([^']+)'",html) for html in [candidate,baseline]]
 if any(m is None for m in cores):p.error('Both inputs must be explicit WASM builds')
 models=[re.search(rb"var NNUE_MODEL = \{ hidden: (\d+), data: '([^']+)' \}",html) for html in [candidate,baseline]]
 if any(m is None for m in models):p.error('Network metadata is missing')
 if models[0].groups()!=models[1].groups():p.error('Performance ablations require the same network and hidden width')
 baseline_revision=prepare.git('rev-parse','--verify',a.baseline_revision+'^{commit}').decode().strip()
 with tempfile.TemporaryDirectory() as td:
  opponents=Path(td)/'opponents.json';opponents.write_text(json.dumps({'Mitchell-WASM-baseline':{'command':a.node,'options':['option.Level=65','option.MoveOverhead=20']}}))
  args=argparse.Namespace(out=a.out,revision=a.revision,opponents=str(opponents),games_per_opponent=a.games,fruit=None,minimal=None,move_seconds=a.move_seconds,margin_ms=250,fastchess=a.fastchess,node=a.node,concurrency=1,openings=None,purpose='Paired full-WASM evolution experiment')
  args.native_adapter_required=True
  config_path=prepare.prepare(args)
 c=json.loads(config_path.read_text());root=config_path.parent
 Path(c['html']).write_bytes(candidate);c['htmlSha256']=prepare.sha(c['html'])
 c['engineSourceSha256']=hashlib.sha256(candidate.split(b'<script id="engine-src">',1)[1].split(b'</script>',1)[0]).hexdigest()
 baseline_path=root/'baseline.html';baseline_path.write_bytes(baseline)
 wrapper=root/'adapter/uci-file.cjs';wrapper.write_text("process.env.MITCHELL_HTML=process.argv[2];require('./uci.cjs');\n")
 opponent=c['opponents']['Mitchell-WASM-baseline'];opponent['arguments']=['args='+shlex.join([str(wrapper),str(baseline_path)])]
 opponent['additionalInputs']={str(f):prepare.sha(f) for f in [baseline_path,wrapper,Path(c['adapter']),Path(c['helper'])]}
 opponent['sourceRevision']=baseline_revision
 c['environment']={'MITCHELL_REQUIRE_WASM':'1','MITCHELL_WASM_MEMORY':'32','MITCHELL_EXACT_ENDGAMES':'0'}
 c['networkSha256']=hashlib.sha256(base64.b64decode(models[0].group(2),validate=True)).hexdigest();c['hidden']=int(models[0].group(1))
 c['engineIdentity']={'level':65,'backend':'wasm-required','wasmMemoryMiB':32,'wasmSha256':hashlib.sha256(base64.b64decode(cores[0].group(1),validate=True)).hexdigest(),'modelSha256':c['networkSha256'],'hidden':c['hidden']}
 c['artifactReconstruction']='node scripts/build.cjs --candidate-wasm --output engine-under-test.html'
 c['preparer']=str(root/'prepare-wasm-match.py');shutil.copyfile(__file__,c['preparer']);c['preparerSha256']=prepare.sha(c['preparer'])
 c['purposeNote']='Relative short-control test, not a rating. Same adapter, 32 MiB WASM, network and time control; no books, no evaluation adjudication, no arbitrary move-limit draws. All completed games retained. Caller-supplied artifacts are identified by hashes; revision labels must correspond to their explicit builds.'
 c.pop('ccrlReferenceDate',None);config_path.write_text(json.dumps(c,indent=2)+'\n')
 print('Prepared:',config_path);print('Run:',sys.executable,root/'runner.py',config_path)
if __name__=='__main__':main()
