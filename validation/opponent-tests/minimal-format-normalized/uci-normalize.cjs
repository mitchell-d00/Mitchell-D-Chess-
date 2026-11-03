#!/usr/bin/env node
// Original MIT, test-only UCI stream adapter. Changes promotion-case spelling only.
// node scripts/uci-normalize.cjs --log adjustments.jsonl -- /path/to/engine [args]
function normalize(line){
 const tokens=line.trim().split(/\s+/),changes=[];
 const move=i=>{if(i<0||i>=tokens.length)return;const before=tokens[i];if(/^[a-h][1-8][a-h][1-8][QRBN]$/.test(before)){tokens[i]=before.slice(0,4)+before[4].toLowerCase();changes.push({index:i,before,after:tokens[i]});}};
 if(tokens[0]==='bestmove'){move(1);const p=tokens.indexOf('ponder');if(p>=0)move(p+1);}
 else if(tokens[0]==='info'){
  const pv=tokens.indexOf('pv'),string=tokens.indexOf('string'),curr=tokens.indexOf('currmove');
  if(curr>=0&&(string<0||string>curr))move(curr+1);
  if(pv>=0&&(string<0||string>pv))for(let i=pv+1;i<tokens.length;i++)move(i);
 }
 return {line:changes.length?tokens.join(' '):line,changes};
}
module.exports={normalize};
if(require.main===module){
 const fs=require('node:fs'),{spawn}=require('node:child_process'),readline=require('node:readline');
 const args=process.argv.slice(2),separator=args.indexOf('--'),logIndex=args.indexOf('--log');
 if(separator<0||!args[separator+1]){process.stderr.write('Usage: uci-normalize.cjs [--log path] -- engine [args]\n');process.exit(2);}
 const log=logIndex>=0?fs.createWriteStream(args[logIndex+1],{flags:'a'}):null;
 const child=spawn(args[separator+1],args.slice(separator+2),{stdio:['pipe','pipe','inherit']});
 child.on('error',e=>{process.stderr.write(String(e)+'\n');process.exitCode=1;});
 child.stdin.on('error',()=>{});process.stdin.pipe(child.stdin);
 readline.createInterface({input:child.stdout,crlfDelay:Infinity}).on('line',raw=>{
  const result=normalize(raw);
  if(result.changes.length){const record=JSON.stringify({utc:new Date().toISOString(),raw,normalized:result.line,changes:result.changes})+'\n';log?log.write(record):process.stderr.write(record);}
  process.stdout.write(result.line+'\n');
 });
 child.on('exit',(code,signal)=>{if(log)log.end();process.exitCode=signal?1:(code||0);process.stdin.unpipe(child.stdin);process.stdin.destroy();});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(!child.killed)child.kill(signal);});
}
