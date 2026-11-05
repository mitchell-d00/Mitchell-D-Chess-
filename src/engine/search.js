  // ---------- Search ----------
  var TT_BITS = 21, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  var ttLo = new Int32Array(TT_SIZE), ttHi = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttScore = new Int32Array(TT_SIZE);
  var ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE);
  var STOP = { stop: true }, TT_CONTEXT = null;
  var LMR = [];
  for (var dd = 0; dd < 64; dd++) { LMR.push(new Int8Array(64)); for (var mm = 0; mm < 64; mm++) LMR[dd][mm] = dd && mm ? Math.floor(0.7 + Math.log(dd) * Math.log(mm) / 2.3) : 0; }
  var MAXPLY = 96;

  function Searcher(pos, opt) {
    this.pos = pos; this.opt = opt; this.nodes = 0;
    this.deadline = opt.time ? Date.now() + opt.time : Infinity;
    this.killers = []; for (var i = 0; i < MAXPLY + 2; i++) this.killers.push([0, 0]);
    this.hist = new Int32Array(16 * 128);
    this.contHist = []; this.capHist = new Int16Array(16 * 128 * 7);
    this.ecLo = new Int32Array(32768); this.ecHi = new Int32Array(32768);
    this.ecValue = new Int32Array(32768); this.ecFull = new Int32Array(32768);
    this.counter = new Int32Array(16 * 128);
    this.evalStack = new Int32Array(MAXPLY + 2);
    this.mode = opt.eval || 'full';
    if (this.mode === 'nnue') { if (!pos.nnue) pos.nnue = new NeuralAccumulator(pos); }
    else pos.nnue = null;
    var ttContext = this.mode + ':' + (opt.q !== false) + ':' + pos.side + ':' + (opt.contempt || 0);
    if (ttContext !== TT_CONTEXT) { ttDepth.fill(-1); ttFlag.fill(-1); TT_CONTEXT = ttContext; }
    this.q = opt.q !== false;
    this.useNull = opt.nullMove !== false;
    this.adv = !!opt.adv;
    this.rootSide = pos.side; this.contempt = opt.contempt || 0;
    this.seldepth = 0;
  }
  var S = Searcher.prototype;
  S.evaluate = function () {
    var p = this.pos, h = p.lo & 32767;
    // full-move number matters for the early queen development term.
    if (this.ecFull[h] === p.full && this.ecLo[h] === p.lo && this.ecHi[h] === p.hi) return this.ecValue[h];
    var v = evaluate(p, this.mode);
    this.ecLo[h] = p.lo; this.ecHi[h] = p.hi; this.ecFull[h] = p.full; this.ecValue[h] = v;
    return v;
  };
  S.order = function (ms, ttm, ply, prevKey) {
    var b = this.pos.b, sc = new Array(ms.length), k = this.killers[ply], cm = prevKey ? this.counter[prevKey] : 0;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], fl = (m >> 17) & 15, pr = (m >> 14) & 7, v;
      if (m === ttm) v = 1e8;
      else if (fl & 1) {
        var victim = (fl & 2) ? P : (b[(m >> 7) & 127] & 7), att = b[m & 127] & 7;
        var mvv = VAL[victim] * 10 - VAL[att] / 10;
        if (!this.adv || VAL[victim] >= VAL[att]) v = 5e7 + mvv;
        else v = this.pos.see(m) >= 0 ? 5e7 + mvv : -5e7 + mvv;
        if (pr) v += VAL[pr];
        v += this.capHist[(b[m & 127] * 128 + ((m >> 7) & 127)) * 7 + victim];
      }
      else if (pr) v = pr === Q ? 4.5e7 : -6e7;
      else if (m === k[0]) v = 4e7;
      else if (m === k[1]) v = 3.9e7;
      else if (m === cm) v = 3.8e7;
      else {
        var hk = b[m & 127] * 128 + ((m >> 7) & 127);
        v = this.hist[hk] + (this.contHist[prevKey] ? this.contHist[prevKey][hk] : 0);
      }
      sc[i] = v;
    }
    for (i = 1; i < ms.length; i++) {
      var mv0 = ms[i], s0 = sc[i], j = i - 1;
      while (j >= 0 && sc[j] < s0) { ms[j + 1] = ms[j]; sc[j + 1] = sc[j]; j--; }
      ms[j + 1] = mv0; sc[j + 1] = s0;
    }
    return ms;
  };
  S.checkTime = function () {
    if ((++this.nodes & (this.opt.time < 100 ? 127 : 1023)) === 0 && Date.now() >= this.deadline) throw STOP;
  };
  S.isDraw = function () {
    var pos = this.pos;
    if (pos.half >= 100) return true;
    var L = pos.hLo.length - 1, lo = pos.lo, hi = pos.hi;
    for (var i = L - 2; i >= 0 && i >= L - pos.half; i -= 2) if (pos.hLo[i] === lo && pos.hHi[i] === hi) return true;
    return false;
  };
  S.drawScore = function () { return this.pos.side === this.rootSide ? -this.contempt : this.contempt; };
  S.histUpdate = function (key, bonus) {
    var h = this.hist[key];
    this.hist[key] = h + bonus - ((h * Math.abs(bonus)) / 16384 | 0);
  };
  S.qs = function (alpha, beta, ply, qd) {
    this.checkTime();
    if (ply > this.seldepth) this.seldepth = ply;
    var pos = this.pos, us = pos.side, inCheck = pos.inCheck();
    // Mate takes precedence over a claimable fifty-move draw.
    if (this.isDraw() && (!inCheck || pos.legalMoves().length)) return this.drawScore();
    var stand = inCheck ? -INF : this.evaluate();
    if (ply >= MAXPLY) return inCheck && !pos.legalMoves().length ? -MATE + ply : this.evaluate();
    if (!inCheck) {
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (qd > 12) return stand;
    }
    var ms = this.order(pos.gen(!inCheck), 0, ply, 0), legal = 0;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], fl = (m >> 17) & 15, pr = (m >> 14) & 7;
      if (!inCheck && !(fl & 2) && !pr) {
        var vic = VAL[pos.b[(m >> 7) & 127] & 7];
        if (stand + vic + 200 < alpha) continue;
        if (this.adv && VAL[pos.b[m & 127] & 7] > vic && pos.see(m) < 0) continue;
      }
      pos.make(m);
      if (pos.attacked(pos.kingSq[us >> 3], us ^ BLACK)) { pos.unmake(); continue; }
      legal++;
      var sc = -this.qs(-beta, -alpha, ply + 1, qd + 1);
      pos.unmake();
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return inCheck && !legal ? -MATE + ply : alpha;
  };
  S.hasPieces = function (side) {
    var b = this.pos.b;
    for (var s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } var p = b[s]; if (p && (p & BLACK) === side && (p & 7) !== P && (p & 7) !== K) return true; }
    return false;
  };
  S.negamax = function (depth, alpha, beta, ply, allowNull, prevKey, excluded) {
    this.checkTime();
    var pos = this.pos;
    if (ply > 0 && this.isDraw() && (!pos.inCheck() || pos.legalMoves().length)) return this.drawScore();
    var us = pos.side, inCheck = pos.attacked(pos.kingSq[us >> 3], us ^ BLACK);
    if (inCheck && ply < 2 * (this.rootDepth || 8) + 6) depth++;
    if (depth <= 0) return this.q ? this.qs(alpha, beta, ply, 0) : this.evaluate();
    if (ply >= MAXPLY) return this.evaluate();
    if (ply > this.seldepth) this.seldepth = ply;
    var mAlpha = Math.max(alpha, -MATE + ply), mBeta = Math.min(beta, MATE - ply - 1);
    if (ply > 0 && mAlpha >= mBeta) return mAlpha;

    var h = pos.lo & TT_MASK, ttm = 0, alpha0 = alpha, pv = beta - alpha > 1, generated = null;
    if (ttFlag[h] >= 0 && ttLo[h] === pos.lo && ttHi[h] === pos.hi) {
      ttm = ttMove[h];
      if (ttm) {
        generated = pos.gen(false);
        // A signature match is not a licence to make an unchecked cached move.
        // Discard both move and score if the entry is inconsistent with the board.
        if (generated.indexOf(ttm) < 0) ttm = 0;
      }
      if (ttm && !excluded && ply > 0 && ttDepth[h] >= depth && !pv) {
        var ts = ttScore[h];
        if (ts > MATE - 1000) ts -= ply; else if (ts < -MATE + 1000) ts += ply;
        var tf = ttFlag[h];
        if (tf === 0) return ts;
        if (tf === 1 && ts >= beta) return ts;
        if (tf === 2 && ts <= alpha) return ts;
      }
    }
    var staticEval = inCheck ? -INF : this.evaluate();
    this.evalStack[ply] = staticEval;
    var improving = !inCheck && ply >= 2 && staticEval > this.evalStack[ply - 2];

    if (!excluded && !pv && !inCheck && ply > 0) {
      if (this.adv) {
        // reverse futility
        if (depth <= 7 && Math.abs(beta) < MATE - 1000 && staticEval - (85 * depth - (improving ? 45 : 0)) >= beta) return staticEval;
        // razoring
        if (depth <= 2 && staticEval + 260 * depth < alpha) { var rz = this.qs(alpha, beta, ply, 0); if (rz < alpha) return rz; }
      }
      if (this.useNull && allowNull && depth >= 3 && staticEval >= beta && this.hasPieces(us)) {
        var R = 3 + (depth >= 7 ? 1 : 0) + (this.adv ? Math.min(2, ((staticEval - beta) / 220) | 0) : 0);
        pos.makeNull();
        var ns = -this.negamax(depth - 1 - R, -beta, -beta + 1, ply + 1, false, 0);
        pos.unmakeNull();
        if (ns >= beta) {
          if (depth < 10) return ns >= MATE - 1000 ? beta : ns;
          // Verify deeper null cutoffs with null move disabled to limit zugzwang failures.
          var verify = this.negamax(depth - R, beta - 1, beta, ply, false, prevKey);
          if (verify >= beta) return verify;
        }
      }
    }
    // internal iterative deepening
    if (!excluded && this.adv && !ttm && pv && depth >= 6) {
      this.negamax(depth - 3, alpha, beta, ply, true, prevKey);
      if (ttLo[h] === pos.lo && ttHi[h] === pos.hi) {
        if (!generated) generated = pos.gen(false);
        ttm = generated.indexOf(ttMove[h]) >= 0 ? ttMove[h] : 0;
      }
    }

    var singularMove = 0;
    if (!excluded && this.adv && ply > 0 && depth >= 7 && ttm && ttLo[h] === pos.lo && ttHi[h] === pos.hi && ttDepth[h] >= depth - 3 && ttFlag[h] !== 2 && Math.abs(ttScore[h]) < MATE - 1000) {
      var singularBeta = ttScore[h] - depth * 2;
      var alternatives = this.negamax((depth - 1) >> 1, singularBeta - 1, singularBeta, ply, false, prevKey, ttm);
      if (alternatives < singularBeta) singularMove = ttm;
    }
    // Generate to validate cached moves, but defer ordering until it is needed.
    if (!generated) generated = pos.gen(false);
    var staged = this.mode === 'nnue' && ttm && !excluded;
    var ms = staged ? [ttm] : this.order(generated, ttm, ply, prevKey), legal = 0, best = -INF, bestM = 0, quietsTried = [], k = this.killers[ply];
    var b = pos.b;
    for (var i = 0; i < ms.length || staged; i++) {
      if (i === ms.length && staged) {
        staged = false;
        ms = this.order(generated, ttm, ply, prevKey);
        var hashIndex = ms.indexOf(ttm); if (hashIndex >= 0) ms.splice(hashIndex, 1);
        i = 0; if (!ms.length) break;
      }
      var m = ms[i]; if (m === excluded) continue;
      var fl = (m >> 17) & 15, pr = (m >> 14) & 7, quiet = !(fl & 1) && !pr;
      var to = (m >> 7) & 127, key = b[m & 127] * 128 + to;
      if (!excluded && this.adv && !pv && ply > 0 && !inCheck && legal > 0 && best > -MATE + 1000) {
        if (quiet && m !== k[0] && m !== k[1]) {
          if (depth <= 5 && quietsTried.length >= (improving ? 4 + depth * depth : 2 + (depth * depth >> 1))) continue;
          if (depth <= 4 && staticEval + 110 + 95 * depth <= alpha) continue;
          if (depth <= 3 && this.hist[key] < -3000 * depth) continue;
        } else if ((fl & 1) && !pv && depth <= 5 && m !== ttm && pos.see(m) < -90 * depth) continue;
      }
      pos.make(m);
      if (pos.attacked(pos.kingSq[us >> 3], us ^ BLACK)) { pos.unmake(); continue; }
      legal++;
      var givesCheck = pos.attacked(pos.kingSq[(us ^ BLACK) >> 3], us);
      var childKey = b[to] * 128 + to, sc, nextDepth = depth - 1 + (m === singularMove ? 1 : 0);
      if (legal === 1) sc = -this.negamax(nextDepth, -beta, -alpha, ply + 1, true, childKey);
      else {
        var red = 0;
        if (depth >= 3 && quiet && !inCheck && !givesCheck && legal > (pv ? 3 : 2)) {
          if (this.adv) {
            red = LMR[Math.min(depth, 63)][Math.min(legal, 63)];
            if (pv) red--;
            if (m === k[0] || m === k[1]) red--;
            if (!improving) red++;
            if (this.hist[key] > 4000) red--;
            if (red > depth - 2) red = depth - 2;
            if (red < 0) red = 0;
          } else red = legal > 8 && depth >= 5 ? 2 : 1;
        }
        sc = -this.negamax(nextDepth - red, -alpha - 1, -alpha, ply + 1, true, childKey);
        if (sc > alpha && red) sc = -this.negamax(nextDepth, -alpha - 1, -alpha, ply + 1, true, childKey);
        if (sc > alpha && sc < beta) sc = -this.negamax(nextDepth, -beta, -alpha, ply + 1, true, childKey);
      }
      pos.unmake();
      if (sc > best) {
        best = sc; bestM = m;
        if (sc > alpha) {
          alpha = sc;
          if (ply === 0) { this.rootBest = m; this.rootScore = sc; }
          if (alpha >= beta) {
            if (quiet) {
              if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
              var bonus = Math.min(depth * depth * 8, 1600);
              this.histUpdate(key, bonus);
              for (var qi = 0; qi < quietsTried.length; qi++) this.histUpdate(quietsTried[qi], -bonus);
              if (prevKey) {
                this.counter[prevKey] = m;
                var ch = this.contHist[prevKey] || (this.contHist[prevKey] = new Int16Array(2048));
                ch[key] += bonus - (ch[key] * bonus / 16384 | 0);
                for (var cq = 0; cq < quietsTried.length; cq++) {
                  var ck = quietsTried[cq]; ch[ck] -= bonus + (ch[ck] * bonus / 16384 | 0);
                }
              }
            }
            if (fl & 1) {
              var cv = (fl & 2) ? P : b[to] & 7, ci = key * 7 + cv, cb = Math.min(1200, depth * depth * 8);
              this.capHist[ci] += cb - (this.capHist[ci] * cb / 16384 | 0);
            }
            break;
          }
        }
      }
      if (quiet) quietsTried.push(key);
    }
    if (!legal && excluded) return -INF;
    if (!legal) return inCheck ? -MATE + ply : 0;
    var store = best;
    if (store > MATE - 1000) store += ply; else if (store < -MATE + 1000) store -= ply;
    if (!excluded && (ttLo[h] !== pos.lo || ttHi[h] !== pos.hi || depth >= ttDepth[h] - 2 || ttFlag[h] !== 0)) {
      ttLo[h] = pos.lo; ttHi[h] = pos.hi; ttMove[h] = bestM; ttScore[h] = store; ttDepth[h] = depth;
      ttFlag[h] = best >= beta ? 1 : best <= alpha0 ? 2 : 0;
    }
    return best;
  };

  // Score every root move (weaker levels pick among these with noise)
  function rootScores(pos, opt) {
    var s = new Searcher(pos, { eval: opt.eval, q: opt.q, nullMove: false, time: 0 });
    var ms = pos.legalMoves(), out = [];
    for (var i = 0; i < ms.length; i++) {
      pos.make(ms[i]);
      var sc = opt.depth <= 1 ? -(s.q ? s.qs(-INF, INF, 1, 0) : evaluate(pos, s.mode)) : -s.negamax(opt.depth - 1, -INF, INF, 1, false, 0);
      if (pos.inCheck() && !pos.legalMoves().length) sc = MATE - 1;
      pos.unmake();
      out.push({ m: ms[i], s: sc });
    }
    out.sort(function (a, b) { return b.s - a.s; });
    return out;
  }
  function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

