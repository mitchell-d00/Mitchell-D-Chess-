// ================= Local named games =================
const library = GameLibrary.create({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
function snapshotGame() {
  if (G.clock) tickClock();
  return GameLibrary.validate({version:1,startFen:G.startFen,moves:G.moves,mode:G.mode,players:G.players,official:G.official,review:G.review,tags:G.tags,over:G.over,clock:G.clock,clockHist:G.clockHist,touched:G.touched,drawOffer:G.drawOffer,view:G.view,flipped:BV.flipped});
}
function restoreGame(saved, record) {
  const state = saved.game, side = record.fens.at(-1).split(' ')[1], finalChess = new E.Chess(record.fens.at(-1));
  if (!state.over && !state.review && (state.official ? record.terminalOfficial : record.terminalCasual)) throw new Error('The saved result does not match a finished position.');
  if (state.touched && !finalChess.legalMoves().some(m=>E.sqName(E.mFrom(m))===state.touched)) throw new Error('The saved touch-move lock is not legal.');
  if (state.clock && !state.over && state.clock.running !== side) throw new Error('The saved clock does not match the side to move.');
  newGame({record});
  Object.assign(G,{mode:state.mode,players:state.players,official:state.official,review:state.review,tags:state.tags,over:state.over,clock:state.clock,clockHist:state.clockHist,touched:state.touched,drawOffer:state.drawOffer,view:state.view,paused:true,restored:true,savedId:saved.id});
  if (G.clock) G.clock.last = performance.now();
  if (!state.review) {
    setup.mode=state.mode;setup.rules=state.official?'official':'casual';
    if(state.mode==='pvc'){setup.color=state.players.w.type==='human'?'w':'b';setup.level=state.players[setup.color==='w'?'b':'w'].level;}
    if(state.mode==='cvc'){setup.lvlW=state.players.w.level;setup.lvlB=state.players.b.level;}
    if(!state.clock)setup.tc='none';else if(state.clock.per&&[10000,30000,60000].includes(state.clock.per))setup.tc='m'+state.clock.per/1000;else{setup.tc='custom';setup.cw=Math.min(600,state.clock.start.w/60000);setup.cb=Math.min(600,state.clock.start.b/60000);setup.bonus=(state.clock.inc||state.clock.delay)/1000;setup.btype=state.clock.inc?'inc':'delay';}
    saveSetup();syncPlay();
  }
  BV.flipped = state.flipped; afterChange();
}
function openGames() {
  let entries;
  try { entries = library.list(); } catch (error) { openModal(`<div class="modal-head"><h2>Saved games</h2><button class="btn small" data-close>Close</button></div><p role="alert">${esc(error.message)}</p><p>Copy PGN from the game as a backup.</p>`); return; }
  const choices = entries.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');
  openModal(`<div class="modal-head"><h2>Saved games</h2><button class="btn small" data-close>Done</button></div>
    <p>Keep up to 20 named games in this browser. Loading replaces the current game and always starts paused. Export PGN for a portable backup; browser data can be cleared.</p>
    <label class="field">Save target<select id="saveTarget"><option value="">Create a new save</option>${choices}</select></label>
    <label class="field">Game name<input id="saveName" maxlength="80" value="${esc('Game · '+new Date().toLocaleDateString())}"></label>
    <button class="btn primary" id="saveGameBtn">Save new game</button><p id="libraryError" class="feedback bad" role="alert" hidden></p>
    <div class="save-list">${entries.length ? entries.map(e=>`<div class="save-entry"><div><strong>${esc(e.name)}</strong><p class="muted">${e.plies} half-moves · ${esc(new Date(e.updated).toLocaleString())}</p></div><div class="navrow"><button class="btn small" data-load-save="${e.id}">Load paused</button><button class="btn small" data-delete-save="${e.id}">Delete</button></div></div>`).join('') : '<p class="muted">No named games yet.</p>'}</div>`,()=>$('#saveName').focus());
  let disposed=false,job=null;modalCleanup=()=>{disposed=true;if(job)job.cancel();};
  const showError=message=>{$('#libraryError').textContent=message;$('#libraryError').hidden=false;};
  $('#saveTarget').onchange=()=>{const item=entries.find(e=>e.id===$('#saveTarget').value);if(item)$('#saveName').value=item.name;$('#saveGameBtn').textContent=item?'Update this save':'Save new game';};
  $('#saveGameBtn').onclick=()=>{try{G.savedId=library.save($('#saveName').value,snapshotGame(),$('#saveTarget').value||undefined);closeModal();toast('Game saved in this browser.');}catch(error){showError(error.message);}};
  $$('[data-load-save]', $('#ovBox')).forEach(button=>button.onclick=async()=>{
    try{
      const saved=library.load(button.dataset.loadSave);button.disabled=true;button.textContent='Checking…';
      job=positionJob(saved.game,'record');const record=await job.promise;if(disposed)return;
      restoreGame(saved,record);if(tab!=='play')setTab('play');closeModal();toast('Loaded paused. Resume when you are ready.');
    }catch(error){if(!disposed){showError(error.message);button.disabled=false;button.textContent='Load paused';}}
  });
  $$('[data-delete-save]', $('#ovBox')).forEach(button=>button.onclick=()=>{
    const item=entries.find(e=>e.id===button.dataset.deleteSave);
    openModal(`<div class="modal-head"><h2>Delete saved game?</h2><button class="btn small" data-close>Cancel</button></div><p>${esc(item.name)} will be removed from this browser.</p><div class="navrow"><button class="btn" id="keepSave">Keep it</button><button class="btn primary" id="deleteSave">Delete this save</button></div>`);
    $('#keepSave').onclick=openGames;$('#deleteSave').onclick=()=>{try{library.remove(item.id);openGames();}catch(error){toast(error.message);}};
  });
}
$('#gamesBtn').onclick=openGames;
$('#resumeSavedBtn').onclick=resumeGame;
function requestNewGame(action) {
  if (!G || (!G.moves.length && G.startFen===START)) { action(); return; }
  openModal(`<div class="modal-head"><h2>Replace this game?</h2><button class="btn small" data-close>Keep game</button></div><p>The current history will be replaced. Use Saved games first if you want to keep it.</p><div class="navrow"><button class="btn" id="saveBeforeNew">Open saves</button><button class="btn primary" id="confirmNew">Start new game</button></div>`);
  $('#saveBeforeNew').onclick=openGames;$('#confirmNew').onclick=()=>{closeModal();action();};
}

function allowsMoveCues() {
  return !!G && !G.official && G.mode==='pvc' && Object.values(G.players).some(p=>p.type==='ai'&&p.level<=20);
}
function currentRecommendation() {
  if(typeof tab==='undefined'||tab!=='play'||!G||(!G.over&&!G.review)||!G.analysis)return null;
  const index=G.view==null?G.moves.length:G.view,position=G.analysis.positions[index];
  return position&&position.best?MoveExplanations.describe(G.fens[index],position.best):null;
}
function renderMoveCue() {
  const review=currentRecommendation(),cue=G&&G.moveCue;
  const visible=tab==='play'&&(review||allowsMoveCues()&&cue&&cue.fen===curFen()&&cue.ply===(G.view==null?G.moves.length:G.view)&&cue.token===G.token&&cue.detail);
  $('#moveCue').hidden=!visible;if(!visible)return;
  $('#moveCueTitle').textContent=review?'Suggested for this position':'Why this move? · '+cue.title;
  $('#moveCueText').textContent=(review||cue.detail).text;
}
$('#whyBtn').onclick=()=>{
  if(!allowsMoveCues())return;
  const ply=G.view==null?G.moves.length:G.view;if(!ply)return;
  G.moveCue={fen:curFen(),ply,token:G.token,title:'Last played move',detail:MoveExplanations.describe(G.fens[ply-1],G.moves[ply-1])};renderMoveCue();
};

