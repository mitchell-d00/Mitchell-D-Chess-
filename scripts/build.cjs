// Original MIT: deterministic, dependency-free assembly of the one-file release.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
function build() {
  const config = JSON.parse(read('src/build.json'));
  const net = fs.readFileSync(path.join(ROOT, config.model.path));
  if (crypto.createHash('sha256').update(net).digest('hex') !== config.model.sha256) throw Error('Network provenance hash mismatch');
  const neural = read('engine/nnue.js').replace('hidden: 128', 'hidden: '+config.model.hidden)
    .replace('__MODEL__', net.toString('base64'))
    .replace('__KERNEL__', fs.readFileSync(path.join(ROOT, 'engine/nnue-kernel.wasm')).toString('base64'));
  const engine = config.engine.map(file => typeof file === 'string' ? read(file) :
    '  // BEGIN EMBEDDED NEURAL EVALUATOR\n'+neural+'  // END EMBEDDED NEURAL EVALUATOR\n'+file.suffix).join('');
  const bodies = {ENGINE:engine, APP:config.app.map(read).join('')};
  for (const [key, file] of Object.entries(config.scripts)) bodies[key] = read(file);
  let html = read('src/index.template.html').replace('@@STYLES@@', () => read('src/styles.css'));
  for (const [key, body] of Object.entries(bodies)) {
    if (/<\/script\s*>/i.test(body)) throw Error('Unsafe script terminator in '+key);
    const wrapper = config.wrappers[key];
    html = html.replace('@@'+key+'@@', () => wrapper.open+wrapper.leading+body+'</script>');
  }
  if (/@@[A-Z_]+@@/.test(html)) throw Error('Unresolved build placeholder');
  return html;
}
if (require.main === module) {
  const html = build(), target = process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output')+1] : path.join(ROOT, 'index.html');
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== html) throw Error('index.html is stale; run node scripts/build.cjs');
    console.log('PASS: standalone HTML exactly matches modular sources');
  } else { fs.writeFileSync(target, html); console.log('Built '+Buffer.byteLength(html)+' bytes: '+target); }
}
module.exports = build;
