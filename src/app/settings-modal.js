// ================= Settings modal =================
let modalCleanup = null, modalReturnFocus = null;
function openModal(html, after) {
  if (modalCleanup) { const cleanup = modalCleanup; modalCleanup = null; cleanup(); }
  if ($('#ov').hidden) modalReturnFocus = document.activeElement;
  $('#ovBox').innerHTML = html; $('#ov').hidden = false;
  const title = $('#ovBox').querySelector('h2,h3'); if (title) title.id = 'modalTitle';
  $('#ovBox').querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  if (after) after(); else ($('#ovBox button') || $('#ovBox')).focus();
}
function closeModal() { if (modalCleanup) { const cleanup = modalCleanup; modalCleanup = null; cleanup(); } $('#ov').hidden = true; $('#ovBox').innerHTML = ''; if (modalReturnFocus && modalReturnFocus.isConnected) modalReturnFocus.focus({preventScroll:true}); modalReturnFocus = null; }
$('#ov').addEventListener('click', e => { if (e.target.id === 'ov') closeModal(); });
document.addEventListener('keydown', e => {
  if (!$('#ov').hidden && e.key === 'Tab') {
    const controls = $$('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]', $('#ovBox')).filter(el => el.getClientRects().length);
    if (!controls.length) { e.preventDefault(); $('#ovBox').focus(); }
    else if (e.shiftKey && (document.activeElement === controls[0] || !$('#ovBox').contains(document.activeElement))) { e.preventDefault(); controls.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0].focus(); }
    return;
  }
  if (e.key === 'Escape') { if (!$('#ov').hidden) closeModal(); else if ($('.promo')) { if (!(BV.lock && BV.lock())) { $('.promo').remove(); focusSquare(); } } else if (BV.sel && !(BV.lock && BV.lock())) { BV.sel = null; BV.targets = []; renderBoard(); } }
  if (e.target.matches('input,select,textarea') || !$('#ov').hidden) return;
  if (tab === 'play' && G) { if (e.key === 'ArrowLeft') { $('#navPrev').click(); e.preventDefault(); } if (e.key === 'ArrowRight') { $('#navNext').click(); e.preventDefault(); } }
});
function seg(key, opts) { return `<div class="seg" data-set="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(S[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
function openSettings() {
  const bt = BOARD_THEMES.map(([n, a, b]) => `<button class="swatch ${S.light === a && S.dark === b ? 'on' : ''}" data-board="${a},${b}"><span class="mini"><i style="background:${a}"></i><i style="background:${b}"></i><i style="background:${b}"></i><i style="background:${a}"></i></span>${n}</button>`).join('');
  const pt = PIECE_THEMES.map(([n, a, b]) => `<button class="swatch ${S.pw === a && S.pb === b ? 'on' : ''}" data-pieces="${a},${b}"><span class="pcpair" style="--pw:${a};--pb:${b};--pw-line:${lum(a) > .35 ? '#1c1c1c' : '#f3f1ec'};--pb-line:${lum(b) > .35 ? '#1c1c1c' : '#f3f1ec'};background:linear-gradient(90deg,${S.light} 50%,${S.dark} 50%);border-radius:5px">${pieceSVG('n', 'w')}${pieceSVG('n', 'b')}</span>${n}</button>`).join('');
  openModal(`<div class="modal-head"><h2 style="font-size:1.4rem">Colours &amp; settings</h2><button class="btn small" data-close>Done</button></div>
  <div class="setsec"><h3>Appearance</h3>
    <div class="setrow"><div class="lab"><b>Theme</b><span>Light, dark, or follow your device</span></div>${seg('theme', [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
  </div>
  <div class="setsec"><h3>Board colours</h3>
    <div class="swatches" id="boardSw">${bt}</div>
    <div class="pickers"><label>Light squares <input type="color" id="pkLight" value="${S.light}"></label><label>Dark squares <input type="color" id="pkDark" value="${S.dark}"></label></div>
  </div>
  <div class="setsec"><h3>Piece colours</h3>
    <div class="swatches" id="pieceSw">${pt}</div>
    <div class="pickers"><label>White side <input type="color" id="pkW" value="${S.pw}"></label><label>Black side <input type="color" id="pkB" value="${S.pb}"></label></div>
  </div>
  <div class="setsec"><h3>Board</h3>
    <div class="setrow"><div class="lab"><b>Coordinates</b><span>Letters and numbers on the edge</span></div>${seg('coords', [[true, 'On'], [false, 'Off']])}</div>
    <div class="setrow"><div class="lab"><b>Show legal moves</b><span>Dots where the selected piece can go</span></div>${seg('legal', [[true, 'On'], [false, 'Off']])}</div>
    <div class="setrow"><div class="lab"><b>Highlight last move</b></div>${seg('lastmove', [[true, 'On'], [false, 'Off']])}</div>
    <div class="setrow"><div class="lab"><b>Piece animation</b></div>${seg('anim', [['off', 'Off'], ['fast', 'Fast'], ['normal', 'Smooth']])}</div>
    <div class="setrow"><div class="lab"><b>Always promote to queen</b><span>Skip the promotion picker</span></div>${seg('autoQueen', [[false, 'Off'], [true, 'On']])}</div>
    <div class="setrow"><div class="lab"><b>Sounds</b></div>${seg('sound', [[true, 'On'], [false, 'Off']])}</div>
  </div>`);
  const box = $('#ovBox');
  const refresh = () => { applySettings(); renderBoard(); if (tab === 'play') renderBars(); else renderLearnBars(); };
  box.onclick = e => {
    const sb = e.target.closest('.seg[data-set] button');
    if (sb) { const k = sb.parentElement.dataset.set; let v = sb.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false; S[k] = v; saveS(); $$('button', sb.parentElement).forEach(x => x.classList.toggle('on', x === sb)); refresh(); return; }
    const b1 = e.target.closest('[data-board]');
    if (b1) { [S.light, S.dark] = b1.dataset.board.split(','); saveS(); $$('#boardSw .swatch').forEach(x => x.classList.toggle('on', x === b1)); $('#pkLight').value = S.light; $('#pkDark').value = S.dark; refresh(); return; }
    const b2 = e.target.closest('[data-pieces]');
    if (b2) { [S.pw, S.pb] = b2.dataset.pieces.split(','); saveS(); $$('#pieceSw .swatch').forEach(x => x.classList.toggle('on', x === b2)); $('#pkW').value = S.pw; $('#pkB').value = S.pb; refresh(); return; }
  };
  $('#pkLight').oninput = e => { S.light = e.target.value; saveS(); $$('#boardSw .swatch').forEach(x => x.classList.remove('on')); refresh(); };
  $('#pkDark').oninput = e => { S.dark = e.target.value; saveS(); $$('#boardSw .swatch').forEach(x => x.classList.remove('on')); refresh(); };
  $('#pkW').oninput = e => { S.pw = e.target.value; saveS(); $$('#pieceSw .swatch').forEach(x => x.classList.remove('on')); refresh(); };
  $('#pkB').oninput = e => { S.pb = e.target.value; saveS(); $$('#pieceSw .swatch').forEach(x => x.classList.remove('on')); refresh(); };
}
$('#setBtn').onclick = openSettings;
function openGuide() {
  openModal(`<div class="modal-head"><h2>Getting started</h2><button class="btn small" data-close>Done</button></div>
    <div class="setsec"><h3>Play or learn</h3><p>Play the computer, share a screen with a friend, or watch two computers. Learn offers 38 lessons from piece moves to strategy.</p></div>
    <div class="setsec"><h3>Take a break</h3><p>Pause game sits near the board in casual games, with or without a clock. It stops clocks, moves and computer thinking. Resume game continues at the latest position. Save for later keeps a named local copy. Official play keeps pause unavailable; loaded games start paused and can be resumed.</p></div>
    <div class="setsec"><h3>Choose your pace</h3><p>Use the level slider for 65 presets and choose a clock. Levels are difficulty settings, not verified Elo ratings. The highest levels can think for up to a minute.</p></div>
    <div class="setsec"><h3>Make it yours</h3><p>Colours &amp; settings controls board and piece colours, contrast, legal-move dots, animation and sound. Hide game setup when you want more room.</p></div>
    <div class="setsec"><h3>Explore games and positions</h3><p>Import FEN or PGN, click a SAN move to step through a game, or share the displayed position. Saved games keeps named local copies. Game review adds estimated evaluations and alternatives after a game or import. Everything runs locally once this HTML is saved.</p></div>
    <div class="setsec"><h3>Keyboard play</h3><p>Tab to the board, use arrows to explore, and Enter or Space to select a piece and play a destination. Home/End go to the row edges. Escape cancels a selection unless official touch-move applies. Outside the board, Left/Right step through moves.</p></div>
    <div class="setsec"><h3>Learn from your game</h3><p>After a game, choose Review game. What to work on highlights key moments for White, Black or both players. Select a moment, revisit the position before the move, and compare the played move, the opponent’s reply and the suggested alternative. Short-search labels are estimates, not accuracy scores or player ratings.</p></div>
    <div class="setsec"><h3>Engine strength · unrated</h3><p>Levels 51–65 use the improved Mitchell WASM engine, with automatic JavaScript fallback. It retains Thomas Jahn’s credited MIT Leorik neural weights. A completed pilot at one second per move scored 0 wins, 5 draws and 1 loss against native Leorik 3.1.3, and 3 wins, 2 draws and 1 loss against Texel 1.06, with no forfeits. Six games per opponent is too small to establish an absolute Elo. The Source repository contains all games, settings and repeat commands.</p><p>The earlier JavaScript/NNUE engine completed a separate benchmark at one second per move: 0 wins, 7 draws and 93 losses against Stockfish 19, and 0 wins, 20 draws and 80 losses against native Leorik 3.1.3, without forfeits. Those results describe the earlier engine.</p></div>
    <p class="muted">Free, MIT-licensed, no ads or accounts. Source and credits are available in the header. Engine strength remains unrated.</p>`);
}
$('#helpBtn').onclick = openGuide; $('#welcomeGuide').onclick = openGuide;
$('#welcomeTip').hidden = !!store.get('welcomeDismissed', false);
$('#dismissWelcome').onclick = () => { store.set('welcomeDismissed', true); $('#welcomeTip').hidden = true; $('#helpBtn').focus(); };
$('#creditsLink').onclick = () => { $('#licenses').open = true; };
$('#setupToggle').onclick = () => { const hidden = !$('#setupFields').hidden; $('#setupFields').hidden = hidden; $('#setupToggle').setAttribute('aria-expanded', String(!hidden)); $('#setupToggle').textContent = hidden ? 'Show setup' : 'Hide setup'; };

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }

