/* Design system v2: the wound track (count and bracts) sits beside each player's name instead of the hidden head row. */
(()=>{'use strict';
 const place=(zone,id)=>{const title=document.querySelector(zone+' .player-identity'),bar=document.getElementById(id);if(title&&bar&&bar.previousElementSibling!==title)title.after(bar);};
 const run=()=>{place('.opponent-zone','opp-damage');place('.own-zone','own-damage');};
 run();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
})();
