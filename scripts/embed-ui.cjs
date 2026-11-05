// Original MIT: package development UI modules into the standalone game.
const fs=require('node:fs');let html=fs.readFileSync('index.html','utf8');
for(const [id,path]of [['position-tools-src','ui/position-tools.js']]){
 const source=fs.readFileSync(path,'utf8');if(source.includes('</script>'))throw Error('Unsafe script terminator in module');
 const block='<script id="'+id+'">\n'+source+'</script>\n',pattern=new RegExp('<script id="'+id+'">[\\s\\S]*?<\\/script>\\n');
 if(pattern.test(html))html=html.replace(pattern,()=>block);else html=html.replace("<script>\n'use strict';",()=>block+"<script>\n'use strict';");
}
fs.writeFileSync('index.html',html);
