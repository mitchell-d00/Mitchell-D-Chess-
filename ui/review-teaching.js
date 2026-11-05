// Original MIT: position facts and clearly separated short-search estimates.
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory;
  else root.ReviewTeaching=factory(root.ENGINE,root.MoveExplanations);
})(typeof globalThis!=='undefined'?globalThis:this,function(E,cues){
  'use strict';
  const names=['','pawn','knight','bishop','rook','queen','king'];
  function row(input){
    const {fen,uci,before,after,ply}=input,p=new E.Chess(fen),move=p.findUci(uci);
    if(!move)return null;
    const side=p.side?'b':'w',player=side==='w'?'White':'Black',sign=side==='w'?1:-1;
    const played=cues.describe(fen,uci),best=before.best&&p.findUci(before.best),alternative=best&&before.best!==uci?cues.describe(fen,before.best):null;
    const finite=Number.isFinite(before.white)&&Number.isFinite(after.white);
    const reliable=finite&&(before.depth>=2||before.terminal)&&(after.depth>=2||after.terminal);
    const mate=finite&&(Math.abs(before.white)>=E.MATE-1000||Math.abs(after.white)>=E.MATE-1000);
    const loss=reliable&&!mate?(before.best===uci?0:Math.max(0,(before.white-after.white)*sign)):null;
    const missedMate=alternative&&alternative.san.endsWith('#')&&!played.san.endsWith('#');
    p.make(move);const outcome=p.status(true),replyMove=after.best&&p.findUci(after.best),reply=replyMove?cues.describe(p.fen(),after.best):null;
    let label='Within this search estimate',practice='Before choosing a move, compare the opponent’s checks, captures and threats.',topic='Checks, captures and threats',priority=loss||0;
    if(!reliable)label='Search too shallow for comparison';
    else if(before.best===uci)label='Engine choice';
    else if(mate)label='Mate context — inspect the position';
    else if(loss>=200)label='Possible blunder';else if(loss>=100)label='Possible mistake';else if(loss>=50)label='Possible inaccuracy';
    let critical=!!(reliable&&before.best!==uci&&loss>=50),context='';
    if(played.san.endsWith('#')){
      label='Checkmate delivered';topic='Mating patterns';practice='Remember this final mating pattern and the squares the king could not use.';
    }else if(missedMate){
      label='Missed mate in one';critical=true;priority=30000;topic='Mating patterns';
      context=alternative.san+' gives immediate checkmate; '+played.san+' does not.';
      practice='When the king is exposed, check every forcing move before choosing a quieter move.';
    }else if(reply&&reply.san.endsWith('#')){
      label='Mate in one available to '+(side==='w'?'Black':'White');
      critical=before.best!==uci;priority=20000;topic='King safety';
      context='In this position, '+reply.san+' is a legal checkmating reply.';
      practice='Before playing, look for the opponent’s immediate checks and mating threats.';
    }else if(outcome&&outcome.reason==='stalemate'){
      label='Stalemate';topic='Finishing an endgame';context='The opponent has no legal move and is not in check, so the position is a draw.';
      practice='Before a finishing move, check whether the opponent will have a legal move or be in check.';
    }else if(replyMove&&(E.mFlags(replyMove)&1)){
      const ep=!!(E.mFlags(replyMove)&2),target=E.mTo(replyMove),type=ep?1:p.b[target]&7;
      context='The suggested reply captures the '+names[type]+' on '+E.sqName(ep?(p.side?target+16:target-16):target)+'.';
      topic='Piece safety';practice=alternative?'Check what your opponent can capture after your move, and compare the suggested alternative.':'Check what your opponent can capture after your move, and whether you have a useful reply.';
    }else if(alternative&&best&&(E.mFlags(best)&4)){
      topic='King safety';practice='Compare your king’s safety and rook activity before and after castling.';
    }else if(alternative&&E.mPromo(best)){
      topic='Pawn promotion';practice='Look for promotion opportunities and compare all legal promotion pieces.';
    }
    const estimate=loss==null?(mate?'Mating scores are not converted into pawn losses.':!reliable?'A deeper search is needed before assigning a mistake label.':'No pawn-loss estimate for this position.'):
      'The short search estimates '+(loss/100).toFixed(1)+' pawns lost from '+player+'’s point of view.';
    return {ply,side,player,san:played.san,moveLabel:fen.split(' ')[5]+(side==='w'?'. ':'... ')+played.san,label,loss,reliable,critical,priority,topic,practice,context,estimate,
      played:played.text,reply:reply?reply.text:null,alternative:alternative?alternative.san:null,alternativeText:alternative?alternative.text:null,finish:played.san.endsWith('#')};
  }
  function summary(rows,side){
    const selected=rows.filter(r=>!side||side==='all'||r.side===side),issues=selected.filter(r=>r.critical);
    let moments=issues.sort((a,b)=>b.priority-a.priority||a.ply-b.ply).slice(0,3);
    if(!moments.length){const finish=selected.slice().reverse().find(r=>r.finish);if(finish)moments=[finish];}
    return {reviewed:selected.length,issues:issues.length,uncertain:selected.filter(r=>!r.reliable&&!r.finish&&r.label!=='Missed mate in one').length,moments,
      practices:[...new Map(moments.map(r=>[r.topic,{topic:r.topic,text:r.practice}])).values()]};
  }
  return {row,summary};
});
