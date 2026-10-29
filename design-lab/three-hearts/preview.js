(() => {
  'use strict';
  const $ = id => document.getElementById(id), lab = window.SZHeartLab;
  const params = new URLSearchParams(location.search);
  const requested = params.get('mark');
  let selected = lab.variants.some(v => v.id === requested) ? requested : 'bloom';
  let dark = params.get('theme') === 'dark', split = false;
  let stamen = params.get('core') === 'petals' ? 'petals' : 'center';
  $('variants').innerHTML = lab.variants.map(v => `<button class="variant" data-variant="${v.id}" aria-pressed="false"><span class="mark"></span><span><span class="number">${v.number}</span><strong>${v.name}</strong><p>${v.note}</p></span></button>`).join('');
  function render() {
    const variant = lab.variants.find(v => v.id === selected);
    $('hero-eyebrow').textContent = 'HEARTS & BOUGAINVILLEA';
    $('hero-title').innerHTML = '三颗红心。<br>花开在中间。';
    $('hero-note').textContent = '红桃轮廓不变，中央是一簇三角梅小花。';
    $('construction-label').textContent = 'ONE HEART × THREE';
    $('comparison-label').textContent = stamen === 'center' ? '红桃 · 花心居中' : '红桃 · 每瓣一蕊';
    $('stamen-note').textContent = variant.name + ' · 同一轮廓';
    $('petal-core-mark').innerHTML = lab.svg(selected, {stamen:'petals'});
    $('center-core-mark').innerHTML = lab.svg(selected, {stamen:'center'});
    document.querySelectorAll('[data-stamen]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.stamen === stamen)));
    const colors = SZThemeTokens[dark ? 'dark' : 'light'];
    document.documentElement.dataset.szTheme = dark ? 'dark' : 'light';
    for (const [k, value] of Object.entries(colors)) if (k !== 'name') document.documentElement.style.setProperty('--' + k, value);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    $('theme').textContent = dark ? '日间' : '夜间';
    $('theme').setAttribute('aria-pressed', String(dark));
    $('hero-mark').innerHTML = lab.svg(selected, { split, stamen, label: variant.name });
    $('split').setAttribute('aria-pressed', String(split));
    $('split').textContent = split ? '合成一朵花 ↙' : '拆开看三颗心 ↗';
    document.querySelectorAll('.variant').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variant === selected)));
    document.querySelectorAll('.variant .mark').forEach(el => { el.innerHTML = lab.svg(el.closest('[data-variant]').dataset.variant, {stamen}); });
    $('chosen-name').textContent = variant.name;
    document.querySelectorAll('[data-mark]').forEach(el => {
      const type = el.dataset.mark;
      el.innerHTML = type === 'back'
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 100" aria-hidden="true"><rect x="1" y="1" width="68" height="98" rx="8" fill="#ECCE80" stroke="#A17C35" stroke-width="1.3"/><rect x="4.5" y="4.5" width="61" height="91" rx="5" fill="none" stroke="#A17C35" stroke-opacity=".55"/><g transform="translate(13 28) scale(.69)">${lab.petals(selected, {stamen})}</g></svg>`
        : lab.svg(selected, { stamen, card: type === 'card', rival: type === 'rival', mono: type === 'mono' });
    });
    // Keep a fixed production reference beside the experiment, including the official palette.
    $('original-mark').innerHTML = SZFlowerMark.replace(/var\(--sz-logo-petal,[^)]+\)/g, SZThemeTokens.brand.red).replace(/var\(--sz-logo-center,[^)]+\)/g, SZThemeTokens.brand.gold);
    $('single-heart').innerHTML = `<svg viewBox="14 6 36 36" aria-hidden="true"><path d="${variant.path}" fill="${SZThemeTokens.brand.red}"/></svg>`;
    const suffix = stamen === 'center' ? '-center' : '';
    $('download-flower').href = `assets/${selected}${suffix}-flower.svg`;
    $('download-card').href = `assets/${selected}${suffix}-card.svg`;
    const url = new URL(location.href); url.searchParams.set('mark', selected); url.searchParams.set('theme', dark ? 'dark' : 'light'); url.searchParams.set('core', stamen);
    history.replaceState(null, '', url);
  }
  $('variants').addEventListener('click', event => { const button = event.target.closest('[data-variant]'); if (!button) return; selected = button.dataset.variant; split = false; render(); });
  $('stamen-options').addEventListener('click', event => { const button = event.target.closest('[data-stamen]'); if (!button) return; stamen = button.dataset.stamen; render(); });
  $('theme').onclick = () => { dark = !dark; render(); };
  $('split').onclick = () => { split = !split; render(); };
  render();
})();
