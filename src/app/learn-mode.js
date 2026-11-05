// ================= Learn mode =================
let LS = { idx: 0, chess: null, state: 'idle', moves: [], done: new Set(store.get('lessonsDone', [])), busy: false, token: 0 };
function saveDone() { store.set('lessonsDone', [...LS.done]); }
function lessonSide() { return LS.chess.side ? 'b' : 'w'; }
function loadLesson(i) {
  cancelThinking();
  LS.idx = i; store.set('lessonIdx', i);
  const l = LESSONS[i];
  LS.chess = new E.Chess(l.fen); LS.state = 'idle'; LS.moves = []; LS.busy = false; LS.token = Math.random(); LS.human = lessonSide(); LS.feedback = null; LS.why = null; LS.lastExplanation = null;
  BV.flipped = LS.human === 'b'; BV.sel = null; BV.targets = []; BV.arrows = []; BV.marks = l.marks || []; BV.last = null;
  $('#boardmsg').hidden = true;
  renderLearn(); learnBoard();
}
function learnBoard() {
  const l = LESSONS[LS.idx];
  BV.fen = LS.chess.fen(); BV.check = kingInCheckSq(LS.chess);
  const canMove = () => tab === 'learn' && l.type !== 'info' && LS.state !== 'solved' && LS.state !== 'failed' && !LS.busy && lessonSide() === LS.human;
  BV.legal = () => canMove() ? legalFor(LS.chess) : [];
  BV.interactive = canMove;
  BV.onMove = uci => lessonMove(uci);
  renderBoard(); renderLearnBars();
}
function renderLearnBars() {
  const l = LESSONS[LS.idx];
  const top = BV.flipped ? 'w' : 'b', bot = BV.flipped ? 'b' : 'w';
  const lab = s => s === LS.human ? 'You' : (l.type === 'play' ? `Computer · level ${l.level + 1}` : (s === 'w' ? 'White' : 'Black'));
  const bar = s => `<span class="who"><span class="dot" style="background:var(--p${s})"></span><span>${esc(lab(s))}</span>${LS.busy && lessonSide() === s ? '<span class="thinking">thinking…</span>' : ''}</span>`;
  $('#barTop').innerHTML = bar(top); $('#barBot').innerHTML = bar(bot);
  $('#barTop').classList.remove('turn'); $('#barBot').classList.remove('turn');
}
function lessonApply(uci) {
  const m = LS.chess.findUci(uci); if (!m) return null;
  const cap = !!(E.mFlags(m) & 1), from = E.sqName(E.mFrom(m)), to = E.sqName(E.mTo(m)), promo = E.mPromo(m);
  LS.lastExplanation = MoveExplanations.describe(LS.chess.fen(),uci); LS.why = null;
  LS.chess.make(m); LS.moves.push(uci);
  BV.animFrom = [from, to]; BV.last = [from, to]; BV.marks = []; BV.arrows = [];
  if (LS.chess.inCheck()) Snd.check(); else if (cap) Snd.capture(); else Snd.move();
  return { promo };
}
function lessonMove(uci) {
  const l = LESSONS[LS.idx];
  const info = lessonApply(uci); if (!info) return;
  let ok = null;
  if (l.type === 'move') ok = l.accept.includes(uci) || (uci.length === 5 && l.accept.includes(uci));
  else if (l.type === 'check') ok = LS.chess.inCheck();
  else if (l.type === 'mate') { const st = LS.chess.status(); ok = !!(st && st.reason === 'checkmate'); }
  if (l.type === 'play') { learnBoard(); return playLessonStep(info); }
  if (ok) {
    LS.state = 'solved'; LS.feedback = { cls: 'good', text: l.done || 'Well done!' };
    LS.done.add(LS.idx); saveDone(); Snd.end();
  } else {
    LS.state = 'wrong'; LS.feedback = { cls: 'bad', text: 'Not quite. ' + (l.hint || 'Try again.') };
    LS.busy = true;
    const tok = LS.token;
    setTimeout(() => { if (LS.token !== tok) return; LS.chess.unmake(); LS.moves.pop(); LS.lastExplanation=null; LS.why=null; LS.busy = false; LS.state = 'idle'; BV.last = null; BV.marks = l.marks || []; renderLearn(); learnBoard(); }, 1100);
  }
  renderLearn(); learnBoard();
}
function playLessonStep(info) {
  const l = LESSONS[LS.idx];
  const st = LS.chess.status();
  if (l.goal === 'promote' && info.promo) return lessonWin();
  if (st) {
    if (st.reason === 'checkmate' && lessonSide() !== LS.human) return lessonWin();
    return lessonFail(st.reason === 'checkmate' ? 'You were checkmated.' : `The game ended in a draw by ${st.reason}.`);
  }
  if (lessonSide() !== LS.human) {
    LS.busy = true; renderLearnBars(); renderLearn();
    const tok = LS.token;
    think(l.fen, LS.moves.slice(), l.level).then(r => {
      setTimeout(() => {
        if (LS.token !== tok) return;
        LS.busy = false;
        if (!r || !r.move) return;
        lessonApply(r.move);
        learnBoard();
        const st2 = LS.chess.status();
        if (st2) { if (st2.reason === 'checkmate') lessonFail('You were checkmated.'); else lessonFail(`The game ended in a draw by ${st2.reason}.`); return; }
        if (l.goal === 'promote' && LS.chess.legalMoves().length && !hasPawn(LS.human)) { lessonFail('Your pawn was captured.'); return; }
        renderLearn();
      }, 300);
    }).catch(() => { if (LS.token === tok) { LS.busy = false; LS.feedback = {cls:'info',text:'The computer could not finish. Reset the lesson to try again.'}; renderLearn(); learnBoard(); } });
  }
}
function hasPawn(side) { return parseFenBoard(LS.chess.fen()).some(p => p.type === 'p' && p.color === side); }
function lessonWin() { const l = LESSONS[LS.idx]; LS.state = 'solved'; LS.feedback = { cls: 'good', text: l.done || 'Well done!' }; LS.done.add(LS.idx); saveDone(); Snd.end(); renderLearn(); learnBoard(); }
function lessonFail(t) { LS.state = 'failed'; LS.feedback = { cls: 'bad', text: t + ' Press Try again to restart.' }; renderLearn(); learnBoard(); }
const KIND = { info: 'Read', move: 'Find the move', check: 'Give check', mate: 'Mate in one', play: 'Play it out' };
function renderLearn() {
  const l = LESSONS[LS.idx], n = LESSONS.length;
  const last = LS.idx === n - 1;
  let fb = '';
  if (LS.feedback) fb = `<div class="feedback ${LS.feedback.cls}">${LS.feedback.text}</div>`;
  else if (LS.showHint && l.hint) fb = `<div class="feedback info">Hint: ${esc(l.hint)}</div>`;
  const solved = LS.state === 'solved' || l.type === 'info';
  $('#lessonCard').innerHTML = `
    <div><p class="eyebrow">${esc(l.tier)} · Lesson ${LS.idx + 1} of ${n} · ${KIND[l.type]}</p><h2>${esc(l.title)}</h2></div>
    <p class="txt">${l.text}</p>
    ${l.task ? `<div class="task"><span aria-hidden="true">♟</span><span>${esc(l.task)}</span></div>` : ''}
    ${fb}
    ${LS.why ? `<div class="feedback info" role="status"><strong>Why this move?</strong> ${esc(LS.why)}<p class="muted">Position cues, not the engine’s reasoning.</p></div>` : ''}
    <div class="navrow">
      <button class="btn small" id="lPrev" ${LS.idx === 0 ? 'disabled' : ''}>Previous</button>
      ${l.type !== 'info' ? `<button class="btn small" id="lWhy" ${LS.busy ? 'disabled' : ''}>Why this move?</button><button class="btn small" id="lHint" ${solved ? 'disabled' : ''}>Hint</button><button class="btn small" id="lReset">${LS.state === 'failed' ? 'Try again' : 'Reset'}</button>` : ''}
      <span class="grow"></span>
      <button class="btn small ${solved ? 'primary' : ''}" id="lNext" ${last ? 'disabled' : ''}>${solved ? 'Next lesson' : 'Skip'}</button>
    </div>`;
  $('#lPrev').onclick = () => loadLesson(LS.idx - 1);
  $('#lNext').onclick = () => { if (l.type === 'info') { LS.done.add(LS.idx); saveDone(); } LS.showHint = false; loadLesson(LS.idx + 1); };
  if ($('#lHint')) $('#lHint').onclick = () => {
    LS.showHint = true; LS.feedback = null;
    if (l.type === 'move' && l.accept) BV.arrows = [[l.accept[0].slice(0, 2), l.accept[0].slice(2, 4)]];
    renderLearn(); renderBoard();
  };
  if ($('#lWhy')) $('#lWhy').onclick=()=>{
    if(LS.busy)return;
    let detail=LS.lastExplanation;
    if(!detail&&l.type==='move'&&l.accept){detail=MoveExplanations.describe(LS.chess.fen(),l.accept[0]);if(detail)BV.arrows=[[detail.from,detail.to]];}
    LS.why=[detail&&detail.text,l.hint].filter(Boolean).join(' ')||'Try the lesson hint and look at checks, captures and threats.';renderLearn();renderBoard();
  };
  if ($('#lReset')) $('#lReset').onclick = () => { LS.showHint = false; loadLesson(LS.idx); };
  // list
  const tiers = [...new Set(LESSONS.map(x => x.tier))];
  $('#lessonList').innerHTML = tiers.map(t => {
    const items = LESSONS.map((x, i) => ({ x, i })).filter(o => o.x.tier === t);
    const d = items.filter(o => LS.done.has(o.i)).length;
    return `<div class="tiergroup"><h3>${esc(t)} <span>${d}/${items.length}</span></h3>${items.map(o => `<button class="litem ${LS.done.has(o.i) ? 'done' : ''} ${o.i === LS.idx ? 'cur' : ''}" data-l="${o.i}"><span class="tick">${LS.done.has(o.i) ? '✓' : ''}</span><span>${esc(o.x.title)} <span class="kind">· ${KIND[o.x.type]}</span></span></button>`).join('')}</div>`;
  }).join('');
  $('#learnProg').textContent = `${LS.done.size} of ${n} complete`;
  $('#learnBar').style.width = (LS.done.size / n * 100) + '%';
}
$('#lessonList').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) { LS.showHint = false; loadLesson(+b.dataset.l); } });

