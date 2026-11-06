// Render the actual piece SVGs and inspect their pixels, including every outer contour.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  const result=await page.evaluate(async()=>{
   const fail=message=>{throw Error(message);},rgb=hex=>hex.slice(1).match(/../g).map(s=>parseInt(s,16)),same=(p,c)=>c.every((v,i)=>Math.abs(v-p[i])<4);
   // Expected outlines include reversed colours and mid-grey, not only side names.
   const palettes=[...PIECE_THEMES.map((p,i)=>({name:p[0],w:p[1],b:p[2],outlines:i===3?['#000000','#000000']:['#000000','#ffffff']})),
    {name:'Reversed custom colours',w:'#000000',b:'#ffffff',outlines:['#ffffff','#000000']},
    {name:'Middle grey',w:'#808080',b:'#808080',outlines:['#000000','#000000']}];
   let sprites=0,backgrounds=0,edges=0;
   for(const palette of palettes){
    S.pw=palette.w;S.pb=palette.b;applySettings();
    const style=getComputedStyle(document.documentElement);
    for(const [side,expected]of [['w',palette.outlines[0]],['b',palette.outlines[1]]]){
     if(style.getPropertyValue('--p'+side+'-line').trim()!==expected)fail('Wrong contrasting outline: '+palette.name+' '+side);
     for(const type of ['k','q','r','b','n','p']){
      const name=palette.name+' '+side+' '+type,host=document.createElement('div');host.innerHTML=pieceSVG(type,side);const svg=host.firstElementChild;
      svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','180');svg.setAttribute('height','180');
      for(const prop of ['--pw','--pb','--pw-line','--pb-line'])svg.style.setProperty(prop,style.getPropertyValue(prop));
      const url=URL.createObjectURL(new Blob([svg.outerHTML],{type:'image/svg+xml'})),img=new Image();
      try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});}finally{URL.revokeObjectURL(url);}
      const canvas=document.createElement('canvas');canvas.width=canvas.height=180;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
      const pixels=ctx.getImageData(0,0,180,180).data,at=(x,y)=>pixels.subarray((Math.floor(y)*180+Math.floor(x))*4,(Math.floor(y)*180+Math.floor(x))*4+4),outline=rgb(expected),fill=rgb(palette[side]);
      if(type==='k'){
       if(!same(at(22.5*4,6*4),fill))fail('King cross centre must match the piece: '+name);
       if(!same(at(20.4*4,6*4),outline))fail('King cross border must contrast with its centre: '+name);
      }
      let contour=0;
      for(let y=2;y<178;y++)for(let x=2;x<178;x++){
       const p=at(x,y);if(p[3]<250)continue;
       if([[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy])=>at(x+dx,y+dy)[3]<2)){
        if(!same(p,outline))fail('Unoutlined outer contour: '+name+' at '+x+','+y);
        contour++;
       }
      }
      if(contour<50)fail('Missing piece silhouette: '+name);edges+=contour;sprites++;
      for(const bg of ['#000000','#ffffff']){
       ctx.fillStyle=bg;ctx.fillRect(0,0,180,180);ctx.drawImage(img,0,0);const composite=ctx.getImageData(0,0,180,180).data,c=rgb(bg);let visible=0;
       for(let i=0;i<composite.length;i+=4)if(!same(composite.subarray(i,i+4),c))visible++;
       if(visible<150)fail('Piece vanishes on '+bg+': '+name);backgrounds++;
      }
     }
    }
   }
   S.pw='#ffffff';S.pb='#000000';S.light='#ffffff';S.dark='#000000';applySettings();setup.mode='pvp';setup.tc='none';newGame();
   return {sprites,backgrounds,edges};
  });
  assert.equal(result.sprites,108);assert.equal(result.backgrounds,216);assert(result.edges>10000);
  // Settings swatches use the same contrast policy as the actual board pieces.
  await page.click('#setBtn');
  const previews=await page.locator('.pcpair').evaluateAll(nodes=>nodes.map(n=>({w:getComputedStyle(n).getPropertyValue('--pw-line').trim(),b:getComputedStyle(n).getPropertyValue('--pb-line').trim()})));
  assert.equal(previews.length,7);assert.deepEqual(previews[3],{w:'#000000',b:'#000000'});await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);console.log(`PASS: ${result.sprites} rendered piece/colour combinations; ${result.backgrounds} solid black/white backgrounds; ${result.edges} contrasting contour pixels; piece-coloured outlined king crosses and matching settings previews offline`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
