// The layout editor: canvas interaction, tools, properties and layers.
(function (FP) {
  const { U, Furniture, Scene, Lights, Store, icon } = FP;
  const f = (n) => +(+n).toFixed(2);
  const SVGNS = 'http://www.w3.org/2000/svg';

  const TOOLS = [
    { id: 'select', short: 'Select', label: 'Select & move', key: 'V', icon: 'select' },
    { id: 'pan', short: 'Pan', label: 'Pan', key: 'H', icon: 'pan' },
    { id: 'measure', short: 'Measure', label: 'Measure', key: 'M', icon: 'measure' },
    { id: 'erase', short: 'Erase', label: 'Erase parts of the plan', key: 'E', icon: 'erase' },
    { id: 'lights', short: 'Lights', label: 'Light planner', key: 'L', icon: 'light' },
    { id: 'scale', short: 'Scale', label: 'Set scale', key: 'S', icon: 'scale' },
  ];

  class Editor {
    constructor(app, project, root) {
      this.app = app;
      this.p = project;
      this.root = root;
      this.tool = 'select';
      this.sel = null;
      this.view = project.view || null;
      this.hist = {};
      this.eraseOpts = { mode: 'brush', size: 30, color: '#ffffff' };
      this.measure = null;
      this.lightNotes = null;
      this.clipboard = null;
      this.build();
    }

    get v() {
      return this.p.variants.find((x) => x.id === this.p.activeVariantId) || this.p.variants[0];
    }
    get s() {
      return this.p.settings;
    }
    item(id) {
      return this.v.items.find((i) => i.id === id);
    }
    get selItem() {
      return this.sel ? this.item(this.sel) : null;
    }

    // ------------------------------------------------------------------ DOM
    build() {
      this.root.innerHTML = `
      <div class="editor">
        <header class="topbar">
          <button class="btn ghost" data-act="home" title="All projects">${icon('back')} <span>Projects</span></button>
          <input class="proj-name" value="${U.esc(this.p.name)}" title="Project name" spellcheck="false">
          <div class="vtabs"></div>
          <div class="grow"></div>
          <button class="icon-btn" data-act="undo" title="Undo (Ctrl+Z)">${icon('undo')}</button>
          <button class="icon-btn" data-act="redo" title="Redo (Ctrl+Shift+Z)">${icon('redo')}</button>
          <span class="divider"></span>
          <button class="btn" data-act="compare" title="Compare layouts side by side">${icon('compare')} <span>Compare</span></button>
          <div class="menu-wrap">
            <button class="btn" data-act="export-menu">${icon('download')} <span>Save / export</span></button>
            <div class="menu" hidden>
              <button data-act="link-file">${icon('save')} <span class="lf-label">Auto-save to a file on this computer…</span></button>
              <button data-act="export-json">${icon('file')} Download project file (.json)</button>
              <button data-act="export-png">${icon('image')} Download this layout as PNG</button>
              <button data-act="replace-plan">${icon('upload')} Replace floor plan image…</button>
            </div>
          </div>
          <span class="save-state" title="Your work is saved in this browser automatically">Saved</span>
        </header>
        <div class="workspace">
          <aside class="left panel">
            <div class="tools"></div>
            <div class="tool-opts"></div>
            <div class="sec-head"><h3>Furniture</h3><button class="link" data-act="new-type">${icon('plus', 14)} New type</button></div>
            <p class="hint small">Tap or click to add, or drag onto the plan.</p>
            <input class="inp lib-search" type="search" placeholder="Search furniture…">
            <div class="library"></div>
          </aside>
          <section class="stage">
            <svg class="canvas" xmlns="${SVGNS}">
              ${Scene.defs()}
              <g class="l-plan"></g>
              <g class="l-erase"></g>
              <g class="l-grid"></g>
              <g class="l-glow"></g>
              <g class="l-rooms"></g>
              <g class="l-items"></g>
              <g class="l-labels"></g>
              <g class="l-over"></g>
            </svg>
            <div class="banner" hidden></div>
            <div class="zoom">
              <button class="icon-btn" data-act="zoom-out" title="Zoom out">${icon('minus')}</button>
              <span class="zoom-val">100%</span>
              <button class="icon-btn" data-act="zoom-in" title="Zoom in">${icon('plus')}</button>
              <button class="icon-btn" data-act="fit" title="Fit plan to screen">${icon('fit')}</button>
            </div>
            <div class="statusbar"><span class="st-pos"></span><span class="st-scale"></span><span class="st-hint"></span></div>
          </section>
          <aside class="right panel">
            <div class="props"></div>
            <div class="sec-head"><h3>Layers</h3><button class="link" data-act="new-room" title="Make a room to group furniture in">${icon('plus', 14)} Room</button></div>
            <div class="layers"></div>
            <div class="sec-head"><h3>View</h3></div>
            <div class="viewopts"></div>
          </aside>
          <div class="sheet-back" data-act="sheet-close"></div>
        </div>
        <nav class="mobbar">
          <button data-act="sheet-left">${icon('plus', 18)}<span>Add &amp; tools</span></button>
          <button data-act="sheet-right" class="mob-edit">${icon('edit', 18)}<span class="mob-edit-label">Layers</span></button>
        </nav>
      </div>`;
      const r = this.root;
      this.svg = U.$('.canvas', r);
      this.L = {};
      ['plan', 'erase', 'grid', 'glow', 'rooms', 'items', 'labels', 'over'].forEach((k) => (this.L[k] = U.$('.l-' + k, r)));

      r.addEventListener('click', (e) => this.onClick(e));
      U.$('.proj-name', r).addEventListener('change', (e) => {
        this.p.name = e.target.value.trim() || 'Untitled';
        this.save();
      });

      this.renderTools();
      this.renderLibrary();
      this.renderViewOpts();
      this.renderTabs();
      this.renderPlan();
      this.bindCanvas();
      this.bindKeys();
      this.renderAll();
      requestAnimationFrame(() => {
        if (!this.view) this.fit();
        else this.applyView();
      });
      this.ro = new ResizeObserver(() => this.applyView());
      this.ro.observe(this.svg);
      this.updateLinkLabel();
    }

    destroy() {
      this.ro && this.ro.disconnect();
      document.removeEventListener('keydown', this._kd);
      document.removeEventListener('keyup', this._ku);
      this.root.innerHTML = '';
    }

    onClick(e) {
      const b = e.target.closest('[data-act]');
      if (!b || !this.root.contains(b)) return;
      const act = b.dataset.act;
      const menu = U.$('.menu', this.root);
      if (act !== 'export-menu') menu.hidden = true;
      switch (act) {
        case 'home': return this.app.showHome();
        case 'undo': return this.undo();
        case 'redo': return this.redo();
        case 'compare': return FP.Compare.open(this);
        case 'export-menu': menu.hidden = !menu.hidden; e.stopPropagation(); return;
        case 'export-json': return Store.exportProject(this.p);
        case 'export-png': return this.exportPng();
        case 'link-file': return this.app.linkFile(this.p).then(() => this.updateLinkLabel());
        case 'replace-plan': return this.replacePlan();
        case 'zoom-in': return this.zoomBy(1.25);
        case 'zoom-out': return this.zoomBy(0.8);
        case 'fit': return this.fit();
        case 'new-type': return this.newType();
        case 'new-room': return this.newGroup();
        case 'sheet-left': return this.openSheet(this.sheet === 'left' ? null : 'left');
        case 'sheet-right': return this.openSheet(this.sheet === 'right' ? null : 'right');
        case 'sheet-close': return this.openSheet(null);
      }
    }

    async updateLinkLabel() {
      const el = U.$('.lf-label', this.root);
      if (!el) return;
      if (!Store.canLinkFile()) {
        el.textContent = 'Auto-save to a file (needs Chrome or Edge)';
        return;
      }
      const h = await Store.getLinkedHandle(this.p.id);
      el.textContent = h ? `Auto-saving to “${h.name}” (change…)` : 'Auto-save to a file on this computer…';
    }

    // ------------------------------------------------------------------ saving & history
    save() {
      this.p.view = this.view;
      this.app.saveSoon(this.p);
    }

    snapshot() {
      const v = this.v;
      return JSON.stringify({ items: v.items, erasures: v.erasures, rooms: v.rooms, groups: v.groups });
    }
    h() {
      const id = this.v.id;
      return (this.hist[id] = this.hist[id] || { undo: [], redo: [] });
    }
    pushUndo(snap) {
      const h = this.h();
      h.undo.push(snap);
      if (h.undo.length > 150) h.undo.shift();
      h.redo = [];
      this.updateUndoBtns();
    }
    // Run a mutation as one undoable step.
    change(fn, opts = {}) {
      const before = this.snapshot();
      fn();
      if (this.snapshot() !== before) this.pushUndo(before);
      this.renderAll(opts);
      this.save();
    }
    restore(snap) {
      const o = JSON.parse(snap);
      Object.assign(this.v, o);
      if (this.sel && !this.item(this.sel)) this.sel = null;
      this.renderAll();
      this.save();
    }
    undo() {
      const h = this.h();
      if (!h.undo.length) return;
      h.redo.push(this.snapshot());
      this.restore(h.undo.pop());
      this.updateUndoBtns();
    }
    redo() {
      const h = this.h();
      if (!h.redo.length) return;
      h.undo.push(this.snapshot());
      this.restore(h.redo.pop());
      this.updateUndoBtns();
    }
    updateUndoBtns() {
      const h = this.h();
      U.$('[data-act=undo]', this.root).disabled = !h.undo.length;
      U.$('[data-act=redo]', this.root).disabled = !h.redo.length;
    }

    // ------------------------------------------------------------------ view
    applyView() {
      const r = this.svg.getBoundingClientRect();
      if (!r.width || !this.view) return;
      const { x, y, scale } = this.view;
      this.svg.setAttribute('viewBox', `${f(x)} ${f(y)} ${f(r.width / scale)} ${f(r.height / scale)}`);
      U.$('.zoom-val', this.root).textContent = Math.round(scale * 100) + '%';
      this.svg.style.setProperty('--px', 1 / scale);
      this.renderOverlay();
    }
    fit() {
      const r = this.svg.getBoundingClientRect();
      const { w, h } = Scene.planSize(this.p);
      if (!r.width) return;
      const scale = Math.min((r.width - 60) / w, (r.height - 60) / h);
      this.view = { scale, x: w / 2 - r.width / 2 / scale, y: h / 2 - r.height / 2 / scale };
      this.applyView();
    }
    zoomBy(k, cx, cy) {
      const r = this.svg.getBoundingClientRect();
      if (cx === undefined) {
        cx = r.width / 2;
        cy = r.height / 2;
      }
      const v = this.view;
      const wx = v.x + cx / v.scale, wy = v.y + cy / v.scale;
      v.scale = U.clamp(v.scale * k, 0.02, 20);
      v.x = wx - cx / v.scale;
      v.y = wy - cy / v.scale;
      this.applyView();
      this.saveViewSoon();
    }
    saveViewSoon() {
      clearTimeout(this._vt);
      this._vt = setTimeout(() => this.save(), 800);
    }
    // On phones the side panels are bottom sheets opened from the bar at the bottom.
    get isPhone() {
      return window.matchMedia('(max-width: 760px)').matches;
    }
    openSheet(which) {
      this.sheet = which;
      const ed = U.$('.editor', this.root);
      ed.classList.toggle('sheet-left', which === 'left');
      ed.classList.toggle('sheet-right', which === 'right');
    }
    updateMobBar() {
      const l = U.$('.mob-edit-label', this.root);
      if (!l) return;
      const it = this.selItem;
      l.textContent = it ? `Edit ${it.name || 'item'}` : 'Layers';
      U.$('.mob-edit', this.root).classList.toggle('on', !!it);
    }

    toWorld(e) {
      const r = this.svg.getBoundingClientRect();
      return [this.view.x + (e.clientX - r.left) / this.view.scale, this.view.y + (e.clientY - r.top) / this.view.scale];
    }
    viewCenter() {
      const r = this.svg.getBoundingClientRect();
      return [this.view.x + r.width / 2 / this.view.scale, this.view.y + r.height / 2 / this.view.scale];
    }

    // ------------------------------------------------------------------ rendering
    renderPlan() {
      const { w, h } = Scene.planSize(this.p);
      this.L.plan.innerHTML = `<rect x="0" y="0" width="${f(w)}" height="${f(h)}" fill="#fff"/><image href="${this.p.plan.dataUrl}" x="0" y="0" width="${f(w)}" height="${f(h)}" preserveAspectRatio="none"/>`;
      this.L.plan.querySelector('image').setAttribute('opacity', this.s.planOpacity ?? 1);
      this.renderGrid();
      this.updateBanner();
    }
    renderGrid() {
      const { w, h } = Scene.planSize(this.p);
      this.L.grid.innerHTML = this.s.showGrid ? `<rect x="0" y="0" width="${f(w)}" height="${f(h)}" fill="url(#grid-pat-big)" pointer-events="none"/>` : '';
    }
    renderAll(opts = {}) {
      const v = this.v;
      this.L.erase.innerHTML = Scene.erasures(v);
      this.L.glow.innerHTML = this.s.showLights ? Scene.lightPreview(this.p, v) : '';
      this.L.rooms.innerHTML = this.tool === 'lights' || this.s.showRooms ? Scene.rooms(v) : '';
      this.L.items.innerHTML = Scene.items(this.p, v, { hit: true });
      this.L.labels.innerHTML = this.s.showLabels ? Scene.labels(this.p, v) : '';
      this.renderOverlay();
      if (!opts.keepProps) this.renderProps();
      this.renderLayers();
      this.updateUndoBtns();
      this.updateStatus();
      this.updateMobBar();
    }
    // fast path while dragging: only the moved item + overlay
    renderItemFast(it) {
      const g = this.L.items.querySelector(`[data-id="${it.id}"]`);
      if (g) {
        const tmp = document.createElementNS(SVGNS, 'g');
        tmp.innerHTML = Scene.item(this.p, it, '', true);
        g.replaceWith(tmp.firstChild);
      }
      if (this.s.showLabels) this.L.labels.innerHTML = Scene.labels(this.p, this.v);
      if (this.s.showLights) this.L.glow.innerHTML = Scene.lightPreview(this.p, this.v);
      this.renderOverlay();
    }

    renderOverlay() {
      if (!this.view) return;
      const px = 1 / this.view.scale;
      let o = '';
      const it = this.selItem;
      if (it && !it.hidden && this.tool === 'select') {
        const touch = window.matchMedia('(pointer: coarse)').matches;
        const hs = (touch ? 22 : 11) * px, rotR = (touch ? 13 : 8) * px, rotOff = (touch ? 40 : 26) * px;
        o += `<g transform="${Scene.itemTransform(it)}">`;
        o += `<rect x="${f(-it.w / 2)}" y="${f(-it.d / 2)}" width="${f(it.w)}" height="${f(it.d)}" fill="none" stroke="#2f6fed" stroke-width="${f(1.5 * px)}" stroke-dasharray="${f(5 * px)} ${f(3 * px)}"/>`;
        if (!it.locked) {
          o += `<line x1="0" y1="${f(-it.d / 2)}" x2="0" y2="${f(-it.d / 2 - rotOff)}" stroke="#2f6fed" stroke-width="${f(1.5 * px)}"/>`;
          o += `<circle data-handle="rot" cx="0" cy="${f(-it.d / 2 - rotOff)}" r="${f(rotR)}" fill="#fff" stroke="#2f6fed" stroke-width="${f(2 * px)}" class="h-rot"/>`;
          for (const hx of [-1, 0, 1])
            for (const hy of [-1, 0, 1]) {
              if (!hx && !hy) continue;
              o += `<rect data-handle="${hx},${hy}" x="${f((hx * it.w) / 2 - hs / 2)}" y="${f((hy * it.d) / 2 - hs / 2)}" width="${f(hs)}" height="${f(hs)}" rx="${f(2 * px)}" fill="#fff" stroke="#2f6fed" stroke-width="${f(1.6 * px)}" class="h-rs" style="cursor:${this.cursorFor(hx, hy, it.rot)}"/>`;
            }
        }
        o += `</g>`;
        // dimension labels
        const [tx, ty] = U.toWorld(it, 0, it.d / 2 + 14 * px);
        const lbl = this.drag && this.drag.kind === 'rotate' ? `${Math.round(it.rot || 0)}°` : `${Math.round(it.w)} × ${Math.round(it.d)} cm`;
        o += `<text x="${f(tx)}" y="${f(ty)}" font-size="${f(12 * px)}" class="dim-lbl" text-anchor="middle" dominant-baseline="central">${lbl}</text>`;
      }
      if (this.measure) {
        const m = this.measure;
        const len = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
        const col = m.kind === 'measure' ? '#d6336c' : '#e8590c';
        o += `<line x1="${f(m.x1)}" y1="${f(m.y1)}" x2="${f(m.x2)}" y2="${f(m.y2)}" stroke="${col}" stroke-width="${f(2.5 * px)}"/>`;
        [[m.x1, m.y1], [m.x2, m.y2]].forEach(([x, y]) => (o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(4 * px)}" fill="${col}"/>`));
        const ang = (Math.atan2(m.y2 - m.y1, m.x2 - m.x1) * 180) / Math.PI;
        const label = m.kind === 'scale' ? 'Draw along a known length' : m.kind === 'straighten' ? `${(Math.round(ang / 90) * 90 - ang).toFixed(1)}° to straighten` : U.fmtLen(len);
        o += `<text x="${f((m.x1 + m.x2) / 2)}" y="${f((m.y1 + m.y2) / 2 - 12 * px)}" font-size="${f(14 * px)}" class="dim-lbl strong" text-anchor="middle">${label}</text>`;
      }
      if (this.dragRect) {
        const d = this.dragRect;
        const x = Math.min(d.x1, d.x2), y = Math.min(d.y1, d.y2), w = Math.abs(d.x2 - d.x1), h = Math.abs(d.y2 - d.y1);
        const col = d.kind === 'erase' ? this.eraseOpts.color : '#5b8def';
        o += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${col}" fill-opacity="${d.kind === 'erase' ? 1 : 0.12}" stroke="#5b8def" stroke-width="${f(1.5 * px)}" stroke-dasharray="${f(6 * px)} ${f(4 * px)}"/>`;
        o += `<text x="${f(x + w / 2)}" y="${f(y + h / 2)}" font-size="${f(13 * px)}" class="dim-lbl" text-anchor="middle">${U.fmtLen(w)} × ${U.fmtLen(h)}</text>`;
      }
      if (this.brushCursor && this.tool === 'erase' && this.eraseOpts.mode === 'brush') {
        const [x, y] = this.brushCursor;
        o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(this.eraseOpts.size / 2)}" fill="none" stroke="#333" stroke-width="${f(1 * px)}" stroke-dasharray="${f(3 * px)} ${f(3 * px)}"/>`;
      }
      this.L.over.innerHTML = o;
    }

    cursorFor(hx, hy, rot) {
      const ang = (((Math.atan2(hy, hx) * 180) / Math.PI + (rot || 0)) % 180 + 180) % 180;
      const c = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
      return c[Math.round(ang / 45) % 4];
    }

    updateBanner() {
      const b = U.$('.banner', this.root);
      if (!this.p.plan.calibrated) {
        b.hidden = false;
        b.innerHTML = `${icon('scale')} <span><b>Set the scale first</b> so furniture sizes match the plan: use <b>Set scale</b> and draw along a wall you know the length of.</span> <button class="btn small primary" data-act2="scale">Set scale</button> <button class="icon-btn" data-act2="dismiss" title="Hide">${icon('close', 14)}</button>`;
        b.onclick = (e) => {
          const a = e.target.closest('[data-act2]');
          if (!a) return;
          if (a.dataset.act2 === 'scale') this.setTool('scale');
          else b.hidden = true;
        };
      } else b.hidden = true;
    }

    updateStatus(pos) {
      if (pos) U.$('.st-pos', this.root).textContent = `x ${Math.round(pos[0])} cm · y ${Math.round(pos[1])} cm`;
      const { w, h } = Scene.planSize(this.p);
      U.$('.st-scale', this.root).textContent = `Plan ${U.fmtLen(w)} × ${U.fmtLen(h)}${this.p.plan.calibrated ? '' : ' (scale not set)'}`;
      const hints = {
        select: 'Drag to move · corners resize keeping shape (Shift = stretch) · round handle rotates (Shift = free) · click again to pick what’s underneath · Del removes',
        pan: 'Drag to pan · scroll to zoom',
        measure: 'Drag to measure a distance',
        erase: this.eraseOpts.mode === 'brush' ? 'Paint over things in the drawing to hide them' : 'Drag a box to cover part of the drawing',
        lights: 'Drag a box over a room to get a recommended light layout',
        scale: 'Drag along a wall or dimension line whose real length you know',
        straighten: 'Drag along a wall that should be horizontal or vertical',
        crop: 'Drag a box around the part of the plan to keep',
      };
      U.$('.st-hint', this.root).textContent = hints[this.tool] || '';
    }

    // ------------------------------------------------------------------ tools panel
    renderTools() {
      const host = U.$('.tools', this.root);
      host.innerHTML = TOOLS.map(
        (t) => `<button class="tool ${t.id === this.tool ? 'on' : ''}" data-tool="${t.id}" title="${t.label} (${t.key})">${icon(t.icon, 20)}<span>${t.short}</span></button>`
      ).join('');
      host.onclick = (e) => {
        const b = e.target.closest('[data-tool]');
        if (b) {
          this.setTool(b.dataset.tool);
          if (this.isPhone && !['erase', 'lights'].includes(b.dataset.tool)) this.openSheet(null);
        }
      };
      this.renderToolOpts();
    }

    setTool(t) {
      this.tool = t;
      this.measure = null;
      this.dragRect = null;
      this.svg.dataset.tool = t;
      U.$$('.tool', this.root).forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
      this.renderToolOpts();
      this.renderAll();
    }

    renderToolOpts() {
      const host = U.$('.tool-opts', this.root);
      const t = this.tool;
      if (t === 'erase') {
        const o = this.eraseOpts;
        host.innerHTML = `<div class="opt-card">
          <div class="seg"><button data-em="brush" class="${o.mode === 'brush' ? 'on' : ''}">Brush</button><button data-em="rect" class="${o.mode === 'rect' ? 'on' : ''}">Box</button></div>
          ${o.mode === 'brush' ? `<label class="field row"><span>Size</span><input type="range" min="5" max="150" value="${o.size}" class="es"><b class="esv">${o.size} cm</b></label>` : ''}
          <label class="field row"><span>Paint colour</span><input type="color" value="${o.color}" class="ec"></label>
          <p class="hint small">Covers parts of the drawing (e.g. a printed bed) in this layout only. Undo with Ctrl+Z.</p>
          <div class="row gap"><button class="btn small" data-x="copy-erase">Copy erasing to all layouts</button><button class="btn small danger-ghost" data-x="clear-erase">Clear</button></div>
        </div>`;
        host.onclick = (e) => {
          const m = e.target.closest('[data-em]');
          if (m) {
            o.mode = m.dataset.em;
            this.renderToolOpts();
            this.updateStatus();
          }
          const x = e.target.closest('[data-x]');
          if (x && x.dataset.x === 'clear-erase') this.change(() => (this.v.erasures = []));
          if (x && x.dataset.x === 'copy-erase') {
            const src = U.clone(this.v.erasures);
            this.p.variants.forEach((v) => v !== this.v && (v.erasures = U.clone(src)));
            this.save();
            U.toast('Erasing copied to all layouts');
          }
        };
        host.oninput = (e) => {
          if (e.target.classList.contains('es')) {
            o.size = +e.target.value;
            U.$('.esv', host).textContent = o.size + ' cm';
          }
          if (e.target.classList.contains('ec')) o.color = e.target.value;
        };
      } else if (t === 'lights') {
        const rooms = this.v.rooms || [];
        const nSug = this.v.items.filter((i) => i.suggested).length;
        host.innerHTML = `<div class="opt-card">
          <p class="small"><b>Drag a box over a room</b> to get a recommended light layout for it.</p>
          ${rooms.length ? `<div class="room-list">${rooms.map((r) => `<div class="room-row"><span>${U.esc(r.name)} <i>${U.esc((Lights.ROOM_TYPES[r.type] || {}).label || '')}</i></span><button class="icon-btn" data-redo="${r.id}" title="Recalculate">${icon('rotr', 14)}</button><button class="icon-btn" data-delroom="${r.id}" title="Remove room and its suggested lights">${icon('trash', 14)}</button></div>`).join('')}</div>` : ''}
          <label class="check"><input type="checkbox" class="lp" ${this.s.showLights ? 'checked' : ''}> Preview lighting</label>
          ${nSug ? `<button class="btn small danger-ghost" data-x="clear-sug">Remove ${nSug} suggested light${nSug > 1 ? 's' : ''}</button>` : ''}
          ${this.lightNotes ? `<div class="notes"><h4>Recommendation</h4><ul>${this.lightNotes.map((n) => `<li>${U.esc(n)}</li>`).join('')}</ul></div>` : ''}
        </div>`;
        host.onclick = (e) => {
          const rd = e.target.closest('[data-redo]');
          if (rd) {
            const room = rooms.find((r) => r.id === rd.dataset.redo);
            if (room) this.applyLightPlan(room);
          }
          const dr = e.target.closest('[data-delroom]');
          if (dr)
            this.change(() => {
              this.v.rooms = rooms.filter((r) => r.id !== dr.dataset.delroom);
              this.v.items = this.v.items.filter((i) => !(i.suggested && i.roomId === dr.dataset.delroom));
            }), this.renderToolOpts();
          const x = e.target.closest('[data-x]');
          if (x && x.dataset.x === 'clear-sug') {
            this.change(() => (this.v.items = this.v.items.filter((i) => !i.suggested)));
            this.lightNotes = null;
            this.renderToolOpts();
          }
        };
        host.oninput = (e) => {
          if (e.target.classList.contains('lp')) {
            this.s.showLights = e.target.checked;
            this.renderViewOpts();
            this.renderAll();
            this.save();
          }
        };
      } else if (t === 'crop') {
        host.innerHTML = `<div class="opt-card"><p class="small"><b>Drag a box</b> around the part of the plan you want to keep.</p><button class="btn small" data-x="cancel">Cancel</button></div>`;
        host.onclick = (e) => e.target.closest('[data-x]') && this.setTool('scale');
        host.oninput = null;
      } else if (t === 'straighten') {
        host.innerHTML = `<div class="opt-card"><p class="small"><b>Drag along a wall</b> that should run straight across or straight down. The plan turns to line it up.</p><button class="btn small" data-x="cancel">Cancel</button></div>`;
        host.onclick = (e) => e.target.closest('[data-x]') && this.setTool('scale');
        host.oninput = null;
      } else if (t === 'scale') {
        const pdf = this.p.plan.pdf;
        host.innerHTML = `<div class="opt-card">
          <p class="small"><b>Drag along something you know the length of</b> (a wall, a door, a dimension line). You’ll then type the real length.</p>
          <p class="small muted">Current: ${this.p.plan.calibrated ? 'scale set' : 'not set yet'}.</p>
          <p class="small muted">Shown in the bottom bar as the plan size. Check it with <b>Measure</b>.</p>
          ${pdf ? `<label class="field row"><span>Or drawing scale 1:</span><input type="number" class="inp small ratio" value="${pdf.drawingScale || 100}" min="1"><button class="btn small" data-x="ratio">Apply</button></label><p class="hint small">Works for PDFs printed to scale (e.g. 1:100).</p>` : ''}
        </div>
        <div class="opt-card">
          <p class="small"><b>Turn the plan</b> so the walls run straight across the screen.</p>
          <div class="btn-row wrap">
            <button class="btn small" data-x="straighten">${icon('measure', 14)} Straighten along a wall</button>
            <button class="icon-btn" data-x="rotl" title="Turn plan 90° left">${icon('rotl', 16)}</button>
            <button class="icon-btn" data-x="rotr" title="Turn plan 90° right">${icon('rotr', 16)}</button>
          </div>
          <p class="small"><b>Crop</b> away title blocks and empty paper.</p>
          <button class="btn small" data-x="crop">${icon('fit', 14)} Crop to a box</button>
        </div>
        </div>`;
        host.onclick = (e) => {
          const x = e.target.closest('[data-x]');
          if (x && x.dataset.x === 'straighten') return this.setTool('straighten');
          if (x && x.dataset.x === 'rotl') return this.rotatePlan(-90);
          if (x && x.dataset.x === 'rotr') return this.rotatePlan(90);
          if (x && x.dataset.x === 'crop') return this.setTool('crop');
          if (x && x.dataset.x === 'ratio') {
            const ratio = +U.$('.ratio', host).value;
            if (ratio > 0) {
              pdf.drawingScale = ratio;
              this.applyScale(FP.PlanImport.pxPerCmFromRatio(pdf.pxPerPt, ratio));
            }
          }
        };
        host.oninput = null;
      } else {
        host.innerHTML = '';
        host.onclick = host.oninput = null;
      }
    }

    // ------------------------------------------------------------------ library
    renderLibrary() {
      const host = U.$('.library', this.root);
      const q = (this.libQuery || '').trim().toLowerCase();
      const groups = {};
      Furniture.allTypes(this.p)
        .filter((t) => !q || t.name.toLowerCase().includes(q) || (t.cat || '').toLowerCase().includes(q))
        .forEach((t) => (groups[t.custom ? 'Your types' : t.cat || 'Other'] ||= []).push(t));
      host.innerHTML =
        Object.entries(groups)
          .map(
            ([cat, list]) =>
              `<div class="lib-cat">${U.esc(cat)}</div>` +
              list
                .map(
                  (t) => `<div class="lib-item" draggable="true" data-type="${t.type}" title="Add ${U.esc(t.name)} (${Math.round(Furniture.defaults(this.p, t.type).w)} × ${Math.round(Furniture.defaults(this.p, t.type).d)} cm)">
            ${Furniture.thumb(this.p, t.type, 52)}<span>${U.esc(t.name)}</span>${t.custom ? `<button class="lib-del" data-del="${t.type}" title="Delete this type">${icon('close', 12)}</button>` : ''}
          </div>`
                )
                .join('')
          )
          .join('') || `<p class="hint small lib-cat">Nothing matches “${U.esc(q)}”.</p>`;
      const search = U.$('.lib-search', this.root);
      if (search && !search.oninput)
        search.oninput = () => {
          this.libQuery = search.value;
          this.renderLibrary();
        };
      host.onclick = (e) => {
        const del = e.target.closest('[data-del]');
        if (del) {
          e.stopPropagation();
          return this.deleteType(del.dataset.del);
        }
        const li = e.target.closest('.lib-item');
        if (li) {
          this.addItem(li.dataset.type);
          if (this.isPhone) this.openSheet(null);
        }
      };
      host.ondragstart = (e) => {
        const li = e.target.closest('.lib-item');
        if (li) e.dataTransfer.setData('text/fp-type', li.dataset.type);
      };
    }

    addItem(type, at, extra = {}) {
      const dd = Furniture.defaults(this.p, type);
      const def = Furniture.def(this.p, type);
      let [x, y] = at || this.viewCenter();
      // don't drop new items exactly on top of each other
      if (!at) while (this.v.items.some((i) => Math.abs(i.x - x) < 1 && Math.abs(i.y - y) < 1)) (x += 25), (y += 25);
      const it = Object.assign(
        { id: U.uid('i'), type, name: def.name, x, y, w: dd.w, d: dd.d, rot: 0, color: dd.color, opacity: 1 },
        dd.shape ? { shape: dd.shape } : {},
        def.isLight ? { radius: 150, tone: 'warm' } : {},
        extra
      );
      this.change(() => this.v.items.push(it));
      this.select(it.id);
      return it;
    }

    async newType(from) {
      const body = U.h(`<div class="form">
        <label class="field"><span>Name</span><input class="inp" name="name" value="${U.esc(from ? from.name : '')}" placeholder="e.g. Bookshelf"></label>
        <div class="row gap"><label class="field"><span>Width (cm)</span><input class="inp" type="number" name="w" value="${from ? Math.round(from.w) : 80}" min="1"></label>
        <label class="field"><span>Depth (cm)</span><input class="inp" type="number" name="d" value="${from ? Math.round(from.d) : 40}" min="1"></label></div>
        <div class="row gap"><label class="field"><span>Colour</span><input type="color" name="color" value="${from ? from.color : '#8aa1b1'}"></label>
        <label class="field"><span>Shape</span><select class="inp" name="shape"><option value="rect">Rectangle</option><option value="rounded">Rounded</option><option value="round">Round / oval</option></select></label></div>
      </div>`);
      const res = await U.modal({
        title: 'New furniture type',
        body,
        buttons: [{ label: 'Cancel', value: null }, { label: 'Create', primary: true, value: (el) => Object.fromEntries(U.$$('[name]', el).map((i) => [i.name, i.value])) }],
        validate: (v) => (!v.name.trim() ? 'Give it a name' : +v.w > 0 && +v.d > 0 ? null : 'Width and depth must be positive'),
      });
      if (!res) return;
      const t = { type: 'custom_' + U.uid('t'), name: res.name.trim(), w: +res.w, d: +res.d, color: res.color, shape: res.shape };
      this.p.customTypes.push(t);
      this.save();
      this.renderLibrary();
      this.addItem(t.type);
    }

    async deleteType(type) {
      const t = this.p.customTypes.find((c) => c.type === type);
      if (!t) return;
      const used = this.p.variants.reduce((n, v) => n + v.items.filter((i) => i.type === type).length, 0);
      if (!(await U.confirm('Delete furniture type', `Delete “${t.name}” from the library?${used ? ` The ${used} placed item(s) stay where they are.` : ''}`, 'Delete', true))) return;
      this.p.customTypes = this.p.customTypes.filter((c) => c.type !== type);
      // keep placed items drawable
      this.p.variants.forEach((v) => v.items.forEach((i) => i.type === type && (i.type = 'custom_orphan')));
      this.save();
      this.renderLibrary();
      this.renderAll();
    }

    // ------------------------------------------------------------------ selection & item ops
    select(id) {
      this.sel = id;
      this.renderOverlay();
      this.renderProps();
      this.renderLayers();
      this.updateMobBar();
    }
    updateSel(fn, opts) {
      const it = this.selItem;
      if (!it) return;
      this.change(() => fn(it), opts);
    }
    deleteSel() {
      const it = this.selItem;
      if (!it) return;
      this.change(() => (this.v.items = this.v.items.filter((i) => i !== it)));
      this.select(null);
    }
    duplicateSel() {
      const it = this.selItem;
      if (!it) return;
      const c = Object.assign(U.clone(it), { id: U.uid('i'), x: it.x + 20, y: it.y + 20, suggested: false, locked: false });
      const idx = this.v.items.indexOf(it);
      this.change(() => this.v.items.splice(idx + 1, 0, c));
      this.select(c.id);
    }
    reorder(id, where) {
      const items = this.v.items;
      const i = items.findIndex((x) => x.id === id);
      if (i < 0) return;
      this.change(() => {
        const [it] = items.splice(i, 1);
        let j = where === 'front' ? items.length : where === 'back' ? 0 : where === 'up' ? i + 1 : i - 1;
        items.splice(U.clamp(j, 0, items.length), 0, it);
      });
    }

    // ------------------------------------------------------------------ properties panel
    renderProps() {
      const host = U.$('.props', this.root);
      const it = this.selItem;
      if (!it) {
        const v = this.v;
        const n = v.items.length;
        const lights = v.items.filter((i) => i.type === 'light').length;
        host.innerHTML = `<div class="sec-head"><h3>${U.esc(v.name)}</h3></div>
          <p class="muted small">${n} item${n === 1 ? '' : 's'} · ${lights} light${lights === 1 ? '' : 's'} · ${v.erasures.length} erase stroke${v.erasures.length === 1 ? '' : 's'}</p>
          <label class="field"><span>Notes for this layout</span><textarea class="inp notes-ta" rows="4" placeholder="What do you like about this layout?">${U.esc(v.notes || '')}</textarea></label>
          <p class="hint small">Select an item to edit its size, colour and layer.</p>`;
        U.$('.notes-ta', host).oninput = (e) => {
          v.notes = e.target.value;
          this.save();
        };
        return;
      }
      const def = Furniture.def(this.p, it.type);
      const shapes = def.shapes || null;
      host.innerHTML = `<div class="sec-head"><h3>${U.esc(def.name)}</h3>${it.suggested ? '<span class="pill">suggested</span>' : ''}</div>
        <label class="field"><span>Name</span><input class="inp" data-k="name" value="${U.esc(it.name || '')}"></label>
        <div class="row gap">
          <label class="field"><span>Width (cm)</span><input class="inp" type="number" min="1" step="1" data-k="w" value="${f(it.w)}"></label>
          <button class="icon-btn mt" data-p="swap" title="Swap width and depth">${icon('swap', 16)}</button>
          <label class="field"><span>Depth (cm)</span><input class="inp" type="number" min="1" step="1" data-k="d" value="${f(it.d)}"></label>
        </div>
        <div class="row gap">
          <label class="field"><span>Rotation (°)</span><input class="inp" type="number" step="1" data-k="rot" value="${f(it.rot || 0)}"></label>
          <button class="icon-btn mt" data-p="rotl" title="Rotate 90° left">${icon('rotl', 16)}</button>
          <button class="icon-btn mt" data-p="rotr" title="Rotate 90° right (R)">${icon('rotr', 16)}</button>
        </div>
        <div class="row gap">
          <label class="field"><span>X (cm)</span><input class="inp" type="number" data-k="x" value="${Math.round(it.x)}"></label>
          <label class="field"><span>Y (cm)</span><input class="inp" type="number" data-k="y" value="${Math.round(it.y)}"></label>
        </div>
        <label class="field"><span>Room</span><select class="inp" data-k="group"><option value="">Not in a room</option>${(this.v.groups || []).map((g) => `<option value="${g.id}" ${it.group === g.id ? 'selected' : ''}>${U.esc(g.name)}</option>`).join('')}<option value="__new">+ New room…</option></select></label>
        ${shapes ? `<label class="field"><span>Shape</span><select class="inp" data-k="shape">${shapes.map((s) => `<option value="${s}" ${it.shape === s ? 'selected' : ''}>${{ rect: 'Rectangle', rounded: 'Rounded', round: 'Round / oval' }[s]}</option>`).join('')}</select></label>` : ''}
        <div class="field"><span>Colour</span>
          <div class="swatches">${Furniture.SWATCHES.map((c) => `<button class="sw ${c === it.color ? 'on' : ''}" style="background:${c}" data-color="${c}" title="${c}"></button>`).join('')}<input type="color" data-k="color" value="${it.color || def.color}" title="Pick any colour"></div>
          <button class="link small" data-p="defcolor">Reset to default colour</button>
        </div>
        <label class="field row"><span>Opacity</span><input type="range" min="0.1" max="1" step="0.05" data-k="opacity" value="${it.opacity ?? 1}"></label>
        ${it.type === 'light' ? `<div class="row gap"><label class="field"><span>Light reach (cm)</span><input class="inp" type="number" min="20" step="10" data-k="radius" value="${Math.round(it.radius || 150)}"></label>
          <label class="field"><span>Tone</span><select class="inp" data-k="tone">${Object.entries(Scene.LIGHT_TONES).map(([k, t]) => `<option value="${k}" ${it.tone === k ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label></div>` : ''}
        <div class="field"><span>Layer</span><div class="btn-row">
          <button class="icon-btn" data-p="front" title="Bring to front">${icon('top', 16)}</button>
          <button class="icon-btn" data-p="up" title="Bring forward (])">${icon('up', 16)}</button>
          <button class="icon-btn" data-p="down" title="Send backward ([)">${icon('down', 16)}</button>
          <button class="icon-btn" data-p="back" title="Send to back">${icon('bottom', 16)}</button>
          <span class="grow"></span>
          <button class="icon-btn ${it.locked ? 'on' : ''}" data-p="lock" title="${it.locked ? 'Unlock' : 'Lock in place'}">${icon(it.locked ? 'lock' : 'unlock', 16)}</button>
        </div></div>
        <div class="btn-row wrap">
          <button class="btn small" data-p="dup">${icon('copy', 14)} Duplicate</button>
          <button class="btn small" data-p="remember" title="New ${U.esc(def.name)} items in this project will get this size and colour">Use as default size</button>
          ${!def.custom || it.type === 'custom_orphan' ? `<button class="btn small" data-p="astype">Save as new type</button>` : ''}
          <button class="btn small danger-ghost" data-p="del">${icon('trash', 14)} Delete</button>
        </div>`;

      host.onchange = (e) => {
        const k = e.target.dataset.k;
        if (!k) return;
        let val = e.target.value;
        if (['w', 'd', 'rot', 'x', 'y', 'opacity', 'radius'].includes(k)) {
          val = parseFloat(val);
          if (!isFinite(val)) return this.renderProps();
          if ((k === 'w' || k === 'd') && val < 1) val = 1;
          if (k === 'rot') val = ((val % 360) + 360) % 360;
        }
        if (k === 'group') {
          if (val === '__new') return this.newGroup(it);
          return this.updateSel((i) => (val ? (i.group = val) : delete i.group));
        }
        this.updateSel((i) => (i[k] = val), { keepProps: k !== 'shape' });
        if (k === 'name') this.renderLayers();
      };
      host.oninput = (e) => {
        const k = e.target.dataset.k;
        if (k === 'opacity' || k === 'color') {
          // live preview while dragging the slider / colour wheel; committed on change
          it[k] = k === 'opacity' ? +e.target.value : e.target.value;
          this.renderItemFast(it);
        }
      };
      host.onclick = (e) => {
        const c = e.target.closest('[data-color]');
        if (c) return this.updateSel((i) => (i.color = c.dataset.color));
        const b = e.target.closest('[data-p]');
        if (!b) return;
        const a = b.dataset.p;
        if (a === 'swap') this.updateSel((i) => ([i.w, i.d] = [i.d, i.w]));
        else if (a === 'rotl') this.updateSel((i) => (i.rot = (((i.rot || 0) - 90) % 360 + 360) % 360));
        else if (a === 'rotr') this.updateSel((i) => (i.rot = ((i.rot || 0) + 90) % 360));
        else if (a === 'defcolor') this.updateSel((i) => (i.color = Furniture.defaults(this.p, i.type).color));
        else if (['front', 'up', 'down', 'back'].includes(a)) this.reorder(it.id, a);
        else if (a === 'lock') this.updateSel((i) => (i.locked = !i.locked));
        else if (a === 'dup') this.duplicateSel();
        else if (a === 'del') this.deleteSel();
        else if (a === 'remember') {
          this.p.typeDefaults[it.type] = { w: it.w, d: it.d, color: it.color, shape: it.shape };
          this.save();
          this.renderLibrary();
          U.toast(`New ${def.name} items will be ${Math.round(it.w)} × ${Math.round(it.d)} cm`);
        } else if (a === 'astype') this.newType(it);
      };
    }

    // ------------------------------------------------------------------ layers panel
    // Rooms are named groups; an item belongs to one through item.group.
    groupOf(it) {
      return (this.v.groups || []).find((g) => g.id === it.group) || null;
    }

    async newGroup(moveItem) {
      const n = (this.v.groups || []).length + 1;
      const name = await this.askRoomName('New room', `Room ${n}`);
      if (!name) return this.renderProps();
      const g = { id: U.uid('g'), name };
      this.change(() => {
        this.v.groups = (this.v.groups || []).concat(g);
        if (moveItem) moveItem.group = g.id;
      });
    }

    async askRoomName(title, value) {
      const res = await U.modal({
        title,
        body: U.h(`<div class="form"><label class="field"><span>Room name</span><input class="inp" name="name" value="${U.esc(value)}"></label></div>`),
        buttons: [{ label: 'Cancel', value: null }, { label: 'Save', primary: true, value: (el) => U.$('[name=name]', el).value.trim() }],
      });
      return res || null;
    }

    renderLayers() {
      const host = U.$('.layers', this.root);
      const items = this.v.items.slice().reverse();
      const groups = this.v.groups || [];
      if (!items.length && !groups.length) {
        host.innerHTML = `<p class="hint small">Nothing placed yet. Use <b>+ Room</b> to make rooms, then drag furniture into them here.</p>`;
        return;
      }
      const row = (it) => `<div class="layer ${it.id === this.sel ? 'on' : ''} ${it.hidden ? 'dim' : ''}" draggable="true" data-id="${it.id}">
            <span class="dot" style="background:${it.color}"></span><span class="lname">${U.esc(it.name || 'Item')}</span>
            <button class="icon-btn tiny" data-l="hide" title="${it.hidden ? 'Show' : 'Hide'}">${icon(it.hidden ? 'eyeoff' : 'eye', 14)}</button>
            <button class="icon-btn tiny ${it.locked ? 'on' : ''}" data-l="lock" title="${it.locked ? 'Unlock' : 'Lock'}">${icon(it.locked ? 'lock' : 'unlock', 14)}</button>
          </div>`;
      const gid = (it) => (this.groupOf(it) || { id: 'none' }).id;
      const list = groups.map((g) => ({ id: g.id, name: g.name, items: items.filter((it) => it.group === g.id) }));
      const loose = items.filter((it) => gid(it) === 'none');
      if (!groups.length) {
        host.innerHTML = loose.map(row).join('') + `<p class="hint small layer-tip">Use <b>+ Room</b> to make rooms, then drag furniture into them.</p>`;
      } else {
        list.push({ id: 'none', name: 'Not in a room', items: loose });
        this.layerFolds = this.layerFolds || {};
        const selG = this.selItem ? gid(this.selItem) : null;
        host.innerHTML = list
          .filter((g) => g.items.length || g.id !== 'none')
          .map((g) => {
            const folded = this.layerFolds[g.id] && g.id !== selG;
            const allHidden = g.items.length && g.items.every((i) => i.hidden);
            const allLocked = g.items.length && g.items.every((i) => i.locked);
            const real = g.id !== 'none';
            return `<div class="lgroup" data-g="${g.id}">
              <div class="lgroup-head">
                <button class="icon-btn tiny fold ${folded ? 'shut' : ''}" data-g-act="fold" title="${folded ? 'Expand' : 'Collapse'}">${icon('down', 12)}</button>
                <span class="lgname" ${real ? 'title="Double-click to rename"' : ''}>${U.esc(g.name)}</span><span class="lgcount">${g.items.length}</span>
                ${g.items.length ? `<button class="icon-btn tiny" data-g-act="hide" title="${allHidden ? 'Show' : 'Hide'} everything in ${U.esc(g.name)}">${icon(allHidden ? 'eyeoff' : 'eye', 14)}</button>
                <button class="icon-btn tiny ${allLocked ? 'on' : ''}" data-g-act="lock" title="${allLocked ? 'Unlock' : 'Lock'} everything in ${U.esc(g.name)}">${icon(allLocked ? 'lock' : 'unlock', 14)}</button>` : ''}
                ${real ? `<button class="icon-btn tiny" data-g-act="rename" title="Rename room">${icon('edit', 13)}</button>
                <button class="icon-btn tiny" data-g-act="del" title="Delete room (furniture stays)">${icon('trash', 13)}</button>` : ''}
              </div>
              ${folded ? '' : g.items.length ? g.items.map(row).join('') : `<p class="hint small lgroup-empty">Drag furniture here</p>`}
            </div>`;
          })
          .join('');
      }
      const groupItems = (id) => this.v.items.filter((i) => gid(i) === id);
      host.onmousedown = (e) => {
        const ga = e.target.closest('[data-g-act]');
        if (!ga) return;
        e.preventDefault();
        const act = ga.dataset.gAct;
        const id = ga.closest('[data-g]').dataset.g;
        const its = groupItems(id);
        if (act === 'fold') {
          this.layerFolds[id] = !this.layerFolds[id];
          return this.renderLayers();
        }
        if (act === 'hide') {
          const v = !its.every((i) => i.hidden);
          return this.change(() => its.forEach((i) => (i.hidden = v)));
        }
        if (act === 'lock') {
          const v = !its.every((i) => i.locked);
          return this.change(() => its.forEach((i) => (i.locked = v)));
        }
        if (act === 'rename') return this.renameGroup(id);
        if (act === 'del')
          return this.change(() => {
            this.v.groups = this.v.groups.filter((g) => g.id !== id);
            its.forEach((i) => delete i.group);
          });
      };
      host.ondblclick = (e) => {
        const n = e.target.closest('.lgname');
        const g = n && n.closest('[data-g]');
        if (g && g.dataset.g !== 'none') this.renameGroup(g.dataset.g);
      };
      host.onclick = (e) => {
        const row = e.target.closest('.layer');
        if (!row) return;
        const id = row.dataset.id;
        const b = e.target.closest('[data-l]');
        if (b) {
          const it = this.item(id);
          this.change(() => (b.dataset.l === 'hide' ? (it.hidden = !it.hidden) : (it.locked = !it.locked)));
          return;
        }
        this.select(id);
      };
      let dragId = null;
      const clearMarks = () => U.$$('.drop-above, .drop-below, .drop-into', host).forEach((r) => r.classList.remove('drop-above', 'drop-below', 'drop-into'));
      host.ondragstart = (e) => {
        const row = e.target.closest('.layer');
        dragId = row && row.dataset.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragId || '');
      };
      host.ondragend = () => {
        dragId = null;
        clearMarks();
      };
      host.ondragover = (e) => {
        e.preventDefault();
        clearMarks();
        const row = e.target.closest('.layer');
        if (row && row.dataset.id !== dragId) {
          const r = row.getBoundingClientRect();
          row.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-above' : 'drop-below');
          return;
        }
        const g = !row && e.target.closest('.lgroup');
        if (g) g.classList.add('drop-into');
      };
      host.ondrop = (e) => {
        e.preventDefault();
        const row = e.target.closest('.layer');
        const g = e.target.closest('.lgroup');
        const newType = e.dataTransfer.getData('text/fp-type');
        if (newType) {
          // dropped straight from the furniture library onto a room
          const id = g ? g.dataset.g : 'none';
          return this.addItem(newType, null, id === 'none' ? {} : { group: id });
        }
        if (!dragId) return clearMarks();
        if (row && row.dataset.id !== dragId) {
          const above = row.classList.contains('drop-above');
          return this.change(() => {
            const items = this.v.items;
            const it = items.splice(items.findIndex((x) => x.id === dragId), 1)[0];
            const target = items.find((x) => x.id === row.dataset.id);
            const ti = items.indexOf(target);
            // list is shown top-first, so "above" in the list = later in the array
            items.splice(above ? ti + 1 : ti, 0, it);
            target.group ? (it.group = target.group) : delete it.group;
          });
        }
        if (g) {
          const it = this.item(dragId);
          const id = g.dataset.g;
          return this.change(() => (id === 'none' ? delete it.group : (it.group = id)));
        }
        this.renderLayers();
      };
    }

    async renameGroup(id) {
      const g = (this.v.groups || []).find((x) => x.id === id);
      if (!g) return;
      const name = await this.askRoomName('Rename room', g.name);
      if (name) this.change(() => (g.name = name));
    }

    // ------------------------------------------------------------------ view options
    renderViewOpts() {
      const s = this.s;
      const host = U.$('.viewopts', this.root);
      host.innerHTML = `
        <label class="field row"><span>Plan visibility</span><input type="range" min="0.1" max="1" step="0.05" data-v="planOpacity" value="${s.planOpacity ?? 1}"></label>
        <label class="check"><input type="checkbox" data-v="showLabels" ${s.showLabels ? 'checked' : ''}> Show names on furniture</label>
        <label class="check"><input type="checkbox" data-v="showGrid" ${s.showGrid ? 'checked' : ''}> Show 50 cm grid</label>
        <label class="check"><input type="checkbox" data-v="snap" ${s.snap ? 'checked' : ''}> Snap to 5 cm when moving</label>
        <label class="check"><input type="checkbox" data-v="showLights" ${s.showLights ? 'checked' : ''}> Preview lighting</label>`;
      host.oninput = (e) => {
        const k = e.target.dataset.v;
        if (!k) return;
        s[k] = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
        if (k === 'planOpacity') this.L.plan.querySelector('image').setAttribute('opacity', s.planOpacity);
        else if (k === 'showGrid') this.renderGrid();
        else this.renderAll({ keepProps: true });
        if (k === 'showLights' && this.tool === 'lights') this.renderToolOpts();
        this.save();
      };
    }

    // ------------------------------------------------------------------ variant tabs
    renderTabs() {
      const host = U.$('.vtabs', this.root);
      host.innerHTML =
        this.p.variants
          .map(
            (v) => `<div class="vtab ${v.id === this.p.activeVariantId ? 'on' : ''}" data-vid="${v.id}" title="Double-click to rename">
            <span>${U.esc(v.name)}</span>${v.id === this.p.activeVariantId ? `<button class="icon-btn tiny" data-vm="${v.id}" title="Layout options">${icon('more', 14)}</button>` : ''}</div>`
          )
          .join('') + `<button class="icon-btn" data-vnew title="New layout">${icon('plus', 16)}</button>`;
      host.onclick = (e) => {
        if (e.target.closest('[data-vnew]')) return this.variantMenu(e.target.closest('[data-vnew]'), null);
        const m = e.target.closest('[data-vm]');
        if (m) return this.variantMenu(m, m.dataset.vm);
        const t = e.target.closest('.vtab');
        if (t) this.switchVariant(t.dataset.vid);
      };
      host.ondblclick = (e) => {
        const t = e.target.closest('.vtab');
        if (t) this.renameVariant(t.dataset.vid);
      };
    }

    popMenu(anchor, entries) {
      U.$$('.pop').forEach((p) => p.remove());
      const r = anchor.getBoundingClientRect();
      const m = U.h(`<div class="pop menu">${entries.map((e, i) => `<button data-i="${i}" class="${e.danger ? 'danger' : ''}">${e.label}</button>`).join('')}</div>`);
      m.style.left = Math.min(r.left, window.innerWidth - 240) + 'px';
      m.style.top = r.bottom + 4 + 'px';
      document.body.appendChild(m);
      const off = (e) => {
        if (!m.contains(e.target)) {
          m.remove();
          document.removeEventListener('mousedown', off, true);
        }
      };
      setTimeout(() => document.addEventListener('mousedown', off, true));
      m.onclick = (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        m.remove();
        document.removeEventListener('mousedown', off, true);
        entries[+b.dataset.i].fn();
      };
    }

    variantMenu(anchor, vid) {
      if (!vid) {
        return this.popMenu(anchor, [
          { label: `${icon('copy', 14)} Copy of “${U.esc(this.v.name)}”`, fn: () => this.newVariant(true) },
          { label: `${icon('plus', 14)} Empty layout`, fn: () => this.newVariant(false) },
        ]);
      }
      this.popMenu(anchor, [
        { label: `${icon('edit', 14)} Rename`, fn: () => this.renameVariant(vid) },
        { label: `${icon('copy', 14)} Duplicate`, fn: () => this.newVariant(true) },
        { label: `${icon('trash', 14)} Delete layout`, danger: true, fn: () => this.deleteVariant(vid) },
      ]);
    }

    nextVariantName() {
      const used = new Set(this.p.variants.map((v) => v.name));
      for (let i = 0; i < 26; i++) {
        const n = 'Layout ' + String.fromCharCode(65 + i);
        if (!used.has(n)) return n;
      }
      return 'Layout ' + (this.p.variants.length + 1);
    }

    newVariant(copy) {
      const v = Store.newVariant(this.nextVariantName());
      if (copy) {
        const src = this.v;
        // keep item ids so the compare view can match items across layouts
        Object.assign(v, { items: U.clone(src.items), erasures: U.clone(src.erasures), rooms: U.clone(src.rooms), groups: U.clone(src.groups || []), notes: '' });
      }
      this.p.variants.push(v);
      this.switchVariant(v.id);
      U.toast(copy ? `Created ${v.name} as a copy` : `Created ${v.name}`);
    }

    async renameVariant(vid) {
      const v = this.p.variants.find((x) => x.id === vid);
      const n = await U.prompt('Rename layout', 'Name', v.name);
      if (n && n.trim()) {
        v.name = n.trim();
        this.renderTabs();
        this.renderProps();
        this.save();
      }
    }

    async deleteVariant(vid) {
      if (this.p.variants.length < 2) return U.toast('A project needs at least one layout', 'error');
      const v = this.p.variants.find((x) => x.id === vid);
      if (!(await U.confirm('Delete layout', `Delete “${v.name}”? This can’t be undone.`, 'Delete', true))) return;
      this.p.variants = this.p.variants.filter((x) => x.id !== vid);
      delete this.hist[vid];
      this.switchVariant(this.p.variants[0].id);
    }

    switchVariant(vid) {
      this.p.activeVariantId = vid;
      this.sel = null;
      this.measure = null;
      this.lightNotes = null;
      this.renderTabs();
      this.renderToolOpts();
      this.renderAll();
      this.save();
    }

    // ------------------------------------------------------------------ scale
    applyScale(newPxPerCm) {
      const plan = this.p.plan;
      const k = plan.pxPerCm / newPxPerCm; // multiply old cm coords by k
      if (!isFinite(k) || k <= 0) return;
      // Keep everything anchored to the drawing: positions and erasing scale with
      // it, furniture keeps its real-life size.
      this.p.variants.forEach((v) => {
        v.items.forEach((i) => ((i.x *= k), (i.y *= k)));
        v.erasures.forEach((e) => {
          if (e.kind === 'rect') ['x', 'y', 'w', 'h'].forEach((q) => (e[q] *= k));
          else {
            e.pts = e.pts.map(([x, y]) => [x * k, y * k]);
            e.size *= k;
          }
        });
        (v.rooms || []).forEach((r) => ['x', 'y', 'w', 'h'].forEach((q) => (r[q] *= k)));
      });
      this.hist = {};
      plan.pxPerCm = newPxPerCm;
      plan.calibrated = true;
      if (this.view) {
        this.view.x *= k;
        this.view.y *= k;
        this.view.scale /= k;
      }
      this.renderPlan();
      this.measure = null;
      this.setTool('select');
      this.applyView();
      this.save();
      const { w, h } = Scene.planSize(this.p);
      U.toast(`Scale set. The plan is ${U.fmtLen(w)} × ${U.fmtLen(h)}.`, 'ok', 4000);
    }

    async finishScale(m) {
      const lenCm = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
      if (lenCm * this.view.scale < 10) return;
      const v = await U.prompt('Set the scale', 'Real length of the line you drew (cm)', '', { type: 'number', step: 'any', hint: 'Tip: zoom in and draw along a long wall or dimension line for the best accuracy. 1 m = 100 cm.', ok: 'Set scale' });
      const real = parseFloat(v);
      if (!(real > 0)) {
        this.measure = null;
        this.renderOverlay();
        return;
      }
      const linePx = lenCm * this.p.plan.pxPerCm;
      this.applyScale(linePx / real);
    }

    // ------------------------------------------------------------------ rotate / straighten plan
    async finishStraighten(m) {
      this.measure = null;
      if (Math.hypot(m.x2 - m.x1, m.y2 - m.y1) * this.view.scale < 15) return this.renderOverlay();
      const ang = (Math.atan2(m.y2 - m.y1, m.x2 - m.x1) * 180) / Math.PI;
      const deg = Math.round(ang / 90) * 90 - ang;
      if (Math.abs(deg) < 0.05) {
        this.setTool('select');
        return U.toast('That wall is already straight', 'ok');
      }
      await this.rotatePlan(deg);
    }

    // Turn the plan bitmap; furniture, erasing and rooms turn with it.
    async rotatePlan(deg) {
      U.toast('Turning the plan…');
      const r = await FP.PlanImport.rotate(this.p.plan, deg);
      this.replaceBitmap(r, deg);
      U.toast(`Plan turned ${Math.abs(deg).toFixed(1)}° ${deg > 0 ? 'right' : 'left'}`, 'ok');
    }

    async cropPlan(rect) {
      const k = this.p.plan.pxPerCm;
      if (rect.w * this.view.scale < 20 || rect.h * this.view.scale < 20) return U.toast('Drag a bigger box', 'error');
      const r = await FP.PlanImport.crop(this.p.plan, rect.x * k, rect.y * k, rect.w * k, rect.h * k);
      this.replaceBitmap(r, 0);
      U.toast('Plan cropped', 'ok');
    }

    // Swap in a transformed plan bitmap; r.map converts old plan pixels to new
    // ones. Furniture, erasing and rooms move with the drawing.
    replaceBitmap(r, deg) {
      const plan = this.p.plan;
      const k = plan.pxPerCm;
      const mapCm = (x, y) => r.map(x * k, y * k).map((v) => v / k);
      this.p.variants.forEach((v) => {
        v.items.forEach((i) => {
          [i.x, i.y] = mapCm(i.x, i.y);
          i.rot = (((i.rot || 0) + deg) % 360 + 360) % 360;
        });
        v.erasures = v.erasures.map((e) => {
          if (e.kind === 'rect') return { kind: 'poly', color: e.color, pts: [[e.x, e.y], [e.x + e.w, e.y], [e.x + e.w, e.y + e.h], [e.x, e.y + e.h]].map(([x, y]) => mapCm(x, y)) };
          return Object.assign(e, { pts: e.pts.map(([x, y]) => mapCm(x, y)) });
        });
        (v.rooms || []).forEach((rm) => {
          const [cx, cy] = mapCm(rm.x + rm.w / 2, rm.y + rm.h / 2);
          if (Math.abs(Math.abs(deg % 180) - 90) < 45) [rm.w, rm.h] = [rm.h, rm.w];
          Object.assign(rm, { x: cx - rm.w / 2, y: cy - rm.h / 2 });
        });
      });
      Object.assign(plan, { dataUrl: r.dataUrl, widthPx: r.widthPx, heightPx: r.heightPx });
      this.hist = {};
      this.sel = null;
      this.renderPlan();
      this.setTool('select');
      this.fit();
      this.save();
    }

    // ------------------------------------------------------------------ light planner
    async finishLightRoom(r) {
      if (r.w < 50 || r.h < 50) return U.toast('Drag a bigger box over the room', 'error');
      const n = (this.v.rooms || []).length + 1;
      const body = U.h(`<div class="form">
        <p class="muted small">Room size: ${U.fmtLen(r.w)} × ${U.fmtLen(r.h)}</p>
        <label class="field"><span>Room name</span><input class="inp" name="name" value="Room ${n}"></label>
        <label class="field"><span>What is the room used for?</span><select class="inp" name="type">${Object.entries(Lights.ROOM_TYPES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('')}</select></label>
        <p class="hint small">Ceiling lights are spread evenly, and task lights are added for a desk, sim rig, kitchen table, bed or sofa inside the box.</p>
      </div>`);
      const res = await U.modal({ title: 'Recommend lights', body, buttons: [{ label: 'Cancel', value: null }, { label: 'Suggest lights', primary: true, value: (el) => Object.fromEntries(U.$$('[name]', el).map((i) => [i.name, i.value])) }] });
      this.dragRect = null;
      if (!res) return this.renderOverlay();
      const room = { id: U.uid('r'), name: res.name || 'Room', type: res.type, x: r.x, y: r.y, w: r.w, h: r.h };
      this.v.rooms = this.v.rooms || [];
      const before = this.snapshot();
      this.v.rooms.push(room);
      this.applyLightPlan(room, before);
    }

    applyLightPlan(room, before) {
      before = before || this.snapshot();
      const res = Lights.recommend(room, room.type, this.v.items);
      this.v.items = this.v.items.filter((i) => !(i.suggested && i.roomId === room.id)).concat(res.lights);
      this.pushUndo(before);
      this.s.showLights = true;
      this.lightNotes = res.notes;
      this.renderViewOpts();
      this.renderToolOpts();
      this.renderAll();
      this.save();
      U.toast(`${res.lights.length} lights suggested for ${room.name}`, 'ok');
    }

    // ------------------------------------------------------------------ canvas events
    bindCanvas() {
      const svg = this.svg;
      svg.dataset.tool = this.tool;
      svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const r = svg.getBoundingClientRect();
        const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
        this.zoomBy(k, e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });

      svg.addEventListener('pointerdown', (e) => this.onDown(e));
      svg.addEventListener('pointermove', (e) => this.onMove(e));
      svg.addEventListener('pointerup', (e) => this.onUp(e));
      svg.addEventListener('pointercancel', (e) => this.onUp(e));
      svg.addEventListener('pointerleave', () => {
        this.brushCursor = null;
        this.renderOverlay();
      });
      svg.addEventListener('contextmenu', (e) => e.preventDefault());
      svg.addEventListener('dblclick', (e) => {
        const g = e.target.closest('.item');
        if (g && this.tool === 'select') {
          this.select(g.dataset.id);
          const inp = U.$('.props [data-k=w]', this.root);
          if (inp) inp.focus(), inp.select();
        }
      });
      // drop from library
      const stage = U.$('.stage', this.root);
      stage.addEventListener('dragover', (e) => {
        if (e.dataTransfer.types.includes('text/fp-type')) e.preventDefault();
      });
      stage.addEventListener('drop', (e) => {
        const type = e.dataTransfer.getData('text/fp-type');
        if (!type) return;
        e.preventDefault();
        this.setTool('select');
        this.addItem(type, this.toWorld(e));
      });
    }

    // Two fingers on the plan zoom and pan; whatever the first finger started is undone.
    startPinch() {
      const d = this.drag;
      if (d && ['move', 'rotate', 'resize'].includes(d.kind)) {
        Object.assign(d.it, d.orig);
        this.renderAll({ keepProps: true });
      } else if (d && d.kind === 'brush') {
        this.v.erasures = this.v.erasures.filter((x) => x !== d.stroke);
        this.L.erase.innerHTML = Scene.erasures(this.v);
      }
      this.measure = null;
      this.dragRect = null;
      const [a, b] = [...this.touches.values()];
      const r = this.svg.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      this.drag = { kind: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: this.view.scale, wx: this.view.x + mx / this.view.scale, wy: this.view.y + my / this.view.scale };
      this.renderOverlay();
    }
    movePinch() {
      const d = this.drag;
      const [a, b] = [...this.touches.values()];
      const r = this.svg.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      const v = this.view;
      v.scale = U.clamp((d.scale * Math.hypot(a.x - b.x, a.y - b.y)) / d.dist, 0.02, 20);
      v.x = d.wx - mx / v.scale;
      v.y = d.wy - my / v.scale;
      this.applyView();
    }

    capture(e) {
      try {
        this.svg.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    onDown(e) {
      if (e.pointerType === 'touch') {
        this.touches = this.touches || new Map();
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.touches.size === 2) {
          this.capture(e);
          return this.startPinch();
        }
        if (this.touches.size > 2) return;
      }
      if (this.drag) return;
      const p = this.toWorld(e);
      const pan = e.button === 1 || e.button === 2 || this.spaceDown || this.tool === 'pan';
      this.capture(e);
      if (pan) {
        this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: this.view.x, vy: this.view.y };
        this.svg.classList.add('panning');
        return;
      }
      if (e.button !== 0) return;
      const t = this.tool;
      if (t === 'select') {
        const hEl = e.target.closest('[data-handle]');
        const it = this.selItem;
        if (hEl && it) {
          const hv = hEl.dataset.handle;
          this.drag = { kind: hv === 'rot' ? 'rotate' : 'resize', it, orig: U.clone(it), snap: this.snapshot(), p0: p };
          if (hv !== 'rot') [this.drag.hx, this.drag.hy] = hv.split(',').map(Number);
          return;
        }
        const g = e.target.closest('.item');
        if (g) {
          const id = g.dataset.id;
          const wasSel = this.sel === id;
          this.select(id);
          const it2 = this.item(id);
          this.drag = { kind: 'move', it: it2, orig: U.clone(it2), snap: this.snapshot(), p0: p, wasSel, sx: e.clientX, sy: e.clientY, moved: false };
          return;
        }
        // tapping empty floor deselects, but only once the finger lifts without panning or pinching
        this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: this.view.x, vy: this.view.y, deselect: true };
        this.svg.classList.add('panning');
      } else if (t === 'measure' || t === 'scale' || t === 'straighten') {
        this.measure = { kind: t, x1: p[0], y1: p[1], x2: p[0], y2: p[1] };
        this.drag = { kind: t };
        this.renderOverlay();
      } else if (t === 'erase') {
        const o = this.eraseOpts;
        if (o.mode === 'brush') {
          this.drag = { kind: 'brush', snap: this.snapshot(), stroke: { kind: 'stroke', pts: [p.map((n) => +n.toFixed(1))], size: o.size, color: o.color } };
          this.v.erasures.push(this.drag.stroke);
          this.L.erase.innerHTML = Scene.erasures(this.v);
        } else {
          this.dragRect = { kind: 'erase', x1: p[0], y1: p[1], x2: p[0], y2: p[1] };
          this.drag = { kind: 'erect' };
        }
      } else if (t === 'crop') {
        this.dragRect = { kind: 'crop', x1: p[0], y1: p[1], x2: p[0], y2: p[1] };
        this.drag = { kind: 'crop' };
      } else if (t === 'lights') {
        this.dragRect = { kind: 'room', x1: p[0], y1: p[1], x2: p[0], y2: p[1] };
        this.drag = { kind: 'room' };
      }
    }

    onMove(e) {
      if (e.pointerType === 'touch' && this.touches && this.touches.has(e.pointerId)) {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.drag && this.drag.kind === 'pinch') return this.touches.size >= 2 && this.movePinch();
      }
      const p = this.toWorld(e);
      this.updateStatus(p);
      if (this.tool === 'erase' && this.eraseOpts.mode === 'brush') {
        this.brushCursor = p;
        if (!this.drag) this.renderOverlay();
      }
      const d = this.drag;
      if (!d) return;
      if (d.kind === 'pan') {
        this.view.x = d.vx - (e.clientX - d.sx) / this.view.scale;
        this.view.y = d.vy - (e.clientY - d.sy) / this.view.scale;
        this.applyView();
        return;
      }
      if (d.kind === 'move') {
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < (e.pointerType === 'touch' ? 8 : 3)) return;
        d.moved = true;
        if (d.it.locked) return;
        let dx = p[0] - d.p0[0], dy = p[1] - d.p0[1];
        if (e.shiftKey) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
        let nx = d.orig.x + dx, ny = d.orig.y + dy;
        if (this.s.snap) {
          nx = U.round(nx, 5);
          ny = U.round(ny, 5);
        }
        d.it.x = nx;
        d.it.y = ny;
        this.renderItemFast(d.it);
        return;
      }
      if (d.kind === 'rotate') {
        const it = d.it;
        let a = (Math.atan2(p[0] - it.x, -(p[1] - it.y)) * 180) / Math.PI;
        if (!e.shiftKey) a = U.round(a, 15);
        it.rot = ((a % 360) + 360) % 360;
        this.renderItemFast(it);
        return;
      }
      if (d.kind === 'resize') {
        const it = d.it, o = d.orig;
        const [lx, ly] = U.toLocal(o, p[0], p[1]);
        const ax = (-d.hx * o.w) / 2, ay = (-d.hy * o.d) / 2;
        let w = d.hx ? Math.max(1, Math.abs(lx - ax)) : o.w;
        let dd = d.hy ? Math.max(1, Math.abs(ly - ay)) : o.d;
        // corners keep the proportions; hold Shift to stretch freely
        if (d.hx && d.hy && !e.shiftKey) {
          const k = Math.max(w / o.w, dd / o.d);
          w = o.w * k;
          dd = o.d * k;
        }
        w = Math.round(w);
        dd = Math.round(dd);
        const cx = d.hx ? ax + (d.hx * w) / 2 : 0, cy = d.hy ? ay + (d.hy * dd) / 2 : 0;
        const [wx, wy] = U.toWorld(o, cx, cy);
        Object.assign(it, { w, d: dd, x: wx, y: wy });
        this.renderItemFast(it);
        return;
      }
      if (d.kind === 'measure' || d.kind === 'scale' || d.kind === 'straighten') {
        let [x, y] = p;
        if (e.shiftKey && d.kind !== 'straighten') {
          // lock to horizontal / vertical
          Math.abs(x - this.measure.x1) > Math.abs(y - this.measure.y1) ? (y = this.measure.y1) : (x = this.measure.x1);
        }
        this.measure.x2 = x;
        this.measure.y2 = y;
        this.renderOverlay();
        return;
      }
      if (d.kind === 'brush') {
        const pts = d.stroke.pts;
        const last = pts[pts.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) > Math.max(1, d.stroke.size / 6)) {
          pts.push(p.map((n) => +n.toFixed(1)));
          this.L.erase.innerHTML = Scene.erasures(this.v);
        }
        this.renderOverlay();
        return;
      }
      if (d.kind === 'erect' || d.kind === 'room' || d.kind === 'crop') {
        this.dragRect.x2 = p[0];
        this.dragRect.y2 = p[1];
        this.renderOverlay();
      }
    }

    onUp(e) {
      if (e.pointerType === 'touch' && this.touches) {
        this.touches.delete(e.pointerId);
        if (this.drag && this.drag.kind === 'pinch') {
          // the pinch ends when the first finger lifts; ignore the second one
          if (this.touches.size < 2) {
            this.drag = { kind: 'pinchend' };
            this.saveViewSoon();
          }
          return;
        }
        if (this.drag && this.drag.kind === 'pinchend') {
          if (!this.touches.size) this.drag = null;
          return;
        }
      }
      const d = this.drag;
      this.drag = null;
      this.svg.classList.remove('panning');
      try {
        this.svg.releasePointerCapture(e.pointerId);
      } catch (_) {}
      if (!d) return;
      if (d.kind === 'pan') {
        if (d.deselect && this.sel && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) this.select(null);
        return this.saveViewSoon();
      }
      if (d.kind === 'move' && !d.moved) {
        // Clicking an already-selected item again picks the item underneath it,
        // so a rug under a table can still be selected.
        if (d.wasSel) {
          const stack = document
            .elementsFromPoint(e.clientX, e.clientY)
            .map((el) => el.closest && el.closest('.l-items .item'))
            .filter(Boolean)
            .map((g) => g.dataset.id)
            .filter((id, i, a) => a.indexOf(id) === i);
          if (stack.length > 1) {
            const i = stack.indexOf(d.it.id);
            this.select(stack[(i + 1) % stack.length]);
          }
        }
        return;
      }
      if (['move', 'rotate', 'resize'].includes(d.kind)) {
        if (this.snapshot() !== d.snap) this.pushUndo(d.snap);
        this.renderAll();
        this.save();
        return;
      }
      if (d.kind === 'measure') return;
      if (d.kind === 'scale') return this.finishScale(this.measure);
      if (d.kind === 'straighten') return this.finishStraighten(this.measure);
      if (d.kind === 'brush') {
        this.pushUndo(d.snap);
        this.save();
        this.renderProps();
        return;
      }
      if (d.kind === 'erect') {
        const r = this.rectOf(this.dragRect);
        this.dragRect = null;
        if (r.w > 1 && r.h > 1) this.change(() => this.v.erasures.push({ kind: 'rect', ...r, color: this.eraseOpts.color }));
        else this.renderOverlay();
        return;
      }
      if (d.kind === 'room') return this.finishLightRoom(this.rectOf(this.dragRect));
      if (d.kind === 'crop') {
        const r = this.rectOf(this.dragRect);
        this.dragRect = null;
        return this.cropPlan(r);
      }
    }

    rectOf(d) {
      const r = { x: Math.min(d.x1, d.x2), y: Math.min(d.y1, d.y2), w: Math.abs(d.x2 - d.x1), h: Math.abs(d.y2 - d.y1) };
      Object.keys(r).forEach((k) => (r[k] = +r[k].toFixed(1)));
      return r;
    }

    // ------------------------------------------------------------------ keyboard
    bindKeys() {
      this._kd = (e) => {
        if (!this.root.isConnected || document.querySelector('.modal-back')) return;
        const tag = (e.target.tagName || '').toLowerCase();
        const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key.toLowerCase() === 'z' && !typing) {
          e.preventDefault();
          return e.shiftKey ? this.redo() : this.undo();
        }
        if (mod && e.key.toLowerCase() === 'y' && !typing) {
          e.preventDefault();
          return this.redo();
        }
        if (typing) return;
        if (e.key === ' ') {
          this.spaceDown = true;
          this.svg.classList.add('space');
          e.preventDefault();
          return;
        }
        const it = this.selItem;
        if (mod && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          return this.duplicateSel();
        }
        if (mod && e.key.toLowerCase() === 'c' && it) return (this.clipboard = U.clone(it));
        if (mod && e.key.toLowerCase() === 'v' && this.clipboard) {
          const c = Object.assign(U.clone(this.clipboard), { id: U.uid('i'), x: this.clipboard.x + 20, y: this.clipboard.y + 20, suggested: false });
          this.change(() => this.v.items.push(c));
          return this.select(c.id);
        }
        if (mod) return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && it) {
          e.preventDefault();
          return this.deleteSel();
        }
        if (e.key === 'Escape') {
          this.measure = null;
          this.dragRect = null;
          if (this.tool !== 'select') this.setTool('select');
          else this.select(null);
          return;
        }
        if (it && e.key.startsWith('Arrow')) {
          e.preventDefault();
          if (it.locked) return;
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          // merge consecutive nudges into one undo step
          if (!this._nudge) this._nudge = this.snapshot();
          it.x += dx;
          it.y += dy;
          this.renderItemFast(it);
          clearTimeout(this._nt);
          this._nt = setTimeout(() => {
            this.pushUndo(this._nudge);
            this._nudge = null;
            this.renderAll();
            this.save();
          }, 500);
          return;
        }
        if (it && e.key.toLowerCase() === 'r') return this.updateSel((i) => (i.rot = ((i.rot || 0) + (e.shiftKey ? -90 : 90) + 360) % 360));
        if (it && e.key === ']') return this.reorder(it.id, 'up');
        if (it && e.key === '[') return this.reorder(it.id, 'down');
        if (e.key === '0' || e.key === 'f') return this.fit();
        if (e.key === '+' || e.key === '=') return this.zoomBy(1.25);
        if (e.key === '-') return this.zoomBy(0.8);
        const tool = TOOLS.find((t) => t.key.toLowerCase() === e.key.toLowerCase());
        if (tool) this.setTool(tool.id);
      };
      this._ku = (e) => {
        if (e.key === ' ') {
          this.spaceDown = false;
          this.svg && this.svg.classList.remove('space');
        }
      };
      document.addEventListener('keydown', this._kd);
      document.addEventListener('keyup', this._ku);
    }

    // ------------------------------------------------------------------ misc
    async exportPng() {
      try {
        const canvas = await Scene.toCanvas(this.p, this.v, { maxPx: 3000 });
        canvas.toBlob((b) => U.download(`${U.safeName(this.p.name)}-${U.safeName(this.v.name)}.png`, b), 'image/png');
      } catch (e) {
        console.error(e);
        U.toast('Could not create the image: ' + e.message, 'error');
      }
    }

    async replacePlan() {
      const inp = U.h('<input type="file" accept="image/*,application/pdf,.pdf">');
      inp.onchange = async () => {
        const file = inp.files[0];
        if (!file) return;
        try {
          const plan = await FP.PlanImport.fromFile(file);
          if (!plan) return;
          // keep the current scale if the new plan has none of its own
          if (!plan.calibrated && this.p.plan.calibrated) {
            plan.pxPerCm = this.p.plan.pxPerCm * (plan.widthPx / this.p.plan.widthPx);
          }
          this.p.plan = plan;
          this.renderPlan();
          this.renderAll();
          this.fit();
          this.save();
          U.toast('Floor plan replaced. Check the scale.', 'ok');
        } catch (err) {
          U.toast(err.message, 'error');
        }
      };
      inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.click();
    setTimeout(() => inp.remove(), 60000);
    }
  }

  FP.Editor = Editor;
})(window.FP);
