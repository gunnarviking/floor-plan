// Recommended light layout for a room: an even grid of ceiling lights for
// general light, plus task lights placed from the furniture in the room.
(function (FP) {
  const { U } = FP;

  const ROOM_TYPES = {
    living: { label: 'Living room', lux: 100, tone: 'warm' },
    bedroom: { label: 'Bedroom', lux: 75, tone: 'warm' },
    kitchen: { label: 'Kitchen / dining', lux: 150, tone: 'neutral' },
    office: { label: 'Office / sim room', lux: 150, tone: 'neutral' },
    bathroom: { label: 'Bathroom', lux: 150, tone: 'neutral' },
    hallway: { label: 'Hallway', lux: 75, tone: 'warm' },
  };

  const inRoom = (room, it) => it.x >= room.x && it.x <= room.x + room.w && it.y >= room.y && it.y <= room.y + room.h;

  function light(name, x, y, opts = {}) {
    return Object.assign(
      {
        id: U.uid('i'),
        type: 'light',
        name,
        x,
        y,
        w: opts.size || 24,
        d: opts.size || 24,
        rot: 0,
        color: '#ffd54f',
        opacity: 1,
        radius: opts.radius || 150,
        tone: opts.tone || 'warm',
        suggested: true,
        roomId: opts.roomId,
      },
      opts.extra || {}
    );
  }

  // Returns {lights:[items], notes:[strings]}
  function recommend(room, roomType, items) {
    const rt = ROOM_TYPES[roomType] || ROOM_TYPES.living;
    const area = (room.w * room.h) / 10000; // m²
    const out = [];
    const notes = [];
    const contained = items.filter((it) => it.type !== 'light' && inRoom(room, it));

    // --- general (ambient) light grid ---
    // Light needed ≈ area × lux / 0.7 (losses), spread over ~900 lm fixtures,
    // laid out in the grid whose spacing is closest to square.
    const FIXTURE_LM = 900;
    const need = (area * rt.lux) / 0.7;
    const n = Math.max(1, Math.round(need / FIXTURE_LM));
    let nx = 1, ny = 1, best = Infinity;
    for (let cx = 1; cx <= n; cx++) {
      for (let cy = 1; cy <= n; cy++) {
        const cnt = cx * cy;
        if (cnt < n || cnt > n + 2) continue;
        const score = (cnt - n) * 0.6 + Math.abs(Math.log(room.w / cx / (room.h / cy)));
        if (score < best) (best = score), (nx = cx), (ny = cy);
      }
    }
    if (roomType === 'hallway') {
      if (room.w >= room.h) (nx = Math.max(1, Math.round(room.w / 180))), (ny = 1);
      else (ny = Math.max(1, Math.round(room.h / 180))), (nx = 1);
    }
    const sx = room.w / nx, sy = room.h / ny;
    const glow = Math.max(sx, sy) * 0.85 + 30;
    // Glare check: avoid a fixture right above the sim rig / desk monitor.
    const screens = contained.filter((it) => it.type === 'simrig' || it.type === 'desk');
    let moved = 0;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        let x = room.x + sx * (i + 0.5), y = room.y + sy * (j + 0.5);
        for (const s of screens) {
          const [lx, ly] = U.toLocal(s, x, y);
          if (Math.abs(lx) < s.w / 2 + 20 && ly < -s.d / 2 + s.d * 0.35 && ly > -s.d / 2 - 60) {
            // push the light behind the user (towards the item's front side) to avoid screen glare
            const [nxw, nyw] = U.toWorld(s, lx, s.d / 2 + 40);
            x = U.clamp(nxw, room.x + 30, room.x + room.w - 30);
            y = U.clamp(nyw, room.y + 30, room.y + room.h - 30);
            moved++;
          }
        }
        out.push(light(nx * ny === 1 ? 'Ceiling light' : 'Ceiling downlight', x, y, { radius: glow, tone: rt.tone, roomId: room.id }));
      }
    }
    const lumens = Math.round(need / 50) * 50;
    notes.push(
      `${rt.label}: ${(room.w / 100).toFixed(1)} × ${(room.h / 100).toFixed(1)} m (${area.toFixed(1)} m²). ` +
        (nx * ny === 1
          ? 'One central ceiling light is enough for a room this size.'
          : `${nx * ny} ceiling lights in a ${nx} × ${ny} grid, about ${Math.round(sx)} × ${Math.round(sy)} cm apart and half that distance from the walls, so the light overlaps evenly.`)
    );
    notes.push(`Aim for roughly ${lumens} lumen of general light in total (≈${Math.round(lumens / (nx * ny) / 50) * 50} lm per fixture, ${rt.lux} lux target).`);
    if (moved) notes.push(`Moved ${moved} ceiling light${moved > 1 ? 's' : ''} away from the screen side of your desk or sim rig to avoid glare and reflections.`);

    // --- task / accent lights from furniture ---
    contained.forEach((it) => {
      if (it.type === 'desk') {
        const [x, y] = U.toWorld(it, -it.w / 2 + 18, -it.d / 2 + 18);
        out.push(light('Desk lamp', x, y, { radius: 90, tone: 'neutral', size: 18, roomId: room.id }));
        notes.push(`Desk lamp on the back left corner of “${it.name}” for task light without shadows from a right hand.`);
      } else if (it.type === 'simrig') {
        const [x, y] = U.toWorld(it, 0, -it.d / 2 - 12);
        out.push(light('Bias light (LED strip)', x, y, { radius: 80, tone: 'cool', size: 18, roomId: room.id }));
        notes.push(`Bias light behind the monitor of “${it.name}”: reduces eye strain and keeps the screen free of reflections. Keep the ceiling light behind your seat, not above the screen.`);
      } else if (it.type === 'table') {
        out.push(light('Pendant over table', it.x, it.y, { radius: Math.max(it.w, it.d) * 0.75, tone: 'warm', size: 34, roomId: room.id }));
        notes.push(`Pendant centred over “${it.name}”, hung about 65–75 cm above the table top.`);
      } else if (it.type === 'bed') {
        const stands = contained.filter((n) => n.type === 'nightstand');
        if (stands.length) {
          stands.slice(0, 2).forEach((n) => out.push(light('Reading light', n.x, n.y, { radius: 75, tone: 'warm', size: 18, roomId: room.id })));
          notes.push('Reading lights at the nightstands, warm and dimmable.');
        } else {
          [-1, 1].forEach((s) => {
            const [x, y] = U.toWorld(it, s * (it.w / 2 - 15), -it.d / 2 + 12);
            out.push(light('Reading light', x, y, { radius: 75, tone: 'warm', size: 18, roomId: room.id }));
          });
          notes.push('Wall-mounted reading lights at the head of the bed, warm and dimmable.');
        }
      } else if (it.type === 'sofa') {
        const [x, y] = U.toWorld(it, it.w / 2 + 20, -it.d / 2 + 15);
        out.push(light('Floor lamp', x, y, { radius: 110, tone: 'warm', size: 22, roomId: room.id }));
        notes.push(`Floor lamp next to “${it.name}” for cosy evening light.`);
      } else if (it.type === 'plant' && Math.max(it.w, it.d) >= 60) {
        notes.push(`Tip: a small uplight under “${it.name}” makes a nice accent.`);
      }
    });
    if (roomType === 'bedroom' || roomType === 'living') notes.push('Put the ceiling lights on a dimmer and use warm white (2700K) for evenings.');
    if (roomType === 'office') notes.push('Use neutral white (3500–4000K) and high CRI (90+) for work and screen time.');
    return { lights: out, notes };
  }

  FP.Lights = { ROOM_TYPES, recommend };
})(window.FP);
