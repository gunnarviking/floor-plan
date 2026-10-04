// Turning an uploaded image or PDF into the floor plan bitmap.
(function (FP) {
  const { U } = FP;
  const PlanImport = {};
  let pdfReady = null;

  // pdf.js is bundled in /vendor. Loading the worker as a normal script makes it
  // run on the page itself, which also works when the app is opened from disk.
  function loadPdfJs() {
    if (pdfReady) return pdfReady;
    pdfReady = (async () => {
      if (!window.pdfjsLib) await U.loadScript('vendor/pdf.min.js');
      if (!window.pdfjsWorker) await U.loadScript('vendor/pdf.worker.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      return window.pdfjsLib;
    })();
    pdfReady.catch(() => (pdfReady = null));
    return pdfReady;
  }

  const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  async function pickPage(pdf) {
    if (pdf.numPages === 1) return 1;
    const wrap = U.h(`<div><p>This PDF has ${pdf.numPages} pages. Pick the floor plan page.</p><div class="page-grid"></div></div>`);
    const grid = wrap.querySelector('.page-grid');
    const n = Math.min(pdf.numPages, 24);
    let chosen = 1;
    for (let i = 1; i <= n; i++) {
      const cell = U.h(`<button class="page-cell ${i === 1 ? 'on' : ''}" data-p="${i}"><canvas></canvas><span>Page ${i}</span></button>`);
      grid.appendChild(cell);
      cell.onclick = () => {
        chosen = i;
        U.$$('.page-cell', grid).forEach((c) => c.classList.toggle('on', c === cell));
      };
      pdf.getPage(i).then((page) => {
        const vp0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: 150 / Math.max(vp0.width, vp0.height) });
        const cv = cell.querySelector('canvas');
        cv.width = vp.width;
        cv.height = vp.height;
        page.render({ canvasContext: cv.getContext('2d'), viewport: vp });
      });
    }
    const ok = await U.modal({ title: 'Choose a page', body: wrap, wide: true, buttons: [{ label: 'Cancel', value: null }, { label: 'Use this page', value: true, primary: true }] });
    return ok ? chosen : null;
  }

  // Look for a printed drawing scale like "1:100" or "M 1:50" on the page.
  async function findScale(page) {
    try {
      const tc = await page.getTextContent();
      // Title blocks are often letter-spaced ("S K A L A 1 :1 0 0"), so also
      // look at the text with all spaces removed.
      const text = tc.items.map((i) => i.str).join(' ');
      const re = /(?:^|[^\d.,])1\s*:\s*(20|25|50|75|100|125|150|200|250|500)(?!\d)/;
      const m = text.match(re) || text.replace(/\s+/g, '').match(re);
      return m ? +m[1] : null;
    } catch (e) {
      return null;
    }
  }

  // Crop away empty white page margins (PDF plans often sit on a big sheet).
  // Returns the original canvas when there is little to gain.
  function trimWhite(canvas) {
    const { width: w, height: h } = canvas;
    const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const ink = (i) => data[i + 3] > 20 && (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    const step = Math.max(1, Math.floor(Math.max(w, h) / 2500));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (ink((y * w + x) * 4)) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return canvas;
    const m = Math.round(Math.max(w, h) * 0.02);
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
    x1 = Math.min(w, x1 + m + step); y1 = Math.min(h, y1 + m + step);
    const cw = x1 - x0, ch = y1 - y0;
    if (cw * ch > w * h * 0.85) return canvas;
    const out = document.createElement('canvas');
    out._ox = x0;
    out._oy = y0;
    out.width = cw;
    out.height = ch;
    out.getContext('2d').drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
    return out;
  }

  // Returns {dataUrl, widthPx, heightPx, pxPerCm, calibrated, source, pdf?}
  PlanImport.fromFile = async (file) => {
    if (isPdf(file)) {
      const pdfjs = await loadPdfJs();
      const buf = await U.readFile(file, 'buffer');
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      const pageNo = await pickPage(pdf);
      if (!pageNo) return null;
      const page = await pdf.getPage(pageNo);
      const vp0 = page.getViewport({ scale: 1 });
      // Render sharp enough to zoom in, but keep the bitmap a sane size.
      const scale = U.clamp(4200 / Math.max(vp0.width, vp0.height), 1.5, 6);
      const vp = page.getViewport({ scale });
      let canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      canvas = trimWhite(canvas);
      const drawingScale = await findScale(page);
      const pxPerPt = scale;
      return {
        dataUrl: canvas.toDataURL('image/png'),
        widthPx: canvas.width,
        heightPx: canvas.height,
        pxPerCm: drawingScale ? PlanImport.pxPerCmFromRatio(pxPerPt, drawingScale) : canvas.width / 1200,
        calibrated: !!drawingScale,
        source: file.name,
        pdf: { page: pageNo, pxPerPt, drawingScale },
      };
    }
    if (!/^image\//.test(file.type)) throw new Error('Please choose an image (PNG, JPG, …) or a PDF.');
    let dataUrl = await U.readFile(file, 'dataURL');
    const img = await U.loadImage(dataUrl);
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w * h < 40e6) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      const t = trimWhite(c);
      if (t !== c) {
        dataUrl = t.toDataURL('image/png');
        w = t.width;
        h = t.height;
      }
    }
    return {
      dataUrl,
      widthPx: w,
      heightPx: h,
      pxPerCm: w / 1200,
      calibrated: false,
      source: file.name,
    };
  };

  // Rotate a plan bitmap by deg (clockwise) and trim the new white corners.
  // Returns {dataUrl, widthPx, heightPx, map(x,y) -> [x,y]} where map converts
  // old plan pixel coordinates to new ones.
  PlanImport.rotate = async (plan, deg) => {
    const img = await U.loadImage(plan.dataUrl);
    const w = plan.widthPx, h = plan.heightPx;
    const r = (deg * Math.PI) / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
    const nw = Math.round(w * c + h * s), nh = Math.round(w * s + h * c);
    const cv = document.createElement('canvas');
    cv.width = nw;
    cv.height = nh;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, nw, nh);
    ctx.translate(nw / 2, nh / 2);
    ctx.rotate(r);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    const t = trimWhite(cv);
    const ox = t._ox || 0, oy = t._oy || 0;
    return {
      dataUrl: t.toDataURL('image/png'),
      widthPx: t.width,
      heightPx: t.height,
      map: (x, y) => {
        const [rx, ry] = U.rotatePt(x - w / 2, y - h / 2, deg);
        return [rx + nw / 2 - ox, ry + nh / 2 - oy];
      },
    };
  };

  // Cut the plan bitmap to a rectangle given in plan pixels.
  PlanImport.crop = async (plan, x, y, w, h) => {
    const img = await U.loadImage(plan.dataUrl);
    x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
    w = Math.min(plan.widthPx - x, Math.round(w)); h = Math.min(plan.heightPx - y, Math.round(h));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
    return { dataUrl: cv.toDataURL('image/png'), widthPx: w, heightPx: h, map: (px, py) => [px - x, py - y] };
  };

  // 1 pt = 1/72 inch on paper. At 1:N, 1 cm in reality = 1/N cm on paper.
  PlanImport.pxPerCmFromRatio = (pxPerPt, ratio) => (pxPerPt * 72) / 2.54 / ratio;

  FP.PlanImport = PlanImport;
})(window.FP);
