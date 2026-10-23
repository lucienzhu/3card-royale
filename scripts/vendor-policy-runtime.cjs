'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),pkg=path.join(root,'node_modules/onnxruntime-web');
const dest=path.join(root,'vendor/onnxruntime');fs.mkdirSync(dest,{recursive:true});
for(const file of ['ort.wasm.min.mjs','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])
  fs.copyFileSync(path.join(pkg,'dist',file),path.join(dest,file));
// npm's web package omits notices; keep the pinned upstream notices in vendor/.
for(const file of ['LICENSE','ThirdPartyNotices.txt'])
  if(!fs.existsSync(path.join(dest,file)))throw Error('Missing upstream notice: '+file);
fs.writeFileSync(path.join(dest,'version.json'),JSON.stringify({name:'onnxruntime-web',version:JSON.parse(fs.readFileSync(path.join(pkg,'package.json'))).version},null,2)+'\n');
console.log('Vendored ONNX Runtime Web WASM files (single-thread configuration).');
