/* Shared, offline locale catalog. Protocol IDs, saved games and player names are not translated. */
(()=>{'use strict';
const locales={'zh-CN':'简体中文',en:'English',ja:'日本語',ko:'한국어',es:'Español'},key='gk_ui_language';
const normalize=value=>{const v=String(value||'').toLowerCase();return /^zh(?:-|$)/.test(v)?'zh-CN':Object.keys(locales).find(k=>v===k||v.startsWith(k+'-'))||null;};
const stored=()=>{try{return localStorage.getItem(key);}catch{return null;}};
let language=normalize(new URL(location.href).searchParams.get('lang'))||normalize(stored())||normalize(navigator.language)||'en';
document.documentElement.lang=language;
const catalogs={ja:{},ko:{},es:{}},patterns={ja:[],ko:[],es:[]},missing=new Set();
function add(rows){for(const [source,...values]of rows){['ja','ko','es'].forEach((lang,i)=>{if(!values[i])throw new Error('Missing '+lang+' translation: '+source);catalogs[lang][source]=values[i];if(source.includes('{')){const names=[];const re=source.split(/(\{\w+\})/).map(p=>/^\{\w+\}$/.test(p)?(names.push(p.slice(1,-1)),/^(n|m|game|round|games|score|gap|wounds)$/.test(p.slice(1,-1))?'([0-9][0-9,. /]*)':'(.+?)'):p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');patterns[lang].push({re:new RegExp('^'+re+'$'),names,value:values[i]});}});}}
function translate(source,lang=language,depth=0){const s=String(source??''),trim=s.trim(),dict=catalogs[lang];if(!dict||!trim||depth>5)return s;if(dict[trim]!==undefined)return s.replace(trim,dict[trim]);for(const p of patterns[lang]){const m=trim.match(p.re);if(m){let out=p.value;p.names.forEach((n,i)=>out=out.replaceAll('{'+n+'}',translate(m[i+1],lang,depth+1)));return s.replace(trim,out);}}
// Compound labels use the same small, explicit vocabulary as their standalone forms.
if(/ · | → |: |\n/.test(trim)){const parts=trim.split(/( · | → |: |\n)/);if(parts.length>1){const out=parts.map(p=>translate(p,lang,depth+1)).join('');if(out!==trim)return s.replace(trim,out);}}
if(/[A-Za-z]{3}/.test(trim)&&trim.length<800)missing.add(trim);return s;}
function pair(zh,en,lang=language){return lang==='zh-CN'?zh:translate(en,lang);}
function options(){return Object.entries(locales).map(([id,label])=>'<option value="'+id+'" lang="'+id+'">'+label+'</option>').join('');}
function onePagerPath(lang=language){return 'docs/shenzhen-flower-rules-a4.'+(normalize(lang)||'en')+'.pdf';}
function documentPath(name,lang=language){
 const locale=normalize(lang)||'en',section={SDK:'sdk',ACTIONS:'actions',RL:'gym',MODEL:'models',CONTRIBUTING:'contribute'}[name];
 if(['ja','ko','es'].includes(locale)){
  if(name==='RULES')return 'docs/RULES.'+locale+'.md';
  if(section)return 'docs/GUIDE.'+locale+'.md#'+section;
 }
 return 'docs/'+name+(locale==='zh-CN'&&name!=='ACTIONS'?'.zh-CN':'')+'.md';
}
function setLanguage(next){const lang=normalize(next);if(!lang)return;language=lang;try{localStorage.setItem(key,lang);}catch{}const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);document.documentElement.lang=lang;window.GKLocale?.setLanguage(lang);window.dispatchEvent(new CustomEvent('sz-language-change',{detail:{language:lang}}));apply();}
const sourceText=new WeakMap(),sourceAttrs=new WeakMap();let observer,queued=false;
function apply(){language=normalize(document.documentElement.lang)||language;observer?.disconnect();
// The game and probability lab already own DOM translation and source tracking.
if(!window.GKLocale){const walker=document.createTreeWalker(document,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&!n.parentElement.closest('script,style,code,pre,[data-no-i18n],.site-language-select')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});while(walker.nextNode()){const n=walker.currentNode,old=sourceText.get(n),source=old?.display===n.nodeValue?old.source:n.nodeValue,display=translate(source);sourceText.set(n,{source,display});if(n.nodeValue!==display)n.nodeValue=display;}
for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]')){if(el.closest('[data-no-i18n]'))continue;const old=sourceAttrs.get(el)||{};for(const attr of ['aria-label','title','placeholder'])if(el.hasAttribute(attr)){const current=el.getAttribute(attr),source=old[attr]?.display===current?old[attr].source:current,display=translate(source);old[attr]={source,display};if(display!==current)el.setAttribute(attr,display);}sourceAttrs.set(el,old);}}
for(const select of document.querySelectorAll('[data-language-select],[data-site-language],#ds-language')){if(select.tagName!=='SELECT')continue;if(select.options.length!==5)select.innerHTML=options();select.value=language;const label=pair('语言','Language');if(select.getAttribute('aria-label')!==label)select.setAttribute('aria-label',label);}
const og=document.querySelector('meta[property="og:locale"]'),tag={'zh-CN':'zh_CN',en:'en_US',ja:'ja_JP',ko:'ko_KR',es:'es_ES'}[language];if(og&&og.content!==tag)og.content=tag;
observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['lang']});}
function init(){observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;apply();});}});document.addEventListener('change',e=>{if(e.target.matches('[data-site-language],[data-language-select]'))setLanguage(e.target.value);});apply();}
window.SZI18n={locales,normalize,translate,pair,add,options,onePagerPath,documentPath,setLanguage,apply,get language(){return language;},get missing(){return [...missing];},catalogs};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
