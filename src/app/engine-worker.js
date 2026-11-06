// ================= Engine worker =================
let worker = null, reqId = 0, pending = {};
function recoverEngineWorker(w, reason) {
  if(worker!==w)return;
  w.terminate();worker=null;const jobs=pending;pending={};
  for(const p of Object.values(jobs)){
    clearTimeout(p.timer);
    if(p.fallback)p.res({...p.fallback,timeBudget:p.budget,recovery:reason});
    else p.rej(new Error(reason==='timeout'?'Engine response timed out':'Engine worker failed'));
  }
}
function makeWorker() {
  try {
    // A cheap provisional move stays inside the worker and needs no search
    // table or neural allocation. It is used only after a failed/stalled search.
    const src = $('#engine-src').textContent + `
const handleEngineRequest=self.onmessage;
self.onmessage=function(e){const d=e.data,x=d.extra;
 if(x&&Number.isFinite(x.clockDeadline)){
  const left=x.clockDeadline-(performance.timeOrigin+performance.now());
  x.time=Math.max(1,Math.min(Number(x.time)||1,left));
 }
 if(x&&x.fallbackFen){try{
  const p=new ENGINE.Chess(x.fallbackFen),moves=p.legalMoves();let best=null,score=-Infinity;
  for(const m of moves){p.make(m);let v=-ENGINE.evaluate(p,'pst');
   if(!p.legalMoves().length)v=p.inCheck()?ENGINE.MATE-1:0;
   p.unmake();if(v>score){best=m;score=v;}
  }
  if(best!==null)self.postMessage({id:d.id,provisional:true,result:{move:p.uci(best),score,depth:0,nodes:0,book:false,backend:'clock-fallback'}});
 }catch(error){/* The strict engine handler still validates the real input. */}}
 handleEngineRequest(e);
};`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const w = new Worker(url); URL.revokeObjectURL(url);
    w.onmessage = e => {
      if(worker!==w)return;
      const p=pending[e.data.id];if(!p)return;
      if(e.data.provisional){p.fallback=e.data.result;return;}
      delete pending[e.data.id];clearTimeout(p.timer);
      e.data.ok?p.res(e.data.result):p.rej(new Error(e.data.error));
    };
    w.onerror=e=>{e.preventDefault();recoverEngineWorker(w,'worker-error');};
    return w;
  } catch (e) { return null; }
}
worker = makeWorker();
function think(fen, moves, level, extra) {
  const id = ++reqId;
  if(worker)return new Promise((res,rej)=>{
    const w=worker,p={res,rej,budget:E.levelThinkTime(level,extra)};pending[id]=p;
    const limit=extra&&Number.isFinite(extra.maxWallMs)?extra.maxWallMs:p.budget+5000;
    p.timer=setTimeout(()=>{if(pending[id]===p)recoverEngineWorker(w,'timeout');},Math.max(1,limit));
    try{w.postMessage({id,fen,moves,level,extra});}catch(error){recoverEngineWorker(w,'worker-error');}
  });
  worker = makeWorker();
  if (worker) return think(fen, moves, level, extra);
  return Promise.reject(new Error('This browser could not start the chess worker'));
}
function cancelThinking() {
  if (worker && Object.keys(pending).length) {
    worker.terminate();const jobs=pending;pending={};worker=makeWorker();
    Object.values(jobs).forEach(p=>{clearTimeout(p.timer);p.rej(new Error('Search cancelled'));});
  }
}
