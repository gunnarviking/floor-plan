// Side-by-side comparison of layouts in a project, with synced zoom/pan and a
// list of what differs.
(function (FP) {
  const { U, Scene, icon } = FP;
  const f = (n) => +(+n).toFixed(2);

  function diff(a, b) {
    const A = new Map(a.items.map((i) => [i.id, i])), B = new Map(b.items.map((i) => [i.id, i]));
    const out = { added: [], removed: [], moved: [], resized: [], recolored: [] };
    b.items.forEach((i) => !A.has(i.id) && out.added.push(i));
    a.items.forEach((i) => {
      const j = B.get(i.id);
      if (!j) return out.removed.push(i);
      const dist = Math.hypot(i.x - j.x, i.y - j.y);
      if (dist > 2 || Math.abs((i.rot || 0) - (j.rot || 0)) > 0.5) out.moved.push({ a: i, b: j, dist });
      if (Math.abs(i.w - j.w) > 0.5 || Math.abs(i.d - j.d) > 0.5) out.resized.push({ a: i, b: j });
      if ((i.color || '') !== (j.color || '')) out.recolored.push({ a: i, b: j });
    });
    return out;
  }

  function stats(project, v) {
    const furn = v.items.filter((i) => i.type !== 'light' && i.type !== 'rug' && !i.hidden);
    const area = furn.reduce((s, i) => s + i.w * i.d, 0) / 10000;
    return {
      items: v.items.length,
      lights: v.items.filter((i) => i.type === 'light').length,
      area: area.toFixed(1),
    };
  }

  const Compare = {};

  Compare.open = (editor) => {
    const p = editor.p;
    if (p.variants.length < 2) {
      U.toast('Make a second layout first (the + next to the layout tabs).', 'error', 3500);
      return;
    }
    const other = p.variants.find((v) => v.id !== p.activeVariantId).id;
    // project order, so the earlier layout is the baseline
    let chosen = p.variants.map((v) => v.id).filter((id) => id === p.activeVariantId || id === other);
    const { w, h } = Scene.planSize(p);
    let view = null;
    let showLights = !!p.settings.showLights;
    let highlight = true;

    const el = U.h(`<div class="compare">
      <header class="topbar">
        <h2>${icon('compare')} Compare layouts</h2>
        <div class="cmp-pick"></div>
        <div class="grow"></div>
        <label class="check"><input type="checkbox" class="c-hl" checked> Highlight changes</label>
        <label class="check"><input type="checkbox" class="c-lights" ${showLights ? 'checked' : ''}> Preview lighting</label>
        <button class="icon-btn" data-c="fit" title="Fit">${icon('fit')}</button>
        <button class="btn" data-c="close">${icon('close', 16)} Close</button>
      </header>
      <div class="cmp-panes"></div>
      <div class="cmp-diff"></div>
    </div>`);
    document.body.appendChild(el);

    const panes = U.$('.cmp-panes', el);

    function renderPick() {
      U.$('.cmp-pick', el).innerHTML = p.variants
        .map((v) => `<label class="chip ${chosen.includes(v.id) ? 'on' : ''}"><input type="checkbox" value="${v.id}" ${chosen.includes(v.id) ? 'checked' : ''}>${U.esc(v.name)}</label>`)
        .join('');
    }

    function render() {
      const vs = chosen.map((id) => p.variants.find((v) => v.id === id)).filter(Boolean);
      const base = vs[0];
      panes.style.gridTemplateColumns = `repeat(${vs.length}, 1fr)`;
      panes.innerHTML = vs
        .map((v, idx) => {
          const st = stats(p, v);
          let extra = '';
          if (highlight && idx > 0) {
            const d = diff(base, v);
            const mark = (it, col) => `<g transform="${Scene.itemTransform(it)}"><rect x="${f(-it.w / 2 - 4)}" y="${f(-it.d / 2 - 4)}" width="${f(it.w + 8)}" height="${f(it.d + 8)}" rx="4" fill="none" stroke="${col}" stroke-width="3" vector-effect="non-scaling-stroke"/></g>`;
            d.added.forEach((i) => (extra += mark(i, '#2b8a3e')));
            d.moved.forEach((m) => {
              extra += mark(m.b, '#e8590c');
              extra += `<line x1="${f(m.a.x)}" y1="${f(m.a.y)}" x2="${f(m.b.x)}" y2="${f(m.b.y)}" stroke="#e8590c" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`;
              extra += `<g transform="${Scene.itemTransform(m.a)}" opacity="0.5"><rect x="${f(-m.a.w / 2)}" y="${f(-m.a.d / 2)}" width="${f(m.a.w)}" height="${f(m.a.d)}" fill="none" stroke="#e8590c" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/></g>`;
            });
            d.resized.forEach((m) => (extra += mark(m.b, '#7048e8')));
            d.removed.forEach((i) => (extra += `<g transform="${Scene.itemTransform(i)}"><rect x="${f(-i.w / 2)}" y="${f(-i.d / 2)}" width="${f(i.w)}" height="${f(i.d)}" fill="#e03131" fill-opacity="0.08" stroke="#e03131" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/></g>`));
          }
          return `<div class="cmp-pane">
            <div class="cmp-title"><b>${U.esc(v.name)}</b><span class="muted small">${st.items} items · ${st.lights} lights · ${st.area} m² furniture</span><button class="btn small" data-open="${v.id}">Edit</button></div>
            <svg class="cmp-svg" xmlns="http://www.w3.org/2000/svg">${Scene.full(p, v, { lights: showLights, extra })}</svg>
            ${v.notes ? `<div class="cmp-notes">${U.esc(v.notes)}</div>` : ''}
          </div>`;
        })
        .join('');
      // differences list
      const dl = U.$('.cmp-diff', el);
      if (vs.length < 2) {
        dl.innerHTML = '<p class="muted">Pick at least two layouts.</p>';
      } else {
        dl.innerHTML = vs
          .slice(1)
          .map((v) => {
            const d = diff(base, v);
            const li = (arr, fn) => arr.map((x) => `<li>${fn(x)}</li>`).join('');
            const n = d.added.length + d.removed.length + d.moved.length + d.resized.length + d.recolored.length;
            return `<div class="diff-card"><h4>${U.esc(v.name)} compared with ${U.esc(base.name)}</h4>
              ${n === 0 ? '<p class="muted small">No furniture differences.</p>' : `<ul class="diff">
              ${li(d.added, (i) => `<span class="tag add">added</span> ${U.esc(i.name)}`)}
              ${li(d.removed, (i) => `<span class="tag rem">removed</span> ${U.esc(i.name)}`)}
              ${li(d.moved, (m) => `<span class="tag mov">moved</span> ${U.esc(m.b.name)} <span class="muted">${U.fmtLen(m.dist)}${Math.abs((m.a.rot || 0) - (m.b.rot || 0)) > 0.5 ? ', rotated' : ''}</span>`)}
              ${li(d.resized, (m) => `<span class="tag rsz">resized</span> ${U.esc(m.b.name)} <span class="muted">${Math.round(m.a.w)}×${Math.round(m.a.d)} → ${Math.round(m.b.w)}×${Math.round(m.b.d)} cm</span>`)}
              ${li(d.recolored, (m) => `<span class="tag col">colour</span> ${U.esc(m.b.name)} <span class="sw-mini" style="background:${m.a.color}"></span>→<span class="sw-mini" style="background:${m.b.color}"></span>`)}
              </ul>`}
              <p class="hint small">Items are matched when a layout was made as a copy of another.</p></div>`;
          })
          .join('');
      }
      if (!view) fit();
      else applyView();
    }

    // Fit to the furnished area (plus margin), or to the whole plan when empty.
    function fit() {
      const svg = U.$('.cmp-svg', el);
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      let b = { x: 0, y: 0, x2: w, y2: h };
      const boxes = [];
      chosen.forEach((id) => {
        const v = p.variants.find((x) => x.id === id);
        if (!v) return;
        v.items.forEach((i) => boxes.push(U.itemBBox(i)));
        (v.rooms || []).forEach((rm) => boxes.push({ x: rm.x, y: rm.y, x2: rm.x + rm.w, y2: rm.y + rm.h }));
      });
      if (boxes.length) {
        const m = 120;
        b = {
          x: Math.max(0, Math.min(...boxes.map((q) => q.x)) - m),
          y: Math.max(0, Math.min(...boxes.map((q) => q.y)) - m),
          x2: Math.min(w, Math.max(...boxes.map((q) => q.x2)) + m),
          y2: Math.min(h, Math.max(...boxes.map((q) => q.y2)) + m),
        };
      }
      const bw = b.x2 - b.x, bh = b.y2 - b.y;
      const scale = Math.min((r.width - 20) / bw, (r.height - 20) / bh);
      view = { scale, x: b.x + bw / 2 - r.width / 2 / scale, y: b.y + bh / 2 - r.height / 2 / scale };
      applyView();
    }
    function applyView() {
      U.$$('.cmp-svg', el).forEach((svg) => {
        const r = svg.getBoundingClientRect();
        svg.setAttribute('viewBox', `${f(view.x)} ${f(view.y)} ${f(r.width / view.scale)} ${f(r.height / view.scale)}`);
      });
    }

    // synced pan & zoom
    let drag = null;
    panes.addEventListener('wheel', (e) => {
      const svg = e.target.closest('.cmp-svg');
      if (!svg) return;
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const wx = view.x + cx / view.scale, wy = view.y + cy / view.scale;
      view.scale = U.clamp(view.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), 0.02, 20);
      view.x = wx - cx / view.scale;
      view.y = wy - cy / view.scale;
      applyView();
    }, { passive: false });
    panes.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.cmp-svg')) return;
      drag = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
      panes.setPointerCapture(e.pointerId);
    });
    panes.addEventListener('pointermove', (e) => {
      if (!drag) return;
      view.x = drag.vx - (e.clientX - drag.sx) / view.scale;
      view.y = drag.vy - (e.clientY - drag.sy) / view.scale;
      applyView();
    });
    panes.addEventListener('pointerup', () => (drag = null));

    const close = () => {
      el.remove();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', applyView);
    };
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', applyView);

    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-c]');
      if (c && c.dataset.c === 'close') return close();
      if (c && c.dataset.c === 'fit') return fit();
      const o = e.target.closest('[data-open]');
      if (o) {
        close();
        editor.switchVariant(o.dataset.open);
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.classList.contains('c-lights')) {
        showLights = e.target.checked;
        return render();
      }
      if (e.target.classList.contains('c-hl')) {
        highlight = e.target.checked;
        return render();
      }
      if (e.target.closest('.cmp-pick')) {
        const id = e.target.value;
        if (e.target.checked) chosen.push(id);
        else chosen = chosen.filter((x) => x !== id);
        if (chosen.length > 4) chosen = chosen.slice(-4);
        // keep the project's order, first chosen is the baseline
        chosen = p.variants.map((v) => v.id).filter((vid) => chosen.includes(vid));
        renderPick();
        render();
      }
    });

    renderPick();
    requestAnimationFrame(render);
  };

  FP.Compare = Compare;
})(window.FP);
