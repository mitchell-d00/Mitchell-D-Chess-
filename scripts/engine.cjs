// Development helper: load the exact standalone engine without a DOM or dependencies.
const fs = require('node:fs');
const vm = require('node:vm');
module.exports = function load(file = 'index.html', globals = {}) {
  const html = fs.readFileSync(file, 'utf8');
  let source = html.match(/<script id="engine-src">([\s\S]*?)<\/script>/)[1];
  // Permit benchmarking older revisions that did not export Searcher.
  if (!source.includes('Searcher: Searcher')) source = source.replace('Chess: Chess, LEVELS:', 'Searcher: Searcher, Chess: Chess, LEVELS:');
  const context = { ...globals, module: { exports: {} } };
  vm.runInNewContext(source, context, { filename: file });
  return context.module.exports;
};
