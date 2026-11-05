// Original MIT: factual position cues, independent of search/evaluation intent.
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory;
  else root.MoveExplanations=factory(root.ENGINE);
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
  function board(fen){
    const out=new Map();fen.split(' ')[0].split('/').forEach((row,r)=>{let f=0;for(const c of row){if(/[1-8]/.test(c))f+=+c;else{out.set('abcdefgh'[f++]+(8-r),{type:c.toLowerCase(),side:c===c.toUpperCase()?'w':'b'});}}});return out;
  }
  const xy=s=>[s.charCodeAt(0)-97,+s[1]-1];
  function attacks(p,from,to,pieces){
    const [x,y]=xy(from),[tx,ty]=xy(to),dx=tx-x,dy=ty-y,ax=Math.abs(dx),ay=Math.abs(dy);
    if(!ax&&!ay)return false;
    if(p.type==='p')return ax===1&&dy===(p.side==='w'?1:-1);
    if(p.type==='n')return ax*ay===2;
    if(p.type==='k')return Math.max(ax,ay)===1;
    if(!((p.type==='b'||p.type==='q')&&ax===ay||(p.type==='r'||p.type==='q')&&(!ax||!ay)))return false;
    for(let a=x+Math.sign(dx),b=y+Math.sign(dy);a!==tx||b!==ty;a+=Math.sign(dx),b+=Math.sign(dy))if(pieces.has('abcdefgh'[a]+(b+1)))return false;
    return true;
  }
  function describe(fen,uci){
    const chess=new E.Chess(fen),move=chess.findUci(uci);if(!move)return null;
    const from=E.sqName(E.mFrom(move)),to=E.sqName(E.mTo(move)),before=board(fen),piece=before.get(from),captured=before.get(to),san=chess.san(move),reasons=[];
    chess.make(move);const after=board(chess.fen()),moved=after.get(to),status=chess.status(true);
    if(status&&status.reason==='checkmate')reasons.push('delivers checkmate: the king has no legal escape');
    else{
      if(uci.length===5)reasons.push('promotes the pawn to a '+names[uci[4]]);
      if(piece.type==='k'&&Math.abs(xy(from)[0]-xy(to)[0])===2)reasons.push('castles, moving the king and bringing the rook into play');
      if(captured)reasons.push('captures the '+names[captured.type]+' on '+to);
      else if(piece.type==='p'&&from[0]!==to[0])reasons.push('captures a pawn en passant');
      if(chess.inCheck())reasons.push('gives check, so the opponent must answer the threat to the king');
      const targets=[...after].filter(([sq,p])=>p.side!==piece.side&&p.type!=='p'&&attacks(moved,to,sq,after));
      if(targets.length>=2)reasons.push('attacks the '+targets.slice(0,2).map(([sq,p])=>names[p.type]+' on '+sq).join(' and '));
      if(!reasons.length&&['n','b'].includes(piece.type)&&from[1]===(piece.side==='w'?'1':'8'))reasons.push('develops the '+names[piece.type]+' from its home rank'+('cdef'.includes(to[0])?' toward the centre':''));
      if(!reasons.length&&piece.type==='p'&&['d4','e4','d5','e5'].includes(to))reasons.push('places a pawn in the centre');
      if(!reasons.length&&piece.type==='r'&&![...after].some(([sq,p])=>sq[0]===to[0]&&p.type==='p'))reasons.push('places the rook on an open file with no pawns');
    }
    if(!reasons.length)reasons.push('moves the '+names[piece.type]+' from '+from+' to '+to);
    return {san,from,to,text:san+': '+reasons.slice(0,2).join('; ')+'.'};
  }
  return {describe};
});
