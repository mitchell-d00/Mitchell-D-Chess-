// Original MIT versioned browser-only game library. No accounts or network.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory;
  else root.GameLibrary = factory(root.PositionTools);
})(typeof self !== 'undefined' ? self : globalThis, function (T) {
  'use strict';
  const KEY = 'mitchell-d-chess.games.v1', LIMIT = 20, MAX_GAME = 220000;
  const error = message => { throw new Error(message); };
  function number(value, max = 1000000000) { if (!Number.isFinite(value) || value < 0 || value > max) error('Invalid saved clock value.'); return value; }
  function player(value) {
    if (!value || !['human','ai'].includes(value.type)) error('Invalid saved player.');
    if (value.type === 'human') return {type:'human'};
    if (!Number.isInteger(value.level) || value.level < 1 || value.level > 65) error('Invalid saved computer level.');
    let persona;
    if(value.persona!=null){
      const p=value.persona;
      if(typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>40||/[\x00-\x1f\x7f]/.test(p.name)||!Number.isInteger(p.aggression)||p.aggression < -100||p.aggression > 100)error('Invalid saved opponent persona.');
      persona={name:p.name.trim(),aggression:p.aggression};
    }
    return {type:'ai',level:value.level,...(persona?{persona}:{})};
  }
  function validate(game) {
    if (!game || game.version !== 1 || JSON.stringify(game).length > MAX_GAME) error('Unsupported or oversized saved game.');
    const startFen = T.validateFen(game.startFen);
    if (!Array.isArray(game.moves) || game.moves.length > T.MAX_PLIES || game.moves.some(u => typeof u !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u))) error('Invalid saved moves.');
    if (!['pvc','pvp','cvc'].includes(game.mode) || !game.players) error('Invalid saved game mode.');
    const players={w:player(game.players.w),b:player(game.players.b)}, ai=+(players.w.type==='ai')+ +(players.b.type==='ai');
    if (ai !== {pvp:0,pvc:1,cvc:2}[game.mode]) error('Saved players do not match the game mode.');
    const tags={};
    if (game.tags && (typeof game.tags !== 'object' || Object.keys(game.tags).length > 64)) error('Invalid saved PGN headers.');
    for (const [key,value] of Object.entries(game.tags || {})) { if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key) || typeof value !== 'string' || value.length > 4096) error('Invalid saved PGN header.'); tags[key]=value; }
    let over=null;
    if (game.over) { if (!['1-0','0-1','1/2-1/2'].includes(game.over.result) || typeof game.over.reason !== 'string' || game.over.reason.length > 200) error('Invalid saved result.'); over={result:game.over.result,reason:game.over.reason}; }
    let clock=null,clockHist=[];
    if (game.clock) {
      const c=game.clock;if (!c.start || ![null,'w','b'].includes(c.running) || typeof c.pgn !== 'string' || c.pgn.length>50) error('Invalid saved clock.');
      clock={w:number(c.w),b:number(c.b),inc:number(c.inc,300000),delay:number(c.delay,300000),per:number(c.per,3600000),start:{w:number(c.start.w),b:number(c.start.b)},running:c.running,pgn:c.pgn,delayLeft:number(c.delayLeft,300000)};
      if (clock.delayLeft>clock.delay || (over&&clock.running)) error('Inconsistent saved clock.');
      if (!Array.isArray(game.clockHist) || game.clockHist.length!==game.moves.length) error('Saved clock history does not match moves.');
      clockHist=game.clockHist.map(c=>({w:number(c.w),b:number(c.b)}));
    }
    const touched=game.touched==null?null:game.touched;
    if(touched!==null&&(typeof touched!=='string'||!/^[a-h][1-8]$/.test(touched)||!game.official))error('Invalid saved touch-move lock.');
    let drawOffer=null;if(game.drawOffer){if(!['w','b'].includes(game.drawOffer.by)||over)error('Invalid saved draw offer.');drawOffer={by:game.drawOffer.by};}
    const view=game.view==null?null:game.view;
    if (view!==null&&(!Number.isInteger(view)||view<0||view>game.moves.length)) error('Invalid saved board view.');
    if (game.review&&clock) error('A review cannot have a running game clock.');
    return {version:1,startFen,moves:game.moves.slice(),mode:game.mode,players,official:!!game.official,review:!!game.review,tags,over,clock,clockHist,touched,drawOffer,view,flipped:!!game.flipped};
  }
  function create(storage) {
    function read() {
      let text;try{text=storage.getItem(KEY);}catch(e){error('Browser storage is unavailable. Copy PGN as a backup.');}
      if (!text) return [];
      if (text.length>4500000) error('The game library is too large.');
      let data;try{data=JSON.parse(text);}catch(e){error('The saved game library could not be read.');}
      if (!data||data.version!==1||!Array.isArray(data.games)||data.games.length>LIMIT) error('Unsupported saved game library.');
      const ids=new Set();
      for(const item of data.games){if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(item.id)||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>80||typeof item.updated!=='string'||!Number.isFinite(Date.parse(item.updated)))error('Invalid saved game library entry.');ids.add(item.id);}
      return data.games;
    }
    function write(games) { try{storage.setItem(KEY,JSON.stringify({version:1,games}));}catch(e){error('Could not save: browser storage is full or unavailable. Existing saves were kept. Copy PGN as a backup.');} }
    return {
      list(){return read().map(x=>({id:x.id,name:x.name,updated:x.updated,plies:Array.isArray(x.game?.moves)?x.game.moves.length:0})).sort((a,b)=>b.updated.localeCompare(a.updated));},
      save(name,game,id){name=String(name).trim();if(!name||name.length>80)error('Give the game a name of 1–80 characters.');const clean=validate(game),games=read();let index=id?games.findIndex(g=>g.id===id):-1;if(id&&index<0)error('That save no longer exists. Refresh the library.');if(index<0&&games.length>=LIMIT)error('The library holds 20 games. Delete one before making another save.');const item={id:id||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name,updated:new Date().toISOString(),game:clean};if(index<0)games.push(item);else games[index]=item;write(games);return item.id;},
      load(id){const item=read().find(g=>g.id===id);if(!item)error('That saved game no longer exists.');return {id:item.id,name:item.name,game:validate(item.game)};},
      remove(id){const games=read();if(!games.some(g=>g.id===id))error('That save no longer exists.');write(games.filter(g=>g.id!==id));}
    };
  }
  return {KEY,LIMIT,MAX_GAME,validate,create};
});
