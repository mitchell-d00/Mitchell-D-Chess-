const assert=require('node:assert/strict'),E=require('./engine.cjs')(),T=require('../ui/position-tools.js')(E),L=require('../ui/game-library.js')(T);
const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},library=L.create(storage);
const game={version:1,startFen:T.START,moves:['e2e4'],mode:'pvp',players:{w:{type:'human'},b:{type:'human'}},official:false,review:false,tags:{Event:'A "game"'},over:null,clock:{w:59000,b:60000,inc:1000,delay:0,per:0,start:{w:60000,b:60000},running:'b',delayLeft:0,pgn:'60+1'},clockHist:[{w:59000,b:60000}],view:null,flipped:false};
const id=library.save('Game 1',game);assert.equal(library.list().length,1);assert.deepEqual(library.load(id).game,L.validate(game));
library.save('Renamed',game,id);assert.equal(library.list()[0].name,'Renamed');assert.equal(library.list().length,1);
const prior=map.get(L.KEY),failed=L.create({getItem:storage.getItem,setItem(){throw Error('Quota');}});assert.throws(()=>failed.save('No space',game),/Existing saves were kept/);assert.equal(map.get(L.KEY),prior);
for(const bad of [{...game,startFen:'bad'},{...game,moves:['e2e9']},{...game,clock:{...game.clock,w:NaN}},{...game,clockHist:[]},{...game,mode:'cvc'},{...game,players:{w:{type:'ai',level:999},b:{type:'human'}}}])assert.throws(()=>L.validate(bad));
for(let i=1;i<20;i++)library.save('Game '+i,game);assert.throws(()=>library.save('Too many',game),/20 games/);library.remove(id);assert.equal(library.list().length,19);
console.log('PASS: versioned local records, player/clock validation, bounded library, explicit overwrite/delete and atomic quota failures');
