// Original MIT clock allocation. Milliseconds throughout; no clock is reset here.
function allocateThinkTime(clock, side, levelCap, ply) {
  const remaining = Math.max(0, Number(clock[side]) || 0);
  const cap = Math.max(1, Number(levelCap) || 1000);
  const reserve = Math.min(remaining * .15, Math.max(40, Math.min(500, remaining * .02)));
  const delay = Math.max(0, Number(clock.delayLeft) || 0);
  const available = Math.max(1, remaining + delay - reserve);
  // A planning horizon, not a prediction of the game's actual remaining length.
  const movesLeft = Math.max(18, 40 - Math.floor(Math.max(0, ply) / 6));
  const ideal = clock.per ? remaining * .65 : remaining / movesLeft + Math.max(0, clock.inc || 0) * .8 + delay * .8;
  const burstCap = clock.per ? remaining * .75 : remaining * .25 + delay * .8;
  return {time:Math.max(1, Math.floor(Math.min(cap, available, burstCap, ideal))),reserve};
}
if (typeof module !== 'undefined') module.exports = allocateThinkTime;
