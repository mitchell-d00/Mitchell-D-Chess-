// ================= Play mode =================
const L18 = E.LEVELS; // all 65 levels
let G = null;
let setup = Object.assign({ mode: 'pvc', color: 'w', level: 8, lvlW: 25, lvlB: 18, tc: 'none', rules: 'casual', cw: 10, cb: 10, bonus: 5, btype: 'inc' }, store.get('setup', {}));
['level', 'lvlW', 'lvlB'].forEach(k => { setup[k] = Math.min(L18.length, Math.max(1, +setup[k] || 1)); });
const saveSetup = () => store.set('setup', setup);
function playerLabel(side) {
  if (G.review && G.tags && G.tags[side === 'w' ? 'White' : 'Black']) return {name:G.tags[side === 'w' ? 'White' : 'Black'],lvl:''};
  const p = G.players[side];
  if (p.type === 'human') return { name: G.mode === 'pvp' ? (side === 'w' ? 'White' : 'Black') : 'You', lvl: '' };
  const L = L18[p.level - 1];
  return { name: L.name, lvl: `Level ${p.level} · ${L.tier}` };
}
function newGame(options = {}) {
  cancelAnalysis();
  const record = options.record, startFen = record ? record.startFen : (options.startFen || START);
  const chess = new E.Chess(startFen);
  if (record) for (const u of record.moves) { const m = chess.findUci(u); if (!m) throw new Error('Invalid imported move.'); chess.make(m); }
  cancelThinking(); $('#hintBtn').textContent = 'Hint';
  const mode = record ? 'pvp' : setup.mode;
  let players;
  if (mode === 'pvc') {
    let c = setup.color === 'r' ? (Math.random() < .5 ? 'w' : 'b') : setup.color;
    players = c === 'w' ? { w: { type: 'human' }, b: { type: 'ai', level: setup.level } } : { w: { type: 'ai', level: setup.level }, b: { type: 'human' } };
    BV.flipped = c === 'b';
  } else if (mode === 'pvp') { players = { w: { type: 'human' }, b: { type: 'human' } }; BV.flipped = false; }
  else { players = { w: { type: 'ai', level: setup.lvlW }, b: { type: 'ai', level: setup.lvlB } }; BV.flipped = false; }
  G = { mode, players, chess, startFen, review: !!record, tags: record ? record.tags : {}, moves: record ? record.moves.slice() : [], sans: record ? record.sans.slice() : [], fens: record ? record.fens.slice() : [startFen], lastFromTo: record ? record.lastFromTo.slice() : [null], view: null, over: null, thinking: false, paused: false, evalW: null, depth: 0, token: Math.random(),
    official: !record && setup.rules === 'official', clock: record ? null : makeClock(), clockHist: [], touched: null, drawOffer: null, tabPaused: false };
  if (record && record.result !== '*') G.over = { result: record.result, reason: 'imported result' };
  else G.over = G.chess.status(record ? true : G.official);
  if (G.clock && !G.over) startClock(sideToMove());
  BV.sel = null; BV.targets = []; BV.arrows = []; BV.marks = [];
  $('#boardmsg').hidden = true;
  syncPlay(); afterChange();
}
function curFen() { return G.view == null ? G.chess.fen() : G.fens[G.view]; }
function sideToMove() { return G.chess.side ? 'b' : 'w'; }
function humanToMove() { return !G.review && !G.paused && !G.over && G.view == null && G.players[sideToMove()].type === 'human' && !G.thinking; }
function playMove(uci, fromAI) {
  if (G.over) return false;
  const m = G.chess.findUci(uci); if (!m) return false;
  const san = G.chess.san(m), cap = !!(E.mFlags(m) & 1);
  const from = E.sqName(E.mFrom(m)), to = E.sqName(E.mTo(m));
  const mover = sideToMove();
  if (G.clock) { tickClock(); if (G.over) return false; G.clockHist.push({ w: G.clock.w, b: G.clock.b }); }
  G.touched = null;
  if (G.drawOffer && G.drawOffer.by !== mover) { if (G.mode === 'pvp') toast('Draw offer declined by playing on.'); G.drawOffer = null; }
  G.chess.make(m);
  if (G.clock) { const c = G.clock; if (c.per) c[mover] = c.per; else c[mover] += c.inc; startClock(mover === 'w' ? 'b' : 'w'); }
  G.moves.push(uci); G.sans.push(san); G.fens.push(G.chess.fen()); G.lastFromTo.push([from, to]);
  BV.animFrom = [from, to]; BV.arrows = [];
  if (G.chess.inCheck()) Snd.check(); else if (cap) Snd.capture(); else Snd.move();
  const st = G.chess.status(G.official);
  if (st) endGame(st);
  afterChange();
  return true;
}
function endGame(st) {
  G.over = st; Snd.end();
  if (G.clock) G.clock.running = null;
  G.drawOffer = null; G.touched = null;
  cancelThinking(); G.thinking = false;
  const res = st.result, why = st.reason;
  let title = res === '1/2-1/2' ? 'Draw' : (res === '1-0' ? 'White wins' : 'Black wins');
  if (G.mode === 'pvc' && res !== '1/2-1/2') { const humanSide = G.players.w.type === 'human' ? 'w' : 'b'; title = (res === '1-0') === (humanSide === 'w') ? 'You win!' : 'You lost'; }
  const box = $('#boardmsg');
  box.innerHTML = `<div><p class="eyebrow">${esc(why)}</p><h2>${esc(title)}</h2><p class="muted">${res.replace('1/2-1/2', '½–½')}</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn" id="msgClose">Look at the board</button><button class="btn primary" id="msgNew">New game</button></div></div>`;
  box.hidden = false;
  $('#msgClose').onclick = () => box.hidden = true;
  $('#msgNew').onclick = () => requestNewGame(()=>newGame());
}
function afterChange() {
  // board view
  const fen = curFen();
  BV.fen = fen;
  const idx = G.view == null ? G.fens.length - 1 : G.view;
  BV.last = G.lastFromTo[idx];
  const tmp = new E.Chess(fen); BV.check = kingInCheckSq(tmp);
  BV.legal = () => humanToMove() ? legalFor(G.chess) : [];
  BV.interactive = () => tab === 'play' && humanToMove();
  BV.onMove = uci => { playMove(uci); };
  BV.lock = () => (tab === 'play' && G && G.official && humanToMove()) ? G.touched : null;
  BV.onTouch = sq => { if (tab === 'play' && G && G.official && humanToMove() && !G.touched) { G.touched = sq; renderStatus(); } };
  $('#recordBox').hidden = !G.review && !(G.restored&&!G.over);
  $('#continueBtn').hidden = !G.review; $('#resumeSavedBtn').hidden = !G.restored || G.review || !!G.over;
  if (G.restored&&!G.review) $('#recordTitle').textContent = 'Saved game · paused';
  if (G.review) $('#recordTitle').textContent = (G.moves.length ? 'Imported game' : 'Imported position') + ' · review';
  renderBoard(); renderBars(); renderStatus(); renderMoves(); renderButtons(); renderAnalysis(); renderMoveCue();
  maybeAI();
}
function maybeAI() {
  if (!G || G.review || G.over || G.view != null || G.paused || G.thinking) return;
  const side = sideToMove(), p = G.players[side];
  if (p.type !== 'ai') return;
  // Rendering and move processing have already used some of this turn.
  // Charge that time before allocating another search, rather than waiting
  // for the next 100 ms clock tick.
  if (G.clock) { tickClock(); if (G.over) return; }
  if (G.official) {
    const claim = G.chess.claimable();
    if (claim && aiScore(side) <= 15) { endGame({ result: '1/2-1/2', reason: `${claim}, claimed by ${playerLabel(side).name}` }); afterChange(); return; }
  }
  G.thinking = true;G.thinkBudget=null; renderBars(); renderStatus(); renderButtons();
  const tok = G.token, fenBefore = G.chess.fen(), ply = G.moves.length;
  const t0 = Date.now();
  let minDelay = G.mode === 'cvc' ? { slow: 1400, normal: 600, fast: 120 }[setup.speed || 'normal'] : 350;
  let extra;
  if (G.clock) {
    const c = G.clock, rem = c[side];
    const allocation = allocateThinkTime(c, side, 120000, ply);
    const budget = allocation.time, reserve = allocation.reserve;
    extra = { time: budget };
    // Viewing speed must not spend the last seconds on an already chosen move.
    minDelay = rem < 10000 ? 0 : Math.min(minDelay, 150, Math.max(0, rem - budget - reserve));
    G.thinkBudget=E.levelThinkTime(p.level-1,extra);renderStatus();
  }
  think(G.startFen === START ? null : G.startFen, G.moves.slice(), p.level - 1, extra).then(r => {
    const wait = Math.max(0, minDelay - (Date.now() - t0));
    setTimeout(() => {
      if (!G || G.token !== tok || G.moves.length !== ply) return;
      G.thinking = false;
      if (!r || !r.move) { renderStatus(); return; }
      const backend=r.backend==='wasm'?' · WASM':r.backend==='js-fallback'?' · JavaScript fallback':'';
      G.engineSource={ply:ply+1,text:r.book?'Last computer move: opening book':r.depth?(G.startFen!==START?'Last computer move: engine search · custom position':L18[p.level-1].book?'Last computer move: engine search · out of book':'Last computer move: engine search · book disabled')+backend:''};
      if (!r.book && r.depth) { G.evalW = E.whiteScore(fenBefore, r.score); G.depth = r.depth; }
      if (G.paused) { G.pendingAI = r.move; renderStatus(); renderButtons(); return; }
      playMove(r.move, true);
    }, wait);
  }).catch(() => { if (G.token === tok) { G.thinking = false; renderStatus(); } });
}
function capturedFor(fen) {
  const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }, have = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  parseFenBoard(fen).forEach(p => { if (p.type !== 'k') have[p.color][p.type]++; });
  const val = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const lost = c => { const out = []; ['q', 'r', 'b', 'n', 'p'].forEach(t => { const n = Math.max(0, start[t] - have[c][t]); for (let i = 0; i < n; i++) out.push(t); }); return out; };
  const mat = c => Object.keys(val).reduce((s, t) => s + have[c][t] * val[t], 0);
  return { byW: lost('b'), byB: lost('w'), diff: mat('w') - mat('b') };
}
function renderBars() {
  const top = BV.flipped ? 'w' : 'b', bot = BV.flipped ? 'b' : 'w';
  const cap = capturedFor(curFen());
  const bar = side => {
    const lab = playerLabel(side), took = side === 'w' ? cap.byW : cap.byB, other = side === 'w' ? 'b' : 'w';
    const adv = side === 'w' ? cap.diff : -cap.diff;
    const thinking = G.thinking && sideToMove() === side;
    return `<span class="who"><span class="dot" style="background:var(--p${side})"></span><span>${esc(lab.name)}</span>${lab.lvl ? `<span class="lvl">${esc(lab.lvl)}</span>` : ''}${thinking ? '<span class="thinking">thinking…</span>' : ''}</span><span class="caps">${took.map(t => pieceSVG(t, other)).join('')}${adv > 0 ? `<b>+${adv}</b>` : ''}</span>${G.clock ? `<span class="clock" data-clock="${side}" role="timer" aria-label="${side === 'w' ? 'White' : 'Black'} clock"></span>` : ''}`;
  };
  $('#barTop').innerHTML = bar(top); $('#barBot').innerHTML = bar(bot);
  renderClocks();
  const turn = G.over ? null : sideToMove();
  $('#barTop').classList.toggle('turn', turn === top); $('#barBot').classList.toggle('turn', turn === bot);
}
function fmtEval(w) {
  if (w == null) return '';
  if (Math.abs(w) > E.MATE - 1000) { const n = Math.ceil((E.MATE - Math.abs(w)) / 2); return (w > 0 ? 'White' : 'Black') + ' mates in ' + n; }
  const v = (w / 100).toFixed(1); return (w > 0 ? '+' : '') + v;
}
function renderStatus() {
  const el = $('#status'); el.classList.remove('check');
  let txt, side = sideToMove();
  if (G.over) { const r = G.over.result; txt = (r === '1/2-1/2' ? 'Draw' : r === '1-0' ? 'White wins' : 'Black wins') + ' by ' + G.over.reason; }
  else if (G.view != null) txt = `Viewing move ${G.view} of ${G.moves.length}`;
  else if (G.restored && G.paused) txt = 'Saved game paused. Resume when you are ready.';
  else if (G.paused) txt = 'Paused';
  else if (G.review) txt = 'Review · ' + (side === 'w' ? 'White' : 'Black') + ' to move';
  else {
    const inC = G.chess.inCheck();
    const who = G.players[side].type === 'ai' ? playerLabel(side).name : (G.mode === 'pvp' ? (side === 'w' ? 'White' : 'Black') : 'You');
    if (G.players[side].type === 'ai') txt = G.paused ? 'Paused' : `${who} (${side === 'w' ? 'White' : 'Black'}) is thinking`;
    else txt = G.mode === 'pvc' ? 'Your move' : `${side === 'w' ? 'White' : 'Black'} to move`;
    if (inC) { txt = 'Check! ' + txt; el.classList.add('check'); }
    if (G.touched && humanToMove()) txt += ` · touch-move: move the piece on ${G.touched}`;
  }
  const limited=G.clock&&G.thinking&&!G.paused&&!G.over&&G.view==null&&G.thinkBudget>0;
  el.innerHTML = `<span class="ic" style="background:var(--p${G.over ? (G.over.result === '0-1' ? 'b' : 'w') : side})"></span><span>${esc(txt)}${G.official ? '<span class="official-tag">FIDE</span>' : ''}${limited?`<small class="clock-budget">Clocked thinking allowance: up to ${(G.thinkBudget/1000).toFixed(G.thinkBudget<1000?2:1)}s for this move.</small>`:''}</span>`;
  const source=G.engineSource;$('#engineSource').hidden=G.view!=null||!source||!source.text||source.ply>G.moves.length;
  if(!$('#engineSource').hidden)$('#engineSource').textContent=source.text;
  renderDrawBox();
  const showEval = G.mode !== 'pvp' && G.evalW != null && (!G.official || G.mode === 'cvc');
  $('#evalBox').hidden = !showEval;
  if (showEval) {
    const w = G.evalW, pct = Math.abs(w) > E.MATE - 1000 ? (w > 0 ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-w / 300)) - 1);
    $('#evalFill').style.width = pct + '%';
    $('#evalTxt').textContent = 'Computer’s view: ' + fmtEval(w);
    $('#evalDepth').textContent = G.depth ? 'depth ' + G.depth : '';
  }
}
function renderMoves() {
  const box = $('#moves');
  if (!G.sans.length) { box.innerHTML = '<div class="empty">No moves yet. ' + (G.startFen.split(' ')[1] === 'b' ? 'Black' : 'White') + ' moves next.</div>'; return; }
  let h = '', i = 0, number = +G.startFen.split(' ')[5], firstBlack = G.startFen.split(' ')[1] === 'b';
  const cur = G.view == null ? G.sans.length : G.view;
  const button = at => `<button data-i="${at + 1}" class="${cur === at + 1 ? 'cur' : ''}" aria-label="Position after ${esc(G.sans[at])}, half-move ${at + 1}">${esc(G.sans[at])}</button>`;
  while (i < G.sans.length) {
    h += `<span class="n">${number++}.</span>`;
    if (firstBlack) { h += '<span></span>'; firstBlack = false; } else h += button(i++);
    h += i < G.sans.length ? button(i++) : '<span></span>';
  }
  box.innerHTML = h;
  if (G.view == null) box.scrollTop = box.scrollHeight;
}
$('#moves').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; setView(+b.dataset.i); });
function setView(i) {
  if (i >= G.fens.length - 1) G.view = null; else G.view = Math.max(0, i);
  BV.sel = null; BV.targets = []; BV.arrows = [];
  afterChange();
}
$('#navFirst').onclick = () => setView(0);
$('#navPrev').onclick = () => setView((G.view == null ? G.fens.length - 1 : G.view) - 1);
$('#navNext').onclick = () => { if (G.view != null) setView(G.view + 1); };
$('#navLast').onclick = () => setView(G.fens.length - 1);
function renderButtons() {
  $('#board').setAttribute('aria-readonly', String(!BV.interactive()));
  const cvc = G.mode === 'cvc';
  renderSessionControls();
  $('#undoBtn').disabled = G.paused || G.review || cvc || G.official || !G.moves.length || (G.mode === 'pvc' && !G.moves.some((_, i) => G.players[(i + (G.startFen.split(' ')[1] === 'b' ? 1 : 0)) % 2 ? 'b' : 'w'].type === 'human'));
  $('#undoBtn').title = G.official ? 'Take backs are not allowed under official rules' : '';
  $('#hintBtn').disabled = !humanToMove() || G.official || !!G.hinting;
  $('#hintBtn').title = G.official ? 'Hints are not allowed under official rules' : '';
  $('#whyBtn').hidden = !allowsMoveCues();
  $('#whyBtn').disabled = G.official || !(G.view==null?G.moves.length:G.view);
  $('#drawBtn').disabled = cvc || !!G.over || !humanToMove() || !!G.drawOffer || G.moves.length < 2;
  $('#resignBtn').disabled = G.review || !!G.over || cvc || !G.moves.length && G.mode === 'pvc' && G.players.w.type === 'ai';
  $('#navFirst').disabled = $('#navPrev').disabled = (G.view === 0) || G.fens.length < 2;
  $('#navNext').disabled = $('#navLast').disabled = G.view == null;
}
// One state transition serves the visible control and restored-game resume.
function renderSessionControls() {
  const visible=tab==='play'&&!G.review&&!G.over,paused=!!G.paused;
  $('#sessionControls').hidden=!visible;$('.game').classList.toggle('session-active',visible);if(!visible)return;
  $('#sessionControls').classList.toggle('is-paused',paused);
  const title=paused?(G.restored?'Saved game paused':'Game paused'):'Game in progress';
  const detail=paused?(G.clock?'Clock and moves are stopped. Resume when ready.':'Moves are stopped. Resume when ready.'):G.official?'Pause is unavailable during official play.':G.clock?'Take a break: pause stops the clock and moves.':'Take a break: pause stops all moves.';
  if($('#sessionTitle').textContent!==title)$('#sessionTitle').textContent=title;
  if($('#sessionDetail').textContent!==detail)$('#sessionDetail').textContent=detail;
  $('#pauseLabel').textContent=paused?'Resume game':'Pause game';$('#pauseIcon').innerHTML=paused?'<svg viewBox="0 0 20 20"><path fill="currentColor" d="M5 3L17 10L5 17Z"/></svg>':'<svg viewBox="0 0 20 20"><path fill="currentColor" d="M4 3H8V17H4ZM12 3H16V17H12Z"/></svg>';
  $('#pauseBtn').disabled=!paused&&G.official;
  $('#savePausedBtn').hidden=!paused;
}
function pauseGame() {
  if(tab!=='play'||!G||G.review||G.over||G.paused||G.official)return false;
  // Charge elapsed play before freezing, preserving the remaining delay/increment.
  if(G.clock)tickClock();if(G.over)return false;
  G.paused=true;G.token=Math.random();G.thinking=false;G.hinting=false;G.moveCue=null;delete G.pendingAI;
  cancelThinking();$('#hintBtn').textContent='Hint';
  if(drag){drag.el.classList.remove('drag');drag=null;}
  $('.promo')?.remove();BV.sel=null;BV.targets=[];BV.arrows=[];
  afterChange();return true;
}
function resumeGame() {
  if(tab!=='play'||!G||G.review||G.over||!G.paused)return false;
  G.restored=false;G.paused=false;G.view=null;delete G.pendingAI;
  if(G.clock)G.clock.last=performance.now();
  afterChange();return true;
}
$('#pauseBtn').onclick=()=>G.paused?resumeGame():pauseGame();
$('#savePausedBtn').onclick=()=>openGames();
$('#undoBtn').onclick = () => {
  if (G.paused || !G.moves.length || G.official) return;
  cancelThinking(); G.engineSource=null; G.thinking = false; G.over = null; G.view = null; $('#boardmsg').hidden = true; G.token = Math.random();
  const pop = () => { G.chess.unmake(); G.moves.pop(); G.sans.pop(); G.fens.pop(); G.lastFromTo.pop(); const h = G.clockHist.pop(); if (G.clock && h) { G.clock.w = h.w; G.clock.b = h.b; } };
  pop();
  if (G.mode === 'pvc') { while (G.moves.length && G.players[sideToMove()].type === 'ai') pop(); }
  BV.sel = null; BV.targets = []; BV.arrows = [];
  G.paused = G.mode === 'pvc' ? false : G.paused;
  G.drawOffer = null; G.touched = null;
  if (G.clock) startClock(sideToMove());
  afterChange();
};
$('#hintBtn').onclick = () => {
  if (!humanToMove() || G.official || G.hinting) return;
  G.hinting = true;
  const tok = G.token, ply = G.moves.length;
  $('#hintBtn').disabled = true; $('#hintBtn').textContent = 'Thinking…';
  think(G.startFen === START ? null : G.startFen, G.moves.slice(), 24, { time: 1500 }).then(r => {
    if (G && G.token === tok) { G.hinting = false; $('#hintBtn').textContent = 'Hint'; }
    if (!G || G.token !== tok || G.moves.length !== ply || !r || !r.move) { renderButtons(); return; }
    BV.arrows = [[r.move.slice(0, 2), r.move.slice(2, 4)]]; renderBoard(); renderButtons();
    G.moveCue = {fen:curFen(),ply:G.view==null?G.moves.length:G.view,token:G.token,title:'Suggested move',detail:MoveExplanations.describe(curFen(),r.move)}; renderMoveCue();
    toast('Suggested move shown with the arrow.');
  }).catch(() => { if (G && G.token === tok) { G.hinting = false; $('#hintBtn').textContent = 'Hint'; renderButtons(); } });
};
$('#flipBtn').onclick = () => { BV.flipped = !BV.flipped; renderBoard(); if (tab === 'play') renderBars(); else renderLearnBars(); };
$('#resignBtn').onclick = () => {
  if (G.over || G.review) return;
  const token=G.token,loser=G.mode==='pvc'?(G.players.w.type==='human'?'w':'b'):sideToMove();
  openModal(`<div class="modal-head"><h2>Resign this game?</h2><button class="btn small" data-close>Keep playing</button></div><p>Resigning ends this game. You can still review or save it.</p><button class="btn primary" id="rsYes">Resign</button>`);
  $('#rsYes').onclick=()=>{closeModal();if(!G||G.token!==token||G.over)return;endGame({result:loser==='w'?'0-1':'1-0',reason:(loser==='w'?'White':'Black')+' resigned'});afterChange();};
};
function pgn() {
  const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const nm = side => { const p = G.players[side]; return p.type === 'human' ? (G.mode === 'pvc' ? 'You' : (side === 'w' ? 'White' : 'Black')) : `Mitchell D Chess level ${p.level} (${L18[p.level - 1].name})`; };
  const tags = G.tags || {}, result = G.over ? G.over.result : '*';
  return PositionTools.exportPgn({ startFen: G.startFen, sans: G.sans, result, tags }, {
    Event: tags.Event || 'Mitchell D Chess game' + (G.official ? ' (official rules)' : ''), Site: tags.Site || 'Mitchell D Chess', Date: tags.Date || date,
    White: tags.White || nm('w'), Black: tags.Black || nm('b'), TimeControl: G.clock ? G.clock.pgn : (tags.TimeControl || '-'), Termination: !G.over ? 'unterminated' : /time/.test(G.over.reason) ? 'time forfeit' : 'normal'
  });
}
// Parsing uses a disposable worker so large annotated games cannot block play.
function positionJob(text, format) {
  let jobWorker, timer, settle;
  const promise = new Promise((resolve, reject) => {
    settle = reject;
    try {
      const handler = `self.onmessage=e=>{try{const d=e.data.text;const result=e.data.format==='record'?PositionTools.fromMoves(d.startFen,d.moves,d.tags,d.over?d.over.result:'*'):e.data.format==='fen'?PositionTools.fromFen(d):PositionTools.parsePgn(d);self.postMessage({ok:true,result});}catch(error){self.postMessage({ok:false,error:String(error.message||error)});}};`;
      const url = URL.createObjectURL(new Blob([$('#engine-src').textContent, $('#position-tools-src').textContent, handler], {type:'text/javascript'}));
      try { jobWorker = new Worker(url); } finally { URL.revokeObjectURL(url); }
      const finish = () => { clearTimeout(timer); jobWorker.terminate(); };
      jobWorker.onmessage = e => { finish(); e.data.ok ? resolve(e.data.result) : reject(new Error(e.data.error)); };
      jobWorker.onerror = () => { finish(); reject(new Error('Could not read the game in this browser.')); };
      timer = setTimeout(() => { finish(); reject(new Error('Import took too long. Try a shorter PGN main line.')); },15000);
      jobWorker.postMessage({text,format});
    } catch (error) { reject(new Error('Could not start the import worker.')); }
  });
  return { promise, cancel() { clearTimeout(timer); if (jobWorker) jobWorker.terminate(); settle(new Error('Import cancelled.')); } };
}
function openImport(initial = '') {
  openModal(`<div class="modal-head"><h2>Import a position or game</h2><button class="btn small" data-close>Cancel</button></div>
    <p>Paste FEN or one PGN game, or choose a text file. PGN comments and variations are skipped; the main line is loaded for review.</p>
    <label class="field">Format<select id="importFormat"><option value="auto">Detect automatically</option><option value="fen">FEN position</option><option value="pgn">PGN game</option></select></label>
    <label class="field">FEN or PGN<textarea id="importText" spellcheck="false" maxlength="256000"></textarea></label>
    <label class="field">Or choose a file<input id="importFile" type="file" accept=".pgn,.fen,.txt,text/plain,application/x-chess-pgn"></label>
    <p class="muted">Loading replaces the current game. Review starts without a clock or computer moves. Maximum 256 KB and 1,024 half-moves.</p>
    <p id="importError" class="feedback bad" role="alert" hidden></p><button class="btn primary" id="importLoad">Load for review</button>`, () => $('#importText').focus());
  $('#importText').value = initial;
  let disposed = false, job = null; modalCleanup = () => { disposed = true; if (job) job.cancel(); };
  const error = message => { $('#importError').textContent = message; $('#importError').hidden = false; };
  $('#importFile').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > PositionTools.MAX_TEXT) { error('Choose one file smaller than 256 KB.'); return; }
    try { const text = await file.text(); if (!disposed) $('#importText').value = text; } catch (e) { if (!disposed) error('Could not read that file.'); }
  };
  $('#importLoad').onclick = async () => {
    const text = $('#importText').value.trim(); if (!text) { error('Paste a FEN position or PGN game first.'); return; }
    const requested = $('#importFormat').value, format = requested === 'auto' ? (/^[pnbrqkPNBRQK1-8]+\//.test(text) ? 'fen' : 'pgn') : requested;
    $('#importLoad').disabled = true; $('#importLoad').textContent = 'Checking…'; $('#importError').hidden = true;
    job = positionJob(text, format);
    try {
      const record = await job.promise; if (disposed) return;
      newGame({record}); if (tab !== 'play') setTab('play'); closeModal(); if (record.notice) toast(record.notice);
    } catch (e) { if (!disposed) { error(e.message); $('#importLoad').disabled = false; $('#importLoad').textContent = 'Load for review'; } }
  };
}
$('#importBtn').onclick = () => openImport();
$('#shareBtn').onclick = () => {
  const fen = tab === 'play' ? curFen() : LS.chess.fen();
  const url = new URL(location.protocol === 'file:' ? 'https://mitchell-d00.github.io/Mitchell-D-Chess-/' : location.href);
  url.hash = 'fen=' + encodeURIComponent(fen);
  openModal(`<div class="modal-head"><h2>Share this position</h2><button class="btn small" data-close>Close</button></div><p>The link opens the displayed position for review, without a running clock.</p><label class="field">Position URL<input id="shareUrl" class="share-url" type="text" readonly></label><p id="shareStatus" role="status" aria-live="polite">Copying position link…</p><button class="btn primary" id="copyShareBtn">Copy link again</button>`,()=>{$('#shareUrl').value=url.href;$('#shareUrl').focus();$('#shareUrl').select();});
  const status=$('#shareStatus'),input=$('#shareUrl'); input.onclick=()=>input.select();
  const copy=async()=>{try{await navigator.clipboard.writeText(url.href);if(status.isConnected)status.textContent='Copied. The URL stays here so you can check or copy it again.';}catch(error){if(status.isConnected){status.textContent='Clipboard unavailable. Select the URL above and copy it manually.';input.focus();input.select();}}};
  $('#copyShareBtn').onclick=copy;copy();
};
$('#continueBtn').onclick = () => { const fen = curFen(); requestNewGame(()=>{newGame({startFen:fen});toast('New game from the displayed position; fresh clocks and your selected setup.');}); };
window.addEventListener('hashchange', () => { try { const fen = PositionTools.hashFen(location.hash); if (fen) openImport(fen); } catch (e) { toast(e.message); } });
function copyText(text, label) {
  const done = () => toast(label + ' copied.');
  const fallback = () => openModal(`<div class="modal-head"><h3>${esc(label)}</h3><button class="btn small" data-close>Close</button></div><p class="muted">Select the text below and copy it.</p><textarea readonly id="copyArea">${esc(text)}</textarea>`, () => { const t = $('#copyArea'); t.focus(); t.select(); });
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
}
$('#pgnBtn').onclick = () => copyText(pgn(), 'PGN');
$('#fenBtn').onclick = () => copyText(tab === 'play' ? curFen() : LS.chess.fen(), 'FEN');

