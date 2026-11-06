// ================= Opponent personalities (local, opt-in) =================
const PERSONA_POLICY = 'style-v1';
const PERSONA_PRESETS = [
  {name:'Solid Defender',aggression:-80}, {name:'Positional Player',aggression:-35},
  {name:'Tactical Attacker',aggression:65}, {name:'Gambit Player',aggression:100}
];
let savedOpponents = store.get('opponents.v1', []);
savedOpponents = Array.isArray(savedOpponents) ? savedOpponents.slice(0,12).filter(x=>E.normalizePersona(x)&&Number.isInteger(x.level)&&x.level>=1&&x.level<=65).map(x=>({...E.normalizePersona(x),level:x.level})) : [];
function personaKey(target) { return target==='opponent'?'persona':target==='white'?'personaW':'personaB'; }
function personaLevelKey(target) { return target==='opponent'?'level':target==='white'?'lvlW':'lvlB'; }
function personaStyle(value) { return value<0?'Defensive '+Math.abs(value):value>0?'Aggressive '+value:'Balanced'; }
function personaTags(players) {
  const tags={};
  for(const side of ['w','b'])if(players[side].type==='ai'){
    const name=side==='w'?'White':'Black',p=E.normalizePersona(players[side].persona);
    tags[name+'Persona']=p?p.name:'Standard engine';tags[name+'Aggression']=String(p?p.aggression:0);
    tags[name+'StylePolicy']=PERSONA_POLICY;
  }
  return tags;
}
function syncPersonas() {
  const box=$('#personaPanel');box.hidden=setup.mode==='pvp';
  if(box.hidden)return;
  const targets=setup.mode==='cvc'?['white','black']:['opponent'];
  $('#personaEditors').innerHTML=targets.map(target=>{
    const p=E.normalizePersona(setup[personaKey(target)]),value=p?p.aggression:0;
    const selected=p?PERSONA_PRESETS.findIndex(x=>x.name===p.name&&x.aggression===value):-1;
    return `<fieldset class="persona-editor" data-persona="${target}"><legend>${target==='opponent'?'Your opponent':target==='white'?'White computer':'Black computer'}</legend>
      <label class="field">Playing style<select data-persona-preset><option value="standard">Standard engine</option>${PERSONA_PRESETS.map((x,i)=>`<option value="${i}" ${selected===i?'selected':''}>${x.name}</option>`).join('')}<option value="custom" ${p&&selected<0?'selected':''}>Custom persona</option></select></label>
      <label class="field">Defensive ↔ Aggressive<input data-persona-slider type="range" min="-100" max="100" step="5" value="${value}" aria-valuetext="${personaStyle(value)}"></label>
      <output data-persona-output aria-live="polite">${p?personaStyle(value):'Standard engine · personas off'}</output>
      <label class="field">Opponent name<input data-persona-name maxlength="40" value="${esc(p?p.name:'Custom opponent')}" autocomplete="off"></label>
      <div class="navrow"><button class="btn small" data-persona-save>Save named opponent</button><button class="btn small" data-persona-reset>Standard engine</button></div>
      <label class="field">Saved opponents<select data-persona-load><option value="">Choose a saved opponent…</option>${savedOpponents.map((x,i)=>`<option value="${i}">${esc(x.name)} · Level ${x.level} · ${personaStyle(x.aggression)}</option>`).join('')}</select></label>
      <button class="btn small" data-persona-delete>Delete selected save</button>
    </fieldset>`;
  }).join('');
  for(const editor of $$('.persona-editor',box)){
    const target=editor.dataset.persona,key=personaKey(target),slider=$('[data-persona-slider]',editor),name=$('[data-persona-name]',editor),preset=$('[data-persona-preset]',editor),output=$('[data-persona-output]',editor);
    if(!setup[key])preset.value='standard';
    const update=()=>{
      const p=E.normalizePersona({name:name.value,aggression:+slider.value});
      if(!p){output.textContent='Use a name of 1–40 characters without control characters.';return false;}
      setup[key]=p;saveSetup();preset.value='custom';output.textContent=personaStyle(p.aggression);slider.setAttribute('aria-valuetext',personaStyle(p.aggression));return true;
    };
    slider.oninput=update;name.onchange=update;
    preset.onchange=()=>{if(preset.value==='standard')setup[key]=null;else if(preset.value==='custom')setup[key]={name:'Custom opponent',aggression:+slider.value};else setup[key]={...PERSONA_PRESETS[+preset.value]};saveSetup();syncPersonas();};
    $('[data-persona-reset]',editor).onclick=()=>{setup[key]=null;saveSetup();syncPersonas();};
    $('[data-persona-save]',editor).onclick=()=>{
      if(!update())return;
      const p={...setup[key],level:setup[personaLevelKey(target)]},index=savedOpponents.findIndex(x=>x.name===p.name),next=savedOpponents.slice();
      if(index<0&&next.length>=12){toast('Keep up to 12 opponents. Delete a save first.');return;}
      if(index<0)next.push(p);else next[index]=p;
      if(writeOpponents(next)){syncPersonas();toast('Opponent and level saved in this browser.');}
    };
    const load=$('[data-persona-load]',editor);
    load.onchange=()=>{if(load.value==='')return;const p=savedOpponents[+load.value];setup[key]=E.normalizePersona(p);setup[personaLevelKey(target)]=p.level;saveSetup();syncPlay();$('[data-persona="'+target+'"] [data-persona-load]').value=String(savedOpponents.indexOf(p));$('#personaNotice').textContent='Saved opponent selected for the next game. Start a new game to play.';};
    $('[data-persona-delete]',editor).onclick=()=>{if(load.value===''){toast('Choose a saved opponent to delete.');return;}const next=savedOpponents.filter((_,i)=>i!==+load.value);if(writeOpponents(next)){syncPersonas();toast('Saved opponent deleted. Current selections are kept.');}};
  }
}
function writeOpponents(next) {
  try { localStorage.setItem('mitchell-d-chess.opponents.v1',JSON.stringify(next));savedOpponents=next;return true; }
  catch(error){toast('Could not save opponents: browser storage is full or unavailable.');return false;}
}
$('#personasOff').onclick=()=>{setup.persona=setup.personaW=setup.personaB=null;saveSetup();syncPersonas();toast('Standard engine selected for the next game.');};
