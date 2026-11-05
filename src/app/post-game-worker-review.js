// ================= Post-game worker review =================
let analysisJob=null,analysisSerial=0;
function cancelAnalysis() {
  if (!analysisJob) return;
  const job=analysisJob;analysisJob=null;job.game.analysis.status='cancelled';cancelThinking();if(G===job.game)renderAnalysis();
}
function analysisRow(index, before, after) {
  const row=ReviewTeaching.row({fen:G.fens[index],uci:G.moves[index],before,after,ply:index+1});
  if(!row)throw new Error('Invalid move in review history.');return row;
}
async function startAnalysis() {
  if (tab!=='play'||!G||( !G.over&&!G.review)) return;
  cancelAnalysis();
  const game=G,budget=+$('#analysisBudget').value,job={id:++analysisSerial,game};analysisJob=job;
  const record=game.analysis={status:'running',positions:[],rows:[],budget,total:game.fens.length};
  renderAnalysis();
  try{
    const p=new E.Chess(game.startFen);
    for(let i=0;i<game.fens.length;i++){
      if(analysisJob!==job||G!==game)return;
      if(i>0){const move=p.findUci(game.moves[i-1]);if(!move)throw new Error('Invalid review history.');p.make(move);}
      const terminal=p.status(game.review||game.official);let value;
      if(terminal){value={white:terminal.result==='1/2-1/2'?0:terminal.result==='1-0'?E.MATE:-E.MATE,best:null,bestSan:null,depth:0,terminal:true};}
      else{
        const r=await think(game.startFen===START?null:game.startFen,game.moves.slice(0,i),64,{time:budget,noBook:true});
        if(analysisJob!==job||G!==game)return;
        const m=r&&p.findUci(r.move);if(!m)throw new Error('No legal analysis move was returned.');
        value={white:r.depth?E.whiteScore(game.fens[i],r.score):null,best:r.move,bestSan:p.san(m),depth:r.depth||0};
      }
      record.positions.push(value);if(i>0)record.rows.push(analysisRow(i-1,record.positions[i-1],value));renderAnalysis();
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(analysisJob===job){analysisJob=null;record.status='complete';renderAnalysis();}
  }catch(error){if(analysisJob===job){analysisJob=null;record.status='error';record.error=String(error.message||error).slice(0,200);renderAnalysis();}}
}
function renderAnalysis() {
  if(!G)return;
  const data=G.analysis,available=!!G.over||G.review,running=!!analysisJob&&analysisJob.game===G;
  $('#analyseBtn').disabled=!available||running;$('#analysisBudget').disabled=running;$('#cancelAnalysisBtn').hidden=!running;
  $('#analyseBtn').textContent=data?'Review again':'Review game';
  $('#analysisProgress').textContent=!available?'Available after a game ends, or after you import a game for review.':!data?'Run short local searches to see estimated evaluations and alternatives.':data.status==='running'?`Analysing ${data.positions.length} of ${data.total} positions…`:data.status==='complete'?`Reviewed ${data.rows.length} half-moves. Estimates from an unrated engine, not an accuracy score.`:data.status==='cancelled'?'Review cancelled. Partial estimates remain below.':'Review stopped: '+data.error;
  $('#analysisOutput').hidden=!data||!data.positions.length;
  const list=$('#analysisMoves');
  if(!data){list.innerHTML='';list._record=null;$('#analysisLesson').hidden=true;const moments=$('#analysisMoments');moments.innerHTML='';moments._record=null;moments._key='';$('#analysisPractice').innerHTML='';return;}
  if(list._record!==data){list.innerHTML='<button class="btn small" data-analysis-ply="0">Starting position</button>';list._record=data;list._count=0;}
  const fresh=data.rows.slice(list._count);list._count=data.rows.length;
  for(const row of fresh){
    const fields=G.fens[row.ply-1].split(' '),number=fields[5]+(fields[1]==='b'?'...':'.');
    const alternative=row.alternative?'Suggested: '+row.alternative:'',loss=row.loss==null?'':`Estimated loss ${(row.loss/100).toFixed(1)} pawns`;
    list.insertAdjacentHTML('beforeend',`<button class="analysis-row" data-analysis-ply="${row.ply}"><strong>${esc(number+' '+row.san)}</strong><span>${esc(row.label)}</span><small>${esc([alternative,loss].filter(Boolean).join(' · '))}</small></button>`);
  }
  const current=G.view==null?G.moves.length:G.view;$$('[data-analysis-ply]',list).forEach(b=>b.classList.toggle('cur',+b.dataset.analysisPly===current));
  renderReviewTeaching(data,current);
  const positions=data.positions,span=Math.max(1,data.total-1),points=positions.map((r,i)=>r.white==null?null:[48+538*i/span,70-Math.max(-800,Math.min(800,r.white))*54/800]);
  let connected=false;const path=points.map(point=>{if(!point){connected=false;return '';}const [x,y]=point,command=connected?'L':'M';connected=true;return command+x.toFixed(2)+' '+y.toFixed(2);}).join(' ');
  const score=positions[current],recommendation=currentRecommendation(),graph=$('#analysisGraph');
  const scoreText=!score||score.white==null?'No completed evaluation':Math.abs(score.white)>=E.MATE-1000?(score.white>0?'White':'Black')+' has a mating score':(score.white>=0?'+':'')+(score.white/100).toFixed(2)+' pawns';
  $('#analysisScore').textContent='Position '+current+' · '+scoreText;
  $('#analysisBest').textContent=recommendation?'Suggested: '+recommendation.san+' ('+recommendation.from+' → '+recommendation.to+').':score&&score.terminal?'Terminal position; no move to suggest.':'No suggestion available for this position yet.';
  graph.setAttribute('aria-valuemax',data.total-1);graph.setAttribute('aria-valuenow',current);graph.setAttribute('aria-valuetext','Position '+current+', '+scoreText);
  $('#analysisEnd').textContent=(data.total-1)+' plies';
  graph.innerHTML=`<line x1="48" y1="70" x2="586" y2="70" stroke="var(--muted)" stroke-dasharray="4 4"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3"/>`+points.map((point,i)=>point?`<circle cx="${point[0]}" cy="${point[1]}" r="${i===current?6:3}" fill="var(--accent)"/>`:'').join('')+(current<positions.length?`<line x1="${48+538*current/span}" x2="${48+538*current/span}" y1="8" y2="133" stroke="var(--accent)" stroke-dasharray="3 3"/>`:'');
  renderArrows();renderMoveCue();

}
$('#analyseBtn').onclick=startAnalysis;$('#cancelAnalysisBtn').onclick=cancelAnalysis;
$('#analysisMoves').onclick=e=>{const b=e.target.closest('[data-analysis-ply]');if(b){G.analysis.selectedPly=+b.dataset.analysisPly;setView(+b.dataset.analysisPly);}};
$('#analysisGraph').onclick=e=>{const data=G.analysis;if(!data||!data.positions.length)return;const box=e.currentTarget.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,((e.clientX-box.left)/box.width*600-48)/538));setView(Math.round(fraction*(data.total-1)));};

