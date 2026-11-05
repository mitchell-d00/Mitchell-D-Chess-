// ================= Board view =================
const BV = {
  flipped: false, focus: 'e2', fen: START, sel: null, targets: [], last: null, check: null, marks: [], arrows: [], interactive: () => false,
  onMove: null, legal: () => [], animFrom: null,
};
function sqXY(name) { const f = name.charCodeAt(0) - 97, r = +name[1] - 1; return BV.flipped ? [7 - f, r] : [f, 7 - r]; }
function xyToSq(col, row) { const f = BV.flipped ? 7 - col : col, r = BV.flipped ? row : 7 - row; return 'abcdefgh'[f] + (r + 1); }
function buildBoard() {
  let h = ''; const occupied = new Map(parseFenBoard(BV.fen).map(p => [p.sq, p]));
  $('#board').setAttribute('aria-readonly', String(!BV.interactive()));
  for (let row = 0; row < 8; row++) {
    h += `<div class="board-row" role="row" aria-rowindex="${row + 1}">`;
    for (let col = 0; col < 8; col++) {
      const name = xyToSq(col, row), dark = (col + row) % 2 === 1, p = occupied.get(name);
      let label = name + ', ' + (p ? (p.color === 'w' ? 'White ' : 'Black ') + NAMES[p.type] : 'empty');
      if (BV.check === name) label += ', check'; if (BV.targets.some(t => t.sq === name)) label += ', legal destination';
      h += `<div class="sq ${dark ? 'd' : 'l'}" data-sq="${name}" role="gridcell" aria-colindex="${col + 1}" aria-label="${esc(label)}" aria-selected="${BV.sel === name}" tabindex="${BV.focus === name ? 0 : -1}">`;
      if (S.coords) { if (row === 7) h += `<span class="co f" aria-hidden="true">${name[0]}</span>`; if (col === 0) h += `<span class="co r" aria-hidden="true">${name[1]}</span>`; }
      h += '</div>';
    }
    h += '</div>';
  }
  $('#board').innerHTML = h;
}
function focusSquare(square = BV.focus) {
  BV.focus = square;
  $$('#board .sq').forEach(el => el.tabIndex = el.dataset.sq === square ? 0 : -1);
  $(`#board .sq[data-sq="${square}"]`)?.focus({preventScroll:true});
}
function activateSquare(square) {
  if (!BV.interactive() || $('.promo')) return;
  BV.focus = square;
  if (BV.sel && BV.sel !== square && BV.targets.some(t => t.sq === square)) { const from = BV.sel; BV.sel = null; BV.targets = []; tryMove(from, square); return; }
  const lock = BV.lock ? BV.lock() : null;
  if (lock && square !== lock) { toast('Touch-move rule: move the piece you touched.'); return; }
  if (selectSq(square)) { if (BV.onTouch) BV.onTouch(square); $('#boardAnnouncement').textContent = square + ' selected. ' + BV.targets.length + ' legal destinations.'; }
  else { BV.sel = null; BV.targets = []; }
  renderBoard(); focusSquare(square);
}
$('#board').addEventListener('keydown', e => {
  const cell = e.target.closest('[data-sq]'); if (!cell) return;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) {
    e.preventDefault(); e.stopPropagation(); let [x,y] = sqXY(cell.dataset.sq);
    if (e.key === 'ArrowLeft') x--; if (e.key === 'ArrowRight') x++; if (e.key === 'ArrowUp') y--; if (e.key === 'ArrowDown') y++;
    if (e.key === 'Home') { x = 0; if (e.ctrlKey) y = 0; } if (e.key === 'End') { x = 7; if (e.ctrlKey) y = 7; }
    focusSquare(xyToSq(Math.max(0,Math.min(7,x)),Math.max(0,Math.min(7,y))));
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); activateSquare(cell.dataset.sq); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (BV.lock && BV.lock()) toast('Touch-move rule: move the piece you touched.'); else { BV.sel = null; BV.targets = []; renderBoard(); focusSquare(); } }
});
$('#board').addEventListener('click', e => { if (e.detail === 0) { const cell = e.target.closest('[data-sq]'); if (cell) activateSquare(cell.dataset.sq); } });
function parseFenBoard(fen) {
  const out = []; const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, ri) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) { f += +ch; continue; } out.push({ sq: 'abcdefgh'[f] + (8 - ri), type: ch.toLowerCase(), color: ch === ch.toLowerCase() ? 'b' : 'w' }); f++; } });
  return out;
}
function renderBoard() {
  const restoreFocus = $('#board').contains(document.activeElement);
  buildBoard();
  const sqEl = n => $(`.sq[data-sq="${n}"]`);
  if (S.lastmove && BV.last) { sqEl(BV.last[0])?.classList.add('last'); sqEl(BV.last[1])?.classList.add('last'); }
  BV.marks.forEach(m => sqEl(m)?.classList.add('mark'));
  if (BV.check) sqEl(BV.check)?.classList.add('chk');
  if (BV.sel) {
    sqEl(BV.sel)?.classList.add('sel');
    if (S.legal) BV.targets.forEach(t => { const el = sqEl(t.sq); if (el) el.insertAdjacentHTML('beforeend', t.cap ? '<span class="ring"></span>' : '<span class="dot"></span>'); });
  }
  const pcs = parseFenBoard(BV.fen);
  let h = '';
  for (const p of pcs) {
    const [x, y] = sqXY(p.sq);
    let start = `translate(${x * 100}%,${y * 100}%)`;
    let anim = '';
    if (BV.animFrom && BV.animFrom[1] === p.sq) { const [fx, fy] = sqXY(BV.animFrom[0]); start = `translate(${fx * 100}%,${fy * 100}%)`; anim = ` data-to="translate(${x * 100}%,${y * 100}%)"`; }
    h += `<div class="pc" data-sq="${p.sq}" style="transform:${start}"${anim}>${pieceSVG(p.type, p.color)}</div>`;
  }
  $('#pieces').innerHTML = h;
  const a = $('#pieces .pc[data-to]');
  if (a) { a.getBoundingClientRect(); requestAnimationFrame(() => { a.style.transform = a.dataset.to; }); }
  BV.animFrom = null;
  renderArrows();
  if (restoreFocus) focusSquare();
}
function renderArrows() {
  const svg = $('#arrows');
  let h = '<defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="rgba(45,140,255,.85)"/></marker></defs>';
  const recommendation = currentRecommendation();
  const arrows = recommendation && $('#analysisArrows').checked ? [[recommendation.from,recommendation.to]] : BV.arrows;
  for (const [a, b] of arrows) {
    const [x1, y1] = sqXY(a), [x2, y2] = sqXY(b);
    const cx1 = x1 * 100 + 50, cy1 = y1 * 100 + 50, cx2 = x2 * 100 + 50, cy2 = y2 * 100 + 50;
    const dx = cx2 - cx1, dy = cy2 - cy1, len = Math.hypot(dx, dy), ex = cx2 - dx / len * 26, ey = cy2 - dy / len * 26;
    h += `<line x1="${cx1}" y1="${cy1}" x2="${ex}" y2="${ey}" stroke="rgba(45,140,255,.85)" stroke-width="20" stroke-linecap="round" marker-end="url(#ah)" data-suggestion="true"/>`;
  }
  svg.innerHTML = h;
}

