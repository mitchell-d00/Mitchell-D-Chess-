import argparse, hashlib, importlib.util, json, shutil, tempfile, unittest, subprocess, sys
from unittest.mock import patch
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prepare',ROOT/'scripts/prepare-benchmark.py');prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
class PrepareTests(unittest.TestCase):
 def test_frozen_inputs_and_non_destructive_preparation(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td);fake=root/'fake-engine';fake.write_text('#!/bin/sh\necho "Fake test binary"\n');fake.chmod(0o700)
   opponents=root/'opponents.json';opponents.write_text(json.dumps({'Other':{'command':str(fake),'options':[]}}))
   args=argparse.Namespace(out=str(root/'run'),revision='HEAD',opponents=str(opponents),games_per_opponent=4,fruit=None,minimal=None,move_seconds=1,margin_ms=250,fastchess=str(fake),node=shutil.which('node'),concurrency=1,openings=None,purpose='Frozen integration fixture')
   path=prepare.prepare(args);config=json.loads(path.read_text())
   self.assertEqual(config['expectedGames'],4)
   for field in ['html','adapter','helper','runner','node','fastchess','openings']:
    self.assertEqual(hashlib.sha256(Path(config[field]).read_bytes()).hexdigest(),config[field+'Sha256'])
   self.assertEqual(config['purpose'],'Frozen integration fixture')
   self.assertEqual(config['engineIdentity']['backend'],'wasm-required')
   self.assertEqual(config['environment']['MITCHELL_REQUIRE_WASM'],'1')
   self.assertEqual(config['engineIdentity']['modelSha256'],'794f2d101e3974eab1a5d37b60b78898ff8bc93c2813831973a9c4dccd51a704')
   with self.assertRaises(ValueError):prepare.prepare(args)
   args.out=str(root/'too-many');args.games_per_opponent=10000
   with self.assertRaises(ValueError):prepare.prepare(args)
   self.assertFalse((root/'too-many').exists())
   runtime=root/'runtime.json';runtime.write_text(json.dumps({'MITCHELL_REQUIRE_WASM':'0'}));args.environment=str(runtime);args.games_per_opponent=4;args.out=str(root/'bad-env')
   with self.assertRaisesRegex(ValueError,'cannot override'):prepare.prepare(args)
   self.assertFalse((root/'bad-env').exists())
   runtime.write_text(json.dumps({'DOTNET_SYSTEM_GLOBALIZATION_INVARIANT':'1'}));args.out=str(root/'with-runtime');valid=json.loads(prepare.prepare(args).read_text())
   self.assertEqual(valid['environment']['DOTNET_SYSTEM_GLOBALIZATION_INVARIANT'],'1');self.assertEqual(valid['environment']['MITCHELL_REQUIRE_WASM'],'1')
   original_git=prepare.git;args.out=str(root/'legacy-adapter')
   def legacy(*argv):return b'// old adapter without native enforcement' if argv[0]=='show' and argv[1].endswith(':scripts/uci.cjs') else original_git(*argv)
   with patch.object(prepare,'git',side_effect=legacy):
    with self.assertRaisesRegex(ValueError,'cannot enforce WASM'):prepare.prepare(args)
   self.assertFalse((root/'legacy-adapter').exists())
   args.native_adapter_required=True;args.out=str(root/'legacy-alternate')
   def old_alternate(*argv):
    if argv[0]=='show' and argv[1].endswith(':index.html'):return b'<script id="engine-src">var oldJavascript=true;</script>'
    return legacy(*argv)
   with patch.object(prepare,'git',side_effect=old_alternate):
    with self.assertRaisesRegex(ValueError,'cannot enforce WASM'):prepare.prepare(args)
   self.assertFalse((root/'legacy-alternate').exists())
   Path(config['helper']).write_text('modified helper')
   result=subprocess.run([sys.executable,config['runner'],str(path)],capture_output=True,text=True,timeout=10)
   self.assertNotEqual(result.returncode,0);self.assertIn('Pinned input changed: helper',result.stderr)
   self.assertFalse((path.parent/'campaign.pid').exists())
if __name__=='__main__':unittest.main()
