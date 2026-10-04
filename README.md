# Floor Planner

A local website for trying furniture layouts on your own floor plan, to scale. No install, no server, nothing is uploaded anywhere.

## Run it

1. Download the whole `floorplanner` folder to your computer (keep `css`, `js` and `vendor` next to `index.html`).
2. Double-click `index.html`. Chrome or Edge works best.

## Where your work is saved

- **Automatically in the browser** on this computer (IndexedDB). It survives closing the browser, but clearing site data removes it.
- **Save / export → Auto-save to a file on this computer** (Chrome/Edge): pick a file once and every change is also written to it.
- **Save / export → Download project file** gives you a `.floorplan.json` copy. Open it again with **Open project file** on the start page.

## Quick tour

| Tool | What it does |
|---|---|
| Scale (S) | Draw along a wall you know, type its real length. PDFs that print a scale like "1:100" are scaled automatically. The same panel can **straighten** a plan drawn at an angle (draw along a wall), turn it 90°, and **crop** away title blocks. |
| Select (V) | Drag to move, corner handles resize keeping proportions (Shift = stretch freely), side handles change one side, round handle rotates in 15° steps (Shift = free rotation). Click an item again to pick the one under it (e.g. a rug under a table). |
| Erase (E) | Paint (brush) or box over parts of the printed plan, e.g. a bed drawn in the wrong place. Per layout. |
| Lights (L) | Drag a box over a room, choose what the room is for, and get a recommended light layout with notes. Turn on *Preview lighting* to see the coverage. |
| Measure (M) | Measure any distance in the plan. |

- Furniture: about 40 standard pieces grouped by room (living room, dining, bedroom, office, kitchen, bathroom & laundry, doors), with a search box. Click or drag from the library. Change width/depth in cm, colour, opacity, rotation and layer order in the right panel. **Use as default size** remembers your measured size for new items of that type. **New type** adds your own (rectangle, rounded or round) pieces.
- Rooms: click **+ Room** above the Layers list to make a room, then drag furniture rows onto it (or pick the room in the item's panel). Each room folds away and can be hidden or locked in one click. Double-click a room name to rename it.
- Layouts: the tabs at the top are different versions of the same plan. **+** makes a copy or an empty one. **Compare** shows layouts side by side with synced zoom and lists what moved, was added, removed, resized or recoloured.
- Keyboard: Ctrl+Z / Ctrl+Shift+Z undo/redo, Delete, Ctrl+D duplicate, R rotate 90°, arrows nudge (Shift = 10 cm), [ and ] change layer, Space+drag or right-drag to pan, scroll to zoom, F to fit.

## Files

- `index.html`, `css/app.css`, `js/*.js` – the app
- `vendor/pdf*.js` – pdf.js for reading PDFs
