#!/usr/bin/env node
// Original MIT UCI bridge for independent match managers. No third-party engines.
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const readline=require('node:readline');
if(!isMainThread){
 const E=require('./engine.cjs')(workerData.html);
 // Initialize the neural payload and TT before reporting ready to the manager.
 new E.Searcher(new E.Chess(),{eval:'nnue',adv:true});
 parentPort.postMessage({ready:true});
 parentPort.on('message',d=>{
  if(d.reset){const p=new E.Chess();new E.Searcher(p,{eval:'mat'});return;}
  try{const r=E.think(d.fen,d.moves,d.level-1,{time:d.time,noBook:true});parentPort.postMessage({id:d.id,result:r});}
  catch(e){parentPort.postMessage({id:d.id,error:String(e.stack||e)});}
 });
}else{
 const path=require('node:path'),fs=require('node:fs');
 const html=process.env.MITCHELL_HTML||path.resolve(__dirname,'../index.html');
 let worker,ready=false,pendingReady=0,active=null,id=0,fen=null,moves=[],level=65,overhead=20;
 const out=line=>process.stdout.write(line+'\n');
 function start(){
  ready=false;worker=new Worker(__filename,{workerData:{html}});
  worker.on('message',d=>{
   if(d.ready){ready=true;while(pendingReady>0){out('readyok');pendingReady--;}return;}
   if(!active||d.id!==active.id)return;
   if(d.error){process.stderr.write(d.error+'\n');process.exit(1);}
   const r=d.result,ms=Math.max(1,Date.now()-active.started);
   if(r?.move){const score=Math.abs(r.score)>99000?'mate '+Math.sign(r.score)*Math.ceil((100000-Math.abs(r.score))/2):'cp '+r.score;out('info depth '+(r.depth||0)+' score '+score+' nodes '+(r.nodes||0)+' time '+ms+' pv '+r.move);out('bestmove '+r.move);}
   else out('bestmove 0000');active=null;
  });
  worker.on('error',e=>{process.stderr.write(e.stack+'\n');process.exit(1);});
 }
 start();
 readline.createInterface({input:process.stdin}).on('line',line=>{
  const parts=line.trim().split(/\s+/),command=parts[0];
  if(command==='uci'){
   out('id name Mitchell D Chess Level 65');out('id author Mitchell D. McPhetridge; NNUE weights Thomas Jahn');
   out('option name Level type spin default 65 min 1 max 65');out('option name MoveOverhead type spin default 20 min 0 max 1000');out('option name Threads type spin default 1 min 1 max 1');out('uciok');
  }else if(command==='isready'){if(ready)out('readyok');else pendingReady++;}
  else if(command==='setoption'){
   const v=parts.indexOf('value'),name=parts.slice(2,v).join(' ').toLowerCase(),value=+parts[v+1];
   if(name==='level'&&Number.isInteger(value)&&value>=1&&value<=65)level=value;
   if(name==='moveoverhead'&&Number.isFinite(value))overhead=Math.max(0,Math.min(1000,value));
  }else if(command==='ucinewgame'){worker.postMessage({reset:true});fen=null;moves=[];}
  else if(command==='position'){
   const i=parts.indexOf('moves');fen=parts[1]==='startpos'?null:parts.slice(2,i<0?undefined:i).join(' ');moves=i<0?[]:parts.slice(i+1);
  }else if(command==='go'){
   if(active){process.stderr.write('Overlapping go commands\n');process.exit(1);}
   const args={};for(let i=1;i<parts.length-1;i+=2)args[parts[i]]=+parts[i+1];
   let budget;
   if(Number.isFinite(args.movetime))budget=Math.max(1,args.movetime-overhead);
   else{
    const black=((fen&&/ b /.test(fen))?1:0)^(moves.length&1),remaining=args[black?'btime':'wtime'],increment=args[black?'binc':'winc']||0;
    if(!Number.isFinite(remaining)){process.stderr.write('A finite time control is required\n');process.exit(1);}
    budget=Math.max(1,Math.min(remaining*.35,remaining-overhead,remaining/(args.movestogo||30)+increment*.8));
   }
   budget=Math.min(60000,budget);active={id:++id,started:Date.now()};worker.postMessage({id,fen,moves,level,time:budget});
  }else if(command==='stop'){
   // This adapter runs finite searches. Return the legal completed search when it finishes.
   // Match managers here use finite per-move limits, not pondering/infinite search.
  }else if(command==='quit'){worker.terminate();process.exit(0);}
 });
 process.stdin.on('end',()=>{worker.terminate();process.exit(0);});
}
