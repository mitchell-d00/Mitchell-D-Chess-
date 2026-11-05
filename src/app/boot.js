// ================= Boot =================
applySettings();
LS.idx = Math.min(LESSONS.length - 1, store.get('lessonIdx', 0) || 0);
syncPlay();
try { const fen = PositionTools.hashFen(location.hash); newGame(fen ? {record:PositionTools.fromFen(fen)} : {}); } catch (error) { newGame(); toast(error.message); }
