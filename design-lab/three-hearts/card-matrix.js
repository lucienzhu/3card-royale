/* Experimental comparison only. Production SVG and heart geometry remain unchanged. */
(async function () {
  'use strict';
  const lab = window.SZHeartLab, params = new URLSearchParams(location.search);
  const centers = lab.centerOptions({angle:params.get('angle') ?? 30,size:params.get('size') ?? 100,inset:params.get('inset') ?? 1.8});
  const scales = [70,80,90,100];
  const tones = [
    {id:'gold',code:'A',name:'原版金底',note:'原样配色',fill:'#ECCE80',edge:'#A17C35',keyline:false},
    {id:'gold-outline',code:'B',name:'金底 · 红描边',note:'金蕊加细红边',fill:'#ECCE80',edge:'#A17C35',keyline:true},
    {id:'ivory',code:'C',name:'浅底 · 金边',note:'奶白牌底',fill:'#F7FBF8',edge:'#A17C35',keyline:false},
    {id:'mint',code:'D',name:'绿牌 · 金边',note:'浅绿牌底',fill:'#E2ECE5',edge:'#A17C35',keyline:false},
    {id:'circuit',code:'E',name:'电路板绿',note:'深绿牌底 · 金边',fill:'#0C2118',edge:'#A17C35',keyline:false},
  ];
  let dark = params.get('theme') === 'dark';
  const dialog = document.getElementById('inspection');
  const query = () => new URLSearchParams({mark:'bloom',core:'center',angle:centers.angle,size:centers.size,inset:centers.inset,theme:dark?'dark':'light'});
  function applyTheme() {
    const p = window.SZThemeTokens[dark?'dark':'light'];
    for (const key of ['paper','panel','table','ink','muted','line']) document.documentElement.style.setProperty(`--${key}`,p[key]);
    document.documentElement.style.setProperty('--accent',p.redText);
    document.documentElement.style.colorScheme = dark?'dark':'light';
    const toggle = document.getElementById('theme');
    toggle.textContent = dark?'日间':'夜间'; toggle.setAttribute('aria-pressed',String(dark));
    document.getElementById('back').href = `index.html?${query()}#card-study`;
    const url = new URL(location.href); url.searchParams.set('theme',dark?'dark':'light'); history.replaceState(null,'',url);
  }
  applyTheme();
  document.getElementById('theme').addEventListener('click',()=>{dark=!dark;applyTheme();});
  document.getElementById('center-note').textContent = `整朵花缩放 · 金蕊固定 ${centers.angle}° / ${centers.size}% / ${centers.inset}`;
  let original;
  try {
    const response = await fetch('../../brand-mark.svg');
    if (!response.ok) throw new Error('Production mark unavailable');
    const source = new DOMParser().parseFromString(await response.text(),'image/svg+xml').documentElement;
    if (source.localName !== 'svg') throw new Error('Invalid production mark');
    original = Array.from(source.children).filter(node=>node.localName!=='rect').map(node=>node.outerHTML).join('');
  } catch (error) {
    document.getElementById('load-error').hidden = false;
    return;
  }
  function card(kind,tone,scale) {
    let flower = kind === 'original' ? original : lab.petals('bloom',{stamen:'center',centers,keyline:tone.keyline});
    if (kind === 'original' && tone.keyline) flower = flower.replaceAll('fill="#F2CD5D"','fill="#F2CD5D" stroke="#C5416B" stroke-width=".65" stroke-linejoin="round" paint-order="stroke fill"');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="9" y="3" width="46" height="58" rx="7" fill="${tone.fill}" stroke="${tone.edge}" stroke-width="2"/><g transform="translate(32 32) scale(${scale/100}) translate(-32 -32)">${flower}</g></svg>`;
  }
  const matrix = document.getElementById('matrix');
  matrix.insertAdjacentHTML('beforeend',`<thead><tr><th scope="col">牌底 ↓ / 花大小 →</th>${scales.map(scale=>`<th scope="col">${scale}%<span class="column-caption">原版 / 红桃版</span></th>`).join('')}</tr></thead><tbody>${tones.map(tone=>`<tr><th scope="row"><span class="row-code">${tone.code}</span><span class="row-name">${tone.name}</span><span class="row-note">${tone.note}</span><span class="swatches" aria-hidden="true"><i style="background:${tone.fill}"></i><i style="background:#C5416B"></i><i style="background:#F2CD5D"></i></span></th>${scales.map((scale,i)=>`<td><button type="button" class="pair-button" data-tone="${tone.id}" data-scale="${scale}" aria-label="${tone.code}${i+1} · ${tone.name} · ${scale}% · 放大对照" aria-haspopup="dialog"><span class="cell-code">${tone.code}${i+1}</span><span class="flower-pair"><span>${card('original',tone,scale)}<small>原版</small></span><span>${card('heart',tone,scale)}<small>红桃</small></span></span></button></td>`).join('')}</tr>`).join('')}</tbody>`);
  function select(tone,scale,open) {
    const code = `${tone.code}${scales.indexOf(scale)+1}`;
    matrix.querySelectorAll('.pair-button').forEach(button=>button.setAttribute('aria-current',String(button.dataset.tone===tone.id && Number(button.dataset.scale)===scale)));
    document.getElementById('inspection-title').textContent = `${code} · ${tone.name} · ${scale}%`;
    document.getElementById('inspection-pair').innerHTML = ['original','heart'].map(kind=>`<figure>${card(kind,tone,scale)}<figcaption>${kind==='original'?'原版花形':'红桃花形'}</figcaption></figure>`).join('');
    document.getElementById('small-pair').innerHTML = ['original','heart'].map(kind=>`<div class="small-sizes">${[24,32,48].map(size=>`<span><span style="width:${size}px">${card(kind,tone,scale)}</span><small>${size}px</small></span>`).join('')}</div>`).join('');
    for (const kind of ['original','heart']) {
      const link = document.getElementById(`download-${kind}`);
      link.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(card(kind,tone,scale))}`;
      link.download = `${kind}-${tone.id}-${scale}-center-${centers.angle}-${centers.size}-${centers.inset}.svg`;
    }
    const url = new URL(location.href); url.searchParams.set('tone',tone.id); url.searchParams.set('scale',scale); history.replaceState(null,'',url);
    if (open) dialog.showModal();
  }
  matrix.addEventListener('click',event=>{
    const button = event.target.closest('.pair-button');
    if (button) select(tones.find(tone=>tone.id===button.dataset.tone),Number(button.dataset.scale),true);
  });
  document.getElementById('close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  select(tones.find(tone=>tone.id===(params.get('tone')||params.get('cardTone')))||tones[1],scales.includes(Number(params.get('scale')))?Number(params.get('scale')):100,false);
})();
