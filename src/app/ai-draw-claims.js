// Original MIT. A legal draw is an option, not a stale opponent evaluation.
function computerDrawClaim(pos, result) {
  if(!result||!result.move)return null;
  // Keep a positively evaluated continuation; under recovery/uncertainty,
  // prefer a known legal point. Always allow an actual immediate checkmate.
  if(!result.recovery&&Number.isFinite(result.score)&&result.score>0)return null;
  const move=pos.findUci(result.move);if(!move)return null;
  const existing=pos.claimable();let intended,mate;
  pos.make(move);
  try{mate=pos.inCheck()&&!pos.legalMoves().length;intended=pos.claimable();}
  finally{pos.unmake();}
  if(mate)return null;
  if(existing)return {reason:existing,type:'current'};
  if(intended)return {reason:intended,type:'intended',move:result.move,san:pos.san(move)};
  return null;
}
if(typeof module!=='undefined')module.exports=computerDrawClaim;
