
var ENGINE = (function () {
  'use strict';
  // ---------- Board representation: 0x88 ----------
  // Pieces: type 1..6 (P N B R Q K), colour bit 8 (0 = white, 8 = black)
  var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, WHITE = 0, BLACK = 8;
  var VAL = [0, 100, 320, 330, 500, 900, 20000];
  var N_D = [-33, -31, -18, -14, 14, 18, 31, 33];
  var B_D = [-17, -15, 15, 17];
  var R_D = [-16, -1, 1, 16];
  var K_D = [-17, -16, -15, -1, 1, 15, 16, 17];
  var CHARS = ' pnbrqk';
  var MATE = 100000, INF = 1000000;

  // Move: from | to<<7 | promo<<14 | flags<<17   flags: 1 capture, 2 en passant, 4 castle, 8 double push
  function mv(f, t, pr, fl) { return f | (t << 7) | (pr << 14) | (fl << 17); }
  var mFrom = function (m) { return m & 127; };
  var mTo = function (m) { return (m >> 7) & 127; };
  var mPromo = function (m) { return (m >> 14) & 7; };
  var mFlags = function (m) { return (m >> 17) & 15; };

  function sqName(s) { return 'abcdefgh'[s & 7] + ((s >> 4) + 1); }
  function sqParse(n) { return (n.charCodeAt(0) - 97) + ((n.charCodeAt(1) - 49) << 4); }

  // ---------- Zobrist ----------
  // Generate whole 64-bit keys with SplitMix64. Consecutive linear xorshift32
  // outputs must not be used as low/high halves: XOR preserves their dependence.
  // BigInt is used only during initialization; search still uses two int32 halves.
  var hashSeed = 0x2545F4919E3779B9n, HASH64_MASK = (1n << 64n) - 1n;
  function nextHashKey() {
    hashSeed = (hashSeed + 0x9E3779B97F4A7C15n) & HASH64_MASK;
    var z = hashSeed;
    z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & HASH64_MASK;
    z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & HASH64_MASK;
    return z ^ (z >> 31n);
  }
  function fillHashKeys(lo, hi) {
    for (var k = 0; k < lo.length; k++) {
      var key = nextHashKey();
      lo[k] = Number(key & 0xFFFFFFFFn) | 0; hi[k] = Number(key >> 32n) | 0;
    }
  }
  var i, ZL = new Int32Array(16 * 128), ZH = new Int32Array(16 * 128);
  fillHashKeys(ZL, ZH);
  var sideHash = nextHashKey(), ZSL = Number(sideHash & 0xFFFFFFFFn) | 0, ZSH = Number(sideHash >> 32n) | 0;
  var ZCL = new Int32Array(16), ZCH = new Int32Array(16); fillHashKeys(ZCL, ZCH);
  var ZEL = new Int32Array(8), ZEH = new Int32Array(8); fillHashKeys(ZEL, ZEH);

  var CR_MASK = new Int32Array(128);
  for (i = 0; i < 128; i++) CR_MASK[i] = 15;
  CR_MASK[0] = 15 & ~2; CR_MASK[7] = 15 & ~1; CR_MASK[4] = 15 & ~3;
  CR_MASK[112] = 15 & ~8; CR_MASK[119] = 15 & ~4; CR_MASK[116] = 15 & ~12;

  // ---------- Piece-square tables (white's view, a8 first) ----------
  var PST = {};
  PST[P] = [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
  PST[N] = [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];
  PST[B] = [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20];
  PST[R] = [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0];
  PST[Q] = [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20];
  var KMG = [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20];
  var KEG = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];
  var PASSED = [0, 5, 10, 20, 35, 60, 100, 0];
  var PHASE_W = [0, 0, 1, 1, 2, 4, 0];

  // ---------- Position ----------
  function Chess(fen) {
    this.nnue = null;
    this.b = new Int8Array(128);
    this.kingSq = [0, 0];
    // per-ply undo stacks
    this.uMove = []; this.uCap = []; this.uCastle = []; this.uEp = []; this.uHalf = [];
    this.hLo = []; this.hHi = [];
    this.load(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }
  var C = Chess.prototype;

  C.load = function (fen) {
    this.nnue = null;
    var parts = fen.trim().split(/\s+/), b = this.b, r, f, s, ch, idx;
    b.fill(0);
    var rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error('Bad FEN');
    for (r = 0; r < 8; r++) {
      f = 0;
      for (var k = 0; k < rows[r].length; k++) {
        ch = rows[r][k];
        if (ch >= '1' && ch <= '8') { f += +ch; continue; }
        idx = CHARS.indexOf(ch.toLowerCase());
        if (idx < 1) throw new Error('Bad FEN');
        s = ((7 - r) << 4) | f;
        b[s] = idx | (ch === ch.toLowerCase() ? BLACK : WHITE);
        if (idx === K) this.kingSq[ch === ch.toLowerCase() ? 1 : 0] = s;
        f++;
      }
    }
    this.side = parts[1] === 'b' ? BLACK : WHITE;
    var c = parts[2] || '-';
    this.castle = (c.indexOf('K') >= 0 ? 1 : 0) | (c.indexOf('Q') >= 0 ? 2 : 0) | (c.indexOf('k') >= 0 ? 4 : 0) | (c.indexOf('q') >= 0 ? 8 : 0);
    this.ep = parts[3] && parts[3] !== '-' ? sqParse(parts[3]) : -1;
    this.half = parseInt(parts[4] || '0', 10) || 0;
    this.full = parseInt(parts[5] || '1', 10) || 1;
    this.uMove.length = this.uCap.length = this.uCastle.length = this.uEp.length = this.uHalf.length = 0;
    this.computeHash();
    this.hLo = [this.lo]; this.hHi = [this.hi];
  };
  C.computeHash = function () {
    var lo = 0, hi = 0, b = this.b;
    for (var s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if (b[s]) { lo ^= ZL[b[s] * 128 + s]; hi ^= ZH[b[s] * 128 + s]; } }
    if (this.side) { lo ^= ZSL; hi ^= ZSH; }
    lo ^= ZCL[this.castle]; hi ^= ZCH[this.castle];
    if (this.ep >= 0) { lo ^= ZEL[this.ep & 7]; hi ^= ZEH[this.ep & 7]; }
    this.lo = lo; this.hi = hi;
  };
  C.fen = function () {
    var out = '', b = this.b;
    for (var r = 7; r >= 0; r--) {
      var e = 0;
      for (var f = 0; f < 8; f++) {
        var p = b[(r << 4) | f];
        if (!p) { e++; continue; }
        if (e) { out += e; e = 0; }
        var ch = CHARS[p & 7];
        out += p & BLACK ? ch : ch.toUpperCase();
      }
      if (e) out += e;
      if (r) out += '/';
    }
    var c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
    return out + ' ' + (this.side ? 'b' : 'w') + ' ' + (c || '-') + ' ' + (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
  };

  C.attacked = function (sq, by) {
    var b = this.b, s, i, p;
    if (by === WHITE) {
      s = sq - 15; if (!(s & 0x88) && b[s] === P) return true;
      s = sq - 17; if (!(s & 0x88) && b[s] === P) return true;
    } else {
      s = sq + 15; if (!(s & 0x88) && b[s] === (P | BLACK)) return true;
      s = sq + 17; if (!(s & 0x88) && b[s] === (P | BLACK)) return true;
    }
    for (i = 0; i < 8; i++) { s = sq + N_D[i]; if (!(s & 0x88) && b[s] === (N | by)) return true; }
    for (i = 0; i < 8; i++) { s = sq + K_D[i]; if (!(s & 0x88) && b[s] === (K | by)) return true; }
    for (i = 0; i < 4; i++) {
      s = sq + B_D[i];
      while (!(s & 0x88)) { p = b[s]; if (p) { if (p === (B | by) || p === (Q | by)) return true; break; } s += B_D[i]; }
      s = sq + R_D[i];
      while (!(s & 0x88)) { p = b[s]; if (p) { if (p === (R | by) || p === (Q | by)) return true; break; } s += R_D[i]; }
    }
    return false;
  };
  C.inCheck = function (side) {
    if (side === undefined) side = this.side;
    return this.attacked(this.kingSq[side >> 3], side ^ BLACK);
  };

  // Pseudo-legal moves; capsOnly for quiescence
  C.gen = function (capsOnly) {
    var out = [], b = this.b, us = this.side, them = us ^ BLACK, s, t, p, ty, i, d;
    var fwd = us ? -16 : 16, startR = us ? 6 : 1, promoR = us ? 0 : 7;
    for (s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      p = b[s];
      if (!p || (p & BLACK) !== us) continue;
      ty = p & 7;
      if (ty === P) {
        t = s + fwd;
        if (!(t & 0x88) && !b[t]) {
          if ((t >> 4) === promoR) { out.push(mv(s, t, Q, 0), mv(s, t, N, 0), mv(s, t, R, 0), mv(s, t, B, 0)); }
          else if (!capsOnly) {
            out.push(mv(s, t, 0, 0));
            if ((s >> 4) === startR && !b[t + fwd]) out.push(mv(s, t + fwd, 0, 8));
          }
        }
        for (i = -1; i <= 1; i += 2) {
          t = s + fwd + i;
          if (t & 0x88) continue;
          if (b[t] && (b[t] & BLACK) === them) {
            if ((t >> 4) === promoR) out.push(mv(s, t, Q, 1), mv(s, t, N, 1), mv(s, t, R, 1), mv(s, t, B, 1));
            else out.push(mv(s, t, 0, 1));
          } else if (t === this.ep) out.push(mv(s, t, 0, 3));
        }
      } else if (ty === N || ty === K) {
        var D = ty === N ? N_D : K_D;
        for (i = 0; i < 8; i++) {
          t = s + D[i];
          if (t & 0x88) continue;
          if (!b[t]) { if (!capsOnly) out.push(mv(s, t, 0, 0)); }
          else if ((b[t] & BLACK) === them) out.push(mv(s, t, 0, 1));
        }
      } else {
        var dirs = ty === B ? B_D : ty === R ? R_D : K_D;
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; t = s + d;
          while (!(t & 0x88)) {
            if (!b[t]) { if (!capsOnly) out.push(mv(s, t, 0, 0)); }
            else { if ((b[t] & BLACK) === them) out.push(mv(s, t, 0, 1)); break; }
            t += d;
          }
        }
      }
    }
    if (!capsOnly) {
      if (us === WHITE) {
        if ((this.castle & 1) && !b[5] && !b[6] && b[7] === R && !this.attacked(4, BLACK) && !this.attacked(5, BLACK) && !this.attacked(6, BLACK)) out.push(mv(4, 6, 0, 4));
        if ((this.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === R && !this.attacked(4, BLACK) && !this.attacked(3, BLACK) && !this.attacked(2, BLACK)) out.push(mv(4, 2, 0, 4));
      } else {
        if ((this.castle & 4) && !b[117] && !b[118] && b[119] === (R | BLACK) && !this.attacked(116, WHITE) && !this.attacked(117, WHITE) && !this.attacked(118, WHITE)) out.push(mv(116, 118, 0, 4));
        if ((this.castle & 8) && !b[115] && !b[114] && !b[113] && b[112] === (R | BLACK) && !this.attacked(116, WHITE) && !this.attacked(115, WHITE) && !this.attacked(114, WHITE)) out.push(mv(116, 114, 0, 4));
      }
    }
    return out;
  };

  C.make = function (m) {
    var b = this.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = (m >> 17) & 15;
    var p = b[f], us = this.side, cap, capSq = t, lo = this.lo, hi = this.hi;
    this.uMove.push(m); this.uCastle.push(this.castle); this.uEp.push(this.ep); this.uHalf.push(this.half);
    if (fl & 2) { capSq = us ? t + 16 : t - 16; }
    cap = b[capSq];
    this.uCap.push(cap);
    if (cap) { lo ^= ZL[cap * 128 + capSq]; hi ^= ZH[cap * 128 + capSq]; b[capSq] = 0; }
    lo ^= ZL[p * 128 + f]; hi ^= ZH[p * 128 + f];
    b[f] = 0;
    var np = pr ? (pr | us) : p;
    b[t] = np; lo ^= ZL[np * 128 + t]; hi ^= ZH[np * 128 + t];
    if ((p & 7) === K) this.kingSq[us >> 3] = t;
    if (fl & 4) {
      var rf, rt;
      if (t === 6) { rf = 7; rt = 5; } else if (t === 2) { rf = 0; rt = 3; } else if (t === 118) { rf = 119; rt = 117; } else { rf = 112; rt = 115; }
      var rp = b[rf]; b[rf] = 0; b[rt] = rp;
      lo ^= ZL[rp * 128 + rf] ^ ZL[rp * 128 + rt]; hi ^= ZH[rp * 128 + rf] ^ ZH[rp * 128 + rt];
    }
    lo ^= ZCL[this.castle]; hi ^= ZCH[this.castle];
    this.castle &= CR_MASK[f] & CR_MASK[t];
    lo ^= ZCL[this.castle]; hi ^= ZCH[this.castle];
    if (this.ep >= 0) { lo ^= ZEL[this.ep & 7]; hi ^= ZEH[this.ep & 7]; }
    this.ep = -1;
    if (fl & 8) { this.ep = (f + t) >> 1; lo ^= ZEL[this.ep & 7]; hi ^= ZEH[this.ep & 7]; }
    this.half = ((p & 7) === P || cap) ? 0 : this.half + 1;
    if (us) this.full++;
    this.side = us ^ BLACK; lo ^= ZSL; hi ^= ZSH;
    this.lo = lo; this.hi = hi;
    this.hLo.push(lo); this.hHi.push(hi);
    if (this.nnue) this.nnue.push(m, p, np, cap, capSq);
  };
  C.unmake = function () {
    if (this.nnue) { if (this.nnue.ply) this.nnue.ply--; else this.nnue = null; }
    var m = this.uMove.pop(), b = this.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = (m >> 17) & 15;
    this.side ^= BLACK; var us = this.side;
    var p = pr ? (P | us) : b[t];
    b[f] = p; b[t] = 0;
    var cap = this.uCap.pop();
    if (fl & 2) b[us ? t + 16 : t - 16] = cap; else b[t] = cap;
    if ((p & 7) === K) this.kingSq[us >> 3] = f;
    if (fl & 4) {
      var rf, rt;
      if (t === 6) { rf = 7; rt = 5; } else if (t === 2) { rf = 0; rt = 3; } else if (t === 118) { rf = 119; rt = 117; } else { rf = 112; rt = 115; }
      b[rf] = b[rt]; b[rt] = 0;
    }
    this.castle = this.uCastle.pop(); this.ep = this.uEp.pop(); this.half = this.uHalf.pop();
    if (us) this.full--;
    this.hLo.pop(); this.hHi.pop();
    this.lo = this.hLo[this.hLo.length - 1]; this.hi = this.hHi[this.hHi.length - 1];
  };
  C.makeNull = function () {
    this.uMove.push(0); this.uCap.push(0); this.uCastle.push(this.castle); this.uEp.push(this.ep); this.uHalf.push(this.half);
    var lo = this.lo ^ ZSL, hi = this.hi ^ ZSH;
    if (this.ep >= 0) { lo ^= ZEL[this.ep & 7]; hi ^= ZEH[this.ep & 7]; }
    this.ep = -1; this.side ^= BLACK; this.half++;
    this.lo = lo; this.hi = hi; this.hLo.push(lo); this.hHi.push(hi);
    if (this.nnue) this.nnue.push(0, 0, 0, 0, 0);
  };
  C.unmakeNull = function () {
    if (this.nnue) { if (this.nnue.ply) this.nnue.ply--; else this.nnue = null; }
    this.uMove.pop(); this.uCap.pop(); this.castle = this.uCastle.pop(); this.ep = this.uEp.pop(); this.half = this.uHalf.pop();
    this.side ^= BLACK; this.hLo.pop(); this.hHi.pop();
    this.lo = this.hLo[this.hLo.length - 1]; this.hi = this.hHi[this.hHi.length - 1];
  };

  C.legalMoves = function () {
    var ms = this.gen(false), out = [], us = this.side;
    for (var i = 0; i < ms.length; i++) {
      this.make(ms[i]);
      if (!this.attacked(this.kingSq[us >> 3], us ^ BLACK)) out.push(ms[i]);
      this.unmake();
    }
    return out;
  };
  C.uci = function (m) { var pr = mPromo(m); return sqName(mFrom(m)) + sqName(mTo(m)) + (pr ? CHARS[pr] : ''); };
  C.findUci = function (u) {
    var ms = this.legalMoves();
    for (var i = 0; i < ms.length; i++) if (this.uci(ms[i]) === u) return ms[i];
    // allow promotion without letter (default queen)
    if (u.length === 4) for (i = 0; i < ms.length; i++) if (this.uci(ms[i]) === u + 'q') return ms[i];
    return 0;
  };
  C.san = function (m) {
    var b = this.b, f = mFrom(m), t = mTo(m), fl = mFlags(m), p = b[f] & 7, s = '';
    if (fl & 4) s = (t & 7) === 6 ? 'O-O' : 'O-O-O';
    else {
      if (p === P) { if (fl & 1) s = 'abcdefgh'[f & 7] + 'x'; s += sqName(t); if (mPromo(m)) s += '=' + CHARS[mPromo(m)].toUpperCase(); }
      else {
        s = CHARS[p].toUpperCase();
        var ms = this.legalMoves(), sameF = false, sameR = false, amb = false;
        for (var i = 0; i < ms.length; i++) {
          var o = ms[i], of = mFrom(o);
          if (o !== m && mTo(o) === t && (b[of] & 7) === p) { amb = true; if ((of & 7) === (f & 7)) sameF = true; if ((of >> 4) === (f >> 4)) sameR = true; }
        }
        if (amb) { if (!sameF) s += 'abcdefgh'[f & 7]; else if (!sameR) s += (f >> 4) + 1; else s += sqName(f); }
        if (fl & 1) s += 'x';
        s += sqName(t);
      }
    }
    this.make(m);
    if (this.inCheck()) s += this.legalMoves().length ? '+' : '#';
    this.unmake();
    return s;
  };
  C.repetitions = function () {
    var n = 0, L = this.hLo.length - 1, lo = this.lo, hi = this.hi;
    for (var i = L; i >= 0 && i >= L - this.half; i -= 2) if (this.hLo[i] === lo && this.hHi[i] === hi) n++;
    return n;
  };
  C.insufficient = function () {
    var b = this.b, minors = 0, bishops = [], s;
    for (s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      var p = b[s] & 7;
      if (!p || p === K) continue;
      if (p === P || p === R || p === Q) return false;
      minors++; if (p === B) bishops.push(((s >> 4) + (s & 7)) & 1);
    }
    if (minors <= 1) return true;
    if (minors === bishops.length && bishops.every(function (x) { return x === bishops[0]; })) return true;
    return false;
  };
  // Returns null or {result:'1-0'|'0-1'|'1/2-1/2', reason}.
  // Casual: threefold repetition and the fifty-move rule end the game automatically.
  // Official (FIDE Laws 9.6): only fivefold repetition and the 75-move rule are automatic; 9.2/9.3 draws must be claimed.
  C.status = function (official) {
    var ms = this.legalMoves();
    if (!ms.length) {
      if (this.inCheck()) return { result: this.side ? '1-0' : '0-1', reason: 'checkmate' };
      return { result: '1/2-1/2', reason: 'stalemate' };
    }
    if (this.insufficient()) return { result: '1/2-1/2', reason: official ? 'dead position' : 'insufficient material' };
    if (official) {
      if (this.repetitions() >= 5) return { result: '1/2-1/2', reason: 'fivefold repetition' };
      if (this.half >= 150) return { result: '1/2-1/2', reason: '75-move rule' };
      return null;
    }
    if (this.half >= 100) return { result: '1/2-1/2', reason: 'fifty-move rule' };
    if (this.repetitions() >= 3) return { result: '1/2-1/2', reason: 'threefold repetition' };
    return null;
  };
  // A draw the player to move may claim under official rules, or null
  C.claimable = function () {
    if (this.repetitions() >= 3) return 'threefold repetition';
    if (this.half >= 100) return 'fifty-move rule';
    return null;
  };
  // Could this colour ('w' or 'b') checkmate by any series of legal moves? (FIDE 6.9: flag-fall is a draw if not)
  C.canMate = function (color) {
    var b = this.b, me = color === 'b' ? BLACK : WHITE, minors = 0, oppMaterial = 0, s, p;
    for (s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      p = b[s]; if (!p || (p & 7) === K) continue;
      if ((p & BLACK) === me) { var t = p & 7; if (t === P || t === R || t === Q) return true; minors++; }
      else oppMaterial++;
    }
    if (minors >= 2) return true;
    if (minors === 1) return oppMaterial > 0;
    return false;
  };
  C.pieceAt = function (name) { var p = this.b[sqParse(name)]; if (!p) return null; return { type: CHARS[p & 7], color: p & BLACK ? 'b' : 'w' }; };

  // ---------- Static exchange evaluation ----------
  var SEEB = new Int8Array(128);
  var SEE_VAL = [0, 100, 320, 330, 500, 900, 10000];
  function leastAttacker(bb, sq, side) {
    var s, i, p, best = -1, bestV = 99;
    if (side === WHITE) {
      s = sq - 15; if (!(s & 0x88) && bb[s] === P) return s;
      s = sq - 17; if (!(s & 0x88) && bb[s] === P) return s;
    } else {
      s = sq + 15; if (!(s & 0x88) && bb[s] === (P | BLACK)) return s;
      s = sq + 17; if (!(s & 0x88) && bb[s] === (P | BLACK)) return s;
    }
    for (i = 0; i < 8; i++) { s = sq + N_D[i]; if (!(s & 0x88) && bb[s] === (N | side)) return s; }
    for (i = 0; i < 4; i++) {
      s = sq + B_D[i];
      while (!(s & 0x88)) { p = bb[s]; if (p) { if ((p & BLACK) === side && ((p & 7) === B || (p & 7) === Q)) { var v = (p & 7) === B ? 3 : 5; if (v < bestV) { bestV = v; best = s; } } break; } s += B_D[i]; }
      s = sq + R_D[i];
      while (!(s & 0x88)) { p = bb[s]; if (p) { if ((p & BLACK) === side && ((p & 7) === R || (p & 7) === Q)) { var v2 = (p & 7) === R ? 4 : 5; if (v2 < bestV) { bestV = v2; best = s; } } break; } s += R_D[i]; }
    }
    if (best >= 0) return best;
    for (i = 0; i < 8; i++) { s = sq + K_D[i]; if (!(s & 0x88) && bb[s] === (K | side)) return s; }
    return -1;
  }
  // Material balance of the capture sequence on the target square, for the side making move m
  C.see = function (m) {
    var b = this.b, from = m & 127, to = (m >> 7) & 127, fl = (m >> 17) & 15, pr = (m >> 14) & 7;
    SEEB.set(b);
    var gain = [], d = 0, side = b[from] & BLACK;
    var target = (fl & 2) ? P : (b[to] & 7);
    gain[0] = target ? SEE_VAL[target] : 0;
    var attacker = b[from] & 7;
    if (pr) { gain[0] += SEE_VAL[pr] - SEE_VAL[P]; attacker = pr; }
    SEEB[from] = 0;
    if (fl & 2) SEEB[side ? to + 16 : to - 16] = 0;
    side ^= BLACK;
    while (true) {
      var s = leastAttacker(SEEB, to, side);
      if (s < 0) break;
      d++;
      gain[d] = SEE_VAL[attacker] - gain[d - 1];
      attacker = SEEB[s] & 7;
      if (attacker === K && leastAttacker(SEEB, to, side ^ BLACK) >= 0) { d--; break; }
      SEEB[s] = 0; side ^= BLACK;
    }
    while (d > 0) { gain[d - 1] = -Math.max(-gain[d - 1], gain[d]); d--; }
    return gain[0];
  };

