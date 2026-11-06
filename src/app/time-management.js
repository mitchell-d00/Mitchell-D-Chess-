// Original MIT clock allocation. All values are milliseconds; clocks are never reset.
function allocateThinkTime(clock, side, levelCap, ply, context = {}) {
  const remaining = Math.max(0, Number(clock[side]) || 0);
  const cap = Math.max(1, Number(levelCap) || 1000);
  const start = Math.max(remaining, Number(clock.start && clock.start[side]) || remaining);
  const overhead = Math.max(20, Math.min(2000, Number(context.overheadMs) || 75));
  const delay = Math.max(0, Number(clock.delayLeft) || 0);
  const increment = Math.max(0, Number(clock.inc) || 0);
  // Leave dispatch/rendering room separately from the bank for future moves.
  const reserve = Math.min(remaining * .45, Math.max(120, overhead * 2));
  const available = Math.max(1, remaining + delay - reserve);
  const bank = clock.per ? 0 : Math.min(remaining * .35, Math.max(500, Math.min(8000, start * .08)));
  // Long endings need a longer horizon as time dwindles, rather than assuming
  // only 18 moves remain. Increment/delay are replenished; the main bank is not.
  const pressure = 1 - Math.min(1, remaining / 15000);
  const emergency = 1 - Math.min(1, remaining / 3000);
  const movesLeft = Math.max(56, 72 - Math.floor(Math.max(0, Number(ply) || 0) / 8)) + pressure * 40 + emergency * 40;
  const ideal = clock.per ? remaining * .65 : (remaining - bank) / movesLeft + increment * .65 + delay * .7;
  const burstCap = clock.per ? remaining * .75 : remaining * .08 + increment * .7 + delay * .75;
  // Measured overhead must reduce search time, including the per-move mode.
  const time = Math.max(1, Math.floor(Math.min(cap, available, burstCap, Math.max(1, ideal - overhead))));
  const mode = clock.per ? 'per-move' : remaining < 1500 ? 'emergency' : remaining < Math.min(15000, Math.max(3000, start * .2)) ? 'time trouble' : remaining < start * .35 ? 'saving time' : 'balanced';
  return {time,reserve,bank,movesLeft,overhead,mode};
}
// Track observed excess wall time conservatively, with gradual recovery after
// fast replies. This state belongs to the current game, not persisted clocks.
function updateClockOverhead(previous, roundTripMs, searchBudgetMs) {
  const observed = Math.max(0, (Number(roundTripMs) || 0) - Math.max(0, Number(searchBudgetMs) || 0));
  return Math.max(20, Math.min(2000, Math.max((Number(previous) || 75) * .9, observed * 1.5 + 20)));
}
if (typeof module !== 'undefined') { module.exports = allocateThinkTime; module.exports.updateClockOverhead = updateClockOverhead; }
