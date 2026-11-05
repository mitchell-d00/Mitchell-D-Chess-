// ================= Tabs =================
let tab = 'play';
function setTab(t) {
  if (t === tab) return;
  tab = t; $('#moveCue').hidden=true; $('#sessionControls').hidden=t!=='play';
  $$('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === t); b.setAttribute('aria-selected', b.dataset.tab === t); b.tabIndex = b.dataset.tab === t ? 0 : -1; });
  $('#railPlay').hidden = t !== 'play'; $('#railLearn').hidden = t !== 'learn';
  $('#boardmsg').hidden = true;
  if (t === 'learn') {
    cancelAnalysis();
    if (G) { G.paused = G.mode === 'cvc' ? true : G.paused; G.token = Math.random(); G.thinking = false; cancelThinking(); G.tabPaused = true; }
    loadLesson(LS.idx);
  } else {
    LS.token = Math.random(); cancelThinking(); if (G) { G.thinking = false; G.tabPaused = false; if (G.clock) G.clock.last = performance.now(); }
    BV.flipped = G.mode === 'pvc' ? G.players.b.type === 'human' : false;
    BV.marks = []; BV.arrows = [];
    afterChange();
    if (G.over) $('#boardmsg').hidden = true;
  }
}
$$('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
$('.tabs').addEventListener('keydown', e => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return; e.preventDefault(); e.stopPropagation(); const next = e.key === 'Home' ? 'play' : e.key === 'End' ? 'learn' : tab === 'play' ? 'learn' : 'play'; setTab(next); $(`.tabs [data-tab="${next}"]`).focus(); });

