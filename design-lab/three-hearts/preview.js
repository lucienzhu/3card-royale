(() => {
  'use strict';
  const $ = id => document.getElementById(id), lab = window.SZHeartLab;
  const params = new URLSearchParams(location.search);
  let selected = lab.variants.some(v => v.id === params.get('mark')) ? params.get('mark') : 'bloom';
  let dark = params.get('theme') === 'dark', split = false;
  let lastFamily = '';
  function render() {
    const variant = lab.variants.find(v => v.id === selected);
    const spade = variant.family === 'spade';
    if (lastFamily !== variant.family) {
      $('variants').innerHTML = lab.variants.filter(v => v.family === variant.family).map(v => `<button class="variant" data-variant="${v.id}" aria-pressed="false"><span class="mark">${lab.svg(v.id)}</span><span><span class="number">${v.number}</span><strong>${v.name}</strong><p>${v.note}</p></span></button>`).join('');
      lastFamily = variant.family;
    }
    document.querySelectorAll('[data-family]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.family === variant.family)));
    $('hero-eyebrow').textContent = spade ? 'THREE SPADES, ONE FLOWER' : 'THREE HEARTS, ONE FLOWER';
    $('hero-title').innerHTML = spade ? '三枚黑桃。<br>一朵三角梅。' : '三颗红心。<br>一朵三角梅。';
    $('hero-note').textContent = spade ? '借黑桃的尖顶与短柄，保留红花与金蕊。' : '沿着扑克牌的红心，试一朵更锋利的花。';
    $('construction-label').textContent = spade ? 'ONE SPADE × THREE' : 'ONE HEART × THREE';
    $('comparison-label').textContent = spade ? variant.name : '三颗心';
    $('heart-reference').hidden = !spade;
    $('heart-mark').innerHTML = lab.svg('bloom');
    const colors = SZThemeTokens[dark ? 'dark' : 'light'];
    document.documentElement.dataset.szTheme = dark ? 'dark' : 'light';
    for (const [k, value] of Object.entries(colors)) if (k !== 'name') document.documentElement.style.setProperty('--' + k, value);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    $('theme').textContent = dark ? '日间' : '夜间';
    $('theme').setAttribute('aria-pressed', String(dark));
    $('hero-mark').innerHTML = lab.svg(selected, { split, label: variant.name });
    $('split').setAttribute('aria-pressed', String(split));
    $('split').textContent = split ? '合成一朵花 ↙' : spade ? '拆开看三枚黑桃 ↗' : '拆开看三颗心 ↗';
    document.querySelectorAll('.variant').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variant === selected)));
    $('chosen-name').textContent = variant.name;
    document.querySelectorAll('[data-mark]').forEach(el => {
      const type = el.dataset.mark;
      el.innerHTML = type === 'back'
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 100" aria-hidden="true"><rect x="1" y="1" width="68" height="98" rx="8" fill="#ECCE80" stroke="#A17C35" stroke-width="1.3"/><rect x="4.5" y="4.5" width="61" height="91" rx="5" fill="none" stroke="#A17C35" stroke-opacity=".55"/><g transform="translate(13 28) scale(.69)">${lab.petals(selected)}</g></svg>`
        : lab.svg(selected, { card: type === 'card', rival: type === 'rival', mono: type === 'mono' });
    });
    // Keep a fixed production reference beside the experiment, including the official palette.
    $('original-mark').innerHTML = SZFlowerMark.replace(/var\(--sz-logo-petal,[^)]+\)/g, SZThemeTokens.brand.red).replace(/var\(--sz-logo-center,[^)]+\)/g, SZThemeTokens.brand.gold);
    $('single-heart').innerHTML = `<svg viewBox="14 6 36 36" aria-hidden="true"><path d="${variant.path}" fill="${SZThemeTokens.brand.red}"/></svg>`;
    $('download-flower').href = `assets/${selected}-flower.svg`;
    $('download-card').href = `assets/${selected}-card.svg`;
    const url = new URL(location.href); url.searchParams.set('mark', selected); url.searchParams.set('theme', dark ? 'dark' : 'light');
    history.replaceState(null, '', url);
  }
  $('families').addEventListener('click', event => { const button = event.target.closest('[data-family]'); if (!button) return; selected = button.dataset.family === 'spade' ? 'spade-cut' : 'bloom'; split = false; render(); });
  $('variants').addEventListener('click', event => { const button = event.target.closest('[data-variant]'); if (!button) return; selected = button.dataset.variant; split = false; render(); });
  $('theme').onclick = () => { dark = !dark; render(); };
  $('split').onclick = () => { split = !split; render(); };
  render();
})();
