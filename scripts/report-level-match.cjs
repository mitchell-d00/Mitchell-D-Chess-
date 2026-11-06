// Original MIT. Render only independently verified, complete browser matches.
const fs=require('node:fs'),path=require('node:path'),verify=require('./verify-level-match.cjs');
function report(directory){
 const root=path.resolve(directory),verified=verify(root),protocol=JSON.parse(fs.readFileSync(path.join(root,'protocol.json'))),summary=JSON.parse(fs.readFileSync(path.join(root,'summary.json')));
 const timing={65:{playedMoves:0,clockSpentMs:0,searchBudgets:[],depths:[],bookMoves:0,minClockMs:Infinity},51:{playedMoves:0,clockSpentMs:0,searchBudgets:[],depths:[],bookMoves:0,minClockMs:Infinity}},endings={};
 for(const game of summary.games){
  const trace=fs.readFileSync(path.join(root,String(game.game).padStart(2,'0')+'.jsonl'),'utf8').trim().split('\n').map(x=>JSON.parse(x));
  for(const row of trace){const t=timing[row.level];t.playedMoves++;if(row.book)t.bookMoves++;if(row.timeBudgetMs!==null)t.searchBudgets.push(row.timeBudgetMs);if(row.depth)t.depths.push(row.depth);t.minClockMs=Math.min(t.minClockMs,row.level===game.whiteLevel?row.whiteMs:row.blackMs);}
  for(const [side,level]of [['white',game.whiteLevel],['black',game.blackLevel]]){const n=trace.filter(t=>t.level===level).length,t=timing[level];t.clockSpentMs+=protocol.seconds*1000+n*protocol.increment*1000-game[side+'Ms'];t.minClockMs=Math.min(t.minClockMs,game[side+'Ms']);}
  endings[game.over.reason]=(endings[game.over.reason]||0)+1;
 }
 const mean=xs=>xs.reduce((n,x)=>n+x,0)/Math.max(1,xs.length),median=xs=>{const a=xs.toSorted((x,y)=>x-y),m=a.length>>1;return a.length?(a.length%2?a[m]:(a[m-1]+a[m])/2):null;};
 const levels=Object.fromEntries(Object.entries(timing).map(([level,t])=>[level,{playedMoves:t.playedMoves,bookMoves:t.bookMoves,clockSpentSeconds:t.clockSpentMs/1000,clockSecondsPerPlayedMove:t.clockSpentMs/1000/t.playedMoves,meanSearchBudgetMs:mean(t.searchBudgets),medianCompletedDepth:median(t.depths),minClockSeconds:t.minClockMs/1000}]));
 const gameResult=g=>g.over.result==='1/2-1/2'?'D':((g.over.result==='1-0')===(g.whiteLevel===65)?'W':'L');
 const pairs=[];for(let i=0;i<summary.games.length;i+=2){const a=summary.games[i],b=summary.games[i+1];pairs.push({opening:a.opening,white65:gameResult(a),black65:gameResult(b),games:[a.game,b.game]});}
 const data={...verified,points65:verified.wins65+verified.draws/2,levels,endings,pairs,startedUtc:protocol.startedUtc,finishedUtc:summary.finishedUtc,protocolRevision:protocol.revision};
 const count=(n,word)=>n+' '+word+(n===1?'':word==='loss'?'es':'s');
 const r=n=>Number(n).toFixed(2),wdl=c=>`${c.wins} / ${c.draws} / ${c.losses}`;
 const markdown=`# Level 65 versus level 51 — completed ${verified.games}-game browser match\n\n`+
  `At **${protocol.control}**, level 65 scored **${count(verified.wins65,'win')}, ${count(verified.draws,'draw')}, ${count(verified.losses65,'loss')}**: **${data.points65}/${verified.games} (${r(verified.score65*100)}%)**.\n\n`+
  `All ${verified.games} games completed. Level-65 flag falls: **${verified.flags65}**; level-51 flag falls: **${verified.flags51}**. Recorded engine recoveries: **${verified.recoveries}**; observed inactivity: **${r(verified.inactiveMs)} ms**.\n\n`+
  `| Level 65 colour | Wins / draws / losses |\n| --- | --- |\n| White | ${wdl(verified.byColour.white)} |\n| Black | ${wdl(verified.byColour.black)} |\n\n`+
  `| Opening | 65 as White | 65 as Black | Games |\n| --- | --- | --- | --- |\n`+pairs.map(p=>`| ${p.opening} | ${p.white65} | ${p.black65} | ${p.games.map(n=>{const s=String(n).padStart(2,'0');return '['+s+']('+s+'.pgn)';}).join(', ')} |`).join('\n')+'\n\n'+
  `Both presets use the same NNUE/WASM engine, with personas disabled. They differ in thinking allowance. The openings were colour-reversed in ${verified.games/2} pairs. Each prescribed eight-ply prefix was replayed without clock charge or increment; the ${protocol.seconds}-second clocks started afterwards. Book play then continued normally. Casual rules, actual app clocks and Fast viewing speed were used. Concurrency was ${protocol.concurrency} offline browser games on one host.\n\n`+
  `| Timing diagnostic | Level 65 | Level 51 |\n| --- | ---: | ---: |\n| Clock seconds spent per played move | ${r(levels[65].clockSecondsPerPlayedMove)} | ${r(levels[51].clockSecondsPerPlayedMove)} |\n| Mean returned search budget, ms | ${r(levels[65].meanSearchBudgetMs)} | ${r(levels[51].meanSearchBudgetMs)} |\n| Median reported completed depth | ${levels[65].medianCompletedDepth} | ${levels[51].medianCompletedDepth} |\n| Lowest recorded clock, seconds | ${r(levels[65].minClockSeconds)} | ${r(levels[51].minClockSeconds)} |\n\n`+
  `Clock cost includes UI/worker/hold time and any final unplayed flagged turn; it is not CPU search time. Search-budget means omit replies without a returned budget (including book/forced moves). Depth is a search diagnostic, not a strength rating.\n\n`+
  `Endings: ${Object.entries(endings).map(([name,n])=>name+' ('+n+')').join('; ')}. All ${verified.plies} half-moves replay legally; ${verified.traceMoves} clocked moves have traces. Actual reply backends: ${Object.entries(verified.backends).map(([name,n])=>name+' '+n).join(', ')}.\n\n`+
  `This is a small within-engine comparison at one time control, not an absolute Elo estimate or proof that every level is stronger. Book randomness and timed cutoffs are not seeded, so reruns can differ. No score/material/move-limit adjudication or engine changes were used.\n\n`+
  `Frozen HTML SHA-256: \`${verified.htmlSha256}\`. Runner revision: \`${protocol.revision}\`. Started ${protocol.startedUtc}; finished ${summary.finishedUtc}. Exact host, browser, inputs and file hashes are in [protocol.json](protocol.json) and [summary.json](summary.json).\n\n`+
  `See [the protocol](../BROWSER-MATCH-PROTOCOL.md). To verify or repeat from the repository:\n\n`+
  '```sh\nnode scripts/verify-level-match.cjs '+path.relative(process.cwd(),root)+'\nnode scripts/report-level-match.cjs '+path.relative(process.cwd(),root)+'\nnode '+path.relative(process.cwd(),path.join(root,'runner.cjs'))+' --html '+path.relative(process.cwd(),path.join(root,'engine-under-test.html'))+' \\\n  --out /path/to/new-empty-directory --games 20 --seconds 60 --increment 1 --concurrency 2\n```\n';
 return {data,markdown};
}
if(require.main===module){if(process.argv.length!==3)throw Error('Supply one completed match directory');const r=report(process.argv[2]);process.stdout.write(r.markdown);}
module.exports=report;
