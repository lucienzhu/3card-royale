# Hearts & bougainvillea / 红桃与三角梅

2026-10-29 · `codex/logo-three-hearts` · design exploration

Three identical hearts rotated by 120°, in the existing red, gold and circuit-board palette. The flat gold card frame and the three heart silhouettes remain unchanged.

- **01 / 向外开花**: outward points, inward heart notches.
- **02 / 三心相聚**: inward points, a more literal three-heart symbol.
- **03 / 旋心**: outward hearts with a local rotation.

Each gold center now sits exactly at the junction of its heart’s two lobe arcs. It shares the heart’s rotation and spacing, including the separated construction view. The original stamen silhouette remains at 1.9× size, with gaps between the three centers and overlap onto the red petals. All three use a single flat gold fill (#F2CD5D). The comparison toggle retains the original stamen size and position on each heart.

Background references: [NParks — Bougainvillea cultivars](https://biodiversitysg.nparks.gov.sg/our-biodiversity/flowering-plants/shrubs-herbaceous-plants/bougainvillea-cultivars/) and [NParks — Bougainvillea glabra](https://www.nparks.gov.sg/florafaunaweb/flora/1/3/1335).

Open `design-lab/three-hearts/index.html?mark=bloom&core=center&theme=light` from the local HTTP server. Compare the wordmark, card backs, player colors, monochrome silhouette and 16–48 px sizes. The top button separates the hearts to show construction. `core=petals` restores the earlier dispersed centers; old spade URLs fall back to the first heart variant.

`marks.js` is the vector source. Run `node design-lab/three-hearts/export.cjs` to regenerate the fifteen SVGs in `assets/`: flower, card, monochrome, centered-flower and centered-flower card for each heart silhouette. Spade studies are no longer included in this preview; their previous versions remain in Git history.

Production logos and shared components are unchanged. This branch is for visual review before any coordinated brand migration.
