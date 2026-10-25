const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
module.exports=async function(){
 const action={type:'play',cards:[0,1,2]},elements={};let fail=false,applied;
 const element=id=>elements[id]||=( {value:'',options:['easy','nn','code','godlike','arena'].map(value=>({value})),addEventListener(type,fn){this[type]=fn;}} );
 function Game(){}Game.prototype.observation=()=>({legal_actions:[action]});Game.prototype.step=a=>{applied=a;};
 const location={href:'http://localhost/?policy=random-v1',search:'?policy=random-v1'};
 const ctx={URL,URLSearchParams,Event,document:{currentScript:{src:'http://localhost/app/policy-ai.js'},documentElement:{lang:'en'},getElementById:element},location,history:{replaceState(a,b,url){location.href=url.href;location.search=url.search;}},MutationObserver:class{observe(){}},queueMicrotask,setTimeout,clearTimeout,localStorage:{getItem(){return 'easy';},setItem(){}},ThreeCardRoyale:{Game},RoyaleEasyPolicy:{version:'easy-v2',chooseAction:()=>action},window:{GKLocale:{language:'en'},dispatchEvent(){},SZArenaPolicy:{selected:'random-v1',cancel(){},async decide(){if(fail)throw Error('offline');return {kind:'arena',action};}}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../../app/policy-ai.js','file://'+__filename),'utf8'),ctx);
 const api=ctx.window.SZPolicy,game={version:'1.0.0',currentActor:()=>1};assert.equal(api.selected,'arena');const d=await api.decide(game);api.apply(game,d);assert.equal(applied,action);
 fail=true;assert.equal((await api.decide(game)).fallback,'arena');assert.equal((await api.decide({...game,version:'0.3.3'})).kind,'legacy');
 element('policy-select').value='code';element('policy-select').change();assert.equal(api.selected,'code');assert(!new URL(location.href).searchParams.has('policy'));assert.equal((await api.decide(game)).kind,'code');
 element('policy-select').value='arena';element('policy-select').change();assert.equal(new URL(location.href).searchParams.get('policy'),'random-v1');
 console.log('Arena: browser route, legal apply, Easy fallback, legacy rules and reload-safe preference URLs.');
};
