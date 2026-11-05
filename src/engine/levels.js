  // ---------- Levels ----------
  // d max depth, t time budget ms, ev evaluation, q quiescence, noise (centipawn sd), bl chance of a deliberate weaker move,
  // adv advanced pruning (SEE, futility, late-move reductions), book opening book
  var LEVELS = [
    { name: 'Pawn Pusher', tier: 'Beginner', random: true, about: 'Plays random legal moves and loves grabbing pieces.' },
    { name: 'First Steps', tier: 'Beginner', d: 1, ev: 'mat', q: false, noise: 260, bl: 0.4, about: 'Counts pieces one move ahead and misses most threats.' },
    { name: 'Curious Cat', tier: 'Beginner', d: 1, ev: 'mat', q: true, noise: 200, bl: 0.3, about: 'Sees simple captures but still drops pieces.' },
    { name: 'Kitchen Table', tier: 'Beginner', d: 1, ev: 'pst', q: true, noise: 160, bl: 0.25, about: 'Starts to like the centre. Often leaves pieces loose.' },
    { name: 'Rookie', tier: 'Beginner', d: 2, ev: 'pst', q: true, noise: 140, bl: 0.2, about: 'Looks two moves ahead and starts to value piece placement.' },
    { name: 'Weekend Player', tier: 'Novice', d: 2, ev: 'pst', q: true, noise: 120, bl: 0.16, about: 'Develops pieces and sometimes sees your threats.' },
    { name: 'Park Bench', tier: 'Novice', d: 2, ev: 'pst', q: true, noise: 95, bl: 0.13, about: 'Spots one-move tactics and protects its pieces.' },
    { name: 'Coffeehouse', tier: 'Novice', d: 2, ev: 'pst', q: true, noise: 75, bl: 0.1, about: 'Rarely hangs a piece, still loose in the endgame.' },
    { name: 'Library Club', tier: 'Novice', d: 3, ev: 'pst', q: true, noise: 65, bl: 0.08, about: 'Thinks three moves deep, plays by simple principles.' },
    { name: 'School Champion', tier: 'Novice', d: 3, ev: 'pst', q: true, noise: 55, bl: 0.06, book: true, about: 'Knows a few openings and punishes obvious blunders.' },
    { name: 'Club Rookie', tier: 'Club', d: 3, ev: 'full', q: true, noise: 45, bl: 0.05, book: true, about: 'Understands pawn structure, open files and king safety.' },
    { name: 'Club Regular', tier: 'Club', d: 3, ev: 'full', q: true, noise: 35, bl: 0.04, book: true, about: 'Solid and patient. Likes outposts for its knights.' },
    { name: 'Club Captain', tier: 'Club', d: 3, ev: 'full', q: true, noise: 25, bl: 0.03, book: true, about: 'Punishes loose pieces and weak pawns.' },
    { name: 'County Player', tier: 'Club', d: 4, ev: 'full', q: true, noise: 20, bl: 0.02, book: true, about: 'Four moves deep. Finds forks and pins.' },
    { name: 'League Anchor', tier: 'Club', d: 4, ev: 'full', q: true, noise: 14, bl: 0.015, book: true, about: 'Rarely errs in simple positions.' },
    { name: 'Tactician', tier: 'Intermediate', d: 4, ev: 'full', q: true, noise: 9, bl: 0.01, book: true, about: 'Sharp at short combinations, a small mistake now and then.' },
    { name: 'Strategist', tier: 'Intermediate', d: 5, t: 400, ev: 'full', q: true, book: true, about: 'Full search with no deliberate mistakes.' },
    { name: 'Tournament Player', tier: 'Intermediate', d: 6, t: 600, ev: 'full', q: true, book: true, about: 'Plans around weak squares and passed pawns.' },
    { name: 'Open Section', tier: 'Intermediate', d: 6, t: 800, ev: 'full', q: true, adv: true, book: true, about: 'Prunes bad lines so it can look further.' },
    { name: 'Regional Contender', tier: 'Intermediate', d: 7, t: 1000, ev: 'full', q: true, adv: true, book: true, about: 'Steady, accurate and hard to trick.' },
    { name: 'Sharp Expert', tier: 'Expert', d: 8, t: 1200, ev: 'full', q: true, adv: true, book: true, about: 'Calculates attacks on your king.' },
    { name: 'Positional Expert', tier: 'Expert', d: 9, t: 1500, ev: 'full', q: true, adv: true, book: true, about: 'Squeezes small advantages over many moves.' },
    { name: 'Endgame Expert', tier: 'Expert', d: 10, t: 1800, ev: 'full', q: true, adv: true, book: true, about: 'Converts won endings with technique.' },
    { name: 'Attacking Expert', tier: 'Expert', d: 11, t: 2200, ev: 'full', q: true, adv: true, book: true, about: 'Goes for the king when the position allows.' },
    { name: 'Expert Analyst', tier: 'Expert', d: 12, t: 2600, ev: 'full', q: true, adv: true, book: true, about: 'Deep, careful calculation.' },
    { name: 'Candidate Master', tier: 'Master', d: 14, t: 3000, ev: 'full', q: true, adv: true, book: true, about: 'Sees combinations most club players miss.' },
    { name: 'Master', tier: 'Master', d: 16, t: 3600, ev: 'full', q: true, adv: true, book: true, about: 'Mistakes get punished quickly.' },
    { name: 'Senior Master', tier: 'Master', d: 18, t: 4200, ev: 'full', q: true, adv: true, book: true, about: 'Thinks longer and sees further.' },
    { name: 'Theory Master', tier: 'Master', d: 20, t: 5000, ev: 'full', q: true, adv: true, book: true, about: 'Deep opening book and long calculation.' },
    { name: 'Deep Master', tier: 'Master', d: 24, t: 6000, ev: 'full', q: true, adv: true, book: true, about: 'Very little gets past it.' },
    { name: 'Grandmaster', tier: 'Grandmaster', d: 64, t: 7500, ev: 'full', q: true, adv: true, book: true, about: 'Thinks up to 7.5 seconds a move.' },
    { name: 'Super Grandmaster', tier: 'Grandmaster', d: 64, t: 9000, ev: 'full', q: true, adv: true, book: true, about: 'Thinks up to 9 seconds a move.' },
    { name: 'Elite Grandmaster', tier: 'Grandmaster', d: 64, t: 11000, ev: 'full', q: true, adv: true, book: true, about: 'Thinks up to 11 seconds a move.' },
    { name: 'World Contender', tier: 'Grandmaster', d: 64, t: 13000, ev: 'full', q: true, adv: true, book: true, about: 'Thinks up to 13 seconds a move.' },
    { name: 'Final Boss', tier: 'Grandmaster', d: 64, t: 16000, ev: 'full', q: true, adv: true, book: true, about: 'Original top preset: up to 16 seconds per move. Strength is unrated.' }
  ];

  for (var lv = 36; lv <= 50; lv++) {
    var seconds = 17 + (lv - 36) * 13 / 14;
    LEVELS.push({ name: 'Deep Analysis ' + (lv - 35), tier: 'Analysis', d: 64,
      t: Math.round(seconds * 1000), ev: 'full', q: true, adv: true, book: true,
      about: 'Full custom engine, up to ' + Math.round(seconds) + ' seconds per move. Strength is unrated.' });
  }

  for (var neuralLevel = 51; neuralLevel <= 65; neuralLevel++) {
    var neuralSeconds = 32 + (neuralLevel - 51) * 28 / 14;
    LEVELS.push({ name: 'Neural Analysis ' + (neuralLevel - 50), tier: 'Neural', d: 64,
      t: Math.round(neuralSeconds * 1000), ev: 'nnue', q: true, adv: true, book: true,
      about: 'Trained MIT neural evaluation, up to ' + Math.round(neuralSeconds) + ' seconds per move. Unrated.' });
  }

  // Separate presets even when an external clock caps their untimed budgets.
  // Level 65 retains the full allowance; lower levels use increasing shares.
  for (var effortLevel = 2; effortLevel <= 65; effortLevel++) {
    LEVELS[effortLevel - 1].clockShare = Math.pow(2, (effortLevel - 65) / 12);
    if(!LEVELS[effortLevel - 1].t)LEVELS[effortLevel - 1].t=Math.round(400*Math.pow(2,(effortLevel-17)/12));
  }
  function levelThinkTime(levelIdx, extra) {
    var L = LEVELS[levelIdx];if(!L)throw new Error('Invalid engine level');
    if(L.random)return 0;
    var cap = L.t || 1000, supplied = extra && Number(extra.time);
    var time = supplied > 0 && isFinite(supplied) ? supplied * (L.clockShare || 1) : cap;
    return Math.max(1, Math.floor(Math.min(120000, cap, time)));
  }

