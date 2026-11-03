#!/usr/bin/env python3
"""MIT tests for PGN accounting and automatic fault pause; no external engine needed."""
import hashlib,importlib.util,json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('campaign',ROOT/'scripts/independent-campaign.py');campaign=importlib.util.module_from_spec(spec);spec.loader.exec_module(campaign)
class CampaignTests(unittest.TestCase):
 def test_pair_and_forfeit_accounting(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td);(root/'one.pgn').write_text('''[Event "test"]
[Round "1"]
[White "Mitchell65"]
[Black "Other"]
[Result "1-0"]
[Termination "normal"]
[Event "test"]
[Round "1"]
[White "Other"]
[Black "Mitchell65"]
[Result "1/2-1/2"]
[Termination "normal"]
[Event "test"]
[Round "2"]
[White "Mitchell65"]
[Black "Other"]
[Result "0-1"]
[Termination "illegal move"]
[Event "test"]
[Result "*"]
''')
   r=campaign.summarize({'timeControl':{},'batches':[{'id':'one','opponent':'Other','games':200}]},root)
   self.assertEqual(r['completedGames'],3);o=r['opponents']['Other'];self.assertEqual(o['completedNormalPairs'],1);self.assertEqual(o['forfeitResults']['losses'],1);self.assertEqual(o['normalResults'],{'wins':1,'draws':1,'losses':0})
 def test_published_snapshot_hashes_and_summary(self):
  root=ROOT/'validation/independent/results-58';snapshot=json.loads((root/'snapshot.json').read_text())
  for name,digest in snapshot['files'].items():self.assertEqual(hashlib.sha256((root/name).read_bytes()).hexdigest(),digest,name)
  p=subprocess.run([sys.executable,str(ROOT/'scripts/independent-campaign.py'),str(root/'campaign.json'),'--summary-only'],capture_output=True,text=True,timeout=10)
  self.assertEqual(p.returncode,0,p.stderr);actual=json.loads(p.stdout);recorded=json.loads((root/'summary.json').read_text())
  for field in ['plannedGames','completedGames','timeControl','opponents']:self.assertEqual(actual[field],recorded[field],field)
  self.assertEqual(actual['completedGames'],58)
  self.assertEqual(sum(v['normalResults']['wins'] for v in actual['opponents'].values()),52)
  self.assertEqual(sum(v['forfeitResults']['wins'] for v in actual['opponents'].values()),1)
 def test_fault_pauses_without_filling_campaign(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td);fake=root/'fake-manager';fake.write_text('''#!/usr/bin/env python3
import sys,time
from pathlib import Path
p=Path(sys.argv[sys.argv.index('-pgnout')+1].split('=',1)[1])
p.write_text('[Event "test"]\\n[Round "1"]\\n[White "Mitchell65"]\\n[Black "Other"]\\n[Result "0-1"]\\n[Termination "illegal move"]\\n')
time.sleep(60)
''');fake.chmod(0o700)
   digest=hashlib.sha256(fake.read_bytes()).hexdigest();config={'html':str(fake),'htmlSha256':digest,'adapter':str(fake),'adapterSha256':digest,'node':sys.executable,'fastchess':str(fake),'openings':str(fake),'openingsSha256':digest,'timeControl':{'movetimeSeconds':1},'opponents':{'Other':{'command':str(fake),'sha256':digest}},'batches':[{'id':'one','opponent':'Other','games':200,'openingStart':1}],'stopOnForfeit':True,'concurrency':1}
   path=root/'campaign.json';path.write_text(json.dumps(config));p=subprocess.run([sys.executable,str(ROOT/'scripts/independent-campaign.py'),str(path)],capture_output=True,text=True,timeout=20)
   self.assertNotEqual(p.returncode,0);status=json.loads((root/'status.json').read_text());self.assertEqual(status['status'],'paused');self.assertIn('Abnormal',status['reason']);self.assertEqual(status['completedGames'],1);self.assertFalse((root/'campaign.pid').exists());self.assertFalse((root/'one.done.json').exists())
if __name__=='__main__':unittest.main()
