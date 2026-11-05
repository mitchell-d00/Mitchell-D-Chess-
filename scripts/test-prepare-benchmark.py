import argparse, hashlib, importlib.util, json, shutil, tempfile, unittest, subprocess, sys
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
   with self.assertRaises(ValueError):prepare.prepare(args)
   args.out=str(root/'too-many');args.games_per_opponent=10000
   with self.assertRaises(ValueError):prepare.prepare(args)
   self.assertFalse((root/'too-many').exists())
   Path(config['helper']).write_text('modified helper')
   result=subprocess.run([sys.executable,config['runner'],str(path)],capture_output=True,text=True,timeout=10)
   self.assertNotEqual(result.returncode,0);self.assertIn('Pinned input changed: helper',result.stderr)
   self.assertFalse((path.parent/'campaign.pid').exists())
if __name__=='__main__':unittest.main()
