# Runtime Visual Atlases v1

This directory documents the runtime-ready visual atlases served from
`public/assets/runtime/`. The PNG files remain in `public/` so Vite can expose
them at `/assets/runtime/<file>` without an import-time transform.

All three runtime PNGs are transparent, 32-bit RGBA images. Their companion
`*-key.png` files are retained under `assets/runtime-sources/` as chroma-key
generation sources and must not be used by the renderer or shipped by Vite.

## Sampling contract

- Use nearest-neighbor filtering (`imageSmoothingEnabled = false`).
- Resolve a source cell by proportional grid coordinates. Atlas dimensions are
  intentionally not required to divide evenly by every row or column count.
- Compute cell edges as `atlasSize * index / gridCount`, rather than rounding a
  single cell size and accumulating error.
- Frame coordinates below are zero-based `(column, row)`.
- Normalized pivots are relative to the selected source cell.
- Keep the current procedural renderer as a fallback while an image is loading
  or if it fails to decode.

## Player atlas

- Runtime: `public/assets/runtime/player-atlas-v1.png`
- Dimensions: 1672 x 941
- Grid: 4 columns x 2 rows
- Output contract: 64 x 80 logical pixels
- Output pivot: `(32, 76)`; bottom-center with four logical pixels of foot room

| Frame | Cell | Intended use |
| --- | --- | --- |
| `idle_right` | (0, 0) | Default idle pose; mirror for left-facing |
| `walk_contact_a` | (1, 0) | Walk cycle contact A |
| `walk_passing` | (2, 0) | Walk cycle passing pose |
| `walk_contact_b` | (3, 0) | Walk cycle contact B |
| `crouch` | (0, 1) | Low stance / inspection |
| `flashlight_aim` | (1, 1) | Active flashlight pose |
| `startle` | (2, 1) | Immediate fear reaction |
| `fatigue` | (3, 1) | Low-energy idle / late loop |

The generated character faces right. Horizontal mirroring happens at draw time;
the pivot remains unchanged in logical output space.

## Hospital props atlas

- Runtime: `public/assets/runtime/hospital-props-atlas-v1.png`
- Dimensions: 1448 x 1086
- Grid: 4 columns x 4 rows
- Ground pivot: normalized `(0.5, 0.92)`
- Center pivot: normalized `(0.5, 0.5)`

| Cell | Runtime ID | Pivot |
| --- | --- | --- |
| (0, 0) | `prop_bed_rusted` | ground |
| (1, 0) | `prop_gurney` | ground |
| (2, 0) | `prop_wheelchair` | ground |
| (3, 0) | `prop_iv_stand` | ground |
| (0, 1) | `prop_medicine_cart` | ground |
| (1, 1) | `prop_locker_closed` | ground |
| (2, 1) | `prop_locker_open` | ground |
| (3, 1) | `prop_crt_monitor` | ground |
| (0, 2) | `prop_room_door` | ground |
| (1, 2) | `prop_curtain` | ground |
| (2, 2) | `prop_wet_reflection` | center |
| (3, 2) | `gear_backpack` | ground |
| (0, 3) | `item_keycard` | center |
| (1, 3) | `item_diary` | center |
| (2, 3) | `item_old_photo` | center |
| (3, 3) | `item_battery` | center |

The atlas does not yet cover `item_broken_phone`, `gear_flashlight`, or
`gear_chest_camera`; those IDs remain in the required inventory and should keep
their procedural fallback until a later atlas revision.

## Observer atlas

- Runtime: `public/assets/runtime/observer-atlas-v1.png`
- Dimensions: 1672 x 941
- Grid: 3 columns x 1 row
- Floor pivot: normalized `(0.5, 0.94)`
- Fragment pivot: normalized `(0.5, 0.5)`

| Frame | Cell | Pivot | Intended use |
| --- | --- | --- | --- |
| `far_silhouette` | (0, 0) | floor | Distant PIP manifestation |
| `mid_occluded_fragment` | (1, 0) | fragment | Partial/occluded reveal |
| `near_head_shoulders_edge` | (2, 0) | fragment | Near-camera edge intrusion |

Observer frames are presentation fragments, not ordinary world sprites. Apply
the existing anomaly channel, alpha, approach, and risk-tier rules after frame
selection so the atlas does not make the Observer routinely explicit.
