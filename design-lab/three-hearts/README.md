# Hearts & bougainvillea / 红桃与三角梅

2026-10-29 · `codex/logo-three-hearts` · design exploration

Three identical hearts rotated by 120°, in the existing red, gold and circuit-board palette. The flat gold card frame remains unchanged.

- **01 / 向外开花**: outward points and a shallow, continuous inner arc. The central negative space is a soft triangle, without the previous pointed notches.
- **02 / 三心相聚**: inward points, a more literal three-heart symbol.
- **03 / 旋心**: outward hearts with a local rotation.

Each gold center uses the earlier heart-arc junction as its anchor, shifted 1.8 units inward for a closer cluster. These positions stay fixed through the inner-contour refinement. Each shares its heart’s rotation and spacing, including the separated construction view. The centered stamen keeps its outward lobes and replaces its inward scallops with a continuous rounded arc, simplifying the negative space between the three centers. It uses 2.25× the original size (90% of the preceding 2.5× study), with gaps between the three centers and overlap onto the red petals. All three use a single flat gold fill (#F2CD5D). The comparison toggle retains the original stamen size and position on each heart.

Background references: [NParks — Bougainvillea cultivars](https://biodiversitysg.nparks.gov.sg/our-biodiversity/flowering-plants/shrubs-herbaceous-plants/bougainvillea-cultivars/) and [NParks — Bougainvillea glabra](https://www.nparks.gov.sg/florafaunaweb/flora/1/3/1335).

Open `design-lab/three-hearts/index.html?mark=bloom&core=center&theme=light` from the local HTTP server. Compare the wordmark, card backs, player colors, monochrome silhouette and 16–48 px sizes. The top button separates the hearts to show construction. `core=petals` restores the earlier dispersed centers; old spade URLs fall back to the first heart variant.

`marks.js` is the vector source. Run `node design-lab/three-hearts/export.cjs` to regenerate the fifteen SVGs in `assets/`: flower, card, monochrome, centered-flower and centered-flower card for each heart silhouette. Spade studies are no longer included in this preview; their previous versions remain in Git history.

Production logos and shared components are unchanged. This branch is for visual review before any coordinated brand migration.
