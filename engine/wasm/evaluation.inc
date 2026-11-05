// Generated mechanical port of src/engine/evaluation.js; original MIT.
static int evaluate(Position& pos, int mode) {
    if (mode == 3) return neuralEvaluate(pos);
    i8* b=pos.b; int s,p,ty,white,idx,mg=0,eg=0,phase=0,mat[2]={0,0},pawnCount[2]={0,0};
    if (mode == 0) {
      for (s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } p = b[s]; if (p && (p & 7) != K) mg += (p & BLACK ? -1 : 1) * VAL[p & 7]; }
      return pos.side ? -mg : mg;
    }
    int full = mode == 2;
    int* pawnsW=EW.data; int* pawnsB=EB.data; int bishops[2]={0,0}; EW.fill(0);EB.fill(0);
    int* minRankW=EMinW.fill(8);int* maxRankB=EMaxB.fill(-1);
    int* maxRankW=EMaxW.fill(-1);int* minRankB=EMinB.fill(8);
    int pawnColours[4]={0,0,0,0};
    Moves& pieces=EPieces; pieces.length = 0; PAW.fill(0); PAB.fill(0);
    for (s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      p = b[s]; if (!p) continue;
      ty = p & 7; white = !(p & BLACK);
      int r = s >> 4, f = s & 7;
      idx = white ? (7 - r) * 8 + f : r * 8 + f;
      int sign = white ? 1 : -1;
      phase += PHASE_W[ty];
      if (ty == K) { mg += sign * KMG[idx]; eg += sign * KEG[idx]; continue; }
      mat[white ? 0 : 1] += VAL[ty];
      int v = VAL[ty] + PST[ty][idx];
      if (ty == P) {
        pawnCount[white ? 0 : 1]++;
        pawnColours[(white ? 0 : 2) + ((r + f) & 1)]++;
        if (full) {
          int*pa=white?PAW.data:PAB.data;int step=white?16:-16;
          if (!((s + step - 1) & 0x88)) pa[s + step - 1]++;
          if (!((s + step + 1) & 0x88)) pa[s + step + 1]++;
        }
        mg += sign * v; eg += sign * (VAL[P] + 10 + (white ? r : 7 - r) * 7);
        if (white) { pawnsW[f]++; if (r < minRankW[f]) minRankW[f] = r; if (r > maxRankW[f]) maxRankW[f] = r; }
        else { pawnsB[f]++; if (r > maxRankB[f]) maxRankB[f] = r; if (r < minRankB[f]) minRankB[f] = r; }
      } else {
        mg += sign * v;
        eg += sign * (ty == R ? VAL[R] + 10 : ty == Q ? VAL[Q] + 10 + PST[Q][idx] : v);
        if (ty == B) bishops[white ? 0 : 1]++;
        if (full) pieces.push(s);
      }
    }
    if (full && pawnCount[0] + pawnCount[1] == 1 && mat[0] + mat[1] == VAL[P]) {
      KPKResult* kpk=probeKPK(pos);
      if (kpk && !kpk->win) return 0;
      if (kpk) eg += kpk->owner ? -700 : 700;
    }
    if (bishops[0] >= 2) { mg += 30; eg += 50; }
    if (bishops[1] >= 2) { mg -= 30; eg -= 50; }
    if (full) {
      int kW = pos.kingSq[0], kB = pos.kingSq[1];
      // pawn structure
      for (int fi = 0; fi < 8; fi++) {
        int lw = fi > 0 ? pawnsW[fi - 1] : 0, rw = fi < 7 ? pawnsW[fi + 1] : 0;
        int lb = fi > 0 ? pawnsB[fi - 1] : 0, rb = fi < 7 ? pawnsB[fi + 1] : 0;
        if (pawnsW[fi] > 1) { mg -= 11 * (pawnsW[fi] - 1); eg -= 22 * (pawnsW[fi] - 1); }
        if (pawnsB[fi] > 1) { mg += 11 * (pawnsB[fi] - 1); eg += 22 * (pawnsB[fi] - 1); }
        if (pawnsW[fi] && !lw && !rw) { mg -= 12; eg -= 16; }
        if (pawnsB[fi] && !lb && !rb) { mg += 12; eg += 16; }
        if (pawnsW[fi]) {
          int rr = maxRankW[fi], passed = true;
          for (int ff = imax(0, fi - 1); ff <= imin(7, fi + 1); ff++) if (pawnsB[ff] && maxRankB[ff] > rr) { passed = false; break; }
          if (passed) {
            int ps = (rr << 4) | fi, front = ps + 16, prom = 0x70 | fi;
            int bonusMg = PASSED[rr], bonusEg = PASSED[rr] * 2;
            int dOwn = imax(iabs((kW & 7) - fi), iabs((kW >> 4) - 7)), dOpp = imax(iabs((kB & 7) - fi), iabs((kB >> 4) - 7));
            bonusEg += (dOpp * 5 - dOwn * EVAL_WEIGHTS.kingPasser) * (rr >= 3 ? rr - 2 : 1);
            if (!(front & 0x88) && b[front]) { bonusMg >>= 1; bonusEg >>= 1; }
            if (pawnsW[fi] && (b[ps - 15] == P || b[ps - 17] == P)) bonusEg += 10;
            mg += bonusMg; eg += bonusEg;
          }
        }
        if (pawnsB[fi]) {
          int rb2 = minRankB[fi], passedB = true;
          for (int fb = imax(0, fi - 1); fb <= imin(7, fi + 1); fb++) if (pawnsW[fb] && minRankW[fb] < rb2) { passedB = false; break; }
          if (passedB) {
            int psb = (rb2 << 4) | fi, frontB = psb - 16, rel = 7 - rb2;
            int bMg = PASSED[rel], bEg = PASSED[rel] * 2;
            int dOwnB = imax(iabs((kB & 7) - fi), kB >> 4), dOppB = imax(iabs((kW & 7) - fi), kW >> 4);
            bEg += (dOppB * 5 - dOwnB * EVAL_WEIGHTS.kingPasser) * (rel >= 3 ? rel - 2 : 1);
            if (!(frontB & 0x88) && b[frontB]) { bMg >>= 1; bEg >>= 1; }
            if (!((psb + 15) & 0x88) && b[psb + 15] == (P | BLACK) || !((psb + 17) & 0x88) && b[psb + 17] == (P | BLACK)) bEg += 10;
            mg -= bMg; eg -= bEg;
          }
        }
      }
      // supported / phalanx pawns
      for (s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        p = b[s];
        if (p == P) { if ((!((s - 15) & 0x88) && b[s - 15] == P) || (!((s - 17) & 0x88) && b[s - 17] == P)) { mg += 7; eg += 5; } if (!((s + 1) & 0x88) && b[s + 1] == P) { mg += 5; eg += 3; } }
        else if (p == (P | BLACK)) { if ((!((s + 15) & 0x88) && b[s + 15] == (P | BLACK)) || (!((s + 17) & 0x88) && b[s + 17] == (P | BLACK))) { mg -= 7; eg -= 5; } if (!((s + 1) & 0x88) && b[s + 1] == (P | BLACK)) { mg -= 5; eg -= 3; } }
      }
      // Backward pawns cannot advance safely and lack support from behind.
      for (int pf = 0; pf < 8; pf++) {
        if (pawnsW[pf]) {
          int pw = (minRankW[pf] << 4) | pf;
          if (PAB[pw + 16] && (pf == 0 || minRankW[pf - 1] > minRankW[pf]) && (pf == 7 || minRankW[pf + 1] > minRankW[pf])) mg -= EVAL_WEIGHTS.backward;
        }
        if (pawnsB[pf]) {
          int pb = (maxRankB[pf] << 4) | pf;
          if (PAW[pb - 16] && (pf == 0 || maxRankB[pf - 1] < maxRankB[pf]) && (pf == 7 || maxRankB[pf + 1] < maxRankB[pf])) mg += EVAL_WEIGHTS.backward;
        }
      }
      // king zones
      ZONE.fill(0);
      int kz[2]={kW,kB};
      for (int zs = 0; zs < 2; zs++) {
        int kq = kz[zs], bit = zs ? 2 : 1, fwd = zs ? -16 : 16;
        ZONE[kq] |= bit;
        for (int zi = 0; zi < 8; zi++) { int z = kq + KD[zi]; if (!(z & 0x88)) { ZONE[z] |= bit; int z2 = z + fwd; if (!(z2 & 0x88)) ZONE[z2] |= bit; } }
      }
      int atkUnits[2]={0,0},atkers[2]={0,0};
      // pieces: mobility, king attack, outposts, rook files
      for (int pi = 0; pi < pieces.length; pi++) {
        s = pieces[pi]; p = b[s]; ty = p & 7; int wh = !(p & BLACK), sg = wh ? 1 : -1, ci = wh ? 0 : 1, enemyBit = wh ? 2 : 1;
        int mob=0,safeMob=0,hits=0,slide=ty!=N;const int*dirs=ty==N?ND:ty==B?BD:ty==R?RD:KD;int dirLength=ty==N||ty==Q?8:4;
        for (int di = 0; di < dirLength; di++) {
          int t = s + dirs[di];
          while (!(t & 0x88)) {
            int q = b[t];
            if (ZONE[t] & enemyBit) hits++;
            if (!q || (q & BLACK) != (p & BLACK)) {
              mob++; if (!(wh ? PAB[t] : PAW[t])) safeMob++;
            }
            if (q) break;
            if (!slide) break;
            t += dirs[di];
          }
        }
        mg += sg * (safeMob - mob) * EVAL_WEIGHTS.safeMobility;
        if ((wh ? PAB[s] : PAW[s])) mg -= sg * EVAL_WEIGHTS.pawnThreat;
        if (ty == B) {
          int badPawns = pawnColours[(wh ? 0 : 2) + (((s >> 4) + (s & 7)) & 1)];
          mg -= sg * badPawns * EVAL_WEIGHTS.bishopPawn;
        }
        mg += sg * (mob - MOB_BASE[ty]) * MOB_MG[ty]; eg += sg * (mob - MOB_BASE[ty]) * MOB_EG[ty];
        if (hits) { atkUnits[ci] += ATK_W[ty] * hits; atkers[ci]++; }
        int r2 = s >> 4, f2 = s & 7, relR = wh ? r2 : 7 - r2;
        if ((ty == N || ty == B) && relR >= 3 && relR <= 5) {
          int sup = wh ? ((!((s - 15) & 0x88) && b[s - 15] == P) || (!((s - 17) & 0x88) && b[s - 17] == P)) : ((!((s + 15) & 0x88) && b[s + 15] == (P | BLACK)) || (!((s + 17) & 0x88) && b[s + 17] == (P | BLACK)));
          int safe = true;
          for (int af = f2 - 1; af <= f2 + 1; af += 2) { if (af < 0 || af > 7) continue; if (wh ? (pawnsB[af] && maxRankB[af] > r2) : (pawnsW[af] && minRankW[af] < r2)) safe = false; }
          if (sup && safe) { mg += sg * (ty == N ? 28 : 14); eg += sg * (ty == N ? 16 : 8); }
        }
        if (ty == R) {
          int own = wh ? pawnsW[f2] : pawnsB[f2], opp = wh ? pawnsB[f2] : pawnsW[f2];
          if (!own && !opp) { mg += sg * 24; eg += sg * 10; } else if (!own) { mg += sg * 12; eg += sg * 6; }
          if (relR == 6) { mg += sg * 14; eg += sg * 22; }
          // Count each connected pair once.
          for (int rd = 0; rd < 2; rd++) {
            int rt = s + (rd ? 16 : 1);
            while (!(rt & 0x88) && !b[rt]) rt += rd ? 16 : 1;
            if (!(rt & 0x88) && b[rt] == p) { mg += sg * EVAL_WEIGHTS.connectedRooks; eg += sg * EVAL_WEIGHTS.connectedRooks; }
          }
        }
        if (ty == Q && relR >= 1 && pos.full <= 8) { int homeN = wh ? (b[1] == N) + (b[6] == N) + (b[2] == B) + (b[5] == B) : (b[113] == (N | BLACK)) + (b[118] == (N | BLACK)) + (b[114] == (B | BLACK)) + (b[117] == (B | BLACK)); mg -= sg * homeN * 6; }
      }
      // king shelter and attack
      for (int side = 0; side < 2; side++) {
        int ks = pos.kingSq[side], kf = ks & 7, kr = ks >> 4, shelter = 0, sg2 = side ? -1 : 1;
        if ((side == 0 && kr <= 1) || (side == 1 && kr >= 6)) {
          for (int df = -1; df <= 1; df++) {
            int sf = kf + df; if (sf < 0 || sf > 7) continue;
            int s1 = (side == 0 ? (kr + 1) << 4 : (kr - 1) << 4) | sf, s2 = (side == 0 ? (kr + 2) << 4 : (kr - 2) << 4) | sf;
            int own2 = P | (side ? BLACK : 0);
            if (!(s1 & 0x88) && b[s1] == own2) shelter += 12; else if (!(s2 & 0x88) && b[s2] == own2) shelter += 6; else shelter -= 12;
            if (!(side ? pawnsW[sf] : pawnsB[sf]) && !(side ? pawnsB[sf] : pawnsW[sf])) shelter -= 10;
          }
        } else if (phase > 14) shelter -= 25;
        mg += sg2 * shelter;
        int enemy = 1 - side;
        if (atkers[enemy] >= 2) { int pen = SAFETY[imin(99, atkUnits[enemy])]; mg -= sg2 * pen; }
      }
    }
    if (phase > 24) phase = 24;
    int score = (((mg * phase) + (eg * (24 - phase))) / 24) | 0;
    int diff = mat[0] - mat[1];
    // drawish: a minor piece up with no pawns cannot win
    if (diff > 0 && pawnCount[0] == 0 && mat[0] < 400) score = score >> 3;
    else if (diff < 0 && pawnCount[1] == 0 && mat[1] < 400) score = score >> 3;
    // mop-up: drive a lone king to the edge
    if (phase <= 8 && iabs(diff) >= 300) {
      int strong = diff > 0 ? 0 : 1, weak = 1 - strong;
      int wk = pos.kingSq[weak], sk = pos.kingSq[strong];
      int wf = wk & 7, wr2 = wk >> 4;
      int centerDist = imax(3 - wf, wf - 4) + imax(3 - wr2, wr2 - 4);
      int kd = iabs((wk & 7) - (sk & 7)) + iabs((wk >> 4) - (sk >> 4));
      int mop = centerDist * 12 + (14 - kd) * 5;
      if (full && mat[weak] == 0 && bishops[strong] == 1 && mat[strong] == VAL[B] + VAL[N]) {
        // KBNK: the mating corners must match the bishop's square colour.
        for (int bi = 0; bi < pieces.length; bi++) {
          int bs = pieces[bi];
          if (b[bs] != (B | (strong ? BLACK : 0))) continue;
          int light = ((bs >> 4) + (bs & 7)) & 1;
          int cornerDistance = light ? imin(wf + 7 - wr2, 7 - wf + wr2) : imin(wf + wr2, 14 - wf - wr2);
          mop += (7 - cornerDistance) * 35;
        }
      }
      score += strong == 0 ? mop : -mop;
    }
    score += pos.side ? -12 : 12;
    return pos.side ? -score : score;
  }

