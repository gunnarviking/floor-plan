// App shell: project list, creating/importing projects, autosave.
(function (FP) {
  const { U, Store, PlanImport, Editor, icon } = FP;

  const App = {
    root: null,
    editor: null,
    current: null,
  };

  App.init = async () => {
    App.root = document.getElementById('app');
    Store.persist();
    window.addEventListener('beforeunload', () => App.flush());
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && App.flush());
    const last = await Store.kvGet('lastProject').catch(() => null);
    const hash = location.hash.replace('#', '');
    const id = hash || last;
    if (id) {
      const p = await Store.getProject(id).catch(() => null);
      if (p) return App.openProject(p);
    }
    App.showHome();
  };

  // ---------------------------------------------------------------- saving
  let saveTimer = null, pending = null;
  App.saveSoon = (p) => {
    pending = p;
    App.setSaveState('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => App.flush(), 300);
  };
  App.flush = async () => {
    clearTimeout(saveTimer);
    const p = pending;
    pending = null;
    if (!p) return;
    try {
      await Store.putProject(p);
      const linked = await App.writeLinked(p);
      App.setSaveState(linked ? 'file' : 'saved');
    } catch (e) {
      console.error(e);
      App.setSaveState('error', e.message);
    }
  };
  App.setSaveState = (st, msg) => {
    const el = document.querySelector('.save-state');
    if (!el) return;
    el.className = 'save-state ' + st;
    el.textContent = { saving: 'Saving…', saved: 'Saved in browser', file: 'Saved to file', error: 'Not saved!', relink: 'Click to reconnect file' }[st] || 'Saved';
    el.title = st === 'error' ? msg || '' : st === 'file' ? 'Saved in this browser and to your linked file' : 'Saved automatically in this browser. Use Save / export to keep a file copy.';
  };

  // Mirror to the linked file on disk, if the user set one up.
  App.writeLinked = async (p) => {
    if (!Store.canLinkFile()) return false;
    const h = await Store.getLinkedHandle(p.id);
    if (!h) return false;
    const perm = await Store.handlePermission(h, false);
    if (perm !== 'granted') {
      // needs a click to re-grant after the browser restarts
      const el = document.querySelector('.save-state');
      if (el) {
        App.setSaveState('relink');
        el.onclick = async () => {
          if ((await Store.handlePermission(h, true)) === 'granted') {
            el.onclick = null;
            App.saveSoon(p);
          }
        };
      }
      return false;
    }
    await Store.writeLinked(h, p);
    return true;
  };

  App.linkFile = async (p) => {
    if (!Store.canLinkFile()) {
      U.toast('Auto-saving to a file needs Chrome or Edge. Use “Download project file” instead.', 'error', 4500);
      return;
    }
    try {
      const h = await Store.linkFile(p);
      U.toast(`Auto-saving to ${h.name}`, 'ok');
      App.setSaveState('file');
    } catch (e) {
      if (e.name !== 'AbortError') U.toast('Could not link the file: ' + e.message, 'error');
    }
  };

  // ---------------------------------------------------------------- home
  App.showHome = async () => {
    await App.flush();
    if (App.editor) {
      App.editor.destroy();
      App.editor = null;
    }
    App.current = null;
    history.replaceState(null, '', location.pathname);
    Store.kvSet('lastProject', null).catch(() => {});
    const list = await Store.listProjects();
    App.root.innerHTML = `<div class="home">
      <header class="home-head">
        <div class="brand">${App.logo()}<div><h1>Floor Planner</h1><p class="muted">Try furniture layouts on your own floor plan, to scale.</p></div></div>
        <div class="row gap">
          <button class="btn" data-h="import">${icon('upload', 16)} Open project file</button>
          <button class="btn primary" data-h="new">${icon('plus', 16)} New project</button>
        </div>
      </header>
      ${list.length ? `<div class="cards">${list.map((p) => App.card(p)).join('')}</div>` : App.emptyState()}
      <footer class="home-foot muted small">Everything is stored in this browser on this computer. Use <b>Save / export</b> inside a project to keep a file copy (or auto-save to a file in Chrome/Edge).</footer>
    </div>`;
    App.root.onclick = async (e) => {
      const b = e.target.closest('[data-h]');
      if (!b) return;
      const a = b.dataset.h, id = b.dataset.id;
      if (a === 'new') return App.newProject();
      if (a === 'import') return App.importProject();
      const p = id && list.find((x) => x.id === id);
      if (!p) return;
      if (a === 'open') return App.openProject(p);
      if (a === 'export') return Store.exportProject(p);
      if (a === 'rename') {
        const n = await U.prompt('Rename project', 'Name', p.name);
        if (n && n.trim()) {
          p.name = n.trim();
          await Store.putProject(p);
          App.showHome();
        }
      }
      if (a === 'dup') {
        const c = U.clone(p);
        c.id = U.uid('p');
        c.name = p.name + ' (copy)';
        c.created = Date.now();
        await Store.putProject(c);
        App.showHome();
      }
      if (a === 'delete') {
        if (await U.confirm('Delete project', `Delete “${p.name}” and all its layouts from this browser? Download a project file first if you want to keep it.`, 'Delete', true)) {
          await Store.deleteProject(p.id);
          await Store.unlinkFile(p.id).catch(() => {});
          App.showHome();
        }
      }
    };
  };

  App.logo = () =>
    `<svg class="logo" viewBox="0 0 48 48" width="44" height="44"><rect x="3" y="3" width="42" height="42" rx="10" fill="#2f6fed"/><path d="M12 12h24v24H12z M12 24h10 M28 12v10 M28 30v6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="15" y="27" width="9" height="6" rx="1.5" fill="#ffd54f"/></svg>`;

  App.card = (p) => {
    const d = new Date(p.updated || p.created);
    return `<div class="card">
      <button class="card-thumb" data-h="open" data-id="${p.id}" title="Open"><img src="${p.plan.dataUrl}" alt=""></button>
      <div class="card-body">
        <div class="card-title"><b>${U.esc(p.name)}</b></div>
        <div class="muted small">${p.variants.length} layout${p.variants.length === 1 ? '' : 's'} · edited ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="card-actions">
          <button class="btn small primary" data-h="open" data-id="${p.id}">Open</button>
          <button class="icon-btn" data-h="rename" data-id="${p.id}" title="Rename">${icon('edit', 15)}</button>
          <button class="icon-btn" data-h="dup" data-id="${p.id}" title="Duplicate">${icon('copy', 15)}</button>
          <button class="icon-btn" data-h="export" data-id="${p.id}" title="Download project file">${icon('download', 15)}</button>
          <button class="icon-btn danger" data-h="delete" data-id="${p.id}" title="Delete">${icon('trash', 15)}</button>
        </div>
      </div>
    </div>`;
  };

  App.emptyState = () => `<div class="empty">
    <svg viewBox="0 0 120 90" width="160"><rect x="8" y="8" width="104" height="74" rx="6" fill="#fff" stroke="#c8d3e6" stroke-width="2"/><path d="M8 45h50M58 8v30M58 58v24M80 45h32" stroke="#9fb0cc" stroke-width="2.5"/><rect x="18" y="16" width="28" height="20" rx="3" fill="#9fb7c9"/><rect x="72" y="58" width="28" height="14" rx="2" fill="#c9a27a"/><circle cx="96" cy="22" r="6" fill="#ffd54f"/></svg>
    <h2>Start with your floor plan</h2>
    <p class="muted">Upload a PNG, JPG or PDF of your floor plan. You can then set the scale, erase parts of the drawing, and try out furniture layouts.</p>
    <button class="btn primary" data-h="new">${icon('plus', 16)} New project</button>
  </div>`;

  App.newProject = async () => {
    let plan = null;
    const body = U.h(`<div class="form">
      <label class="field"><span>Project name</span><input class="inp" name="name" value="My apartment"></label>
      <div class="drop" tabindex="0">
        <input type="file" accept="image/*,application/pdf,.pdf" hidden>
        <div class="drop-inner">${icon('upload', 28)}<p><b>Choose a floor plan</b> or drop it here</p><p class="muted small">PNG, JPG or PDF</p></div>
      </div>
      <div class="plan-info muted small"></div>
    </div>`);
    const fileInp = U.$('input[type=file]', body);
    const drop = U.$('.drop', body);
    const info = U.$('.plan-info', body);
    const load = async (file) => {
      if (!file) return;
      drop.classList.add('loading');
      U.$('.drop-inner', drop).innerHTML = `<div class="spinner"></div><p>Reading ${U.esc(file.name)}…</p>`;
      try {
        plan = await PlanImport.fromFile(file);
        if (!plan) throw new Error('No page selected');
        U.$('.drop-inner', drop).innerHTML = `<img src="${plan.dataUrl}" class="preview"><p class="small">${U.esc(file.name)} · <a href="#" class="chg">change</a></p>`;
        info.innerHTML = plan.calibrated
          ? `Found drawing scale 1:${plan.pdf.drawingScale} in the PDF, so the scale is set automatically. You can fine-tune it later with <b>Set scale</b>.`
          : `Next you’ll set the scale by drawing along a wall you know the length of.`;
        const nm = U.$('[name=name]', body);
        if (nm.value === 'My apartment') nm.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      } catch (e) {
        plan = null;
        U.$('.drop-inner', drop).innerHTML = `${icon('upload', 28)}<p><b>Choose a floor plan</b> or drop it here</p><p class="error small">${U.esc(e.message)}</p>`;
      }
      drop.classList.remove('loading');
    };
    drop.onclick = (e) => {
      e.preventDefault();
      fileInp.click();
    };
    fileInp.onchange = () => load(fileInp.files[0]);
    drop.ondragover = (e) => {
      e.preventDefault();
      drop.classList.add('over');
    };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      load(e.dataTransfer.files[0]);
    };
    const res = await U.modal({
      title: 'New project',
      body,
      buttons: [{ label: 'Cancel', value: null }, { label: 'Create project', primary: true, value: (el) => U.$('[name=name]', el).value }],
      validate: () => (plan ? null : 'Choose a floor plan image or PDF first'),
    });
    if (res === null || !plan) return;
    const p = Store.newProject(res.trim() || 'My floor plan', plan);
    await Store.putProject(p);
    App.openProject(p);
  };

  App.importProject = () => {
    const inp = U.h('<input type="file" accept=".json,application/json">');
    inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      try {
        const p = Store.parse(await U.readFile(file, 'text'));
        const existing = await Store.getProject(p.id);
        if (existing) {
          const choice = await U.modal({
            title: 'Project already exists',
            body: `<p>“${U.esc(existing.name)}” is already in this browser. Replace it with the file, or keep both?</p>`,
            buttons: [{ label: 'Cancel', value: null }, { label: 'Keep both', value: 'copy' }, { label: 'Replace', value: 'replace', primary: true }],
          });
          if (!choice) return;
          if (choice === 'copy') {
            p.id = U.uid('p');
            p.name += ' (imported)';
          }
        }
        await Store.putProject(p);
        U.toast('Project opened from file', 'ok');
        App.openProject(p);
      } catch (e) {
        U.toast(e.message, 'error', 4000);
      }
    };
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.click();
    setTimeout(() => inp.remove(), 60000);
  };

  App.openProject = (p) => {
    if (App.editor) App.editor.destroy();
    App.current = p;
    history.replaceState(null, '', '#' + p.id);
    Store.kvSet('lastProject', p.id).catch(() => {});
    App.root.onclick = null;
    App.editor = new Editor(App, p, App.root);
    App.writeLinked(p).then((ok) => ok && App.setSaveState('file')).catch(() => {});
  };

  FP.App = App;
  document.addEventListener('DOMContentLoaded', App.init);
})(window.FP);
