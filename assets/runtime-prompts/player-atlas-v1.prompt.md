# Player atlas v1 generation prompt

Reference: `assets/concepts/character-direction-v4.png`

Create a production-ready 2D pixel-art character sprite atlas derived faithfully from the approved character turnaround.

- One landscape PNG, exactly 4 columns x 2 rows, equal cells with generous padding.
- Perfectly flat chroma magenta `#FF00FF` background. No grid, labels, UI, scenery, floor, cast shadow, beam, particles, or extra objects.
- Same young Japanese male urban explorer: messy blue-black hair, pale warm skin, black hooded jacket, dark cargo pants, brown-black boots, compact brown backpack, chest action camera, belt pouches, and phone/battery pack.
- Preserve proportions, palette, silhouette, equipment placement, and restrained horror-game look. Full body in every cell, consistent scale and foot baseline. Action poses face screen-right. Flashlight visible in the aim pose but switched off, with no beam.

Cell order:

1. Neutral standing idle, 3/4 side view facing right.
2. Walking contact A, left leg forward.
3. Walking passing pose.
4. Walking contact B, right leg forward.
5. Cautious crouch.
6. Two-handed flashlight aim.
7. Startled recoil, alarmed but not comic.
8. Exhausted stance with dropped shoulders.

Use crisp authored pixel art, nearest-neighbor edges, muted charcoal / blue-black / worn brown colors, and hard edges suitable for chroma-key cleanup. It must remain readable at roughly 64-80 logical pixels tall.
