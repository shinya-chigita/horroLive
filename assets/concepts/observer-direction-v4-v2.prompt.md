# HorroLive — anom_observer Tier 0 correction prompt (v4-v2)

## Generation mode

- Built-in `image_gen` edit
- Use case: `precise-object-edit`
- Image 1 role: edit target

## Final prompt

Use case: precise-object-edit
Asset type: corrected production direction sheet for a 2D horror game anomaly

Input images: Image 1 is the edit target. Preserve its canvas, aspect ratio, pixel-art rendering, panel geometry, palette, lighting, grain, and every element outside the first/leftmost Tier 0 panel.

Primary request: Change only the first, leftmost Tier 0 panel. Remove the currently visible pale humanoid figure completely. Erase every explicit cue of a depicted body: no head shape, no rounded skull, no neck, no shoulder line, no torso boundary, no arms, no legs, no continuous human outline, no garment, no standing shadow, and no ghost silhouette.

Tier 0 replacement: reconstruct the same hospital wall and floor behind that area using irregular non-figurative compression artifacts and missing-information patches. Use a sparse cluster of mismatched rectangular pixel blocks, broken wall seams, interrupted peeling-paint texture, displaced flashlight grain, and two or three disconnected floor-reflection gaps. The patches may create a very weak accidental upright ambiguity only after prolonged viewing, but must first and clearly read as ordinary wall/floor corruption. Keep the artifact asymmetrical, discontinuous, angular, and fragmented; it must not close into a human contour. There must be no single top block that reads as a head and no bilateral shoulder structure. Preserve the curtain, bed edge, switch plate, flashlight cone, wall, floor debris, and lighting arrangement of the first panel.

Hard invariants: change only the leftmost Tier 0 panel and only the pixels necessary to remove the humanoid silhouette and reconstruct the wall/floor artifact. Keep the top/bottom margins and all panel dividers unchanged. Keep the second Tier 1 panel exactly unchanged, including its distant PIP figure and scanlines. Keep the third Tier 2 panel exactly unchanged, including the protagonist, flashlight, curtain occlusion, partial Observer, clothing, and environment. Keep the fourth Tier 3 panel exactly unchanged, including the over-shoulder crop, blank face, detection brackets, outfit, palette, and framing. Do not redesign, move, relight, sharpen, crop, rescale, recolor, or add detail anywhere else. Maintain the exact original image dimensions.

Style/medium: preserve the existing authored 2D pixel art, limited near-black and gray-green palette, dusty warm flashlight light, subtle grain, and crisp clustered pixels.

Constraints: no text, no labels, no numbers, no logo, no watermark, no new UI, no added characters. Tier 0 contains no depicted entity; it is environmental information loss only.

Avoid in Tier 0: person, humanoid, ghost, body, portrait, face, head, shoulders, torso, limbs, clothing, shadow person, full silhouette, rounded anatomical forms, symmetrical arrangement, continuous outline, pareidolia that is immediately obvious.
