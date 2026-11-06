  // Original MIT bridge: the full C++ core is embedded in the offline release.
  var WASM_CORE_DATA = '__WASM_CORE__';
  var WASM_CORE_CONFIG = { enabled: true, memory: 'standard', exactEndgames: false };
  var WASM_CORE_INSTANCE = null, WASM_CORE_ERROR = '';
  function prepareWasmCore() {
    if (WASM_CORE_INSTANCE) return WASM_CORE_INSTANCE;
    if (WASM_CORE_ERROR || typeof WebAssembly === 'undefined') return null;
    try {
      var core = new WebAssembly.Instance(new WebAssembly.Module(neuralDecode(WASM_CORE_DATA)), {env:{clock:function(){return Date.now();}}}).exports;
      if (core.__wasm_call_ctors) core.__wasm_call_ctors(); core.init();core.set_memory(WASM_CORE_CONFIG.memory==='large'?21:19);
      if (!core.set_hidden(NNUE_MODEL.hidden)) throw new Error('Unsupported candidate network');
      var model=neuralDecode(NNUE_MODEL.data);new Uint8Array(core.memory.buffer,core.model_ptr(),model.length).set(model);
      var bitbase=neuralDecode(KPK_DATA);new Uint8Array(core.memory.buffer,core.kpk_ptr(),bitbase.length).set(bitbase);
      WASM_CORE_INSTANCE=core;return core;
    } catch(error) { WASM_CORE_ERROR=String(error.message||error);return null; }
  }
  function coreLoad(core,fen) {
    var pointer=core.input_ptr(),bytes=new Uint8Array(core.memory.buffer,pointer,8192);
    if(fen.length>=8192)throw new Error('Position too long');
    for(var i=0;i<fen.length;i++)bytes[i]=fen.charCodeAt(i);bytes[fen.length]=0;
    if(!core.load())throw new Error('Candidate rejected position');
  }
  function coreFen(core) {
    var bytes=new Uint8Array(core.memory.buffer),pointer=core.fen_ptr(),out='';
    while(bytes[pointer])out+=String.fromCharCode(bytes[pointer++]);return out;
  }
  function thinkWithWasm(startFen,moves,levelIdx,extra) {
    if(!WASM_CORE_CONFIG.enabled||levelIdx<50||extra&&extra.backend==='js')return think(startFen,moves,levelIdx,extra);
    if(WASM_CORE_ERROR||typeof WebAssembly==='undefined'){var fallback=think(startFen,moves,levelIdx,extra);if(fallback)fallback.backend='js-fallback';return fallback;}
    try {
      var L=LEVELS[levelIdx];if(!L)throw new Error('Invalid engine level');
      var p=new Chess(startFen),initial=p.fen(),encoded=[];
      for(var i=0;i<moves.length;i++){var m=p.findUci(moves[i]);if(!m)throw new Error('Invalid move history at ply '+(i+1)+': '+moves[i]);encoded.push(m);p.make(m);}
      var legal=p.legalMoves();if(!legal.length)return null;
      var result={move:null,score:0,depth:0,nodes:0,book:false,backend:'wasm'};
      if(L.book&&!startFen&&!(extra&&extra.noBook)){var bm=bookMove(moves,p);if(bm&&p.findUci(bm)){result.move=bm;result.book=true;return result;}}
      if(legal.length===1){result.move=p.uci(legal[0]);return result;}
      var core=prepareWasmCore();if(!core)throw new Error('Candidate unavailable');
      coreLoad(core,initial);for(var j=0;j<encoded.length;j++)if(!core.play(encoded[j]))throw new Error('Candidate history mismatch');
      var time=levelThinkTime(levelIdx,extra);
      var persona=normalizePersona(extra&&extra.persona);
      core.set_style(persona?persona.aggression:0);
      core.set_endgames(extra&&extra.exactEndgames!==undefined?+extra.exactEndgames:+WASM_CORE_CONFIG.exactEndgames);
      var move=core.iterate(L.d,time,3,extra&&extra.adv!==undefined?+extra.adv:+L.adv,1,20);
      if(!core.result_valid()||legal.indexOf(move)<0||coreFen(core)!==p.fen())throw new Error('Candidate failed root validation');
      result.move=p.uci(move);result.score=core.result_score();result.depth=core.result_depth();result.nodes=core.nodes();result.seldepth=core.seldepth();result.timeBudget=time;return result;
    } catch(error) {
      // History/level errors must stay errors, never become repaired game input.
      if(/Invalid move history|Invalid engine level/.test(String(error.message)))throw error;
      WASM_CORE_ERROR=String(error.message||error);WASM_CORE_INSTANCE=null;
      var fallback=think(startFen,moves,levelIdx,extra);if(fallback)fallback.backend='js-fallback';return fallback;
    }
  }
