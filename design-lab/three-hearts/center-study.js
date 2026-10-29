(() => {
  'use strict';
  const lab = window.SZHeartLab, $ = id => document.getElementById(id);
  const angles = [0, 10, 20, 30, 40, 50], sizes = [80, 90, 100, 110], insets = [1.2, 1.8, 2.4, 3];
  const query = new URLSearchParams(location.search);
  let chosen = lab.centerOptions(Object.fromEntries(['angle', 'size', 'inset'].map(key => [key, query.get(key)])));
  let dark = query.get('theme') === 'dark';
  const key = p => [p.angle, p.size, p.inset].join(',');
  const markup = p => lab.svg('bloom', {stamen:'center', centers:p});
  let count = 0;
  $('matrix').innerHTML = insets.map(inset => `<section class="matrix-section"><h2>内移 ${inset}</h2><p>${inset === 1.8 ? '原版位置' : inset < 1.8 ? '更松一些' : '更靠近中心'} · 每行一种大小，逐列旋转</p><div class="matrix-grid">${sizes.flatMap(size => angles.map(angle => {
    const p = {angle, size, inset}; count += 1;
    return `<button class="candidate" data-params="${key(p)}" aria-pressed="false" aria-label="${angle} 度，${size}%，内移 ${inset}"><span class="id">${String(count).padStart(2,'0')}</span>${markup(p)}<strong>${angle}° · ${size}%</strong><small>内移 ${inset}</small></button>`;
  })).join('')}</div></section>`).join('');
  $('baseline').innerHTML = markup({angle:0,size:100,inset:1.8});
  function render() {
    document.body.classList.toggle('dark', dark);
    $('theme').textContent = dark ? '浅色' : '深色';
    $('theme').setAttribute('aria-pressed', String(dark));
    $('selected').innerHTML = markup(chosen);
    $('detail').innerHTML = markup(chosen).replace('viewBox="0 0 64 64"','viewBox="23 26 18 18"');
    $('selection-label').textContent = `${chosen.angle}° / ${chosen.size}% / 内移 ${chosen.inset}`;
    $('sizes').innerHTML = [16,24,32,48].map(size => `<span><span style="width:${size}px">${markup(chosen)}</span>${size} px</span>`).join('');
    document.querySelectorAll('[data-params],[data-pick]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.params || button.dataset.pick) === key(chosen))));
    const params = new URLSearchParams({...chosen, theme:dark ? 'dark' : 'light'});
    $('apply').href = `index.html?mark=bloom&core=center&${params}`;
    $('card-compare').href = `index.html?mark=bloom&core=center&cardTone=gold-outline&${params}#card-study`;
    $('download').href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lab.svg('bloom',{stamen:'center',centers:chosen,label:'Hearts in bloom'}));
    $('download').download = `bloom-center-${chosen.angle}-${chosen.size}-${chosen.inset}.svg`;
    history.replaceState(null,'',`?${params}`);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-params],[data-pick]');
    if (!button) return;
    const [angle,size,inset] = (button.dataset.params || button.dataset.pick).split(',').map(Number);
    chosen = {angle,size,inset}; render();
    if (button.dataset.params) document.querySelector('.inspection').scrollIntoView({block:'start'});
  });
  $('theme').onclick = () => {dark = !dark; render();};
  render();
})();
