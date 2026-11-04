#!/usr/bin/env python3
"""Original MIT: verify archived inputs and reproduce original neural training."""
import gzip,hashlib,json,os,struct,subprocess,sys,tempfile
from pathlib import Path
root=Path('validation/mnn');report=json.loads((root/'training.json').read_text())
data=gzip.decompress((root/'selfplay.jsonl.gz').read_bytes())
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(data)==report['dataSha256']
assert sha((root/'selfplay.manifest.json').read_bytes())==report['sourceManifestSha256']
assert sha(gzip.decompress((root/'teacher.html.gz').read_bytes()))==report['teacherHtmlSha256']
assert sha((root/'trainer-used.py').read_bytes())==report['trainerSha256']
assert sha(Path('engine/mitchell.mnn').read_bytes())==report['modelSha256']
assert struct.unpack('<4s6H',Path('engine/mitchell.mnn').read_bytes()[:16])==(b'MNN1',32,768,256,256,150,0)
with tempfile.TemporaryDirectory()as td:
    td=Path(td);source=td/'selfplay.jsonl';source.write_bytes(data)
    env={**os.environ,'OPENBLAS_NUM_THREADS':'2','OMP_NUM_THREADS':'2'}
    process=subprocess.run([sys.executable,str(root/'trainer-used.py'),str(source),'--out',str(td/'fit'),'--manifest',str(root/'selfplay.manifest.json')],capture_output=True,text=True,timeout=60,env=env)
    assert process.returncode==0,process.stdout+process.stderr
    actual=json.loads((td/'fit/training.json').read_text())
    assert actual['modelSha256']==report['modelSha256'],'Training differs; use recorded Python/NumPy/BLAS environment and inspect before promotion'
    for field in ['positionCounts','metrics','bestEpoch','fitGatePassed']:assert actual[field]==report[field],field
    assert (td/'fit/mitchell.mnn').read_bytes()==Path('engine/mitchell.mnn').read_bytes()
print('PASS: original model/data/trainer provenance and exact training repetition with separate opening splits')
