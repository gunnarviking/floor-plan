// Small shared helpers. Everything is attached to window.FP so the app works
// when opened straight from disk (file://), where ES modules are blocked.
window.FP = window.FP || {};

(function (FP) {
  const U = {};

  U.uid = (prefix = 'id') =>
    prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  U.clone = (o) => JSON.parse(JSON.stringify(o));

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  U.round = (v, step = 1) => Math.round(v / step) * step;

  U.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  U.h = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  U.debounce = (fn, ms) => {
    let t;
    const d = (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
    d.flush = (...a) => {
      clearTimeout(t);
      fn(...a);
    };
    return d;
  };

  // ---- colour helpers ----
  U.hexToRgb = (hex) => {
    let h = String(hex || '#888888').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgbToHex = (r, g, b) =>
    '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  // amt -1..1 : negative darkens, positive lightens
  U.shade = (hex, amt) => {
    const [r, g, b] = U.hexToRgb(hex);
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    return U.rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
  };
  U.luma = (hex) => {
    const [r, g, b] = U.hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };
  U.contrastText = (hex) => (U.luma(hex) > 0.55 ? '#1d232b' : '#ffffff');

  // ---- geometry ----
  U.rotatePt = (x, y, deg) => {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r), s = Math.sin(r);
    return [x * c - y * s, x * s + y * c];
  };
  // local item coords -> world
  U.toWorld = (item, lx, ly) => {
    const [rx, ry] = U.rotatePt(lx, ly, item.rot || 0);
    return [item.x + rx, item.y + ry];
  };
  U.toLocal = (item, wx, wy) => U.rotatePt(wx - item.x, wy - item.y, -(item.rot || 0));
  U.itemCorners = (item) =>
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => U.toWorld(item, (sx * item.w) / 2, (sy * item.d) / 2));
  U.itemBBox = (item) => {
    const pts = U.itemCorners(item);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  };

  U.fmtLen = (cm) => {
    if (!isFinite(cm)) return '–';
    if (Math.abs(cm) >= 100) return (cm / 100).toFixed(2) + ' m';
    return Math.round(cm) + ' cm';
  };

  U.download = (filename, data, type = 'application/json') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  };

  U.readFile = (file, as = 'dataURL') =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      if (as === 'dataURL') r.readAsDataURL(file);
      else if (as === 'text') r.readAsText(file);
      else r.readAsArrayBuffer(file);
    });

  U.loadImage = (src) =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Could not load image'));
      img.src = src;
    });

  U.loadScript = (src) =>
    new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });

  U.safeName = (s) => String(s || 'floorplan').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'floorplan';

  // ---- toast ----
  U.toast = (msg, kind = 'info', ms = 2600) => {
    let host = document.getElementById('toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toasts';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = msg;
    host.appendChild(el);
    while (host.children.length > 3) host.firstChild.remove();
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 400);
  };

  // ---- modal dialogs ----
  // U.modal({title, body (html or element), buttons:[{label, value, primary, danger}], onOpen(el), wide})
  // resolves with the clicked button's value (or null when closed).
  U.modal = (opts) =>
    new Promise((resolve) => {
      const back = U.h(`<div class="modal-back"><div class="modal ${opts.wide ? 'wide' : ''}">
        <div class="modal-head"><h2>${U.esc(opts.title || '')}</h2><button class="icon-btn close" title="Close">✕</button></div>
        <div class="modal-body"></div>
        <div class="modal-foot"></div></div></div>`);
      const body = back.querySelector('.modal-body');
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else if (opts.body) body.appendChild(opts.body);
      const foot = back.querySelector('.modal-foot');
      let done = false;
      const close = (v) => {
        if (done) return;
        if (opts.validate && v !== null && v !== undefined && v !== false) {
          const err = opts.validate(v, back);
          if (err) {
            U.toast(err, 'error');
            return;
          }
        }
        done = true;
        back.remove();
        document.removeEventListener('keydown', onKey, true);
        resolve(v);
      };
      (opts.buttons || [{ label: 'OK', value: true, primary: true }]).forEach((b) => {
        const btn = U.h(`<button class="btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}">${U.esc(b.label)}</button>`);
        btn.onclick = () => close(typeof b.value === 'function' ? b.value(back) : b.value);
        foot.appendChild(btn);
      });
      back.querySelector('.close').onclick = () => close(null);
      back.addEventListener('mousedown', (e) => {
        if (e.target === back) back._downOnBack = true;
      });
      back.addEventListener('mouseup', (e) => {
        if (e.target === back && back._downOnBack) close(null);
        back._downOnBack = false;
      });
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close(null);
        } else if (e.key === 'Enter' && !(e.target && e.target.tagName === 'TEXTAREA')) {
          const primary = (opts.buttons || []).find((b) => b.primary);
          if (primary) {
            e.preventDefault();
            e.stopPropagation();
            close(typeof primary.value === 'function' ? primary.value(back) : primary.value);
          }
        }
      };
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(back);
      if (opts.onOpen) opts.onOpen(back, close);
      const first = back.querySelector('input, select, textarea');
      if (first) setTimeout(() => first.focus(), 30);
    });

  U.prompt = async (title, label, value = '', opts = {}) => {
    const v = await U.modal({
      title,
      body: `<label class="field"><span>${U.esc(label)}</span><input type="${opts.type || 'text'}" ${opts.step ? `step="${opts.step}"` : ''} class="inp" value="${U.esc(value)}"></label>${opts.hint ? `<p class="hint">${U.esc(opts.hint)}</p>` : ''}`,
      buttons: [
        { label: 'Cancel', value: null },
        { label: opts.ok || 'OK', primary: true, value: (el) => el.querySelector('input').value },
      ],
    });
    return v;
  };

  U.confirm = (title, text, okLabel = 'OK', danger = false) =>
    U.modal({
      title,
      body: `<p>${U.esc(text)}</p>`,
      buttons: [
        { label: 'Cancel', value: false },
        { label: okLabel, value: true, primary: !danger, danger },
      ],
    });

  FP.U = U;
})(window.FP);
