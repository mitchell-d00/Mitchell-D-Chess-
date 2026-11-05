// Original MIT: deterministic, dependency-free assembly of the one-file release.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
function build(options = {}) {
  const config = JSON.parse(read('src/build.json'));
  const net = fs.readFileSync(path.join(ROOT, config.model.path));
  if (crypto.createHash('sha256').update(net).digest('hex') !== config.model.sha256) throw Error('Network provenance hash mismatch');
  const neural = read('engine/nnue.js').replace('hidden: 128', 'hidden: '+config.model.hidden)
    .replace('__MODEL__', net.toString('base64'))
    .replace('__KERNEL__', fs.readFileSync(path.join(ROOT, 'engine/nnue-kernel.wasm')).toString('base64'));
  let engine = config.engine.map(file => {
    if(typeof file==='string')return read(file);
    if(file.neural)return '  // BEGIN EMBEDDED NEURAL EVALUATOR\n'+neural+'  // END EMBEDDED NEURAL EVALUATOR\n'+file.suffix;
    if(file.wasmCore)return options.wasm ? read('engine/wasm/bridge.js').replace('__WASM_CORE__',fs.readFileSync(path.join(ROOT,'engine/wasm/mitchell.wasm')).toString('base64')) : '';
    throw Error('Unknown engine build fragment');
  }).join('');
  if(options.wasm)engine=engine.replace('think: think,', 'WASM_CORE: {config:WASM_CORE_CONFIG, prepare:prepareWasmCore, get error(){return WASM_CORE_ERROR;}}, think: thinkWithWasm,');
  const bodies = {ENGINE:engine, APP:config.app.map(read).join('')};
  for (const [key, file] of Object.entries(config.scripts)) bodies[key] = read(file);
  let html = read('src/index.template.html').replace('@@STYLES@@', () => read('src/styles.css'));
  for (const [key, body] of Object.entries(bodies)) {
    if (/<\/script\s*>/i.test(body)) throw Error('Unsafe script terminator in '+key);
    const wrapper = config.wrappers[key];
    html = html.replace('@@'+key+'@@', () => wrapper.open+wrapper.leading+body+'</script>');
  }
  if (/@@[A-Z_]+@@/.test(html)) throw Error('Unresolved build placeholder');
  if(options.wasm)html=html.replace('<title>Mitchell D Chess</title>','<title>Mitchell D Chess · WASM candidate</title>').replace('65 levels · 38 lessons · Free &amp; offline','WASM candidate · Unrated · Free &amp; offline');
  return html;
}
if (require.main === module) {
  const candidate=process.argv.includes('--candidate-wasm');
  if(candidate&&!process.argv.includes('--output'))throw Error('Candidate builds require --output; public index.html is not overwritten');
  const html = build({wasm:candidate}), target = process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output')+1] : path.join(ROOT, 'index.html');
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== html) throw Error('index.html is stale; run node scripts/build.cjs');
    console.log('PASS: standalone HTML exactly matches modular sources');
  } else { fs.writeFileSync(target, html); console.log('Built '+Buffer.byteLength(html)+' bytes: '+target); }
}
module.exports = build;
