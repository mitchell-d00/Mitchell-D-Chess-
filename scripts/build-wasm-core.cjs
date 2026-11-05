// Development-only freestanding compiler. Output contains original engine code;
// no libc, C++ library, opponent engine, model or external runtime is linked.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),position=fs.readFileSync(path.join(root,'src/engine/position.js'),'utf8');
const array=name=>JSON.parse(position.match(new RegExp('var '+name+' = (\\[[^;]+\\]);'))[1]);
const pst=[Array(64).fill(0)];for(let type=1;type<=5;type++){const symbol=['','P','N','B','R','Q'][type];pst.push(JSON.parse(position.match(new RegExp('PST\\['+symbol+'\\] = (\\[[^;]+\\]);'))[1]));}pst.push(Array(64).fill(0));
const literal=x=>JSON.stringify(x).replaceAll('[','{').replaceAll(']','}');
let header='// Generated from canonical Mitchell constants; MIT. Do not edit.\n';
header+='static constexpr int PST[7][64]='+literal(pst)+';\n';
for(const name of ['VAL','KMG','KEG','PASSED','PHASE_W'])header+='static constexpr int '+name+'['+array(name).length+']='+literal(array(name))+';\n';
header+='static constexpr int SEEVAL[7]={0,100,320,330,500,900,10000};\n';
header+='static constexpr int SAFETY[100]='+literal(Array.from({length:100},(_,i)=>Math.min(450,Math.round(i*i*.16))))+';\n';
header+='static constexpr signed char LMR[64][64]='+literal(Array.from({length:64},(_,d)=>Array.from({length:64},(_,m)=>d&&m?Math.floor(.7+Math.log(d)*Math.log(m)/2.3):0)))+';\n';
fs.writeFileSync(path.join(root,'engine/wasm/tables.inc'),header);
const compiler=process.env.WASM_CXX||'clang++-19',linker=process.env.WASM_LD||'wasm-ld-19';
const generation=spawnSync(process.execPath,[path.join(root,'scripts/generate-wasm-evaluation.cjs')],{cwd:root,encoding:'utf8'});if(generation.status!==0)throw Error(generation.stderr);
const output=path.join(root,'engine/wasm/mitchell.wasm');
const args=['--target=wasm32','-O3','-std=c++17','-msimd128','-ffreestanding','-fno-builtin','-fno-exceptions','-fno-rtti','-fwrapv','-nostdlib','-fuse-ld='+linker,'-Wl,--no-entry','-Wl,--export-memory','-Wl,--export-if-defined=__wasm_call_ctors','-Wl,--initial-memory=33554432','-Wl,--max-memory=67108864','-Wl,-z,stack-size=4194304','-Wl,--strip-all',path.join(root,'engine/wasm/mitchell.cpp'),'-o',output];
const result=spawnSync(compiler,args,{encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr||String(result.error));process.exit(1);}
console.log('Built original WASM core:',fs.statSync(output).size,'bytes; default memory 32 MiB, optional cap 64 MiB');
