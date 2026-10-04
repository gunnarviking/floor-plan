// Builds the SVG markup for a layout (plan, erased areas, furniture, labels,
// light preview). Used by the editor, the compare view and image export.
(function (FP) {
  const { U, Furniture } = FP;
  const f = (n) => +(+n).toFixed(2);

  const LIGHT_TONES = {
    warm: { core: '#ffd27a', label: 'Warm (2700K)' },
    neutral: { core: '#fff1c9', label: 'Neutral (3500K)' },
    cool: { core: '#e3f0ff', label: 'Cool (4000K+)' },
  };

  const Scene = { LIGHT_TONES };

  Scene.planSize = (project) => {
    const p = project.plan;
    return { w: p.widthPx / p.pxPerCm, h: p.heightPx / p.pxPerCm };
  };

  Scene.defs = () => {
    let o = '<defs>';
    Object.entries(LIGHT_TONES).forEach(([k, t]) => {
      o += `<radialGradient id="glow-${k}"><stop offset="0" stop-color="${t.core}" stop-opacity="0.85"/><stop offset="0.45" stop-color="${t.core}" stop-opacity="0.38"/><stop offset="1" stop-color="${t.core}" stop-opacity="0"/></radialGradient>`;
    });
    o += `<pattern id="grid-pat" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#5b8def" stroke-width="0.6" opacity="0.35"/></pattern>`;
    o += `<pattern id="grid-pat-big" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#grid-pat)"/><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#5b8def" stroke-width="1" opacity="0.5"/></pattern>`;
    o += '</defs>';
    return o;
  };

  Scene.erasures = (variant) =>
    (variant.erasures || [])
      .map((e) => {
        if (e.kind === 'poly') return `<polygon points="${e.pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="${e.color || '#fff'}"/>`;
        if (e.kind === 'rect') return `<rect x="${f(e.x)}" y="${f(e.y)}" width="${f(e.w)}" height="${f(e.h)}" fill="${e.color || '#fff'}"/>`;
        if (!e.pts || !e.pts.length) return '';
        if (e.pts.length === 1) return `<circle cx="${f(e.pts[0][0])}" cy="${f(e.pts[0][1])}" r="${f(e.size / 2)}" fill="${e.color || '#fff'}"/>`;
        const d = 'M ' + e.pts.map((p) => f(p[0]) + ' ' + f(p[1])).join(' L ');
        return `<path d="${d}" fill="none" stroke="${e.color || '#fff'}" stroke-width="${f(e.size)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      })
      .join('');

  Scene.itemTransform = (it) => `translate(${f(it.x)} ${f(it.y)}) rotate(${f(it.rot || 0)})`;

  Scene.item = (project, it, extra = '', hit = false) =>
    `<g class="item${it.locked ? ' locked' : ''}" data-id="${it.id}" transform="${Scene.itemTransform(it)}" opacity="${it.opacity ?? 1}" ${extra}>${Furniture.renderItem(project, it)}${
      hit ? `<rect class="hit" x="${f(-it.w / 2)}" y="${f(-it.d / 2)}" width="${f(it.w)}" height="${f(it.d)}" fill="transparent"/>` : ''
    }</g>`;

  Scene.items = (project, variant, opts = {}) =>
    (variant.items || [])
      .filter((it) => !it.hidden)
      .map((it) => Scene.item(project, it, opts.itemAttrs ? opts.itemAttrs(it) : '', opts.hit))
      .join('');

  Scene.labelSize = (it) => U.clamp(Math.min(it.w, it.d) * 0.14, 6, 13);

  Scene.labels = (project, variant) =>
    (variant.items || [])
      .filter((it) => !it.hidden && it.name && it.type !== 'light' && Math.min(it.w, it.d) >= 35)
      .map((it) => {
        const fs = Scene.labelSize(it);
        return `<text x="${f(it.x)}" y="${f(it.y)}" font-size="${f(fs)}" class="lbl" text-anchor="middle" dominant-baseline="central">${U.esc(it.name)}</text>`;
      })
      .join('');

  Scene.lightPreview = (project, variant) => {
    const { w, h } = Scene.planSize(project);
    const lights = (variant.items || []).filter((it) => it.type === 'light' && !it.hidden);
    let o = `<rect x="-2000" y="-2000" width="${f(w + 4000)}" height="${f(h + 4000)}" fill="#0b1020" opacity="0.38"/>`;
    o += `<g style="mix-blend-mode:screen">`;
    lights.forEach((l) => {
      const r = l.radius || 150;
      o += `<circle cx="${f(l.x)}" cy="${f(l.y)}" r="${f(r)}" fill="url(#glow-${l.tone || 'warm'})"/>`;
    });
    o += `</g>`;
    return o;
  };

  Scene.rooms = (variant) =>
    (variant.rooms || [])
      .map(
        (r) =>
          `<g class="room" data-room="${r.id}"><rect x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}" fill="#5b8def" fill-opacity="0.05" stroke="#5b8def" stroke-width="1.5" stroke-dasharray="8 6" vector-effect="non-scaling-stroke"/><text x="${f(r.x + 6)}" y="${f(r.y + 16)}" font-size="13" class="room-lbl">${U.esc(r.name || '')}</text></g>`
      )
      .join('');

  // Full static scene (used by compare view and exports).
  Scene.full = (project, variant, opts = {}) => {
    const { w, h } = Scene.planSize(project);
    const s = project.settings || {};
    let o = Scene.defs();
    if (!opts.noPlan) o += `<image href="${project.plan.dataUrl}" x="0" y="0" width="${f(w)}" height="${f(h)}" preserveAspectRatio="none" opacity="${s.planOpacity ?? 1}"/>`;
    o += `<g class="erasures">${Scene.erasures(variant)}</g>`;
    if (opts.grid) o += `<rect x="0" y="0" width="${f(w)}" height="${f(h)}" fill="url(#grid-pat-big)"/>`;
    if (opts.lights ?? s.showLights) o += Scene.lightPreview(project, variant);
    o += `<g class="items">${Scene.items(project, variant, opts)}</g>`;
    if (opts.labels ?? s.showLabels) o += `<g class="labels">${Scene.labels(project, variant)}</g>`;
    if (opts.extra) o += opts.extra;
    return o;
  };

  // Coordinate ruler used for the AI-assistant snapshot, so the model can map
  // what it sees to centimetre coordinates.
  Scene.ruler = (project) => {
    const { w, h } = Scene.planSize(project);
    let o = '';
    for (let x = 0; x <= w; x += 100) {
      o += `<line x1="${x}" y1="0" x2="${x}" y2="${f(h)}" stroke="#e53935" stroke-width="${x % 500 === 0 ? 1.4 : 0.6}" opacity="0.45"/>`;
      if (x % 200 === 0) o += `<text x="${x + 3}" y="14" font-size="13" fill="#c62828" font-family="sans-serif">${x}</text>`;
    }
    for (let y = 0; y <= h; y += 100) {
      o += `<line x1="0" y1="${y}" x2="${f(w)}" y2="${y}" stroke="#e53935" stroke-width="${y % 500 === 0 ? 1.4 : 0.6}" opacity="0.45"/>`;
      if (y % 200 === 0 && y > 0) o += `<text x="3" y="${y - 3}" font-size="13" fill="#c62828" font-family="sans-serif">${y}</text>`;
    }
    return o;
  };

  // Render a variant to a canvas. opts: {maxPx, ruler, lights, labels}
  Scene.toCanvas = async (project, variant, opts = {}) => {
    const { w, h } = Scene.planSize(project);
    const maxPx = opts.maxPx || 2400;
    const k = Math.min(maxPx / Math.max(w, h), 4);
    const cw = Math.round(w * k), ch = Math.round(h * k);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    const img = await U.loadImage(project.plan.dataUrl);
    ctx.globalAlpha = (project.settings && project.settings.planOpacity) ?? 1;
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.globalAlpha = 1;
    const inner = Scene.full(project, variant, { noPlan: true, lights: opts.lights, labels: opts.labels }) + (opts.ruler ? Scene.ruler(project) : '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${f(w)} ${f(h)}"><style>.lbl{font-family:Inter,system-ui,sans-serif;font-weight:600;fill:#1d232b;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}</style>${inner}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const over = await U.loadImage(url);
      ctx.drawImage(over, 0, 0, cw, ch);
    } finally {
      URL.revokeObjectURL(url);
    }
    return canvas;
  };

  FP.Scene = Scene;
})(window.FP);
