/* Experimental suit family. Each flower repeats one heart or spade contour. */
(function (root) {
  'use strict';
  const variants = [
    {
      id: 'bloom', family: 'heart', number: '01', name: '向外开花', en: 'Hearts in bloom',
      note: '外轮廓更尖，内侧留出心形凹口。',
      path: 'M32 11 L41.4 24.2 C45.5 30 41.4 36 36.5 34.6 Q33.6 33.8 32 31 Q30.4 33.8 27.5 34.6 C22.6 36 18.5 30 22.6 24.2 Z',
      center: [32, 27.2], rotation: 0, spread: 3, scale: .89,
    },
    {
      id: 'gather', family: 'heart', number: '02', name: '三心相聚', en: 'Three of hearts',
      note: '心尖朝内，保留更直接的红心识别。',
      path: 'M32 34 L22.5 24 C17.5 18.5 21 11.2 27 13 Q30 13.8 32 17 Q34 13.8 37 13 C43 11.2 46.5 18.5 41.5 24 Z',
      center: [32, 24], rotation: 0, spread: 0, scale: 1,
    },
    {
      id: 'spin', family: 'heart', number: '03', name: '旋心', en: 'Hearts in motion',
      note: '三颗心同向偏转，轮廓更有动势。',
      path: 'M32 10 L41 23 C45.4 29.2 42.2 35.2 37.1 34.1 Q34.1 33.5 32 30.5 Q29.9 33.5 26.9 34.1 C21.8 35.2 18.6 29.2 23 23 Z',
      center: [32, 26.5], rotation: 24, spread: 2, scale: .93,
    },
    {
      id: 'spade-bloom', family: 'spade', number: '04', name: '桃瓣', en: 'Spade petals',
      note: '完整黑桃轮廓，短柄向心。',
      path: 'M32 10 C29 15 20.5 21 21 26.5 C21.5 32.5 28 33 30.5 28.7 C30.5 32 29 34.8 27.8 38.4 L36.2 38.4 C35 34.8 33.5 32 33.5 28.7 C36 33 42.5 32.5 43 26.5 C43.5 21 35 15 32 10 Z',
      center: [32, 24], rotation: 0, spread: 2, scale: .91,
    },
    {
      id: 'spade-cut', family: 'spade', number: '05', name: '锐桃', en: 'Sharp spades',
      note: '尖顶、直侧边，三根细柄汇成花心。',
      path: 'M32 9 L41 22.5 C45 28 41 33.5 36.5 31.5 C34.6 30.7 33.7 29.3 33 28 L33 39 L31 39 L31 28 C30.3 29.3 29.4 30.7 27.5 31.5 C23 33.5 19 28 23 22.5 Z',
      center: [32, 23.5], rotation: 0, spread: 3, scale: .89,
    },
    {
      id: 'spade-spin', family: 'spade', number: '06', name: '旋桃', en: 'Turning spades',
      note: '黑桃微转，短柄衔接成旋转的花心。',
      path: 'M32 9 L41 22.5 C45 28 41 33.5 36.5 31.5 C34.6 30.7 33.7 29.3 33 28 L33 38 L31 38 L31 28 C30.3 29.3 29.4 30.7 27.5 31.5 C23 33.5 19 28 23 22.5 Z',
      center: [32, 23.5], rotation: 22, spread: 3, scale: .89,
    },
  ];
  const fallback = { red: '#C5416B', gold: '#F2CD5D', goldBase: '#ECCE80', goldEdge: '#A17C35' };
  const palette = () => root.SZThemeTokens?.brand || fallback;
  function petals(id, { mono = false, rival = false, split = false, stamen = 'petals' } = {}) {
    const v = variants.find(v => v.id === id) || variants[0], p = palette();
    const shapes = [0, 120, 240].map(angle => {
      const [x, y] = v.center;
      const core = `M${x} ${y-1.85} L${x+1.85} ${y} L${x} ${y+1.85} L${x-1.85} ${y} Z`;
      return `<g transform="rotate(${angle} 32 36)"><g transform="translate(0 -${v.spread + (split ? 7 : 0)}) rotate(${v.rotation} 32 29)"><path d="${v.path}" fill="${mono ? 'currentColor' : rival ? '#D6A41C' : p.red}"/>${mono || stamen === 'center' ? '' : `<path d="${core}" fill="${rival ? p.goldBase : p.gold}"/>`}</g></g>`;
    }).join('');
    // One central core has approximately the same gold area as three petal cores.
    const center = !mono && stamen === 'center' ? `<path d="M32 32.8 L35.2 36 L32 39.2 L28.8 36 Z" fill="${rival ? p.goldBase : p.gold}"/>` : '';
    return `<g transform="translate(32 36) scale(${v.scale}) translate(-32 -36)">${shapes}${center}</g>`;
  }
  function svg(id, { card = false, mono = false, rival = false, split = false, stamen = 'petals', label = '' } = {}) {
    const p = palette();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${split ? '-6 -6 76 76' : '0 0 64 64'}" fill="none" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${card ? `<rect x="9" y="3" width="46" height="58" rx="7" fill="${mono ? 'none' : p.goldBase}" stroke="${mono ? 'currentColor' : p.goldEdge}" stroke-width="2"/>` : ''}${petals(id, { mono, rival, split, stamen })}</svg>`;
  }
  root.SZHeartLab = { variants, petals, svg };
})(typeof window === 'undefined' ? globalThis : window);
