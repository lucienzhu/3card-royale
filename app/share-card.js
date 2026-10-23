/* MIT. Local PNG cards from public settlement data; never writes game state or sends a file automatically. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SZShareCard=api;})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
const SHARE_URL='https://lucienzhu.github.io/gk-royale-playtest/',QR_ROWS=["111111101101111101000001110100010", "100000100011000100100111000011100", "101110101000101111001111111100100", "101110101101000101100101110011001", "101110101110001010011110111111011", "100000101111110101111001100011110", "111111100010010111000011101010110", "000000001010110011111010100010111", "100011100010100001110011111110011", "101110011011111010111100100001111", "100101110101101001110100011001110", "101100000100001110001001001100101", "001000111000110000100100010111000", "010001000001100010011111100111101", "110011110111011110101010011110110", "011010010000101000111001001101101", "101011110100011101000010110110001", "100010011101010100000100011011100", "110001101011101110001000111001110", "111000001100010100100001001000011", "010110111011101010011001110011011", "101000011101010011100100100011111", "010011111011011111001110000010110", "101011000000110011011111001101111", "101111100001110001011010101111100", "000000001001101010111100000000000", "111111101010101010101010101111111", "100000101100010000110010001000001", "101110101011011111001011001011101", "101110101100000100100010001011101", "101110101101101010001110001011101", "100000100111100110100000001000001", "111111100011000010111101001111111"];
const WIDTH=1080,HEIGHT=1440,escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const palettes={light:{paper:'#EDF4EF',ink:'#10231B',muted:'#4F665A',line:'#C3D4C9',table:'#E2ECE5',red:'#C5416B',gold:'#D6A41C',goldCenter:'#F2CD5D',redText:'#B2365A',goldText:'#866300',gray:'#9DB5A8'},dark:{paper:'#0C2118',ink:'#EAF3EE',muted:'#9DB5A8',line:'#2C4B3C',table:'#112A1F',red:'#C5416B',gold:'#E4C46A',goldCenter:'#F2CD5D',redText:'#E38BA6',goldText:'#E4C46A',gray:'#4F665A'}};
// Only the two already-revealed plays belong in a share. Never copy private hands,
// stock, replacement metadata, or the rest of a saved combat object into the poster.
function publicCombat(c){
 const valid=n=>Number.isInteger(n)&&n>=0&&n<52;
 if(!c||![0,1].includes(c.attacker)||!Array.isArray(c.moves)||c.moves.length!==2||c.moves.some(m=>!m||!Array.isArray(m.cards)||m.cards.length<3||m.cards.length>5||!m.cards.every(valid)||new Set(m.cards).size!==m.cards.length||!Number.isFinite(m.score)))return null;
 return {attacker:c.attacker,actor:[0,1].includes(c.actor)?c.actor:null,reason:String(c.reason||''),action:String(c.action||''),amount:Number(c.amount)||0,before:Array.isArray(c.before)?c.before.slice(0,2).map(Number):null,after:Array.isArray(c.after)?c.after.slice(0,2).map(Number):null,moves:c.moves.map(m=>({cards:[...m.cards],score:m.score,kind:m.kind,name:String(m.name||''),wounds:m.cards.map((_,i)=>['table','wounds'].includes(m.origins?.[i]?.zone)),wild:m.wild&&m.cards.includes(m.wild.physical)&&valid(m.wild.as)?{physical:m.wild.physical,as:m.wild.as}:null}))};
}
const GAME_LAYOUTS=['recap','finish','highlight'];
const layoutOf=value=>GAME_LAYOUTS.includes(value)?value:'finish';
const combatKey=c=>c.attacker+':'+c.moves.map(m=>m.cards.join(',')).join('/');
// Snapshots repeat the previous combat during swaps and refills. Collapse those
// copies, keep their public outcome, and restrict the collection to this game.
function collectCombats(events,game,last,round){
 const records=[],seen=new Map();
 for(const e of Array.isArray(events)?events:[]){
  if(e.game!==game)continue;
  const combat=publicCombat(e.state?.lastCombat);
  if(!combat||!combat.action)continue;
  const turn=Math.max(1,Number(e.round)||1),key=turn+':'+combatKey(combat);
  if(seen.has(key))records[seen.get(key)]={...combat,round:turn,order:seen.get(key)+1};
  else{seen.set(key,records.length);records.push({...combat,round:turn,order:records.length+1});}
 }
 if(last){
  const final=records.at(-1);
  if(!final||combatKey(final)!==combatKey(last))records.push({...last,round:Number(round)||1,order:records.length+1});
 }
 return records;
}
const damageOf=c=>c.action==='damage'?c.amount:0;
const topScore=c=>Math.max(...c.moves.map(m=>m.score));
function featured(d,pick=d.highlightPick){
 const records=d.combats||[],sorted=[...records].sort((a,b)=>pick==='hand'?topScore(b)-topScore(a)||damageOf(b)-damageOf(a)||b.order-a.order:damageOf(b)-damageOf(a)||topScore(b)-topScore(a)||b.order-a.order);
 const combat=sorted[0]||d.combat;
 if(!combat)return {combat:null,who:d.winner};
 const who=pick==='hand'?(combat.moves[0].score===combat.moves[1].score?(combat.action==='damage'?combat.attacker:combat.actor??d.winner):combat.moves[0].score>combat.moves[1].score?0:1):combat.action==='damage'?combat.attacker:combat.actor??(combat.moves[0].score>combat.moves[1].score?0:1);
 return {combat,who};
}
// A recap is a complete chronological record, including scoreless defenses.
function recap(d){return [...(d.combats||[])];}
function summarize(input){
 if(!input?.results?.length)throw new Error('A settled game is required.');
 const results=JSON.parse(JSON.stringify(input.results)),r=results.at(-1),winner=r.winner;
 if(![0,1].includes(winner))throw new Error('Invalid result winner.');
 const match=!!input.match;if(match&&!r.match_won)throw new Error('An unfinished match cannot bloom.');
 const wins=[0,0];results.forEach(x=>wins[x.winner]++);
 const ownAce=results.filter(x=>x.ace_challenger===winner),setbacks=ownAce.filter(x=>x.winner!==winner).length,firstAce=results.find(x=>x.winner===winner&&x.from<14&&x.to===14)?.game??null;
 const s=input.snapshot,combat=publicCombat(s.lastCombat),combats=collectCombats(input.events,r.game,combat,r.rounds),finalWounds=s.players.map(p=>Array.isArray(p.table)?p.table.map(x=>({card:x.up&&Number.isInteger(x.card)&&x.card>=0&&x.card<52?x.card:null})):null),snapshot={players:s.players.map(p=>({level:p.level})),aLosses:[...(s.aLosses||[0,0])],phase:s.phase,levelOwner:s.levelOwner};
 return {results,result:r,winner,match,combat:combat||combats.at(-1)||null,combats,finalWounds,layout:layoutOf(input.layout),highlightPick:input.highlightPick==='hand'?'hand':'damage',playerName:String(input.playerName||''),lang:input.lang==='en'?'en':'zh-CN',theme:input.theme==='dark'?'dark':'light',version:String(input.version||'1.0.0'),seed:Number(input.seed)>>>0,first:input.first===1?1:0,snapshot,wins,games:results.length,rounds:results.reduce((n,x)=>n+(Number(x.rounds)||0),0),setbacks,firstAce};
}
// A single-game keepsake is about the decisive play. Physical cards stay physical:
// a flower's scored substitution is a caption, never a replacement of its face.
function gameSVG(d,assets){
 const en=d.lang==='en',t=(a,b)=>en?b:a,p=palettes[d.theme],layout=layoutOf(d.layout),feature=featured(d),c=layout==='highlight'?feature.combat:d.combat,r=d.result,w=layout==='highlight'?feature.who:d.winner,accent=w===0?p.redText:p.goldText;
 const gameWho=q=>q===0?(d.playerName||t('你','You')):t('对手','Rival'),gap=Number(r.damage[1-d.winner])-Number(r.damage[d.winner]);
 const title=layout==='recap'?t('本局回顾','Game recap'):layout==='finish'?t('决胜现场','Final hand'):t('高光一手','Best play');
 const points=n=>t(n+'分',n+(n===1?' pt':' pts'));
 const rank=n=>({11:'J',12:'Q',13:'K',14:'A'}[n]||String(n)),label=id=>'♠♥♣♦'[Math.floor(id/13)]+rank(id%13+2);
 const role=(q,co=c)=>co?.attacker===q?t('进攻','Attack'):t('防守','Defense');
 const names=['高牌','对子','顺子','同花','三炸','同花顺','四炸','五炸'],english=['High card','Pair','Straight','Flush','Three of a kind','Straight flush','Four of a kind','Five of a kind'];
 const hand=m=>{const k=Number.isInteger(m.kind)?m.kind:['高牌','对子','顺子','同花','炸弹','同花顺','四炸','五炸'].indexOf(m.name);return (en?english:names)[k]||m.name;};
 const units=s=>[...String(s)].reduce((n,x)=>n+(x.charCodeAt(0)>255?1:.56),0);
 const text=(x,y,s,size,fill=p.ink,weight=400,anchor='start',width=920)=>`<text x="${x}" y="${y}" font-size="${Math.min(size,width/Math.max(1,units(s))).toFixed(1)}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${escape(s)}</text>`;
 const shapes=['M12 2C11.3 2.6 2.6 9.2 2.6 15.1C2.6 20 8 21 11.2 18.1L8.7 22.6H15.3L12.8 18.1C16 21 21.4 20 21.4 15.1C21.4 9.2 12.7 2.6 12 2Z','M12 22C11.2 21.4 2.2 15.4 2.2 8.9C2.2 5.6 4.6 3 7.6 3C9.5 3 11 4.1 12 5.6C13 4.1 14.5 3 16.4 3C19.4 3 21.8 5.6 21.8 8.9C21.8 15.4 12.8 21.4 12 22Z','M6.9 7.3a5.1 5.1 0 1 0 10.2 0a5.1 5.1 0 1 0-10.2 0M1.3 14a5.1 5.1 0 1 0 10.2 0a5.1 5.1 0 1 0-10.2 0M12.5 14a5.1 5.1 0 1 0 10.2 0a5.1 5.1 0 1 0-10.2 0M12 11.2L8.9 22.6H15.1Z','M12 2C13.9 6.2 17.6 10 21 12C17.6 14 13.9 17.8 12 22C10.1 17.8 6.4 14 3 12C6.4 10 10.1 6.2 12 2Z'];
 const suit=(id,x,y,size,ink,opacity=1)=>`<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" opacity="${opacity}"><path d="${shapes[Math.floor(id/13)]}" fill="${ink}"/></svg>`;
 function cards(m,y,large,options={}){
  const n=m.cards.length;if(!n)return '';
  const cw=options.width||(large?Math.min(196,(920-(n-1)*16)/n):136),ch=cw*1.4,gap=options.gap??(large?16:14),center=options.center??540,x0=center-(n*cw+(n-1)*gap)/2,rowHeight=options.rowHeight??(large?274.4:ch);
  return `<g data-play="${options.zone||(large?'winner':'response')}">`+m.cards.map((id,i)=>{
   const x=x0+i*(cw+gap),back=id===null,wild=!back&&m.wild?.physical===id,ink=[1,3].includes(Math.floor(id/13))?'#B2365A':'#173D39',scale=cw/196;
   const face=back?`<svg x="${cw*.22}" y="${ch*.3}" width="${cw*.56}" height="${ch*.4}" viewBox="0 0 64 72">${assets.flower}</svg>`:text(20*scale,72*scale,rank(id%13+2),66*scale,ink,750)+suit(id,18*scale,89*scale,36*scale,ink)+suit(id,68*scale,131*scale,110*scale,ink,.09)+(wild?text(20*scale,ch-19*scale,'★',28*scale,'#866300',700):'')+(m.wounds?.[i]?text(cw-17*scale,ch-19*scale,t('伤','W'),25*scale,'#866300',650,'end'):'');
   return `<g data-card="${back?'hidden':id}" transform="translate(${x} ${y+(rowHeight-ch)/2})"><rect y="5" width="${cw}" height="${ch}" rx="${Math.min(16,cw*.08)}" fill="#000" opacity=".05"/><rect width="${cw}" height="${ch}" rx="${Math.min(16,cw*.08)}" fill="${back?'#ECCE80':wild?'#FFF9E8':'#FFFEFA'}" stroke="${back||wild?'#C3A249':'#C3D4C9'}" stroke-width="${wild?3:1.5}"/>${face}</g>`;
  }).join('')+'</g>';
 }
 const identity=(q,x,y,size=26)=>`<svg x="${x}" y="${y-size}" width="${size}" height="${size}" viewBox="0 0 64 72">${assets.flower.replace(/fill="#D83B74"/g,'fill="'+(q===0?p.red:p.gold)+'"').replace(/fill="#DEB04A"/g,'fill="'+(q===0?p.goldCenter:p.red)+'"')}</svg>`;
 const outcome=co=>{
  if(co.action==='damage'){const q=1-co.attacker,total=co.after?.[q];return gameWho(q)+t(' +'+co.amount+'伤',' +'+co.amount+(co.amount===1?' wound':' wounds'))+(Number.isFinite(total)?t(' · 累计'+total+'伤',' · '+total+' total'):'');}
  if(co.action==='refresh')return gameWho(co.actor??1-co.attacker)+t('获'+co.amount+'次换牌机会',' · '+co.amount+(co.amount===1?' swap chance':' swap chances'));
  return co.reason==='exact_tie'||co.reason==='tie'?t('平手','Tie'):t('无伤害','No damage');
 };
 const stepName=co=>String(co.order).padStart(2,'0')+t(' · 第'+co.round+'轮',' · Round '+co.round);
 const wildNote=m=>m.wild?t('花牌 '+label(m.wild.physical)+' → '+label(m.wild.as),'Wild '+label(m.wild.physical)+' → '+label(m.wild.as)):'';
 const playerColor=q=>q===0?p.redText:p.goldText;
 const effectWho=co=>co.action==='damage'?1-co.attacker:co.action==='refresh'?(co.actor??1-co.attacker):null;
 function outcomeLabel(co,x,y,size=30,width=850){
  const q=effectWho(co);
  return (q===null?'':identity(q,x,y+2,size))+text(x+(q===null?0:size+12),y,outcome(co),size,q===null?p.muted:playerColor(q),650,'start',width-size);
 }
 function playerTitle(q,y,m,co,emphasis=false){
  return identity(q,80,y+3,38)+text(134,y,gameWho(q)+' · '+role(q,co),38,playerColor(q),700,'start',340)+text(1000,y,hand(m)+' '+points(m.score),emphasis?37:32,emphasis?playerColor(q):p.muted,emphasis?700:500,'end',490);
 }
 let body='',height=HEIGHT;
 if(layout==='recap'&&d.combats.length){
  const plays=recap(d),step=506,start=356;
  height=Math.max(HEIGHT,start+plays.length*step+220);
  body+=text(80,230,title,en?84:94,p.ink,750)+text(80,288,t('共'+plays.length+'次攻防',plays.length+(plays.length===1?' play':' plays')),30,p.muted);
  plays.forEach((co,i)=>{
   const y=start+i*step;
   body+=`<g data-story-order="${co.order}">`+text(80,y,stepName(co),26,p.muted,500)+`<path d="M80 ${y+20}H1000" stroke="${p.line}"/>`;
   // Each combat is one row: attack on the left, defense on the right.
   // Flower identities follow the players as their roles alternate.
   [co.attacker,1-co.attacker].forEach((q,j)=>{
    const x=80+j*488,top=y+64,m=co.moves[q],cw=Math.min(136,(432-(m.cards.length-1)*12)/m.cards.length);
    body+=`<g data-player="${q}" data-player-y="${top}" data-player-x="${x}" data-role="${j===0?'attack':'defense'}">`+identity(q,x,top+2,32)+text(x+44,top,role(q,co)+' · '+gameWho(q),32,playerColor(q),700,'start',388);
    body+=text(x,top+46,hand(m)+' '+points(m.score),34,p.ink,650,'start',432);
    body+=cards(m,y+132,false,{center:x+216,width:cw,gap:12,rowHeight:192,zone:j===0?'story-attack':'story-defense'});
    const note=wildNote(m);if(note)body+=text(x,y+354,note,25,p.muted,400,'start',432);
    body+='</g>';
   });
   body+=text(540,y+239,'→',32,p.muted,400,'middle')+outcomeLabel(co,80,y+400,30)+'</g>';
  });
 }else if(layout==='finish'&&c){
  body+=text(80,214,title,en?84:94,p.ink,750)+text(80,266,t('最后一手','Last play'),30,p.muted);
  function finalSide(q,y){
   const m=c.moves[q],list=d.finalWounds[q]||Array.from({length:Number(r.damage[q])||0},()=>({card:null})),cw=Math.min(72,(600-Math.max(0,list.length-1)*8)/Math.max(1,list.length));
   let section=`<g data-player="${q}" data-player-y="${y}">`+playerTitle(q,y,m,c);
   section+=cards(m,y+28,true,{width:144,gap:16,rowHeight:202,zone:q===1?'rival-play':'own-play'});
   section+=text(80,y+286,t(r.damage[q]+'伤',r.damage[q]+(r.damage[q]===1?' wound':' wounds')),31,playerColor(q),650,'start',260);
   section+=list.length?cards({cards:list.map(x=>x.card)},y+250,false,{width:cw,gap:8,center:700,rowHeight:101,zone:q===0?'own-wounds':'rival-wounds'}):text(700,y+295,'—',32,p.muted,400,'middle');
   if(wildNote(m))section+=text(540,y+237,wildNote(m),23,p.muted,400,'middle');
   return section+'</g>';
  }
  body+=finalSide(1,340);
  const subject=gameWho(d.winner),verb=d.winner===0&&!d.playerName?'win':'wins',woundCount=n=>n+(n===1?' wound':' wounds');
  const resultLine=c.action==='damage'
   ?t(subject+'打出'+c.amount+'伤，以'+gap+'伤之差获胜。',subject+(verb==='win'?' deal ':' deals ')+woundCount(c.amount)+' and '+verb+' by '+woundCount(gap)+'.')
   :t(subject+'以'+gap+'伤之差获胜。',subject+' '+verb+' by '+woundCount(gap)+'.');
  body+=`<g data-finish-result="sentence">`+text(540,786,resultLine,en?34:38,p.ink,600,'middle',880)+'</g>';
  body+=finalSide(0,862);
 }else if(c){
  body+=text(80,214,title,en?84:94,p.ink,750)+text(80,268,t('第'+c.order+'次攻防','Play '+c.order)+' · '+(d.highlightPick==='hand'?t('最大牌型','Best hand'):t('最大伤害','Biggest hit')),30,p.muted);
  function playSide(q,y){
   const m=c.moves[q],isFeatured=q===w,cw=isFeatured?Math.min(196,(920-(m.cards.length-1)*16)/m.cards.length):148;
   let section=`<g data-player="${q}" data-player-y="${y}" data-featured="${isFeatured}">`+playerTitle(q,y,m,c,isFeatured);
   section+=cards(m,y+34,isFeatured,{width:cw,gap:16,rowHeight:275,zone:isFeatured?'winner':'response'});
   section+=text(540,y+346,wildNote(m),25,p.muted,400,'middle');
   return section+'</g>';
  }
  body+=playSide(1,340);
  const attack=c.moves[c.attacker],damage=c.action==='damage'&&c.amount>0,q=damage?c.attacker:c.actor??1-c.attacker,subject=gameWho(q),you=q===0&&!d.playerName,wounds=c.amount+(c.amount===1?' wound':' wounds');
  let effect=t('本次攻防未造成伤害。','No wounds dealt in this exchange.');
  if(damage)effect=c.reason==='rank_attack'
   ?t(subject+'以点数胜出，打出'+c.amount+'伤。',subject+(you?' win':' wins')+' on rank and '+(you?'deal ':'deals ')+wounds+'.')
   :t(subject+'用'+hand(attack)+'打出'+c.amount+'伤。',subject+(you?' deal ':' deals ')+wounds+' with '+hand(attack).toLowerCase()+'.');
  else if(c.action==='refresh')effect=t(subject+'获得'+c.amount+'次换牌机会。',subject+(you?' earn ':' earns ')+c.amount+(c.amount===1?' swap opportunity.':' swap opportunities.'));
  else if(c.reason==='exact_tie'||c.reason==='tie')effect=t('双方平手，伤势不变。','An exact tie; no wounds dealt.');
  body+=`<g data-highlight-result="sentence">`+text(540,786,effect,en?34:38,p.ink,600,'middle',880)+'</g>';
  body+=playSide(0,862);
 }else{
  // Old saves without the final combat remain shareable; don't invent a hand.
  body+=text(540,350,t('赢下这一局','Won this game'),88,accent,750,'middle')+text(540,540,rank(r.from)+' → '+rank(r.to),130,p.ink,700,'middle');
  [1,0].forEach((q,i)=>{const y=740+i*210;body+=`<g data-player="${q}" data-player-y="${y}">`+identity(q,300,y,44)+text(362,y-4,gameWho(q),42,playerColor(q),700,'start',300)+text(780,y-4,t(r.damage[q]+' 伤',r.damage[q]+' wounds'),42,p.ink,600,'end',300)+'</g>';});
 }
 const qrSize=QR_ROWS.length+8,qrPath=QR_ROWS.flatMap((row,y)=>[...row.matchAll(/1+/g)].map(m=>`M${m.index+4} ${y+4}h${m[0].length}v1h-${m[0].length}z`)).join('');
 const mark=assets.flower.replace(/fill="#DEB04A"/g,'fill="#F2CD5D"').replace(/fill="#D83B74"/g,'fill="#C5416B"');
 const footer=height-HEIGHT;
 const brandWidth=en?236:128,brandX=1000-brandWidth-60;
 const brand=`<g data-share-brand="top-right"><rect x="${brandX}" y="69" width="40" height="52" rx="6" fill="url(#share-logo-gold)" stroke="#A17C35" stroke-width="1.8"/><svg x="${brandX+3}" y="74" width="34" height="42" viewBox="0 0 64 72">${mark}</svg>${text(1000,106,t('深圳花牌','3Card Royale'),30,p.ink,700,'end',brandWidth)}</g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}" role="img" aria-label="${escape(title)}" data-share-layout="${layout}"><defs><linearGradient id="share-logo-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F7E8B5"/><stop offset=".45" stop-color="#ECCE80"/><stop offset=".58" stop-color="#F5E5AF"/><stop offset="1" stop-color="#C6A357"/></linearGradient></defs><style>text{font-family:-apple-system,BlinkMacSystemFont,PingFang SC,Hiragino Sans GB,Microsoft YaHei,Arial,sans-serif}</style><rect width="1080" height="${height}" fill="${p.paper}"/>`+
 identity(d.winner,80,112,28)+text(120,110,gameWho(d.winner)+t('赢下第 '+r.game+' 局',' won game '+r.game),28,p.muted,500,'start',490)+brand+body+
 `<g transform="translate(0 ${footer})">`+text(540,1242,rank(r.from)+' → '+rank(r.to)+' · '+r.rounds+t('轮',r.rounds===1?' round':' rounds'),27,p.muted,500,'middle')+
 `<path d="M80 1270H1000" stroke="${p.line}"/>`+
 text(80,1330,t('三张牌，打出花。','Three cards. Make them bloom.'),28,p.ink,600)+text(80,1418,t('规则 ','Rules ')+d.version,19,p.muted)+
 `<svg x="840" y="1276" width="164" height="164" viewBox="0 0 ${qrSize} ${qrSize}" shape-rendering="crispEdges" aria-label="${SHARE_URL}"><rect width="${qrSize}" height="${qrSize}" fill="#fff"/><path d="${qrPath}" fill="#121417"/></svg></g></svg>`;
}
// The poster is a still of the finale: the winner's flower over the skyline, the vine below, the game's address last.
function makeSVG(d,assets=root.SZBloomAssets,cityStyle=root.SZShareAssets?.cityStyle,bloom=root.SZBloom,finale=root.SZFinale){
 if(!assets)throw new Error('Share card assets are unavailable.');
 if(!d.match)return gameSVG(d,assets);
 if(!cityStyle||!bloom||!finale)throw new Error('Share card assets are unavailable.');
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
function filename(d){return 'shenzhen-flower-'+(d.match?'match':'game-'+layoutOf(d.layout)+(d.layout==='highlight'?'-'+(d.highlightPick||'damage'):''))+'-'+d.seed+'-'+d.result.game+'.png';}
// Retain every play. Very long records scale proportionally to keep the raster
// allocation bounded; neither the record nor the bottom of the PNG is cropped.
function exportSize(svg){
 const rootTag=svg.match(/^<svg\b[^>]*>/)?.[0]||'',width=Number(rootTag.match(/\bwidth="([\d.]+)"/)?.[1]),height=Number(rootTag.match(/\bheight="([\d.]+)"/)?.[1]);
 if(!(width>0&&height>0&&Number.isFinite(width*height)))throw new Error('Invalid poster dimensions.');
 const scale=Math.min(1,Math.sqrt(12000000/(width*height)),16384/Math.max(width,height));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
async function png(svg){
 const size=exportSize(svg),raster=svg.replace(/^<svg\b[^>]*>/,tag=>tag.replace(/\bwidth="[\d.]+"/,'width="'+size.width+'"').replace(/\bheight="[\d.]+"/,'height="'+size.height+'"')),source=URL.createObjectURL(new Blob([raster],{type:'image/svg+xml;charset=utf-8'}));
 try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('PNG artwork could not load.'));img.src=source;});const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable.');ctx.drawImage(img,0,0,size.width,size.height);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed.')),'image/png'));}finally{URL.revokeObjectURL(source);}
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
let lastLayout='recap',lastHighlight='damage';
async function open(input){
 const base=summarize(input),en=base.lang==='en',t=(a,b)=>en?b:a;
 clear();
 if(!dialog){dialog=document.createElement('dialog');dialog.id='share-card-dialog';dialog.className='modal sz-share-dialog';dialog.dataset.noI18n='';dialog.addEventListener('close',()=>{clear();dialog.replaceChildren();});document.body.append(dialog);}
 const tabs=base.match?'':`<div class="sz-share-tabs" role="tablist" aria-label="${t('分享方式','Share style')}">${[['recap','本局回顾','Game recap'],['finish','决胜现场','Final hand'],['highlight','高光一手','Best play']].map(([id,zh,eng])=>`<button type="button" role="tab" id="share-tab-${id}" aria-controls="share-poster-panel" data-share-layout="${id}">${t(zh,eng)}</button>`).join('')}</div>`;
 dialog.lang=base.lang;dialog.dataset.match=String(base.match);
 dialog.innerHTML=`<div class="modal-head"><h2 id="share-card-title">${base.match?t('分享卡片','Share card'):t('回顾与分享','Review & share')}</h2><button type="button" data-share-close>${t('返回结算','Back to result')}</button></div>${tabs}<div class="sz-share-body"><div class="sz-share-context"><p data-share-caption></p><div class="sz-share-picks" role="group" aria-label="${t('选择高光','Pick a highlight')}" hidden><button type="button" data-share-pick="damage">${t('最大伤害','Biggest hit')}</button><button type="button" data-share-pick="hand">${t('最大牌型','Best hand')}</button></div></div><div class="sz-share-preview" id="share-poster-panel" role="tabpanel" aria-busy="true"><p role="status">${t('正在生成 PNG…','Creating your PNG…')}</p><img hidden alt="${t('本次结算分享卡','Share card for this result')}"></div><p class="sz-share-note"></p><div class="sz-share-actions"><a class="primary" data-share-download hidden>${t('保存 PNG','Save PNG')}</a><button type="button" data-share-system hidden>${t('分享…','Share…')}</button><button type="button" data-share-copy hidden>${t('复制图片','Copy image')}</button><button type="button" data-share-retry hidden>${t('重试','Try again')}</button></div><p class="sz-share-status" role="status" aria-live="polite"></p></div>`;
 dialog.setAttribute('aria-labelledby','share-card-title');dialog.querySelector('[data-share-close]').onclick=close;
 let layout=layoutOf(input.layout||lastLayout),pick=input.highlightPick||lastHighlight;
 const $=s=>dialog.querySelector(s),img=$('img'),preview=$('.sz-share-preview'),message=preview.querySelector('p'),download=$('[data-share-download]'),system=$('[data-share-system]'),copy=$('[data-share-copy]'),retry=$('[data-share-retry]'),status=$('.sz-share-status');
 img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',t('放大或缩小分享图片','Enlarge or fit share image'));img.setAttribute('aria-expanded','false');
 const zoom=()=>{if(preview.dataset.long==='true')return;const expanded=preview.dataset.zoomed!=='true';preview.dataset.zoomed=String(expanded);img.setAttribute('aria-expanded',String(expanded));};img.onclick=zoom;img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();zoom();}};
 async function render(){
  preview.dataset.zoomed='false';preview.dataset.long=String(!base.match&&layout==='recap'&&base.combats.length>1);preview.scrollTop=0;img.setAttribute('aria-expanded','false');img.setAttribute('role',preview.dataset.long==='true'?'img':'button');img.setAttribute('aria-label',preview.dataset.long==='true'?t('本局所有攻防，向下滚动查看','All plays in this game. Scroll down to review.'):t('放大或缩小分享图片','Enlarge or fit share image'));$('.sz-share-note').textContent='';preview.tabIndex=preview.dataset.long==='true'?0:-1;img.tabIndex=preview.dataset.long==='true'?-1:0;if(preview.dataset.long==='true')img.removeAttribute('aria-expanded');
  clear();const generation=run,d={...base,layout,highlightPick:pick};
  for(const tab of dialog.querySelectorAll('[data-share-layout]')){const active=tab.dataset.shareLayout===layout;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
  for(const button of dialog.querySelectorAll('[data-share-pick]'))button.setAttribute('aria-pressed',String(button.dataset.sharePick===pick));
  if(!base.match)preview.setAttribute('aria-labelledby','share-tab-'+layout);else preview.removeAttribute('role');
  $('.sz-share-picks').hidden=base.match||layout!=='highlight';
  $('[data-share-caption]').textContent=base.match?'':!base.combat?t('旧记录仅存结果。','Only the result was saved.'):layout==='recap'?t('共'+base.combats.length+'次攻防'+(base.combats.length>1?' · 下滑查看':''),base.combats.length+(base.combats.length>1?' plays · Scroll to review':' play')):layout==='finish'?t('最后一手与伤牌','Last play and wounds'):'';
  $('[data-share-caption]').hidden=!$('[data-share-caption]').textContent;
  preview.setAttribute('aria-busy','true');img.hidden=true;img.removeAttribute('src');message.hidden=false;message.textContent=t('正在生成 PNG…','Creating your PNG…');status.textContent='';
  for(const control of [download,system,copy,retry])control.hidden=true;
  download.removeAttribute('href');download.onclick=null;system.onclick=null;copy.onclick=null;copy.disabled=false;system.disabled=false;
  try{
   if(document.fonts?.ready)await document.fonts.ready;
   if(generation!==run)return;
   const artwork=makeSVG(d),size=exportSize(artwork),blob=await png(artwork);if(generation!==run)return;
   $('.sz-share-note').textContent=size.width+' × '+size.height+' · '+(preview.dataset.long==='true'?t('完整长图','Full game PNG'):t('点图放大','Tap image to enlarge'));
   previewURL=URL.createObjectURL(blob);img.src=previewURL;img.hidden=false;message.hidden=true;preview.setAttribute('aria-busy','false');download.href=previewURL;download.download=filename(d);download.hidden=false;
   download.onclick=()=>{status.textContent=t('已准备下载；也可长按图片保存。','Download ready. You can also save the preview image.');};
   const payload=sharePayload(new File([blob],filename(d),{type:'image/png'}),navigator,d),canCopy=copySupported(navigator,root.ClipboardItem);
   copy.hidden=!canCopy;
   copy.onclick=async()=>{copy.disabled=true;try{await navigator.clipboard.write([new root.ClipboardItem({'image/png':blob})]);if(generation===run)status.textContent=t('已复制。打开微信对话，长按输入框选“粘贴”，即可发送。','Copied. Paste it into a chat to send it.');}catch(_){if(generation===run)status.textContent=t('没能复制。请长按图片存到相册，再从微信发送。','Could not copy. Save the preview image, then send it from your photos.');}finally{if(generation===run)copy.disabled=false;}};
   system.hidden=!payload;system.textContent=payload&&!payload.files?t('分享链接…','Share link…'):t('分享…','Share…');
   system.onclick=async()=>{system.disabled=true;try{await navigator.share(payload);if(generation===run)status.textContent=t('已分享。','Shared.');}catch(e){if(generation===run)status.textContent=e.name==='AbortError'?t('图片还在，随时可以保存。','Your card is still ready to save.'):t('请保存 PNG 后分享。','Save the PNG to share it.');}finally{if(generation===run)system.disabled=false;}};
   status.textContent=canCopy?t('发给微信好友：点“复制图片”后粘贴。','You can also copy the image and paste it into a chat.'):t('长按图片也可保存。','You can also save the preview image.');
  }catch(_){if(generation!==run)return;message.textContent=t('图片暂未生成，请重试。','Could not create the image. Please try again.');preview.setAttribute('aria-busy','false');retry.hidden=false;}
 }
 for(const tab of dialog.querySelectorAll('[data-share-layout]')){
  tab.onclick=()=>{layout=tab.dataset.shareLayout;lastLayout=layout;render();};
  tab.onkeydown=e=>{const ids=GAME_LAYOUTS,i=ids.indexOf(layout),next=e.key==='ArrowRight'?(i+1)%3:e.key==='ArrowLeft'?(i+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next===null)return;e.preventDefault();const button=$('[data-share-layout="'+ids[next]+'"]');button.click();button.focus();};
 }
 for(const button of dialog.querySelectorAll('[data-share-pick]'))button.onclick=()=>{pick=button.dataset.sharePick;lastHighlight=pick;render();};
 retry.onclick=render;
 if(!dialog.open)dialog.showModal();else $('[data-share-close]').focus({preventScroll:true});
 await render();
}
return {SHARE_URL,WIDTH,HEIGHT,palettes,summarize,featured,recap,makeSVG,filename,exportSize,png,sharePayload,copySupported,open,close};
});
