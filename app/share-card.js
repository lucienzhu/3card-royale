/* MIT. Local PNG cards from public settlement data; never writes game state or sends a file automatically. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SZShareCard=api;})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
const SHARE_URL='https://lucienzhu.github.io/gk-royale-playtest/',QR_ROWS=["111111101101111101000001110100010", "100000100011000100100111000011100", "101110101000101111001111111100100", "101110101101000101100101110011001", "101110101110001010011110111111011", "100000101111110101111001100011110", "111111100010010111000011101010110", "000000001010110011111010100010111", "100011100010100001110011111110011", "101110011011111010111100100001111", "100101110101101001110100011001110", "101100000100001110001001001100101", "001000111000110000100100010111000", "010001000001100010011111100111101", "110011110111011110101010011110110", "011010010000101000111001001101101", "101011110100011101000010110110001", "100010011101010100000100011011100", "110001101011101110001000111001110", "111000001100010100100001001000011", "010110111011101010011001110011011", "101000011101010011100100100011111", "010011111011011111001110000010110", "101011000000110011011111001101111", "101111100001110001011010101111100", "000000001001101010111100000000000", "111111101010101010101010101111111", "100000101100010000110010001000001", "101110101011011111001011001011101", "101110101100000100100010001011101", "101110101101101010001110001011101", "100000100111100110100000001000001", "111111100011000010111101001111111"];
const WIDTH=1080,HEIGHT=1440,escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const palettes={light:{paper:'#EDF4EF',ink:'#10231B',muted:'#4F665A',line:'#C3D4C9',table:'#E2ECE5',red:'#C5416B',gold:'#D6A41C',goldCenter:'#F2CD5D',redText:'#B2365A',goldText:'#866300',gray:'#9DB5A8'},dark:{paper:'#0C2118',ink:'#EAF3EE',muted:'#9DB5A8',line:'#2C4B3C',table:'#112A1F',red:'#C5416B',gold:'#E4C46A',goldCenter:'#F2CD5D',redText:'#E38BA6',goldText:'#E4C46A',gray:'#4F665A'}};
function summarize(input){
 if(!input?.results?.length)throw new Error('A settled game is required.');
 const results=JSON.parse(JSON.stringify(input.results)),r=results.at(-1),winner=r.winner;
 if(![0,1].includes(winner))throw new Error('Invalid result winner.');
 const match=!!input.match;if(match&&!r.match_won)throw new Error('An unfinished match cannot bloom.');
 const wins=[0,0];results.forEach(x=>wins[x.winner]++);
 const ownAce=results.filter(x=>x.ace_challenger===winner),setbacks=ownAce.filter(x=>x.winner!==winner).length,firstAce=results.find(x=>x.winner===winner&&x.from<14&&x.to===14)?.game??null;
 const s=input.snapshot,snapshot={players:s.players.map(p=>({level:p.level})),aLosses:[...(s.aLosses||[0,0])],phase:s.phase,levelOwner:s.levelOwner};
 return {results,result:r,winner,match,playerName:String(input.playerName||''),lang:input.lang==='en'?'en':'zh-CN',theme:input.theme==='dark'?'dark':'light',version:String(input.version||'1.0.0'),seed:Number(input.seed)>>>0,first:input.first===1?1:0,snapshot,wins,games:results.length,rounds:results.reduce((n,x)=>n+(Number(x.rounds)||0),0),setbacks,firstAce};
}
// The poster is a still of the finale: the winner's flower over the skyline, the vine below, the game's address last.
function makeSVG(d,assets=root.SZBloomAssets,cityStyle=root.SZShareAssets?.cityStyle,bloom=root.SZBloom,finale=root.SZFinale){
 if(!assets||!cityStyle||!bloom||!finale)throw new Error('Share card assets are unavailable.');
 const en=d.lang==='en',t=(a,b)=>en?b:a,p=palettes[d.theme],own=d.winner===0,accent=own?p.redText:p.goldText,F=finale.FLOWERS[own?'own':'rival'],rank=bloom.rank,r=d.result,font='-apple-system,BlinkMacSystemFont,PingFang SC,Hiragino Sans GB,Microsoft YaHei,Arial,sans-serif';
 const text=(x,y,s,size,fill=p.ink,weight=400,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${escape(s)}</text>`;
 const span=(s,size,fill,weight=400)=>`<tspan font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(s)}</tspan>`;
 const recolor=(shape,q,gray=false,center=q===0?p.gold:p.red)=>shape.replace(/fill="#(D83B74|DEB04A)"/g,(_,c)=>'fill="'+(gray?p.gray:c==='D83B74'?(q===0?p.red:p.gold):center)+'"');
 const vineFlower=(q,x,y,w=22,gray=false)=>`<svg x="${x-w/2}" y="${y-w*72/128}" width="${w}" height="${w*72/64}" viewBox="0 0 64 72">${recolor(assets.flower,q,gray,q===0?p.goldCenter:p.red)}</svg>`;
 // flowers and petals as symbols, placed like the canvas places them
 const defs=`<path id="szb" d="${finale.BRACT}"/>`+F.tones.map((c,i)=>`<g id="szf${i}">${[0,120,240].map(a=>`<g transform="rotate(${a})"><use xlink:href="#szb" fill="${c}"/><circle cy="-5.5" r="1.32" fill="${F.heart}"/></g>`).join('')}</g><g id="szp${i}"><g transform="translate(0 12)"><use xlink:href="#szb" fill="${c}"/><circle cy="-5.5" r="1.32" fill="${F.heart}"/></g></g>`).join('');
 const put=(id,x,y,len,rot,tilt=1,alpha=1)=>`<use xlink:href="#${id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(rot*180/Math.PI).toFixed(1)}) scale(${(len/24).toFixed(3)} ${(len/24*tilt).toFixed(3)})"${alpha<1?` opacity="${alpha.toFixed(2)}"`:''}/>`;
 const hx=540,hy=d.match?565:612,len=d.match?128:104,seed=(d.seed^Math.imul(d.games,2654435761))>>>0||7,B=finale.burstLayout(WIDTH,HEIGHT,hx,hy,len,seed,d.match?1.45:1),glow=own?'197,65,107':'214,164,28',dark=d.theme==='dark';
 const flowers=[];
 if(d.match){
  // Reuse the settled animation's canopy and taper at the skyline; a game win keeps its smaller ring.
  for(const kept of finale.canopyLayout(B.list,WIDTH,355,1110,hx,hy,len)){
   const b=B.list[kept.index],pose=finale.canopyPose({...b,born:0,canopySize:kept.size},12500);
   flowers.push([pose.size,put('szf'+b.tone,pose.x,pose.y,pose.size,pose.rot,b.tilt)]);
  }
 }else{
  for(const b of B.list)if(b.y>=448&&b.y<=1130&&b.d>len*1.25&&b.d<len*2.6)flowers.push([b.size,put('szf'+b.tone,b.x,b.y,b.size*1.1,b.rot,b.tilt)]);
 }
 // Smaller flowers behind, larger in front, the winner's flower last.
 let sky=`<defs><radialGradient id="szglow"><stop offset="0" stop-color="rgb(${glow})" stop-opacity="${dark?.34:.2}"/><stop offset="1" stop-color="rgb(${glow})" stop-opacity="0"/></radialGradient></defs><circle cx="${hx}" cy="${hy}" r="${len*3.4}" fill="url(#szglow)"/>`+flowers.sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join('')+put('szf1',hx,hy,len,.42);
 if(d.match)sky+=finale.egretSVG(.2,700,434,2.3,dark?null:p.ink)+finale.egretSVG(.74,96,742,1.6,dark?null:p.ink);
 // the vine, as in the game
 const model=bloom.project(d.results,d.snapshot,d.first),item=model.current,axis=[];
 if(['1.0.0','0.3.8'].includes(d.version)){
  const x=n=>120+bloom.pos(n)*8.4,base=1194,marks=new Map();
  for(const e of model.entries.slice(1))if(!e.won&&e.epochs[e.winner]===item.epochs[e.winner])marks.set(e.winner+':'+e.levels[e.winner],e);
  for(let q=0;q<2;q++){const level=item.levels[q];if(!(d.match&&d.winner===q)&&!(level===14&&item.losses[q]>0&&item.playing!==q))marks.set(q+':'+level,{winner:q,levels:item.levels});}
  const levels=[...new Set([2,14,...[...marks.values()].map(e=>e.levels[e.winner])])].sort((a,b)=>a-b);
  axis.push(`<path d="M${x(2)} ${base}C360 ${base-5} 700 ${base+5} ${x(15)} ${base}" fill="none" stroke="${p.muted}" stroke-width="2" opacity=".7"/>`);
  for(const level of levels){const width=level===10?34:26;axis.push(`<rect x="${x(level)-width/2}" y="${base-15}" width="${width}" height="30" fill="${p.paper}"/>`+text(x(level),base+8,rank(level),22,p.muted,600,'text-anchor="middle"'));}
  for(const e of marks.values()){const q=e.winner,level=e.levels[q];if(d.match&&d.winner===q&&level===14||level===14&&item.losses[q]>0&&item.playing!==q)continue;const offset=level===14?(x(15)-x(14))*Math.min(2,item.losses[q])/3:0;axis.push(`<g opacity="${level===item.levels[q]?1:.55}">${vineFlower(q,x(level)+offset,base+(q===1?-34:34),22)}</g>`);}
  for(let q=0;q<2;q++)item.failures[q].slice(-2).forEach((_,i)=>axis.push(vineFlower(q,x(14)+(x(15)-x(14))*i/3,base+(q===1?-34:34),22,true)));
  if(d.match)axis.push(`<circle cx="${x(14)}" cy="${base}" r="12" fill="${own?p.red:p.gold}"/><path d="M${x(14)-6} ${base}l4 5 9-11" fill="none" stroke="${p.paper}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`+vineFlower(d.winner,x(15),base,54));
 }
 // the approved skyline, untouched; it blooms only when the match is won
 const city=recolor(assets.city,d.winner).replace('<svg class="fc-bloom-svg"','<svg x="-50" y="700" width="1180" height="461"').replaceAll('href="#','xlink:href="#').replace(/style="--fc-angle:([\d.-]+)deg"/g,'transform="rotate($1 32 36)"');
 const css=cityStyle.replaceAll('.sz-bloom ','').replaceAll('var(--fc-paper)',p.paper).replaceAll('var(--fc-table)',p.table).replaceAll('var(--fc-muted)',p.muted).replaceAll('var(--fc-red)',p.red).replaceAll('var(--fc-gold)',p.gold);
 // words
 const subject=own?(d.playerName?d.playerName+t('，你',d.match?', you’re':', you'):t('你，','You,')):t('对手，','Your rival,'),headline=d.match?t('开花了。','in bloom.'):t('赢下这一局。','won this game.');
 const units=(s,k)=>[...s].reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.56),0)*k,big=en?(d.match?150:116):(d.match?156:120),small=Math.round(big*.42),fit=Math.min(1,940/(units(subject,small)+units(headline,big)+small*.3)),hs=Math.round(big*fit),ss=Math.round(small*fit);
 const kicker=d.match?'':t('第 '+r.game+' 局 · 结算','Game '+r.game+' settled');
 const wins=d.wins,facts=d.match?[[t('共 ',''),String(d.games),t(' 局',' games')],[t('你 ',''),wins[0]+' : '+wins[1],t(' 对手',' you : rival')],['',String(d.rounds),t(' 轮攻防',' rounds')]]:[['',rank(r.from)+' → '+rank(r.to),t(' 升级',' level')],[t('伤势 ',''),r.damage.join(' : '),t('',' wounds')],['',String(r.rounds),t(' 轮攻防',' rounds')]];
 const factLine=facts.map((f,i)=>(i?span('   ·   ',28,p.line):'')+span(f[0],28,p.muted)+span(f[1],38,p.ink,700)+span(f[2],28,p.muted)).join('');
 // the game's own address: the mark, the name, the link and a QR code with integer modules and a white quiet zone
 const qrSize=QR_ROWS.length+8,qrPath=QR_ROWS.flatMap((row,y)=>[...row.matchAll(/1+/g)].map(m=>`M${m.index+4} ${y+4}h${m[0].length}v1h-${m[0].length}z`)).join('');
 const qr=`<svg x="840" y="1268" width="${qrSize*4}" height="${qrSize*4}" viewBox="0 0 ${qrSize} ${qrSize}" shape-rendering="crispEdges" role="img" aria-label="${SHARE_URL}"><rect width="${qrSize}" height="${qrSize}" fill="#fff"/><path d="${qrPath}" fill="#121417"/></svg>`;
 const mark=`<g transform="translate(80 1290) scale(1.05)" aria-label="Shenzhen Flower Cards"><rect x="9" y="3" width="46" height="58" rx="7" fill="#ECCE80" stroke="#A17C35" stroke-width="2"/><g transform="translate(32 36)">${[0,120,240].map(a=>`<g transform="rotate(${a})"><use xlink:href="#szb" fill="#C5416B"/><circle cy="-5.5" r="1.32" fill="#F2CD5D"/></g>`).join('')}</g></g>`;
 const foot=d.match?t('第 '+r.game+' 局，这场花事落定。','Game '+r.game+'. This match is in bloom.'):t('规则 '+d.version+' · 双人普通扑克','Rules '+d.version+' · One ordinary deck, two players');
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escape(subject+headline)}"><style>text{font-family:${font}}${css}.fc-city-drifter,.fc-city-bloom-wave{display:none}${d.match?'':'.fc-city-garden-front,.fc-city-garden-rear{display:none}'}</style><defs>${defs}</defs><rect width="1080" height="1440" fill="${p.paper}"/>`+
  (kicker?`<text x="540" y="150" text-anchor="middle" font-size="30">${span(kicker,30,accent,650)}</text>`:'')+
  `<text x="540" y="${d.match?240:318}" text-anchor="middle" letter-spacing="-2">${span(subject,ss,p.ink,600)}${span(' ',ss,p.ink)}${span(headline,hs,accent,800)}</text>`+
  `<text x="540" y="${d.match?318:400}" text-anchor="middle">${factLine}</text>${city}${sky}${axis.join('')}`+
  `<path d="M80 1262H1000" stroke="${p.line}" stroke-width="1.5"/>${mark}${text(162,1326,t('深圳花牌','3Card Royale'),34,p.ink,700)}${text(162,1362,t('三张牌，打出花。','Three cards. Make them bloom.'),23,p.muted)}${text(80,1404,foot,en?21:22,p.ink,500)}${text(80,1430,'lucienzhu.github.io/gk-royale-playtest',19,p.muted)}${qr}</svg>`;
}
function filename(d){return 'shenzhen-flower-'+(d.match?'match':'game')+'-'+d.seed+'-'+d.result.game+'.png';}
async function png(svg){
 const source=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('PNG artwork could not load.'));img.src=source;});const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable.');ctx.drawImage(img,0,0,WIDTH,HEIGHT);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed.')),'image/png'));}finally{URL.revokeObjectURL(source);}
}
// One kind of item per share. With files but no text or url, iOS Safari adds the title as its own text item beside the PNG,
// and WeChat's 发送给朋友 then never opens the friend list. So: the PNG alone, or the game link alone where files cannot be shared.
function sharePayload(file,nav,d){
 const t=(a,b)=>d?.lang==='en'?b:a,ok=data=>{try{return typeof nav?.share==='function'&&(typeof nav.canShare==='function'?nav.canShare(data)===true:!('files' in data));}catch(_){return false;}};
 if(file){const data={files:[file]};if(ok(data))return data;}
 const link={url:SHARE_URL,title:t('深圳花牌','3Card Royale')};return ok(link)?link:null;
}
// Safari hands a shared file to other apps as a file link, and WeChat's 发送给朋友 does not open its friend list for it.
// Copying the PNG puts the image itself on the clipboard, which pastes into any WeChat chat.
function copySupported(nav,Item){try{return typeof nav?.clipboard?.write==='function'&&typeof Item==='function'&&(typeof Item.supports!=='function'||Item.supports('image/png')===true);}catch(_){return false;}}
let dialog,run=0,previewURL=null;
function clear(){run++;if(previewURL){const old=previewURL;previewURL=null;setTimeout(()=>URL.revokeObjectURL(old),2000);}}
function close(){if(dialog?.open)dialog.close();}
async function open(input){
 const d=summarize(input),en=d.lang==='en',t=(a,b)=>en?b:a;clear();const generation=run;
 if(!dialog){dialog=document.createElement('dialog');dialog.id='share-card-dialog';dialog.className='modal sz-share-dialog';dialog.dataset.noI18n='';dialog.addEventListener('close',()=>{clear();dialog.replaceChildren();});document.body.append(dialog);}
 dialog.lang=d.lang;dialog.innerHTML=`<div class="modal-head"><h2 id="share-card-title">${t('分享卡片','Share card')}</h2><button type="button" data-share-close>${t('返回结算','Back to result')}</button></div><div class="sz-share-body"><div class="sz-share-preview" aria-busy="true"><p role="status">${t('正在生成 PNG…','Creating your PNG…')}</p><img hidden alt="${t('本次结算分享卡','Share card for this result')}"></div><p class="sz-share-note">1080 × 1440 · PNG</p><div class="sz-share-actions"><a class="primary" data-share-download hidden>${t('保存 PNG','Save PNG')}</a><button type="button" data-share-system hidden>${t('分享…','Share…')}</button><button type="button" data-share-copy hidden>${t('复制图片','Copy image')}</button><button type="button" data-share-retry hidden>${t('重试','Try again')}</button></div><p class="sz-share-status" role="status"></p></div>`;
 dialog.setAttribute('aria-labelledby','share-card-title');dialog.querySelector('[data-share-close]').onclick=close;dialog.querySelector('[data-share-retry]').onclick=()=>open(input);if(!dialog.open)dialog.showModal();else dialog.querySelector('[data-share-close]').focus({preventScroll:true});
 try{if(document.fonts?.ready)await document.fonts.ready;const blob=await png(makeSVG(d));if(generation!==run)return;previewURL=URL.createObjectURL(blob);const img=dialog.querySelector('img'),preview=dialog.querySelector('.sz-share-preview'),download=dialog.querySelector('[data-share-download]'),system=dialog.querySelector('[data-share-system]'),status=dialog.querySelector('.sz-share-status');img.src=previewURL;img.hidden=false;preview.querySelector('p').hidden=true;preview.setAttribute('aria-busy','false');download.href=previewURL;download.download=filename(d);download.hidden=false;download.onclick=()=>{status.textContent=t('已准备下载；也可长按图片保存。','Download ready. You can also save the preview image.');};const payload=sharePayload(new File([blob],filename(d),{type:'image/png'}),navigator,d),copy=dialog.querySelector('[data-share-copy]'),canCopy=copySupported(navigator,root.ClipboardItem);copy.hidden=!canCopy;copy.onclick=async()=>{copy.disabled=true;try{await navigator.clipboard.write([new root.ClipboardItem({'image/png':blob})]);status.textContent=t('已复制。打开微信对话，长按输入框选“粘贴”，即可发送。','Copied. Paste it into a chat to send it.');}catch(_){status.textContent=t('没能复制。请长按图片存到相册，再从微信发送。','Could not copy. Save the preview image, then send it from your photos.');}finally{copy.disabled=false;}};system.hidden=!payload;if(payload&&!payload.files)system.textContent=t('分享链接…','Share link…');system.onclick=async()=>{system.disabled=true;try{await navigator.share(payload);status.textContent=t('已分享。','Shared.');}catch(e){status.textContent=e.name==='AbortError'?(canCopy?t('图片还在。发微信可以点“复制图片”。','Your card is still here. You can also copy it into a chat.'):t('图片还在，随时可以保存。','Your card is still ready to save.')):t('请保存 PNG 后分享。','Save the PNG to share it.');}finally{system.disabled=false;}};status.textContent=canCopy?t('发给微信好友：点“复制图片”后粘贴。','You can also copy the image and paste it into a chat.'):t('长按图片也可保存。','You can also save the preview image.');}
 catch(_){if(generation!==run)return;dialog.querySelector('.sz-share-preview p').textContent=t('图片暂未生成，请重试。','Could not create the image. Please try again.');dialog.querySelector('.sz-share-preview').setAttribute('aria-busy','false');dialog.querySelector('[data-share-retry]').hidden=false;}
}
return {SHARE_URL,WIDTH,HEIGHT,palettes,summarize,makeSVG,filename,png,sharePayload,copySupported,open,close};
});
