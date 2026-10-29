# Hearts & bougainvillea / 红桃与三角梅

2026-10-29 · `codex/logo-three-hearts` · design exploration

Three identical hearts rotated by 120°, in the existing red, gold and circuit-board palette. The flat gold card frame remains unchanged.

- **01 / 向外开花**: outward points with the original heart-shaped notch restored. The red petal path stays fixed throughout the center parameter study.
- **02 / 三心相聚**: inward points, a more literal three-heart symbol.
- **03 / 旋心**: outward hearts with a local rotation.

Each gold center uses the earlier heart-arc junction as its anchor, shifted 1.8 units inward for a closer cluster. The complete original six-lobed silhouette is restored; the experiment that smoothed only its inward half was rejected. The default is 2.25× the original production stamen size, with 0° local rotation and a single flat gold fill (#F2CD5D). Each center shares its heart’s rotation and spacing, including the separated construction view. `core=petals` retains the original dispersed centers.

## Center parameter study

Open `design-lab/three-hearts/center-study.html` to compare **96 combinations** on the outward-heart silhouette:

- Rotation: 0°, 10°, 20°, 30°, 40°, 50° (one 60° period of the six-lobed flower).
- Size: 80%, 90%, 100%, 110% of the current 2.25× baseline.
- Inward offset: 1.2, 1.8, 2.4, 3 SVG units from the heart-arc anchor.

Select a tile to compare it with the baseline, inspect the center gap, and check 16–48 px sizes on light or dark backgrounds. “放回预览” carries the exact parameters into the application preview; SVG downloads use the same parameters. Query fields are `angle`, `size`, and `inset`. The defaults in the main preview stay at 0° / 100% / 1.8. The denser combinations intentionally expose where the separate centers become too crowded.

Background references: [NParks — Bougainvillea cultivars](https://biodiversitysg.nparks.gov.sg/our-biodiversity/flowering-plants/shrubs-herbaceous-plants/bougainvillea-cultivars/) and [NParks — Bougainvillea glabra](https://www.nparks.gov.sg/florafaunaweb/flora/1/3/1335).

Open `design-lab/three-hearts/index.html?mark=bloom&core=center&theme=light` from the local HTTP server. Compare the wordmark, card backs, player colors, monochrome silhouette and 16–48 px sizes. The top button separates the hearts to show construction. `core=petals` restores the earlier dispersed centers; old spade URLs fall back to the first heart variant.

`marks.js` is the vector source. Run `node design-lab/three-hearts/export.cjs` to regenerate the fifteen SVGs in `assets/`: flower, card, monochrome, centered-flower and centered-flower card for each heart silhouette. Spade studies are no longer included in this preview; their previous versions remain in Git history.

Production logos and shared components are unchanged. This branch is for visual review before any coordinated brand migration.
