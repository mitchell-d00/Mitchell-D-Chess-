// ================= Draw offers and claims =================
function aiScore(side) {
  // the computer's last evaluation from its own point of view (0 when it has no opinion yet)
  if (G.evalW == null) return 0;
  return side === 'w' ? G.evalW : -G.evalW;
}
function renderDrawBox() {
  const box = $('#drawBox');
  if (!G || G.over || G.view != null) { box.hidden = true; return; }
  const side = sideToMove(), human = G.players[side].type === 'human';
  let h = '';
  if (G.official && human) {
    const claim = G.chess.claimable();
    if (claim) h += `<div>You may claim a draw by <b>${claim}</b>.</div><div class="row"><button class="btn small primary" id="claimBtn">Claim draw</button></div>`;
  }
  if (G.drawOffer && G.mode === 'pvp') {
    if (G.drawOffer.by !== side) h += `<div><b>${G.drawOffer.by === 'w' ? 'White' : 'Black'} offers a draw.</b> Accept, decline, or make a move to decline.</div><div class="row"><button class="btn small primary" id="acceptDraw">Accept draw</button><button class="btn small" id="declineDraw">Decline</button></div>`;
    else h += `<div>Draw offered. ${side === 'w' ? 'Black' : 'White'} will see it after your move.</div>`;
  }
  box.innerHTML = h; box.hidden = !h;
  if ($('#claimBtn')) $('#claimBtn').onclick = () => { const claim = G.chess.claimable(); if (!claim) return; endGame({ result: '1/2-1/2', reason: `${claim}, claimed by ${G.mode === 'pvc' ? 'you' : (side === 'w' ? 'White' : 'Black')}` }); afterChange(); };
  if ($('#acceptDraw')) $('#acceptDraw').onclick = () => { endGame({ result: '1/2-1/2', reason: 'agreement' }); afterChange(); };
  if ($('#declineDraw')) $('#declineDraw').onclick = () => { G.drawOffer = null; renderStatus(); renderButtons(); };
}
$('#drawBtn').onclick = () => {
  if (!G || G.over || !humanToMove()) return;
  const side = sideToMove();
  if (G.mode === 'pvp') { G.drawOffer = { by: side }; renderStatus(); renderButtons(); toast('Draw offered. Now make your move.'); return; }
  // vs computer: it accepts when it is clearly worse, or when the game is level and long
  const ai = side === 'w' ? 'b' : 'w', sc = aiScore(ai), level = G.players[ai].level;
  const accept = G.evalW != null && (sc <= -60 || (Math.abs(sc) <= 20 && G.moves.length >= 60) || (level <= 5 && Math.random() < .3));
  if (accept) { endGame({ result: '1/2-1/2', reason: 'agreement' }); afterChange(); }
  else toast(`${playerLabel(ai).name} declines the draw.`);
};

