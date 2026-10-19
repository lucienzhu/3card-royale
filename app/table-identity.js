/* Reuse the live controls and approved mark; presentation only, no game state. */
(() => {
  'use strict';
  const header = document.querySelector('.app-header');
  const table = document.querySelector('#play-area .table');
  const tabs = table?.querySelector('.tabs');
  const goal = header?.querySelector('.match-goal');
  const topline = table?.querySelector('.topline');
  if (!header || !table || !tabs || !goal || !topline || !window.SZBloomAssets) return;

  header.insertBefore(tabs, header.querySelector('.header-controls'));
  const heading = document.createElement('div');
  heading.className = 'table-heading';
  table.prepend(heading);
  heading.append(goal, topline);

  const marks = [];
  for (const [side, color] of [['opp', 'gold'], ['own', 'red']]) {
    const zone = document.querySelector(side === 'opp' ? '.opponent-zone' : '.own-zone');
    const title = zone.querySelector('.player-title');
    const head = zone.querySelector('.player-head');
    const hand = zone.querySelector('.hand-group');
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mark.setAttribute('viewBox', '0 0 64 72');
    mark.setAttribute('role', 'img');
    mark.setAttribute('focusable', 'false');
    mark.classList.add('player-flower', 'player-flower-' + color);
    mark.innerHTML = window.SZBloomAssets.flower;
    title.prepend(mark);
    hand.prepend(title);
    title.classList.add('player-identity');
    // Keep dynamic counts available to assistive technology, without a second status row.
    head.classList.add('table-sr-only');
    title.querySelectorAll('.level,.hand-total').forEach(el => el.classList.add('table-sr-only'));
    hand.setAttribute('aria-describedby', side + '-damage ' + side + '-hand-count');
    marks.push([mark, color]);
  }
  function labelColors() {
    const en = document.documentElement.lang.startsWith('en');
    for (const [mark, color] of marks) {
      const label = en ? (color === 'gold' ? 'Gold flower' : 'Red flower') : (color === 'gold' ? '金花' : '红花');
      if (mark.getAttribute('aria-label') !== label) mark.setAttribute('aria-label', label);
    }
  }
  labelColors();
  new MutationObserver(labelColors).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  document.body.classList.add('table-identity-layout');
})();
