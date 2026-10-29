# Hearts & spades / 红心与黑桃

2026-10-29 · `codex/logo-three-hearts` · design exploration

Three identical suit contours rotated by 120°, using the current red, gold and circuit-board palette. The flat gold card frame stays the same. Spades explore the silhouette while retaining the red flower color.

- **01 / 向外开花**: outward points, inward heart notches. Closest to the current three-point flower, with a sharper silhouette.
- **02 / 三心相聚**: inward points. A more literal three-heart symbol.
- **03 / 旋心**: outward hearts with a local rotation. A more energetic, asymmetric petal contour within threefold symmetry.
- **04 / 桃瓣**: complete spade silhouettes, with broad stems meeting in the center.
- **05 / 锐桃**: sharp spade points and thin stems forming a shared flower center.
- **06 / 旋桃**: rotated spades with separated stems, giving a turning silhouette.

Open `design-lab/three-hearts/index.html?mark=spade-cut&core=center` from the repository's local HTTP server. Switch between heart and spade families, then select a mark and compare the lockup, card backs, player colors, monochrome silhouette and 16–48 px sizes. The top button separates the petals for inspection; it is a construction view, not a final logo variant.

The stamen comparison keeps the petal geometry identical: **每瓣一蕊** places three gold diamonds on the petals; **花蕊居中** replaces them with one diamond at their common center, keeping approximately the same total gold area. Selecting either updates all application previews and SVG download links. The `core` query parameter preserves the choice.

`marks.js` is the source for all experiment vectors. Run `node design-lab/three-hearts/export.cjs` to regenerate the thirty standalone SVGs in `assets/`: flower, card, monochrome, centered-stamen flower and centered-stamen card for each of the six contours.

Production logos and shared components are unchanged. This branch is for visual review before any coordinated brand migration.
