/* Suit shapes drawn as inline SVG. The shape is card content, so any copy of a card (flight pictures, frozen boards) keeps it without depending on attributes or CSS masks. */
(()=>{'use strict';
 const circle=(cx,cy,r)=>'<path d="M'+(cx-r)+' '+cy+'a'+r+' '+r+' 0 1 0 '+(2*r)+' 0a'+r+' '+r+' 0 1 0 -'+(2*r)+' 0z"/>';
 const shapes={
  s:'<path d="M12 2C11.3 2.6 2.6 9.2 2.6 15.1C2.6 17.9 4.7 19.9 7.3 19.9C8.9 19.9 10.3 19.2 11.2 18.1C10.9 19.9 10 21.4 8.7 22.6L15.3 22.6C14 21.4 13.1 19.9 12.8 18.1C13.7 19.2 15.1 19.9 16.7 19.9C19.3 19.9 21.4 17.9 21.4 15.1C21.4 9.2 12.7 2.6 12 2Z"/>',
  h:'<path d="M12 22C11.2 21.4 2.2 15.4 2.2 8.9C2.2 5.6 4.6 3 7.6 3C9.5 3 11 4.1 12 5.6C13 4.1 14.5 3 16.4 3C19.4 3 21.8 5.6 21.8 8.9C21.8 15.4 12.8 21.4 12 22Z"/>',
  c:circle(12,7.3,5.1)+circle(6.4,14,5.1)+circle(17.6,14,5.1)+'<path d="M12 11.2C11.6 16 10.7 19.4 8.9 22.6L15.1 22.6C13.3 19.4 12.4 16 12 11.2Z"/>',
  d:'<path d="M12 2C13.9 6.2 17.6 10 21 12C17.6 14 13.9 17.8 12 22C10.1 17.8 6.4 14 3 12C6.4 10 10.1 6.2 12 2Z"/>'
 };
 const letters='shcd';
 const key=suit=>typeof suit==='number'?letters[suit]:suit;
 function svg(suit){return '<svg class="suit-shape" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">'+(shapes[key(suit)]||'')+'</svg>';}
 const isRed=suit=>key(suit)==='h'||key(suit)==='d';
 const rankClass=label=>'rank'+(String(label)==='10'?' ten':'');
 window.SZSuit={letters,svg,isRed,rankClass};
})();
