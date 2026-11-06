// Development checks only. No external engine is downloaded or run by this suite.
const {spawnSync} = require('node:child_process'), fs = require('node:fs');
const mode = process.argv[2] || 'all';
if(!['core','browser','all'].includes(mode))throw Error('Use core, browser or all');
const core = [
 ['node','scripts/build.cjs','--check'],['node','scripts/check-size.cjs'],
 ...['test.cjs','test-build.cjs','test-release-engine.cjs','test-level-progression.cjs','test-neural.cjs','test-neural-cache.cjs','test-hash-moves.cjs','test-position-tools.cjs','test-game-library.cjs','test-move-explanations.cjs','test-review-teaching.cjs','test-uci-normalize.cjs','test-time-management.cjs','test-book-import.cjs'].map(x=>['node','scripts/'+x]),
 ['node','scripts/verify-evidence.cjs','validation/modern/stockfish19-pilot'],['node','scripts/verify-evidence.cjs','validation/modern/candidate-checkpoint'],['node','scripts/verify-evidence.cjs','validation/modern/completed-200'],['node','scripts/test-strength-report.cjs'],['python3','scripts/test-prepare-benchmark.py'],['python3','scripts/test-prepare-levels.py'],['python3','scripts/test-campaign.py'],['python3','scripts/test-uci-normalize.py']];
core.push(...['before-65-v50','adjacent-screen','followup-1second'].map(x=>['node','scripts/verify-evidence.cjs','validation/levels/'+x]));
core.push(['node','scripts/verify-clock-games.cjs','validation/clock-management/before','validation/clock-management/after']);
const browser = ['browser-test.cjs','browser-wasm-test.cjs','browser-level-clocks-test.cjs','browser-tools-test.cjs','browser-accessibility-test.cjs','browser-library-analysis-test.cjs','browser-review-teaching-test.cjs','browser-polish-test.cjs','browser-pause-test.cjs','browser-engine-info-test.cjs'].map(x=>['node','scripts/'+x]);
const commands = mode==='core'?core:mode==='browser'?browser:[...core,...browser];
const checks = [], reportIndex = process.argv.indexOf('--report');
for(const argv of commands){
 const startedUtc=new Date().toISOString(),result=spawnSync(argv[0],argv.slice(1),{encoding:'utf8'});
 checks.push({argv,startedUtc,finishedUtc:new Date().toISOString(),exitCode:result.status,stdout:result.stdout,stderr:result.stderr,error:result.error?.message});
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 if(reportIndex>=0)fs.writeFileSync(process.argv[reportIndex+1],JSON.stringify({createdUtc:new Date().toISOString(),checks},null,2)+'\n');
 if(result.error||result.status!==0){if(result.error)console.error(result.error);process.exit(result.status||1);}
}
console.log('PASS: '+checks.length+' '+mode+' checks');