// --- input: click and drag
let drag = null;
function pointToSq(e) {
  const r = $('#boardwrap').getBoundingClientRect();
  const col = Math.floor((e.clientX - r.left) / r.width * 8), row = Math.floor((e.clientY - r.top) / r.height * 8);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  return xyToSq(col, row);
}
function selectSq(sq) {
  const moves = BV.legal().filter(m => m.from === sq);
  if (!moves.length) { BV.sel = null; BV.targets = []; return false; }
  BV.sel = sq;
  const seen = {}; BV.targets = [];
  moves.forEach(m => { if (!seen[m.to]) { seen[m.to] = 1; BV.targets.push({ sq: m.to, cap: m.cap }); } });
  return true;
}
function tryMove(from, to) {
  const ms = BV.legal().filter(m => m.from === from && m.to === to);
  if (!ms.length) return false;
  BV.focus = to;
  if (ms.length > 1 || ms[0].promo) { // promotion
    if (S.autoQueen && !(tab === 'play' && G && G.official)) { BV.onMove(from + to + 'q'); return true; }
    showPromo(from, to); return true;
  }
  BV.onMove(ms[0].uci); return true;
}
function showPromo(from, to) {
  const [x, y] = sqXY(to), color = to[1] === '8' ? 'w' : 'b';
  const box = document.createElement('div'); box.className = 'promo';
  const down = y === 0;
  box.style.left = `clamp(0px, ${x*12.5}%, calc(100% - max(12.5%, 46px)))`;
  if (down) box.style.top = '0'; else box.style.bottom = '0';
  ['q', 'r', 'b', 'n'].forEach(p => box.insertAdjacentHTML('beforeend', `<button data-p="${p}" aria-label="Promote to ${NAMES[p]}">${pieceSVG(p, color)}</button>`));
  box.onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; box.remove(); BV.onMove(from + to + b.dataset.p); focusSquare(to); };
  box.querySelector('button').focus();
  $('#boardwrap').appendChild(box);
  box.querySelector('button').focus();
}
$('#boardwrap').addEventListener('pointerdown', e => {
  if (e.button > 0 || !BV.interactive()) return;
  if ($('.promo')) return;
  const sq = pointToSq(e); if (!sq) return;
  BV.focus = sq;
  Snd.c();
  if (BV.sel && BV.sel !== sq && BV.targets.some(t => t.sq === sq)) { const from = BV.sel; BV.sel = null; BV.targets = []; tryMove(from, sq); return; }
  const lock = BV.lock ? BV.lock() : null;
  if (lock && sq !== lock) { toast('Touch-move rule: you must move the piece you touched.'); return; }
  if (selectSq(sq)) {
    if (BV.onTouch) BV.onTouch(sq);
    renderBoard();
    const el = $(`.pc[data-sq="${sq}"]`);
    if (el) { drag = { sq, el, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; $('#boardwrap').setPointerCapture(e.pointerId); }
  } else { BV.sel = null; BV.targets = []; renderBoard(); }
});
$('#boardwrap').addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
  drag.moved = true;
  const r = $('#boardwrap').getBoundingClientRect(), s = r.width / 8;
  drag.el.classList.add('drag');
  drag.el.style.transform = `translate(${e.clientX - r.left - s / 2}px,${e.clientY - r.top - s / 2}px)`;
  const over = pointToSq(e);
  $$('.sq.hov').forEach(x => x.classList.remove('hov'));
  if (over && BV.targets.some(t => t.sq === over)) $(`.sq[data-sq="${over}"]`)?.classList.add('hov');
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (!d.moved) return;
  const to = pointToSq(e);
  if (to && to !== d.sq && BV.targets.some(t => t.sq === to)) { BV.sel = null; BV.targets = []; tryMove(d.sq, to); }
  else renderBoard();
}
$('#boardwrap').addEventListener('pointerup', endDrag);
$('#boardwrap').addEventListener('pointercancel', e => { if (drag) { drag = null; renderBoard(); } });

function legalFor(chess) {
  return chess.legalMoves().map(m => ({ uci: chess.uci(m), from: E.sqName(E.mFrom(m)), to: E.sqName(E.mTo(m)), promo: E.mPromo(m), cap: !!(E.mFlags(m) & 1) }));
}
function kingInCheckSq(chess) {
  if (!chess.inCheck()) return null;
  return E.sqName(chess.kingSq[chess.side >> 3]);
}