$('#analysisArrows').onchange=()=>renderArrows();
$('#analysisGraph').onkeydown=e=>{const data=G.analysis;if(!data||!data.positions.length)return;const max=data.total-1,current=G.view==null?G.moves.length:G.view;let target;
  if(e.key==='ArrowLeft')target=current-1;else if(e.key==='ArrowRight')target=current+1;else if(e.key==='Home')target=0;else if(e.key==='End')target=max;else return;
  e.preventDefault();e.stopPropagation();setView(Math.max(0,Math.min(max,target)));
};

function renderReviewTeaching(data,current){
  const focus=$('#analysisFocus').value,summary=ReviewTeaching.summary(data.rows,focus),name=focus==='w'?'White':focus==='b'?'Black':'Both players';
  $('#analysisTakeaways').textContent=`${name}: ${summary.reviewed} ${summary.reviewed===1?'move':'moves'} reviewed, ${summary.issues} ${summary.issues===1?'position':'positions'} to revisit.`+(summary.uncertain?` ${summary.uncertain} comparisons are too shallow to classify.`:'')+(data.status==='complete'?'':' Partial review.');
  const moments=$('#analysisMoments'),key=focus+':'+summary.moments.map(row=>row.ply+row.label).join('|');
  if(moments._record!==data||moments._key!==key){
    moments._record=data;moments._key=key;
    moments.innerHTML=summary.moments.length?summary.moments.map(row=>`<button class="btn review-moment" data-review-moment="${row.ply}"><strong>${esc(row.player+' · '+row.moveLabel)}</strong><span>${esc(row.label)}</span><small>${esc(row.topic)}</small></button>`).join(''):'<p class="muted">No key moment identified in these estimates yet. This does not mean every move was best.</p>';
    $('#analysisPractice').innerHTML=summary.practices.map(p=>`<li><strong>${esc(p.topic)}:</strong> ${esc(p.text)}</li>`).join('');
  }
  const selected=data.selectedPly,at=selected&&(current===selected||current===selected-1)?selected:current;
  const row=at>0?data.rows[at-1]:null;$('#analysisLesson').hidden=!row;if(!row)return;
  $('#analysisLesson').dataset.ply=row.ply;
  $('#analysisLessonTitle').textContent=(current===row.ply-1?'Before ':'After ')+row.player+' played '+row.san+' · '+row.label;
  $('#analysisPlayed').textContent='Played: '+row.played;
  $('#analysisReply').textContent=[row.topic==='Piece safety'&&row.reply?'':row.context,row.reply?'Reply to examine: '+row.reply:''].filter(Boolean).join(' ');
  $('#analysisAlternative').textContent=row.alternativeText?'Compare with: '+row.alternativeText:'The search did not suggest a different move here.';
  $('#analysisEstimate').textContent=row.estimate;
  $('#analysisLessonTip').textContent='Practise: '+row.practice;
  $('#analysisBeforeBtn').disabled=current===row.ply-1;$('#analysisAfterBtn').disabled=current===row.ply;
}
$('#analysisFocus').onchange=()=>renderAnalysis();
$('#analysisMoments').onclick=e=>{const button=e.target.closest('[data-review-moment]');if(!button||!G.analysis)return;G.analysis.selectedPly=+button.dataset.reviewMoment;setView(G.analysis.selectedPly-1);};
for(const [id,offset]of [['#analysisBeforeBtn',-1],['#analysisAfterBtn',0]])$(id).onclick=()=>{if(!G.analysis)return;const ply=+$('#analysisLesson').dataset.ply;G.analysis.selectedPly=ply;setView(ply+offset);};