// --- setup controls
function syncPlay() {
  $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === setup.mode));
  $('#setupPvc').hidden = setup.mode !== 'pvc';
  $('#setupCvc').hidden = setup.mode !== 'cvc';
  $$('#colorSeg button').forEach(b => b.classList.toggle('on', b.dataset.c === setup.color));
  $$('#speedSeg button').forEach(b => b.classList.toggle('on', b.dataset.sp === (setup.speed || 'normal')));
  $('#lvl').value = setup.level; showLevel();
  $('#lvlW').value = setup.lvlW; $('#lvlB').value = setup.lvlB;
  $('#tcSel').value = setup.tc; $('#tcCustom').hidden = setup.tc !== 'custom';
  $('#tcWm').value = setup.cw; $('#tcBm').value = setup.cb; $('#tcBonus').value = setup.bonus; $('#tcType').value = setup.btype;
  $$('#rulesSeg button').forEach(b => b.classList.toggle('on', b.dataset.r === setup.rules));
  $('#rulesNote').textContent = setup.rules === 'official'
    ? 'FIDE Laws of Chess: touch-move, no take backs or hints, repetition and fifty-move draws must be claimed (automatic at fivefold repetition or 75 moves), and running out of time is a draw if the opponent cannot checkmate.'
    : 'Relaxed: take backs and hints allowed. Repetition and the fifty-move rule end the game automatically.';
}
function showLevel() {
  const n = +$('#lvl').value, L = L18[n - 1];
  $('#lvlNum').textContent = n; $('#lvlName').textContent = L.name; $('#lvlTier').textContent = L.tier; $('#lvlAbout').textContent = L.about;
  $('#ladder').innerHTML = L18.map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
}
const lvlOptions = L18.map((L, i) => `<option value="${i + 1}">${i + 1}. ${esc(L.name)} (${L.tier})</option>`).join('');
$('#lvlW').innerHTML = lvlOptions; $('#lvlB').innerHTML = lvlOptions;
$('#modeSeg').onclick = e => { const b = e.target.closest('[data-mode]'); if (!b) return; requestNewGame(()=>{setup.mode=b.dataset.mode;saveSetup();syncPlay();newGame();}); };
$('#colorSeg').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; setup.color = b.dataset.c; saveSetup(); syncPlay(); };
$('#speedSeg').onclick = e => { const b = e.target.closest('[data-sp]'); if (!b) return; setup.speed = b.dataset.sp; saveSetup(); syncPlay(); };
$('#lvl').oninput = () => { setup.level = +$('#lvl').value; saveSetup(); showLevel(); if (G && G.mode === 'pvc' && !G.moves.length) { const s = G.players.w.type === 'ai' ? 'w' : 'b'; G.players[s].level = setup.level; renderBars(); } };
$('#lvlW').onchange = () => { setup.lvlW = +$('#lvlW').value; saveSetup(); };
$('#lvlB').onchange = () => { setup.lvlB = +$('#lvlB').value; saveSetup(); };
$('#newBtn').onclick = () => requestNewGame(()=>newGame());
const setupChanged = () => { saveSetup(); syncPlay(); if (G && !G.review && G.startFen === START && !G.moves.length) newGame(); };
$('#tcSel').onchange = () => { setup.tc = $('#tcSel').value; setupChanged(); };
['tcWm', 'tcBm', 'tcBonus'].forEach(id => $('#' + id).onchange = () => {
  setup.cw = Math.min(600, Math.max(0.25, +$('#tcWm').value || 10)); setup.cb = Math.min(600, Math.max(0.25, +$('#tcBm').value || 10));
  setup.bonus = Math.min(300, Math.max(0, Math.round(+$('#tcBonus').value || 0))); setupChanged();
});
$('#tcType').onchange = () => { setup.btype = $('#tcType').value; setupChanged(); };
$('#rulesSeg').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; setup.rules = b.dataset.r; setupChanged(); };

