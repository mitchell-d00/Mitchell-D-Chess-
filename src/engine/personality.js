  // Original MIT style preferences. Standard (zero) never changes evaluation.
  function normalizePersona(value) {
    if (!value || typeof value !== 'object' || !Number.isInteger(value.aggression) || value.aggression < -100 || value.aggression > 100 || typeof value.name !== 'string') return null;
    var name = value.name.trim();
    if (!name || name.length > 40 || /[\x00-\x1f\x7f]/.test(name)) return null;
    return { name: name, aggression: value.aggression };
  }
  // Kept simple for an exact mechanical C++ translation. Side-to-move cp.
  function personaBias(pos, aggression) {
    if (!aggression) return 0;
    var b = pos.b, activity = 0, shelter = 0, retained = 0, phase = 0;
    for (var s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      var p = b[s], ty = p & 7;
      if (!p || ty === K) continue;
      var side = p & BLACK ? 1 : 0, sign = side ? -1 : 1;
      var rank = s >> 4, file = s & 7, rr = side ? 7 - rank : rank;
      var enemyKing = pos.kingSq[1 - side], ownKing = pos.kingSq[side];
      var distance = Math.abs(file - (enemyKing & 7)) + Math.abs(rank - (enemyKing >> 4));
      phase += PHASE_W[ty];
      if (ty === P) {
        activity += sign * Math.max(0, rr - 1) * (Math.abs(file - (enemyKing & 7)) <= 1 ? 3 : 1);
        var front = side ? (ownKing >> 4) - rank : rank - (ownKing >> 4);
        if (Math.abs(file - (ownKing & 7)) <= 1 && front >= 1 && front <= 2) shelter += sign * (front === 1 ? 6 : 3);
      } else {
        activity += sign * (Math.max(0, 7 - distance) * 2 + (ty === N || ty === B ? Math.min(rr, 5) * 2 : 0));
        retained += sign * 4;
      }
    }
    // At <= two rooks of phase, preserve the engine's normal endgame guidance.
    phase = Math.min(24, Math.max(0, phase - 4));
    var score = ((activity - shelter * 2 + retained) * aggression * phase / 2400) | 0;
    score = Math.max(-60, Math.min(60, score));
    return pos.side ? -score : score;
  }
