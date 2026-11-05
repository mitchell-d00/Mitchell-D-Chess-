// ================= Engine worker =================
let worker = null, reqId = 0, pending = {};
function makeWorker() {
  try {
    const src = $('#engine-src').textContent;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const w = new Worker(url); URL.revokeObjectURL(url);
    w.onmessage = e => { const p = pending[e.data.id]; if (!p) return; delete pending[e.data.id]; e.data.ok ? p.res(e.data.result) : p.rej(new Error(e.data.error)); };
    w.onerror = () => {
      if (worker !== w) return;
      w.terminate(); worker = null;
      const jobs = pending; pending = {};
      Object.values(jobs).forEach(p => p.rej(new Error('Engine worker failed')));
    };
    return w;
  } catch (e) { return null; }
}
worker = makeWorker();
function think(fen, moves, level, extra) {
  const id = ++reqId;
  if (worker) return new Promise((res, rej) => { pending[id] = { res, rej }; worker.postMessage({ id, fen, moves, level, extra }); });
  worker = makeWorker();
  if (worker) return think(fen, moves, level, extra);
  return Promise.reject(new Error('This browser could not start the chess worker'));
}
function cancelThinking() {
  if (worker && Object.keys(pending).length) {
    worker.terminate(); const jobs = pending; pending = {}; worker = makeWorker();
    Object.values(jobs).forEach(p => p.rej(new Error('Search cancelled')));
  }
}

