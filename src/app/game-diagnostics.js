// Local timing observations only; these never pause, refund or adjust a clock.
const CLOCK_POLICY_VERSION='bank-latency-v1/recovery-v1/draw-claim-v1';
function gameInactiveMs(now=Date.now()) {
  const a=G&&G.activity;if(!a)return 0;
  return a.hiddenMs+(a.hiddenSince==null?0:Math.max(0,now-a.hiddenSince));
}
function trackGameVisibility() {
  if(!G||G.over)return;
  const now=Date.now(),a=G.activity||(G.activity={hiddenMs:0,hiddenSince:null});
  if(document.hidden){if(a.hiddenSince==null)a.hiddenSince=now;}
  else if(a.hiddenSince!=null){a.hiddenMs+=Math.max(0,now-a.hiddenSince);a.hiddenSince=null;}
}
document.addEventListener('visibilitychange',trackGameVisibility);
function currentThinkDiagnostic() {
  const r=G&&G.activeThink;
  if(!r||G.over||r.token!==G.token||r.ply!==G.moves.length)return G&&G.lastThink;
  return {ply:r.ply,side:r.side,level:r.level,budgetMs:r.budgetMs,wallMs:Math.max(0,Date.now()-r.startedAt),hiddenMs:Math.max(0,gameInactiveMs()-r.inactiveAtStart),phase:r.phase,recovery:r.recovery||'',backend:r.backend||'pending',depth:r.depth??'pending'};
}
function captureThinkDiagnostic(reason) {
  const d=currentThinkDiagnostic();if(d)G.lastThink={...d,reason};
}
function finishGameDiagnostics(reason) {
  captureThinkDiagnostic(reason);
  if(G.activity){G.activity.hiddenMs=gameInactiveMs();G.activity.hiddenSince=null;}
}
function pgnClock(ms) {
  const t=Math.floor(Math.max(0,ms)/100),h=Math.floor(t/36000),m=Math.floor(t%36000/600),s=Math.floor(t%600/10);
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${t%10}`;
}
