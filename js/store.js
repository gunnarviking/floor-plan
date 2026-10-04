// Local persistence: IndexedDB in the browser (autosave), optional mirror to a
// file on disk (File System Access API, Chrome/Edge), plus export/import.
(function (FP) {
  const { U } = FP;
  const DB_NAME = 'floorplanner';
  const DB_VERSION = 1;
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return db().then(
      (d) =>
        new Promise((res, rej) => {
          const t = d.transaction(store, mode);
          const s = t.objectStore(store);
          const r = fn(s);
          t.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
          t.onerror = () => rej(t.error);
          t.onabort = () => rej(t.error);
        })
    );
  }

  const Store = {};
  Store.FORMAT = 'floorplanner-project';
  Store.VERSION = 1;

  Store.listProjects = () => tx('projects', 'readonly', (s) => s.getAll()).then((list) =>
    (list || []).sort((a, b) => (b.updated || 0) - (a.updated || 0))
  );
  Store.getProject = (id) => tx('projects', 'readonly', (s) => s.get(id));
  Store.putProject = (p) => {
    p.updated = Date.now();
    return tx('projects', 'readwrite', (s) => s.put(p));
  };
  Store.deleteProject = (id) => tx('projects', 'readwrite', (s) => s.delete(id));
  Store.kvGet = (k) => tx('kv', 'readonly', (s) => s.get(k));
  Store.kvSet = (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k));
  Store.kvDel = (k) => tx('kv', 'readwrite', (s) => s.delete(k));

  // Ask the browser not to evict our data under storage pressure.
  Store.persist = async () => {
    try {
      if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
    } catch (e) {}
    return false;
  };

  // ---- new project skeleton ----
  Store.newVariant = (name) => ({
    id: U.uid('v'),
    name: name || 'Layout A',
    items: [],
    erasures: [],
    rooms: [],
    notes: '',
    created: Date.now(),
  });

  Store.newProject = (name, plan) => {
    const v = Store.newVariant('Layout A');
    return {
      id: U.uid('p'),
      name: name || 'My floor plan',
      created: Date.now(),
      updated: Date.now(),
      plan, // {dataUrl, widthPx, heightPx, pxPerCm, calibrated, source, pdf?}
      customTypes: [],
      typeDefaults: {},
      variants: [v],
      activeVariantId: v.id,
      view: null,
      settings: { planOpacity: 1, showLabels: true, showLights: false, snap: false, showGrid: false },
    };
  };

  // ---- export / import ----
  Store.serialize = (p) =>
    JSON.stringify({ format: Store.FORMAT, version: Store.VERSION, exported: new Date().toISOString(), project: p });

  Store.parse = (text) => {
    const data = JSON.parse(text);
    const p = data && data.format === Store.FORMAT ? data.project : data;
    if (!p || !p.plan || !Array.isArray(p.variants)) throw new Error('This is not a Floor Planner project file.');
    p.customTypes = p.customTypes || [];
    p.typeDefaults = p.typeDefaults || {};
    p.settings = Object.assign({ planOpacity: 1, showLabels: true, showLights: false, snap: false, showGrid: false }, p.settings || {});
    p.variants.forEach((v) => {
      v.items = v.items || [];
      v.erasures = v.erasures || [];
      v.rooms = v.rooms || [];
      v.groups = v.groups || [];
    });
    if (!p.variants.find((v) => v.id === p.activeVariantId)) p.activeVariantId = p.variants[0].id;
    return p;
  };

  Store.exportProject = (p) => U.download(U.safeName(p.name) + '.floorplan.json', Store.serialize(p));

  // ---- linked file on disk (Chrome / Edge) ----
  Store.canLinkFile = () => typeof window.showSaveFilePicker === 'function';

  Store.linkFile = async (p) => {
    const handle = await window.showSaveFilePicker({
      suggestedName: U.safeName(p.name) + '.floorplan.json',
      types: [{ description: 'Floor Planner project', accept: { 'application/json': ['.json'] } }],
    });
    await Store.kvSet('file:' + p.id, handle);
    await Store.writeLinked(handle, p);
    return handle;
  };

  Store.getLinkedHandle = (pid) => Store.kvGet('file:' + pid).catch(() => null);
  Store.unlinkFile = (pid) => Store.kvDel('file:' + pid);

  Store.handlePermission = async (handle, request = false) => {
    if (!handle || !handle.queryPermission) return 'denied';
    let st = await handle.queryPermission({ mode: 'readwrite' });
    if (st !== 'granted' && request) st = await handle.requestPermission({ mode: 'readwrite' });
    return st;
  };

  Store.writeLinked = async (handle, p) => {
    const w = await handle.createWritable();
    await w.write(Store.serialize(p));
    await w.close();
  };

  FP.Store = Store;
})(window.FP);
