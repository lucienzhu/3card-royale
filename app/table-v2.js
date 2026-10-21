/* Design system v2: the wound track sits beside each player's name, and each pile count sits in the pile label above the card, so the back below stays a plain back. */
(()=>{'use strict';
 const place=(zone,id)=>{const title=document.querySelector(zone+' .player-identity'),bar=document.getElementById(id);if(title&&bar&&bar.previousElementSibling!==title)title.after(bar);};
 const count=(pile,id)=>{const label=document.querySelector(pile+' .pile-label'),b=document.getElementById(id);if(label&&b&&b.parentElement!==label)label.append(b);};
 const run=()=>{place('.opponent-zone','opp-damage');place('.own-zone','own-damage');count('.stock-pile','stock-count');count('.discard-pile','discard-count');};
 run();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
})();
