/* Experimental heart family. Three identical hearts surround a bougainvillea flower center. */
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

  ];
  const fallback = { red: '#C5416B', gold: '#F2CD5D', goldBase: '#ECCE80', goldEdge: '#A17C35' };
  const palette = () => root.SZThemeTokens?.brand || fallback;
  // Reuse the original logo's flat stamen silhouette; one gold fill, no detail layers.
  const stamenPath = "M32.0000 28.5300C32.0829 28.5300 32.1732 28.5641 32.2487 28.6107C32.3242 28.6573 32.3927 28.7403 32.4529 28.8096C32.5132 28.8790 32.5582 28.9660 32.6102 29.0269C32.6622 29.0878 32.7049 29.1403 32.7650 29.1750C32.8251 29.2097 32.8919 29.2205 32.9706 29.2350C33.0494 29.2496 33.1472 29.2451 33.2374 29.2626C33.3276 29.2800 33.4337 29.2979 33.5118 29.3400C33.5899 29.3820 33.6646 29.4432 33.7061 29.5150C33.7475 29.5868 33.7631 29.6821 33.7605 29.7708C33.7579 29.8595 33.7203 29.9602 33.6904 30.0471C33.6604 30.1339 33.6075 30.2164 33.5808 30.2919C33.5541 30.3674 33.5300 30.4306 33.5300 30.5000C33.5300 30.5694 33.5541 30.6326 33.5808 30.7081C33.6075 30.7836 33.6604 30.8661 33.6904 30.9529C33.7203 31.0398 33.7579 31.1405 33.7605 31.2292C33.7631 31.3179 33.7475 31.4132 33.7061 31.4850C33.6646 31.5568 33.5899 31.6180 33.5118 31.6600C33.4337 31.7021 33.3276 31.7200 33.2374 31.7374C33.1472 31.7549 33.0494 31.7504 32.9706 31.7650C32.8919 31.7795 32.8251 31.7903 32.7650 31.8250C32.7049 31.8597 32.6622 31.9122 32.6102 31.9731C32.5582 32.0340 32.5132 32.1210 32.4529 32.1904C32.3927 32.2597 32.3242 32.3427 32.2487 32.3893C32.1732 32.4359 32.0829 32.4700 32.0000 32.4700C31.9171 32.4700 31.8268 32.4359 31.7513 32.3893C31.6758 32.3427 31.6073 32.2597 31.5471 32.1904C31.4868 32.1210 31.4418 32.0340 31.3898 31.9731C31.3378 31.9122 31.2951 31.8597 31.2350 31.8250C31.1749 31.7903 31.1081 31.7795 31.0294 31.7650C30.9506 31.7504 30.8528 31.7549 30.7626 31.7374C30.6724 31.7200 30.5663 31.7021 30.4882 31.6600C30.4101 31.6180 30.3354 31.5568 30.2939 31.4850C30.2525 31.4132 30.2369 31.3179 30.2395 31.2292C30.2421 31.1405 30.2797 31.0398 30.3096 30.9529C30.3396 30.8661 30.3925 30.7836 30.4192 30.7081C30.4459 30.6326 30.4700 30.5694 30.4700 30.5000C30.4700 30.4306 30.4459 30.3674 30.4192 30.2919C30.3925 30.2164 30.3396 30.1339 30.3096 30.0471C30.2797 29.9602 30.2421 29.8595 30.2395 29.7708C30.2369 29.6821 30.2525 29.5868 30.2939 29.5150C30.3354 29.4432 30.4101 29.3820 30.4882 29.3400C30.5663 29.2979 30.6724 29.2800 30.7626 29.2626C30.8528 29.2451 30.9506 29.2496 31.0294 29.2350C31.1081 29.2205 31.1749 29.2097 31.2350 29.1750C31.2951 29.1403 31.3378 29.0878 31.3898 29.0269C31.4418 28.9660 31.4868 28.8790 31.5471 28.8096C31.6073 28.7403 31.6758 28.6573 31.7513 28.6107C31.8268 28.5641 31.9171 28.5300 32.0000 28.5300Z";
  function goldStamen(x, y) {
    return `<path d="${stamenPath}" transform="translate(${x - 32} ${y - 30.5})" fill="${palette().gold}"/>`;
  }
  function flowerCenter() {
    return '<g data-flower-center="bougainvillea">' +
      [[32, 32.3], [28.8, 37.85], [35.2, 37.85]].map(([x,y]) => goldStamen(x,y)).join('') + '</g>';
  }
  function petals(id, { mono = false, rival = false, split = false, stamen = 'petals' } = {}) {
    const v = variants.find(v => v.id === id) || variants[0], p = palette();
    const shapes = [0, 120, 240].map(angle => {
      const [x, y] = v.center;
      return `<g transform="rotate(${angle} 32 36)"><g transform="translate(0 -${v.spread + (split ? 7 : 0)}) rotate(${v.rotation} 32 29)"><path d="${v.path}" fill="${mono ? 'currentColor' : rival ? '#D6A41C' : p.red}"/>${mono || stamen === 'center' ? '' : goldStamen(x, y)}</g></g>`;
    }).join('');
    // Three flat stamens grouped at the shared center.
    const center = !mono && stamen === 'center' ? flowerCenter() : '';
    return `<g transform="translate(32 36) scale(${v.scale}) translate(-32 -36)">${shapes}${center}</g>`;
  }
  function svg(id, { card = false, mono = false, rival = false, split = false, stamen = 'petals', label = '' } = {}) {
    const p = palette();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${split ? '-6 -6 76 76' : '0 0 64 64'}" fill="none" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${card ? `<rect x="9" y="3" width="46" height="58" rx="7" fill="${mono ? 'none' : p.goldBase}" stroke="${mono ? 'currentColor' : p.goldEdge}" stroke-width="2"/>` : ''}${petals(id, { mono, rival, split, stamen })}</svg>`;
  }
  root.SZHeartLab = { variants, petals, svg };
})(typeof window === 'undefined' ? globalThis : window);
