  // Choose a move. moves: UCI list from the start position (startFen optional).
  function think(startFen, moves, levelIdx, extra) {
    var persona = normalizePersona(extra && extra.persona);
    var aggression = persona ? persona.aggression : 0;
    var L = LEVELS[levelIdx];
    if (!L) throw new Error('Invalid engine level');
    var pos = new Chess(startFen);
    for (var i = 0; i < moves.length; i++) { var m = pos.findUci(moves[i]); if (!m) throw new Error('Invalid move history at ply ' + (i + 1) + ': ' + moves[i]); pos.make(m); }
    var legal = pos.legalMoves();
    if (!legal.length) return null;
    var res = { move: null, score: 0, depth: 0, nodes: 0, book: false };
    if (L.random) {
      var caps = legal.filter(function (m) { return (m >> 17) & 1; });
      var pick = caps.length && Math.random() < 0.5 ? caps : legal;
      res.move = pos.uci(pick[Math.floor(Math.random() * pick.length)]);
      return res;
    }
    if (L.book && !startFen && !(extra && extra.noBook)) {
      var bm = bookMove(moves, pos);
      if (bm && pos.findUci(bm)) { res.move = bm; res.book = true; return res; }
    }
    if (legal.length === 1) { res.move = pos.uci(legal[0]); return res; }
    if (L.noise || L.bl) {
      var limited=levelThinkTime(levelIdx,extra);
      var sc = rootScores(pos, { depth: L.d, eval: L.ev, q: L.q, time:limited, aggression: aggression });
      res.depth=sc.completedDepth;res.nodes=sc.nodes;res.timeBudget=limited;
      if (sc[0].s >= MATE - 2 && levelIdx >= 2) { res.move = pos.uci(sc[0].m); res.score = sc[0].s; return res; }
      var noisy = sc.map(function (x) { return { m: x.m, s: x.s + gauss() * (L.noise || 0) }; });
      noisy.sort(function (a, b) { return b.s - a.s; });
      var choice = noisy[0];
      if (Math.random() < (L.bl || 0) && noisy.length > 2) choice = noisy[1 + Math.floor(Math.random() * Math.min(4, noisy.length - 1))];
      res.move = pos.uci(choice.m);
      res.score = sc.filter(function (x) { return x.m === choice.m; })[0].s;
      return res;
    }
    var time = levelThinkTime(levelIdx,extra);
    var basePly = pos.uMove.length, lastBest = 0, stability = 0;
    var searchStart = Date.now();
    var s = new Searcher(pos, { eval: L.ev, q: L.q, time: time, contempt: 20, aggression: aggression, exactEndgames: !!(extra && extra.exactEndgames), adv: extra && extra.adv !== undefined ? extra.adv : L.adv });
    s.deadline = searchStart + time;
    var best = legal[0], bestScore = 0, depthDone = 0, t0 = Date.now(), prev = 0;
    for (var d = 1; d <= L.d; d++) {
      s.rootBest = 0; s.rootDepth = d;
      try {
        var v;
        if (L.adv && d >= 5 && Math.abs(prev) < MATE - 1000) {
          var w = 30, a = prev - w, bta = prev + w;
          while (true) {
            s.rootBest = 0;
            v = s.negamax(d, a, bta, 0, false, 0);
            if (v <= a) { a = Math.max(-INF, a - w * 3); w *= 3; }
            else if (v >= bta) { bta = Math.min(INF, bta + w * 3); w *= 3; }
            else break;
            if (w > 900) { a = -INF; bta = INF; }
          }
        } else v = s.negamax(d, -INF, INF, 0, false, 0);
        if (s.rootBest) { best = s.rootBest; bestScore = v; depthDone = d; prev = v; }
      } catch (e) {
        if (e !== STOP) throw e;
        // Restore the root after the timeout exception unwinds recursive calls.
        while (pos.uMove.length > basePly) {
          if (pos.uMove[pos.uMove.length - 1] === 0) pos.unmakeNull(); else pos.unmake();
        }
        break;
      }
      if (Math.abs(bestScore) > MATE - 1000 && d >= 4) break;
      stability = best === lastBest ? stability + 1 : 0; lastBest = best;
      // Reserve more of the hard budget for unstable principal variations.
      var soft = stability >= 3 ? 0.55 : 0.85;
      if (Date.now() - t0 > time * soft) break;
    }
    if (legal.indexOf(best) < 0) throw new Error('Search selected an illegal root move');
    res.move = pos.uci(best); res.score = bestScore; res.depth = depthDone; res.nodes = s.nodes; res.seldepth = s.seldepth;res.timeBudget=time;
    return res;
  }

  // White-relative score helper
  function whiteScore(fen, score) { return / b /.test(fen) ? -score : score; }

  return {
    normalizePersona: normalizePersona, personaBias: personaBias, NNUE_CONFIG: NNUE_CONFIG, NeuralAccumulator: NeuralAccumulator, neuralEvaluate: neuralEvaluate, NNUE_MODEL: NNUE_MODEL, probeKPK: probeKPK, Searcher: Searcher, EVAL_WEIGHTS: EVAL_WEIGHTS, bookLines: BOOK, Chess: Chess, LEVELS: LEVELS, think: think, evaluate: evaluate, sqName: sqName, sqParse: sqParse, MATE: MATE,
    mFrom: mFrom, mTo: mTo, mPromo: mPromo, mFlags: mFlags, whiteScore: whiteScore, CHARS: CHARS, levelThinkTime:levelThinkTime
  };
})();

if (typeof window === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof module === 'undefined') {
  self.onmessage = function (e) {
    var d = e.data;
    try {
      var r = ENGINE.think(d.fen || null, d.moves || [], d.level, d.extra);
      self.postMessage({ id: d.id, ok: true, result: r });
    } catch (err) { self.postMessage({ id: d.id, ok: false, error: String(err && err.message || err) }); }
  };
}
if (typeof module !== 'undefined') module.exports = ENGINE;

