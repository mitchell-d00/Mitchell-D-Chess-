"""MIT. Integration checks for immutable, comparable native-backend experiments."""
import hashlib, json, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class WasmPreparation(unittest.TestCase):
 def test_freeze_and_reject_changed_model_or_existing_run(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td);html=root/'candidate.html'
   subprocess.run(['node','scripts/build.cjs','--candidate-wasm','--output',str(html)],cwd=ROOT,check=True,capture_output=True)
   fake=root/'fastchess';fake.write_text('#!/bin/sh\necho "Test manager"\n');fake.chmod(0o700)
   args=[sys.executable,str(ROOT/'scripts/prepare-wasm-match.py'),'--candidate-html',str(html),'--baseline-html',str(html),'--baseline-revision','HEAD','--out',str(root/'run'),'--fastchess',str(fake),'--games','2']
   subprocess.run(args,cwd=ROOT,check=True,capture_output=True);config=root/'run/campaign.json';before=config.read_bytes();c=json.loads(before)
   self.assertEqual(c['environment']['MITCHELL_REQUIRE_WASM'],'1');self.assertEqual(c['hidden'],128)
   self.assertEqual(c['networkSha256'],'794f2d101e3974eab1a5d37b60b78898ff8bc93c2813831973a9c4dccd51a704')
   for file,digest in c['opponents']['Mitchell-WASM-baseline']['additionalInputs'].items():self.assertEqual(hashlib.sha256(Path(file).read_bytes()).hexdigest(),digest)
   self.assertNotEqual(subprocess.run(args,cwd=ROOT,capture_output=True).returncode,0);self.assertEqual(config.read_bytes(),before)
   changed=root/'changed.html';changed.write_bytes(html.read_bytes().replace(b'hidden: 128, data:',b'hidden: 256, data:',1))
   args[args.index('--baseline-html')+1]=str(changed);args[args.index('--out')+1]=str(root/'rejected')
   result=subprocess.run(args,cwd=ROOT,capture_output=True,text=True);self.assertNotEqual(result.returncode,0);self.assertIn('same network',result.stderr);self.assertFalse((root/'rejected').exists())
if __name__=='__main__':unittest.main()
