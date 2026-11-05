"""MIT. Freeze the entire level ladder without running external matches."""
import hashlib,json,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class LevelPreparation(unittest.TestCase):
 def test_all_pairs_and_immutable_inputs(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td);manager=root/'manager';manager.write_text('#!/bin/sh\necho "test manager"\n');manager.chmod(0o700)
   args=[sys.executable,'scripts/prepare-level-matches.py','--out',str(root/'run'),'--fastchess',str(manager),'--pairs','adjacent','--games','2','--top-games','4']
   subprocess.run(args,cwd=ROOT,check=True,capture_output=True);file=root/'run/campaign.json';before=file.read_bytes();c=json.loads(before)
   self.assertEqual(len(c['batches']),65);self.assertEqual(c['expectedGames'],132);self.assertEqual(c['candidateName'],'MitchellHigher');self.assertEqual(c['batches'][0]['games'],4)
   self.assertEqual([b['candidateLevel'] for b in c['batches'][1:]],list(range(2,66)))
   self.assertEqual(c['environment']['MITCHELL_REQUIRE_LEVEL_BACKEND'],'1');self.assertNotIn('MITCHELL_REQUIRE_WASM',c['environment'])
   for key in ['html','adapter','helper','runner','preparer','node','fastchess','openings']:self.assertEqual(hashlib.sha256(Path(c[key]).read_bytes()).hexdigest(),c[key+'Sha256'])
   for b in c['batches'][1:]:self.assertIn('option.Level='+str(b['candidateLevel']-1),c['opponents'][b['opponent']]['options'])
   self.assertNotEqual(subprocess.run(args,cwd=ROOT,capture_output=True).returncode,0);self.assertEqual(before,file.read_bytes())
   args[args.index('--out')+1]=str(root/'bad');args[args.index('--pairs')+1]='4:5'
   self.assertNotEqual(subprocess.run(args,cwd=ROOT,capture_output=True).returncode,0);self.assertFalse((root/'bad').exists())
if __name__=='__main__':unittest.main()
