// ================= Clocks =================
function makeClock() {
  const tc = setup.tc;
  if (!tc || tc === 'none') return null;
  let c;
  if (tc[0] === 'm') { const per = +tc.slice(1) * 1000; c = { w: per, b: per, inc: 0, delay: 0, per, pgn: `1/${per / 1000}` }; }
  else if (tc === 'custom') {
    const inc = setup.btype === 'inc' ? setup.bonus * 1000 : 0, delay = setup.btype === 'delay' ? setup.bonus * 1000 : 0;
    c = { w: setup.cw * 60000, b: setup.cb * 60000, inc, delay, per: 0, pgn: setup.cw === setup.cb ? `${setup.cw * 60}${inc ? '+' + inc / 1000 : ''}` : '?' };
  } else { const [m, i] = tc.split('+').map(Number); c = { w: m * 60000, b: m * 60000, inc: i * 1000, delay: 0, per: 0, pgn: `${m * 60}+${i}` }; }
  c.start = { w: c.w, b: c.b }; c.running = null; c.last = 0; c.delayLeft = 0;
  return c;
}
function startClock(side) {
  const c = G.clock; if (!c) return;
  if (c.per) c[side] = c.per;
  c.running = side; c.last = performance.now(); c.delayLeft = c.delay;
  renderClocks();
}
function tickClock() {
  if (!G || !G.clock || !G.clock.running || G.over) return;
  const c = G.clock, now = performance.now();
  if (G.paused || G.tabPaused) { c.last = now; return; }
  let dt = now - c.last; c.last = now;
  if (c.delayLeft > 0) { const use = Math.min(dt, c.delayLeft); c.delayLeft -= use; dt -= use; }
  const side = c.running;
  c[side] -= dt;
  if (c[side] <= 0) { c[side] = 0; renderClocks(); flagFall(side); return; }
  renderClocks();
}
function flagFall(side) {
  const opp = side === 'w' ? 'b' : 'w', name = side === 'w' ? 'White' : 'Black';
  captureThinkDiagnostic('flag fall');
  G.flaggedSide=side;
  cancelThinking(); G.thinking = false; G.token = Math.random();
  if (!G.chess.canMate(opp)) endGame({ result: '1/2-1/2', reason: `${name} ran out of time, but ${opp === 'w' ? 'White' : 'Black'} cannot checkmate` });
  else endGame({ result: opp === 'w' ? '1-0' : '0-1', reason: `${name} lost on time` });
  afterChange();
}
function fmtClock(ms) {
  ms = Math.max(0, ms);
  if (ms < 20000) return (Math.floor(ms / 100) / 10).toFixed(1);
  const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s2 = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}` : `${m}:${String(s2).padStart(2, '0')}`;
}
function renderClocks() {
  if (!G || !G.clock) return;
  const c = G.clock;
  $$('.clock[data-clock]').forEach(el => {
    const side = el.dataset.clock, ms = c[side], run = c.running === side && !G.over;
    el.textContent = fmtClock(ms);
    el.classList.toggle('run', run && !G.paused && !G.tabPaused);
    el.classList.toggle('low', ms < Math.min(20000, c.start[side] * 0.15 + 5000) && ms > 0);
    el.classList.toggle('out', ms <= 0);
  });
}
setInterval(tickClock, 100);

