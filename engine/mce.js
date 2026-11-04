  // Mitchell Constraint Engine: original deterministic features, MIT.
  // Embedded into the existing 0x88 legal engine; no imported model or engine.
  // Feature order is fixed for reproducible self-play training.
  var MCE_KEYS = ['pin', 'kingRing', 'escape', 'entropy', 'loose'];
  var MCE_WEIGHTS = {"pin": 33, "kingRing": 0, "escape": 10, "entropy": 0, "loose": 36};
  var MCE_ATTACK = [new Uint8Array(128), new Uint8Array(128)];
  var MCE_FILES = [new Uint16Array(8), new Uint16Array(8)];
  var MCE_FEATURES = new Float64Array(5);
  var MCE_VALUE = [0, 1, 3, 3, 5, 9, 0];
  function mceFeatures(pos, evaluationOnly) {
    var board = pos.b, maps = MCE_ATTACK, files = MCE_FILES, features = MCE_FEATURES;
    maps[0].fill(0); maps[1].fill(0); files[0].fill(0); files[1].fill(0); features.fill(0);
    var square, piece, type, colour, target, j, dirs, slide;
    // Attack maps include defended friendly pieces and stop at the first blocker.
    for (square = 0; square < 128; square++) {
      if (square & 0x88) { square += 7; continue; }
      piece = board[square]; if (!piece) continue;
      colour = (piece & 8) >> 3; type = piece & 7;
      if (type === P) {
        var step = colour ? -16 : 16;
        for (j = -1; j <= 1; j += 2) { target = square + step + j; if (!(target & 0x88)) maps[colour][target]++; }
      } else {
        dirs = type === N ? N_D : type === B ? B_D : type === R ? R_D : K_D;
        slide = type !== N && type !== K;
        for (j = 0; j < dirs.length; j++) {
          target = square + dirs[j];
          while (!(target & 0x88)) {
            maps[colour][target]++;
            if (board[target] || !slide) break;
            target += dirs[j];
          }
        }
      }
    }
    for (colour = 0; colour < 2; colour++) {
      var sign = colour ? -1 : 1, king = pos.kingSq[colour], enemy = 1 - colour;
      // Absolute pins: own first blocker followed by an opposing compatible slider.
      // A pin is a soft feature, never an excuse to prune a legal sacrifice.
      for (j = 0; j < K_D.length; j++) {
        var direction = K_D[j], blocker = -1;
        target = king + direction;
        while (!(target & 0x88)) {
          piece = board[target];
          if (piece) {
            if (blocker < 0) {
              if (((piece & 8) >> 3) !== colour) break;
              blocker = target;
            } else {
              type = piece & 7;
              var diagonal = direction !== -16 && direction !== -1 && direction !== 1 && direction !== 16;
              if (((piece & 8) >> 3) === enemy && (type === Q || type === (diagonal ? B : R))) features[0] -= sign * MCE_VALUE[board[blocker] & 7];
              break;
            }
          }
          target += direction;
        }
      }
      for (j = 0; j < K_D.length; j++) {
        target = king + K_D[j]; if (target & 0x88) continue;
        if ((!evaluationOnly || MCE_WEIGHTS.kingRing) && maps[enemy][target]) features[1] -= sign * Math.min(3, maps[enemy][target]);
        // Pseudo-safe empty exits are evaluation hints, not legal king moves.
        if (!board[target] && !maps[enemy][target]) features[2] += sign;
      }
    }
    for (square = 0; square < 128; square++) {
      if (square & 0x88) { square += 7; continue; }
      piece = board[square]; if (!piece) continue;
      colour = (piece & 8) >> 3; type = piece & 7;
      var sg = colour ? -1 : 1;
      if (type !== K && maps[1 - colour][square] && !maps[colour][square]) features[4] -= sg * MCE_VALUE[type];
      if (type === P || type === K || (evaluationOnly && !MCE_WEIGHTS.entropy)) continue;
      dirs = type === N ? N_D : type === B ? B_D : type === R ? R_D : K_D;
      slide = type !== N;
      for (j = 0; j < dirs.length; j++) {
        target = square + dirs[j];
        while (!(target & 0x88)) {
          var occupant = board[target];
          if ((!occupant || ((occupant & 8) >> 3) !== colour) && !maps[1 - colour][target]) files[colour][target & 7]++;
          if (occupant || !slide) break;
          target += dirs[j];
        }
      }
    }
    // Shannon entropy of safe destination-file counts. This measures diversity;
    // it is not a recursive search, a proof of constraint, or a hard legality gate.
    for (colour = 0; colour < 2 && (!evaluationOnly || MCE_WEIGHTS.entropy); colour++) {
      var total = 0, entropy = 0;
      for (j = 0; j < 8; j++) total += files[colour][j];
      if (total) for (j = 0; j < 8; j++) if (files[colour][j]) {
        var probability = files[colour][j] / total;
        entropy -= probability * Math.log2(probability);
      }
      features[3] += (colour ? -1 : 1) * entropy;
    }
    return features; // Shared scratch: copy if retaining across another evaluation.
  }
  function mceEvaluate(pos) {
    var base = evaluate(pos, 'full');
    // Preserve exact KPK draws and classical sparse-endgame conversion guidance.
    var count = 0;
    for (var sq = 0; sq < 128; sq++) { if (sq & 0x88) { sq += 7; continue; } if (pos.b[sq]) count++; }
    if (count <= 4) return base;
    var features = mceFeatures(pos, true), adjustment = 0;
    for (var k = 0; k < MCE_KEYS.length; k++) adjustment += features[k] * MCE_WEIGHTS[MCE_KEYS[k]];
    return base + (pos.side ? -1 : 1) * Math.round(adjustment);
  }
