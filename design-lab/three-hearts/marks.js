/* Experimental vector family. All petals are copies of one closed heart path. */
(function (root) {
  'use strict';
  const variants = [
    {
      id: 'bloom', number: '01', name: '向外开花', en: 'Hearts in bloom',
      note: '外轮廓更尖，内侧留出心形凹口。',
      path: 'M32 11 L41.4 24.2 C45.5 30 41.4 36 36.5 34.6 Q33.6 33.8 32 31 Q30.4 33.8 27.5 34.6 C22.6 36 18.5 30 22.6 24.2 Z',
      center: [32, 27.2], rotation: 0, spread: 3, scale: .89,
    },
    {
      id: 'gather', number: '02', name: '三心相聚', en: 'Three of hearts',
      note: '心尖朝内，保留更直接的红心识别。',
      path: 'M32 34 L22.5 24 C17.5 18.5 21 11.2 27 13 Q30 13.8 32 17 Q34 13.8 37 13 C43 11.2 46.5 18.5 41.5 24 Z',
      center: [32, 24], rotation: 0, spread: 0, scale: 1,
    },
    {
      id: 'spin', number: '03', name: '旋心', en: 'Hearts in motion',
      note: '三颗心同向偏转，轮廓更有动势。',
      path: 'M32 10 L41 23 C45.4 29.2 42.2 35.2 37.1 34.1 Q34.1 33.5 32 30.5 Q29.9 33.5 26.9 34.1 C21.8 35.2 18.6 29.2 23 23 Z',
      center: [32, 26.5], rotation: 24, spread: 2, scale: .93,
    },
  ];
  const fallback = { red: '#C5416B', gold: '#F2CD5D', goldBase: '#ECCE80', goldEdge: '#A17C35' };
  const palette = () => root.SZThemeTokens?.brand || fallback;
  function petals(id, { mono = false, rival = false, split = false } = {}) {
    const v = variants.find(v => v.id === id) || variants[0], p = palette();
    const shapes = [0, 120, 240].map(angle => {
      const [x, y] = v.center;
      const core = `M${x} ${y-1.85} L${x+1.85} ${y} L${x} ${y+1.85} L${x-1.85} ${y} Z`;
      return `<g transform="rotate(${angle} 32 36)"><g transform="translate(0 -${v.spread + (split ? 7 : 0)}) rotate(${v.rotation} 32 29)"><path d="${v.path}" fill="${mono ? 'currentColor' : rival ? '#D6A41C' : p.red}"/>${mono ? '' : `<path d="${core}" fill="${rival ? p.goldBase : p.gold}"/>`}</g></g>`;
    }).join('');
    return `<g transform="translate(32 36) scale(${v.scale}) translate(-32 -36)">${shapes}</g>`;
  }
  function svg(id, { card = false, mono = false, rival = false, split = false, label = '' } = {}) {
    const p = palette();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${split ? '-6 -6 76 76' : '0 0 64 64'}" fill="none" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${card ? `<rect x="9" y="3" width="46" height="58" rx="7" fill="${mono ? 'none' : p.goldBase}" stroke="${mono ? 'currentColor' : p.goldEdge}" stroke-width="2"/>` : ''}${petals(id, { mono, rival, split })}</svg>`;
  }
  root.SZHeartLab = { variants, petals, svg };
})(typeof window === 'undefined' ? globalThis : window);
