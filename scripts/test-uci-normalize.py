#!/usr/bin/env python3
"""MIT integration test for the test-only format adapter, driven over native pipes."""
import json,select,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ProtocolTest(unittest.TestCase):
 def test_stream_and_audit(self):
  with tempfile.TemporaryDirectory()as td:
   root=Path(td);fake=root/'fake.py';audit=root/'audit.jsonl'
   fake.write_text('''import sys
print('id name Fake Engine Q',flush=True)
if sys.stdin.readline()!='uci\\n':sys.exit(3)
print('bestmove a7a8Q ponder h2h1R',flush=True)
''')
   p=subprocess.Popen([shutil.which('node'),str(ROOT/'scripts/uci-normalize.cjs'),'--log',str(audit),'--',sys.executable,str(fake)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
   try:
    self.assertTrue(select.select([p.stdout],[],[],10)[0],'Startup timeout')
    self.assertEqual(p.stdout.readline(),'id name Fake Engine Q\n')
    p.stdin.write('uci\n');p.stdin.flush()
    self.assertTrue(select.select([p.stdout],[],[],10)[0],'Response timeout')
    self.assertEqual(p.stdout.readline(),'bestmove a7a8q ponder h2h1r\n');p.wait(timeout=10)
    self.assertEqual(p.returncode,0,p.stderr.read())
    rows=[json.loads(x) for x in audit.read_text().splitlines()];self.assertEqual(len(rows),1);self.assertEqual(rows[0]['raw'],'bestmove a7a8Q ponder h2h1R');self.assertEqual(len(rows[0]['changes']),2)
   finally:
    if p.poll()is None:p.kill();p.wait()
    for stream in [p.stdin,p.stdout,p.stderr]:stream.close()
if __name__=='__main__':unittest.main()
