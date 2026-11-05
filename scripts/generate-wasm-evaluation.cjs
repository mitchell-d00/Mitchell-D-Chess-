// Original MIT mechanical port of canonical classical evaluation to freestanding C++.
// Semantic changes must pass JS/WASM differential tests.
const fs=require('node:fs');
let text=fs.readFileSync('src/engine/evaluation.js','utf8');
let body=text.slice(text.indexOf('  function evaluate(pos, mode) {'));
body=body.replace('  function evaluate(pos, mode) {','static int evaluate(Position& pos, int mode) {').replaceAll('var ','int ').replaceAll("mode === 'nnue'",'mode == 3').replaceAll("mode === 'mat'",'mode == 0').replaceAll("mode === 'full'",'mode == 2').replaceAll('===','==').replaceAll('!==','!=').replaceAll('Math.max','imax').replaceAll('Math.min','imin').replaceAll('Math.abs','iabs');
body=body.replace('int b = pos.b, s, p, ty, white, idx, mg = 0, eg = 0, phase = 0, mat = [0, 0], pawnCount = [0, 0];','i8* b=pos.b; int s,p,ty,white,idx,mg=0,eg=0,phase=0,mat[2]={0,0},pawnCount[2]={0,0};');
body=body.replace('int pawnsW = EW, pawnsB = EB, bishops = [0, 0]; pawnsW.fill(0); pawnsB.fill(0);','int* pawnsW=EW.data; int* pawnsB=EB.data; int bishops[2]={0,0}; EW.fill(0);EB.fill(0);');
body=body.replace('int minRankW = EMinW.fill(8), maxRankB = EMaxB.fill(-1);','int* minRankW=EMinW.fill(8);int* maxRankB=EMaxB.fill(-1);').replace('int maxRankW = EMaxW.fill(-1), minRankB = EMinB.fill(8);','int* maxRankW=EMaxW.fill(-1);int* minRankB=EMinB.fill(8);');
body=body.replace('int pawnColours = [0, 0, 0, 0];','int pawnColours[4]={0,0,0,0};').replace('int pieces = EPieces;','Moves& pieces=EPieces;');
body=body.replace('int kpk = probeKPK(pos);','KPKResult* kpk=probeKPK(pos);').replaceAll('kpk.win','kpk->win').replaceAll('kpk.owner','kpk->owner');
body=body.replace('int kz = [kW, kB];','int kz[2]={kW,kB};').replace('int atkUnits = [0, 0], atkers = [0, 0];','int atkUnits[2]={0,0},atkers[2]={0,0};');
body=body.replace('int mob = 0, safeMob = 0, hits = 0, dirs = ty == N ? N_D : ty == B ? B_D : ty == R ? R_D : K_D, slide = ty != N;','int mob=0,safeMob=0,hits=0,slide=ty!=N;const int*dirs=ty==N?ND:ty==B?BD:ty==R?RD:KD;int dirLength=ty==N||ty==Q?8:4;').replaceAll('dirs.length','dirLength').replaceAll('K_D','KD');
body=body.replace('int pa = white ? PAW : PAB, step = white ? 16 : -16;', 'int*pa=white?PAW.data:PAB.data;int step=white?16:-16;');
fs.writeFileSync('engine/wasm/evaluation.inc','// Generated mechanical port of src/engine/evaluation.js; original MIT.\n'+body);
