// Generated from src/engine/personality.js; original MIT.
  static int personaBias(Position& pos, int aggression) {
    if (!aggression) return 0;
    i8* b=pos.b; int activity=0,shelter=0,retained=0,phase=0;
    for (int s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      int p = b[s], ty = p & 7;
      if (!p || ty == K) continue;
      int side = p & BLACK ? 1 : 0, sign = side ? -1 : 1;
      int rank = s >> 4, file = s & 7, rr = side ? 7 - rank : rank;
      int enemyKing = pos.kingSq[1 - side], ownKing = pos.kingSq[side];
      int distance = iabs(file - (enemyKing & 7)) + iabs(rank - (enemyKing >> 4));
      phase += PHASE_W[ty];
      if (ty == P) {
        activity += sign * imax(0, rr - 1) * (iabs(file - (enemyKing & 7)) <= 1 ? 3 : 1);
        int front = side ? (ownKing >> 4) - rank : rank - (ownKing >> 4);
        if (iabs(file - (ownKing & 7)) <= 1 && front >= 1 && front <= 2) shelter += sign * (front == 1 ? 6 : 3);
      } else {
        activity += sign * (imax(0, 7 - distance) * 2 + (ty == N || ty == B ? imin(rr, 5) * 2 : 0));
        retained += sign * 4;
      }
    }
    // At <= two rooks of phase, preserve the engine's normal endgame guidance.
    phase = imin(24, imax(0, phase - 4));
    int score = ((activity - shelter * 2 + retained) * aggression * phase / 2400) | 0;
    score = imax(-60, imin(60, score));
    return pos.side ? -score : score;
  }
