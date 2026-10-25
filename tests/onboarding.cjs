'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {preferences,key}=require('../app/onboarding.js');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};};
const local=storage(),session=storage(),stores=[()=>local,()=>session];
local.setItem('gk033_compact_play_1.0.0','existing game');
local.setItem('sz-policy','code');
let pref=preferences(stores);
assert(pref.shouldShow,'first visit offers the guide');
pref.seen();
assert(!preferences(stores).shouldShow,'a second load does not offer it again');
pref.enable(false);
pref=preferences(stores);
assert(!pref.enabled&&!pref.shouldShow,'disabled preference persists');
pref.seen();
assert(!preferences(stores).enabled,'manually viewing help never re-enables automatic help');
pref.enable(true);
assert(!preferences(stores).shouldShow,'enabling the option preserves the seen flag');
assert.equal(local.getItem('gk033_compact_play_1.0.0'),'existing game');
assert.equal(local.getItem('sz-policy'),'code');
const off=storage();off.setItem(key,JSON.stringify({enabled:false,seen:false}));
assert(!preferences([()=>off]).shouldShow,'off suppresses even an unseen guide');
const broken=()=>{throw Error('Storage unavailable');};
const tabStore=storage();pref=preferences([broken,()=>tabStore]);pref.seen();
assert(!preferences([broken,()=>tabStore]).shouldShow,'session fallback survives reload');
pref=preferences([broken,broken]);assert(pref.shouldShow);pref.seen();assert(!pref.shouldShow);
local.setItem(key,'bad JSON');session.setItem(key,JSON.stringify({seen:true,enabled:false}));
assert(!preferences(stores).enabled,'recover from a corrupt primary preference');
local.setItem(key,'null');session.setItem(key,'null');assert(preferences(stores).shouldShow);

// Exercise the actual table entry points while help is pending/open. These
// must return before reading or mutating a live game, scheduling AI or results.
const source=fs.readFileSync(require.resolve('../app/table.js'),'utf8');
const take=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
const code=take('function driveAI(){','function stopAI(){')+'\n'+take('function tryAction(fn){','function describeEffect(')+'\n'+take('function syncResult(){','function closeResult(){');
let scheduled=0,rendered=0;
const context={window:{SZOnboarding:{pending:true},SZDrawer:{active:null},SZCardMotion:{busy:false}},
 mode:'play',busy:false,game:{currentActor:()=>1,phase:'attack'},aiSerial:0,
 $:()=>({open:false}),render:()=>rendered++,setTimeout:()=>++scheduled};
vm.createContext(context);vm.runInContext(code,context);
for(const pending of [true,false]){
 context.window.SZOnboarding.pending=pending;
 context.window.SZDrawer.active=pending?null:'onboarding';
 context.driveAI();context.syncResult();
 context.tryAction(()=>{throw Error('Changed game behind tutorial');});
 assert.equal(scheduled,0);assert.equal(rendered,0);
}
context.window.SZDrawer.active=null;context.driveAI();
assert.equal(scheduled,1,'closing help resumes AI normally');
assert.equal(rendered,1);
console.log('OK: onboarding first/repeat visits, opt-out, manual viewing, storage recovery and table pause/resume.');
