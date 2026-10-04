// Furniture catalogue and top-down SVG drawings.
// Every drawing is in centimetres, centred on (0,0); the item's "front" (where
// you sit or face) points down (+y), its back / head end points up (-y).
(function (FP) {
  const { U } = FP;
  const f = (n) => +(+n).toFixed(2);

  function rr(x, y, w, h, r, attrs) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return `<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(0, w))}" height="${f(Math.max(0, h))}" rx="${f(r)}" ${attrs}/>`;
  }
  function circ(cx, cy, r, attrs) {
    return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.max(0, r))}" ${attrs}/>`;
  }
  function ell(cx, cy, rx, ry, attrs) {
    return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(Math.max(0, rx))}" ry="${f(Math.max(0, ry))}" ${attrs}/>`;
  }
  function line(x1, y1, x2, y2, attrs) {
    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" ${attrs}/>`;
  }
  const sw = (w, d, k = 0.02) => f(U.clamp(Math.min(w, d) * k, 0.5, 2.5));

  const R = {};

  R.simrig = (w, d, c) => {
    const W = w / 2, D = d / 2, edge = U.shade(c, -0.45), s = sw(w, d);
    let o = rr(-W, -D, w, d, Math.min(w, d) * 0.08, `fill="${c}" stroke="${edge}" stroke-width="${s}"`);
    // aluminium profile rails
    const rail = Math.max(2, w * 0.06);
    o += rr(-W + w * 0.08, -D + d * 0.1, rail, d * 0.85, 1, `fill="${U.shade(c, 0.22)}"`);
    o += rr(W - w * 0.08 - rail, -D + d * 0.1, rail, d * 0.85, 1, `fill="${U.shade(c, 0.22)}"`);
    o += rr(-W + w * 0.08, -D + d * 0.47, w * 0.84, rail * 0.8, 1, `fill="${U.shade(c, 0.12)}"`);
    // curved ultrawide monitor
    const my = -D + d * 0.065;
    o += `<path d="M ${f(-W * 0.98)} ${f(my + d * 0.035)} Q 0 ${f(my - d * 0.05)} ${f(W * 0.98)} ${f(my + d * 0.035)}" fill="none" stroke="#14171b" stroke-width="${f(Math.max(2.5, d * 0.03))}" stroke-linecap="round"/>`;
    o += `<path d="M ${f(-W * 0.9)} ${f(my + d * 0.05)} Q 0 ${f(my - d * 0.03)} ${f(W * 0.9)} ${f(my + d * 0.05)}" fill="none" stroke="#4fc3f7" stroke-width="${f(Math.max(0.6, d * 0.006))}" stroke-linecap="round" opacity="0.9"/>`;
    // pedals
    const py = -D + d * 0.17, pw = w * 0.11, ph = d * 0.075;
    [-0.22, 0, 0.22].forEach((k, i) =>
      (o += rr(k * w - pw / 2, py, pw, ph, pw * 0.25, `fill="${i === 2 ? '#c9ced6' : '#9aa3ad'}" stroke="#596069" stroke-width="${f(s * 0.5)}"`))
    );
    // wheel
    const wy = -D + d * 0.4, wr = Math.min(w * 0.23, d * 0.11, 17);
    o += rr(-wr * 0.5, wy - wr * 0.2, wr, wr * 1.2, 2, `fill="#2a2e34"`);
    o += circ(0, wy, wr, `fill="none" stroke="#1b1e22" stroke-width="${f(wr * 0.24)}"`);
    o += circ(0, wy, wr * 0.32, `fill="#1b1e22"`);
    o += line(-wr, wy, wr, wy, `stroke="#1b1e22" stroke-width="${f(wr * 0.16)}"`);
    o += line(0, wy, 0, wy + wr, `stroke="#1b1e22" stroke-width="${f(wr * 0.16)}"`);
    o += rr(-wr * 0.08, wy - wr * 1.12, wr * 0.16, wr * 0.24, 0.5, `fill="#e53935"`);
    // bucket seat
    const sy = D - d * 0.42, sh = d * 0.38, swd = w * 0.74;
    o += rr(-swd / 2, sy, swd, sh, swd * 0.3, `fill="#b8322a" stroke="#6e1c17" stroke-width="${s}"`);
    o += rr(-swd * 0.3, sy + sh * 0.12, swd * 0.6, sh * 0.62, swd * 0.2, `fill="#d2463c"`);
    o += rr(-swd * 0.22, sy + sh * 0.78, swd * 0.44, sh * 0.13, 2, `fill="#6e1c17"`);
    o += line(-swd * 0.15, sy + sh * 0.2, -swd * 0.15, sy + sh * 0.68, `stroke="#a52a22" stroke-width="${f(s * 0.6)}"`);
    o += line(swd * 0.15, sy + sh * 0.2, swd * 0.15, sy + sh * 0.68, `stroke="#a52a22" stroke-width="${f(s * 0.6)}"`);
    return o;
  };

  R.desk = (w, d, c) => {
    const W = w / 2, D = d / 2, edge = U.shade(c, -0.4), s = sw(w, d);
    let o = rr(-W, -D, w, d, Math.min(w, d) * 0.03, `fill="${c}" stroke="${edge}" stroke-width="${s}"`);
    for (let i = 1; i < 6; i++) {
      const y = -D + (d * i) / 6 + Math.sin(i * 7) * d * 0.02;
      o += `<path d="M ${f(-W + 2)} ${f(y)} C ${f(-W / 3)} ${f(y - d * 0.02)} ${f(W / 3)} ${f(y + d * 0.025)} ${f(W - 2)} ${f(y)}" fill="none" stroke="${U.shade(c, -0.12)}" stroke-width="${f(s * 0.35)}" opacity="0.6"/>`;
    }
    const mw = Math.min(w * 0.42, 70), my = -D + d * 0.16;
    o += rr(-mw * 0.12, my - d * 0.03, mw * 0.24, d * 0.09, 1.5, `fill="#3a3f46"`);
    o += rr(-mw / 2, my, mw, Math.max(2, d * 0.045), 1, `fill="#1f2328"`);
    o += rr(-mw / 2 + 1, my + Math.max(2, d * 0.045) - 0.8, mw - 2, 0.8, 0.4, `fill="#4fc3f7" opacity="0.8"`);
    const kw = Math.min(w * 0.28, 44), kh = Math.min(d * 0.19, 15), ky = D - d * 0.38;
    o += rr(-kw / 2, ky, kw, kh, 1.2, `fill="#3b4048" stroke="#22262b" stroke-width="${f(s * 0.4)}"`);
    for (let r = 1; r < 4; r++) o += line(-kw / 2 + 1.5, ky + (kh * r) / 4, kw / 2 - 1.5, ky + (kh * r) / 4, `stroke="#5a616b" stroke-width="0.4"`);
    o += ell(kw / 2 + Math.min(w * 0.07, 10), ky + kh * 0.5, Math.min(3.2, w * 0.03), Math.min(5, d * 0.06), `fill="#3b4048" stroke="#22262b" stroke-width="0.4"`);
    if (w > 100) {
      o += circ(-W + w * 0.1, -D + d * 0.3, Math.min(4.5, d * 0.06), `fill="#ffffff" stroke="#b0b6bd" stroke-width="0.6"`);
      o += circ(-W + w * 0.1, -D + d * 0.3, Math.min(3.2, d * 0.042), `fill="#6d4c41"`);
    }
    return o;
  };

  R.chair = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), rad = Math.min(W, D);
    let o = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * (Math.PI / 180);
      const x = Math.cos(a) * W * 0.92, y = Math.sin(a) * D * 0.92;
      o += line(0, 0, x, y, `stroke="#5b6168" stroke-width="${f(rad * 0.09)}" stroke-linecap="round"`);
      o += circ(x, y, rad * 0.075, `fill="#2b2f35"`);
    }
    o += rr(-w * 0.36, -d * 0.36, w * 0.72, d * 0.62, Math.min(w, d) * 0.16, `fill="${c}" stroke="${U.shade(c, -0.45)}" stroke-width="${s}"`);
    o += rr(-w * 0.27, -d * 0.28, w * 0.54, d * 0.44, Math.min(w, d) * 0.12, `fill="${U.shade(c, 0.1)}"`);
    o += rr(-W * 0.92, -d * 0.18, w * 0.09, d * 0.36, 2, `fill="${U.shade(c, -0.3)}"`);
    o += rr(W * 0.92 - w * 0.09, -d * 0.18, w * 0.09, d * 0.36, 2, `fill="${U.shade(c, -0.3)}"`);
    o += `<path d="M ${f(-w * 0.4)} ${f(D * 0.55)} Q 0 ${f(D * 1.02)} ${f(w * 0.4)} ${f(D * 0.55)} L ${f(w * 0.36)} ${f(D * 0.38)} Q 0 ${f(D * 0.78)} ${f(-w * 0.36)} ${f(D * 0.38)} Z" fill="${U.shade(c, -0.18)}" stroke="${U.shade(c, -0.5)}" stroke-width="${s}" stroke-linejoin="round"/>`;
    return o;
  };

  R.table = (w, d, c, item) => {
    const W = w / 2, D = d / 2, edge = U.shade(c, -0.4), s = sw(w, d);
    const round = item && item.shape === 'round';
    let o = round
      ? ell(0, 0, W, D, `fill="${c}" stroke="${edge}" stroke-width="${s}"`) + ell(0, 0, W - 3, D - 3, `fill="none" stroke="${U.shade(c, 0.18)}" stroke-width="${f(s * 0.6)}"`)
      : rr(-W, -D, w, d, Math.min(w, d) * 0.06, `fill="${c}" stroke="${edge}" stroke-width="${s}"`) +
        rr(-W + 3, -D + 3, w - 6, d - 6, Math.min(w, d) * 0.05, `fill="none" stroke="${U.shade(c, 0.18)}" stroke-width="${f(s * 0.6)}"`);
    for (let i = 1; i < 4; i++) {
      const y = -D + (d * i) / 4;
      o += line(-W * (round ? 0.75 : 0.95), y, W * (round ? 0.75 : 0.95), y, `stroke="${U.shade(c, -0.1)}" stroke-width="${f(s * 0.3)}" opacity="0.5"`);
    }
    if (!round) o += rr(-W * 0.72, -d * 0.14, w * 0.72, d * 0.28, 1, `fill="#f3efe7" opacity="0.85"`);
    o += circ(0, 0, Math.min(w, d) * 0.07, `fill="#ffffff" stroke="#c8c2b8" stroke-width="0.6"`);
    o += circ(-Math.min(w, d) * 0.025, -Math.min(w, d) * 0.015, Math.min(w, d) * 0.03, `fill="#7cb342"`);
    o += circ(Math.min(w, d) * 0.025, Math.min(w, d) * 0.02, Math.min(w, d) * 0.025, `fill="#e57373"`);
    return o;
  };

  R.kchair = (w, d, c) => {
    const W = w / 2, D = d / 2, edge = U.shade(c, -0.45), s = sw(w, d);
    let o = rr(-W * 0.92, -D, w * 0.92, d * 0.84, Math.min(w, d) * 0.14, `fill="${c}" stroke="${edge}" stroke-width="${s}"`);
    o += rr(-W * 0.7, -D + d * 0.1, w * 0.7, d * 0.6, Math.min(w, d) * 0.12, `fill="${U.shade(c, 0.22)}"`);
    o += rr(-W, D - d * 0.2, w, d * 0.2, Math.min(w, d) * 0.08, `fill="${U.shade(c, -0.25)}" stroke="${edge}" stroke-width="${s}"`);
    for (let i = 1; i < 4; i++) o += line(-W + (w * i) / 4, D - d * 0.17, -W + (w * i) / 4, D - d * 0.03, `stroke="${U.shade(c, -0.5)}" stroke-width="${f(s * 0.5)}"`);
    return o;
  };

  R.bed = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), frame = U.shade(c, -0.55);
    let o = rr(-W, -D, w, d, 3, `fill="${frame}" stroke="${U.shade(frame, -0.3)}" stroke-width="${s}"`);
    o += rr(-W, -D, w, d * 0.06, 2, `fill="${U.shade(frame, -0.2)}"`);
    o += rr(-W + 2.5, -D + d * 0.06, w - 5, d * 0.94 - 2.5, 3, `fill="#fbfaf7"`);
    const n = w >= 120 ? 2 : 1, gap = 4, pw = (w - 10 - gap * (n - 1)) / n, ph = Math.min(d * 0.14, 32);
    for (let i = 0; i < n; i++) {
      const x = -W + 5 + i * (pw + gap);
      o += rr(x, -D + d * 0.085, pw, ph, ph * 0.35, `fill="#ffffff" stroke="#d9d5cd" stroke-width="${f(s * 0.6)}"`);
      o += line(x + pw * 0.15, -D + d * 0.085 + ph * 0.5, x + pw * 0.85, -D + d * 0.085 + ph * 0.5, `stroke="#ece8e0" stroke-width="0.6"`);
    }
    const dy = -D + d * 0.3;
    o += rr(-W + 1.5, dy, w - 3, D - dy - 1.5, 3, `fill="${c}" stroke="${U.shade(c, -0.25)}" stroke-width="${f(s * 0.6)}"`);
    o += rr(-W + 1.5, dy, w - 3, d * 0.07, 3, `fill="${U.shade(c, 0.35)}"`);
    for (let i = 1; i < 4; i++) {
      const y = dy + d * 0.07 + ((D - dy - d * 0.07) * i) / 4;
      o += `<path d="M ${f(-W + 4)} ${f(y)} Q 0 ${f(y + d * 0.015)} ${f(W - 4)} ${f(y)}" fill="none" stroke="${U.shade(c, -0.12)}" stroke-width="${f(s * 0.4)}" opacity="0.7"/>`;
    }
    return o;
  };

  R.nightstand = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), edge = U.shade(c, -0.45), m = Math.min(w, d);
    let o = rr(-W, -D, w, d, m * 0.06, `fill="${c}" stroke="${edge}" stroke-width="${s}"`);
    o += rr(-W + m * 0.08, -D + m * 0.08, w - m * 0.16, d - m * 0.16, m * 0.04, `fill="none" stroke="${U.shade(c, 0.18)}" stroke-width="${f(s * 0.6)}"`);
    o += rr(-w * 0.12, D - d * 0.1, w * 0.24, d * 0.05, 1, `fill="${U.shade(c, -0.5)}"`);
    o += circ(0, -d * 0.05, m * 0.26, `fill="#fff6d5" stroke="#e5c56a" stroke-width="${f(s * 0.7)}"`);
    o += circ(0, -d * 0.05, m * 0.1, `fill="#ffe082" stroke="#c9a640" stroke-width="${f(s * 0.4)}"`);
    return o;
  };

  R.light = (w, d, c) => {
    const W = w / 2, D = d / 2;
    let o = ell(0, 0, W, D, `fill="${c}" opacity="0.25"`);
    for (let i = 0; i < 8; i++) {
      const a = (i * 45 * Math.PI) / 180;
      o += line(Math.cos(a) * W * 0.62, Math.sin(a) * D * 0.62, Math.cos(a) * W * 0.95, Math.sin(a) * D * 0.95, `stroke="${U.shade(c, -0.25)}" stroke-width="${f(Math.min(w, d) * 0.05)}" stroke-linecap="round"`);
    }
    o += ell(0, 0, W * 0.5, D * 0.5, `fill="${c}" stroke="${U.shade(c, -0.4)}" stroke-width="${f(Math.min(w, d) * 0.04)}"`);
    o += ell(0, 0, W * 0.24, D * 0.24, `fill="#fffdf2"`);
    return o;
  };

  R.dresser = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), edge = U.shade(c, -0.45);
    let o = rr(-W, -D, w, d, Math.min(w, d) * 0.04, `fill="${c}" stroke="${edge}" stroke-width="${s}"`);
    const cols = Math.max(1, Math.round(w / 45));
    for (let i = 1; i < cols; i++) o += line(-W + (w * i) / cols, -D + 2, -W + (w * i) / cols, D - 2, `stroke="${U.shade(c, -0.22)}" stroke-width="${f(s * 0.6)}"`);
    o += rr(-W + 2, -D + 2, w - 4, d * 0.12, 1, `fill="${U.shade(c, 0.15)}" opacity="0.6"`);
    o += rr(-W, D - d * 0.1, w, d * 0.1, 1, `fill="${U.shade(c, -0.3)}"`);
    for (let i = 0; i < cols; i++) o += circ(-W + (w * (i + 0.5)) / cols, D - d * 0.05, Math.min(2.2, d * 0.04), `fill="#d4b483" stroke="#7a5c2e" stroke-width="0.4"`);
    return o;
  };

  R.plant = (w, d, c) => {
    // drawn on a unit circle, then stretched to w x d
    let o = `<g transform="scale(${f(w / 2)} ${f(d / 2)})">`;
    o += `<circle r="0.62" fill="${c}" stroke="${U.shade(c, -0.4)}" stroke-width="0.04"/>`;
    o += `<circle r="0.5" fill="#5d4636"/>`;
    const leaves = [
      [0, 0.95, '#3f7d32'], [52, 0.86, '#5a9b45'], [103, 0.97, '#3f7d32'], [155, 0.84, '#6aac52'],
      [206, 0.96, '#478c38'], [257, 0.88, '#5a9b45'], [308, 0.95, '#3f7d32'],
      [26, 0.6, '#7cc263'], [130, 0.62, '#7cc263'], [232, 0.58, '#7cc263'], [334, 0.6, '#8fd075'],
    ];
    leaves.forEach(([a, len, col]) => {
      o += `<g transform="rotate(${a})"><path d="M 0 0 C 0.16 ${-len * 0.3} 0.14 ${-len * 0.75} 0 ${-len} C -0.14 ${-len * 0.75} -0.16 ${-len * 0.3} 0 0 Z" fill="${col}"/><path d="M 0 -0.05 L 0 ${-len * 0.92}" stroke="#2e5e24" stroke-width="0.02" fill="none"/></g>`;
    });
    o += `<circle r="0.08" fill="#2e5e24"/></g>`;
    return o;
  };

  R.rug = (w, d, c, item) => {
    const W = w / 2, D = d / 2, light = U.shade(c, 0.45), dark = U.shade(c, -0.3), m = Math.min(w, d);
    if (item && item.shape === 'round') {
      let o = ell(0, 0, W, D, `fill="${c}"`);
      o += ell(0, 0, W - m * 0.05, D - m * 0.05, `fill="none" stroke="${light}" stroke-width="${f(m * 0.025)}"`);
      o += ell(0, 0, W - m * 0.11, D - m * 0.11, `fill="none" stroke="${dark}" stroke-width="${f(m * 0.012)}" stroke-dasharray="${f(m * 0.03)} ${f(m * 0.02)}"`);
      o += ell(0, 0, W * 0.3, D * 0.3, `fill="${light}" opacity="0.7"`);
      o += ell(0, 0, W * 0.15, D * 0.15, `fill="${dark}" opacity="0.6"`);
      return o;
    }
    let o = '';
    const fr = Math.min(6, w * 0.03);
    for (let y = -D + 2; y <= D - 2; y += Math.max(2, d / 40)) {
      o += line(-W - fr, y, -W, y, `stroke="${light}" stroke-width="0.6"`);
      o += line(W, y, W + fr, y, `stroke="${light}" stroke-width="0.6"`);
    }
    o += rr(-W, -D, w, d, 1.5, `fill="${c}"`);
    o += rr(-W + m * 0.05, -D + m * 0.05, w - m * 0.1, d - m * 0.1, 1, `fill="none" stroke="${light}" stroke-width="${f(m * 0.025)}"`);
    o += rr(-W + m * 0.1, -D + m * 0.1, w - m * 0.2, d - m * 0.2, 1, `fill="none" stroke="${dark}" stroke-width="${f(m * 0.01)}" stroke-dasharray="${f(m * 0.03)} ${f(m * 0.02)}"`);
    const dw = W * 0.45, dd = D * 0.45;
    o += `<path d="M 0 ${f(-dd)} L ${f(dw)} 0 L 0 ${f(dd)} L ${f(-dw)} 0 Z" fill="${light}" opacity="0.75"/>`;
    o += `<path d="M 0 ${f(-dd * 0.5)} L ${f(dw * 0.5)} 0 L 0 ${f(dd * 0.5)} L ${f(-dw * 0.5)} 0 Z" fill="${dark}" opacity="0.6"/>`;
    return o;
  };

  R.sofa = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), edge = U.shade(c, -0.45);
    const arm = Math.min(w * 0.12, 22), back = Math.min(d * 0.25, 22);
    let o = rr(-W, -D, w, d, 6, `fill="${U.shade(c, -0.15)}" stroke="${edge}" stroke-width="${s}"`);
    o += rr(-W, -D, w, back, 5, `fill="${U.shade(c, -0.25)}"`);
    o += rr(-W, -D, arm, d, 5, `fill="${U.shade(c, -0.2)}"`);
    o += rr(W - arm, -D, arm, d, 5, `fill="${U.shade(c, -0.2)}"`);
    const n = Math.max(1, Math.round((w - 2 * arm) / 70)), cw = (w - 2 * arm - 4) / n;
    for (let i = 0; i < n; i++) o += rr(-W + arm + 2 + i * cw + 1, -D + back + 1, cw - 2, d - back - 4, 4, `fill="${c}" stroke="${U.shade(c, -0.2)}" stroke-width="${f(s * 0.6)}"`);
    return o;
  };

  R.custom = (w, d, c, item) => {
    const W = w / 2, D = d / 2, s = sw(w, d), edge = U.shade(c, -0.4), m = Math.min(w, d);
    const shape = (item && item.shape) || 'rect';
    if (shape === 'round')
      return ell(0, 0, W, D, `fill="${c}" stroke="${edge}" stroke-width="${s}"`) + ell(0, 0, W - m * 0.07, D - m * 0.07, `fill="none" stroke="${U.shade(c, 0.2)}" stroke-width="${f(s * 0.6)}"`);
    const r = shape === 'rounded' ? m * 0.18 : m * 0.02;
    return rr(-W, -D, w, d, r, `fill="${c}" stroke="${edge}" stroke-width="${s}"`) + rr(-W + m * 0.07, -D + m * 0.07, w - m * 0.14, d - m * 0.14, r * 0.7, `fill="none" stroke="${U.shade(c, 0.2)}" stroke-width="${f(s * 0.6)}"`);
  };

  // ---- more household pieces ----
  const base = (w, d, c, rk = 0.04, k = -0.4) => rr(-w / 2, -d / 2, w, d, Math.min(w, d) * rk, `fill="${c}" stroke="${U.shade(c, k)}" stroke-width="${sw(w, d)}"`);
  const inset = (w, d, c, ik = 0.08, rk = 0.03) => {
    const m = Math.min(w, d);
    return rr(-w / 2 + m * ik, -d / 2 + m * ik, w - m * ik * 2, d - m * ik * 2, m * rk, `fill="none" stroke="${U.shade(c, 0.2)}" stroke-width="${f(sw(w, d) * 0.6)}"`);
  };
  const faucet = (x, y, m) => circ(x, y, m * 0.045, `fill="#c7cdd4" stroke="#7d868f" stroke-width="0.5"`) + rr(x - m * 0.015, y, m * 0.03, m * 0.11, m * 0.015, `fill="#aab2ba"`);

  R.cornersofa = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), edge = U.shade(c, -0.45);
    const arm = Math.min(w * 0.08, 20), back = Math.min(d * 0.16, 22), sd = Math.min(d * 0.5, 100), cw = Math.min(w * 0.38, 100);
    const body = `fill="${U.shade(c, -0.15)}" stroke="${edge}" stroke-width="${s}"`;
    let o = `<path d="M ${f(-W)} ${f(-D)} H ${f(W)} V ${f(D)} H ${f(W - cw)} V ${f(-D + sd)} H ${f(-W)} Z" ${body} stroke-linejoin="round"/>`;
    o += rr(-W, -D, w, back, 4, `fill="${U.shade(c, -0.25)}"`);
    o += rr(-W, -D, arm, sd, 4, `fill="${U.shade(c, -0.2)}"`);
    o += rr(W - arm, -D, arm, d, 4, `fill="${U.shade(c, -0.2)}"`);
    const lw = w - arm - cw, n = Math.max(1, Math.round(lw / 70)), cwid = (lw - 2) / n;
    for (let i = 0; i < n; i++) o += rr(-W + arm + 1 + i * cwid + 1, -D + back + 1, cwid - 2, sd - back - 3, 4, `fill="${c}" stroke="${U.shade(c, -0.2)}" stroke-width="${f(s * 0.6)}"`);
    o += rr(W - cw + 1, -D + back + 1, cw - arm - 2, d - back - 3, 5, `fill="${c}" stroke="${U.shade(c, -0.2)}" stroke-width="${f(s * 0.6)}"`);
    return o;
  };

  R.coffeetable = (w, d, c, item) => {
    const W = w / 2, D = d / 2, m = Math.min(w, d), s = sw(w, d);
    const round = item && item.shape === 'round';
    let o = round ? ell(0, 0, W, D, `fill="${c}" stroke="${U.shade(c, -0.4)}" stroke-width="${s}"`) + ell(0, 0, W - m * 0.07, D - m * 0.07, `fill="none" stroke="${U.shade(c, 0.2)}" stroke-width="${f(s * 0.6)}"`) : base(w, d, c, 0.08) + inset(w, d, c, 0.07, 0.05);
    o += rr(-W * 0.45, -D * 0.35, m * 0.42, m * 0.3, 1, `fill="#5c7a99" stroke="#3e5670" stroke-width="0.5" transform="rotate(-8 ${f(-W * 0.25)} ${f(-D * 0.2)})"`);
    o += rr(-W * 0.42, -D * 0.3, m * 0.36, m * 0.25, 1, `fill="#e8dfcf" transform="rotate(-8 ${f(-W * 0.25)} ${f(-D * 0.2)})"`);
    o += circ(W * 0.35, D * 0.15, m * 0.08, `fill="#fff" stroke="#bfb8ad" stroke-width="0.6"`) + circ(W * 0.35, D * 0.15, m * 0.05, `fill="#6d4c41"`);
    return o;
  };

  R.sidetable = (w, d, c) => {
    const m = Math.min(w, d), s = sw(w, d);
    let o = ell(0, 0, w / 2, d / 2, `fill="${c}" stroke="${U.shade(c, -0.4)}" stroke-width="${s}"`);
    o += ell(0, 0, w / 2 - m * 0.08, d / 2 - m * 0.08, `fill="none" stroke="${U.shade(c, 0.2)}" stroke-width="${f(s * 0.6)}"`);
    o += circ(0, 0, m * 0.24, `fill="#f4ead0" stroke="#cdb98a" stroke-width="${f(s * 0.6)}"`) + circ(0, 0, m * 0.06, `fill="#9c8650"`);
    return o;
  };

  R.pouf = (w, d, c) => {
    const m = Math.min(w, d), s = sw(w, d);
    let o = ell(0, 0, w / 2, d / 2, `fill="${c}" stroke="${U.shade(c, -0.4)}" stroke-width="${s}"`);
    for (let i = 0; i < 8; i++) {
      const a = (i * 45 * Math.PI) / 180;
      o += line(0, 0, Math.cos(a) * w * 0.44, Math.sin(a) * d * 0.44, `stroke="${U.shade(c, -0.18)}" stroke-width="${f(s * 0.5)}"`);
    }
    o += circ(0, 0, m * 0.06, `fill="${U.shade(c, -0.35)}"`);
    return o;
  };

  R.tvbench = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d);
    let o = base(w, d, c, 0.05);
    const cols = Math.max(2, Math.round(w / 60));
    for (let i = 1; i < cols; i++) o += line(-W + (w * i) / cols, -D + 2, -W + (w * i) / cols, D - 2, `stroke="${U.shade(c, -0.2)}" stroke-width="${f(s * 0.6)}"`);
    o += rr(-W, D - d * 0.12, w, d * 0.12, 1, `fill="${U.shade(c, -0.25)}"`);
    const tw = Math.min(w * 0.75, 145), ty = -D + d * 0.22;
    o += rr(-tw * 0.12, ty, tw * 0.24, d * 0.28, 1.5, `fill="#3a3f46"`);
    o += rr(-tw / 2, ty - 1, tw, Math.max(2.5, d * 0.09), 1, `fill="#15181c"`);
    o += rr(-tw / 2 + 1, ty - 1 + Math.max(2.5, d * 0.09) - 0.8, tw - 2, 0.8, 0.4, `fill="#4fc3f7" opacity="0.7"`);
    return o;
  };

  R.bookshelf = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), t = Math.max(1.5, Math.min(w, d) * 0.08);
    let o = base(w, d, c, 0.03);
    o += rr(-W + t, -D + t, w - 2 * t, d - 2 * t, 0.5, `fill="${U.shade(c, -0.3)}"`);
    const cols = ['#c0504d', '#4f81bd', '#9bbb59', '#e8c14a', '#8064a2', '#4bacc6', '#f79646', '#3d4450'];
    let x = -W + t + 0.5, i = 0;
    const comp = Math.max(1, Math.round(w / 40));
    while (x < W - t - 1) {
      const bw = 2 + ((i * 7) % 5) * 0.7;
      const bd = (d - 2 * t) * (0.65 + ((i * 3) % 4) * 0.08);
      if (x + bw > W - t - 0.5) break;
      o += rr(x, D - t - bd, bw, bd, 0.3, `fill="${cols[i % cols.length]}" stroke="#00000033" stroke-width="0.2"`);
      x += bw + 0.3;
      i++;
      if (i % 9 === 0) x += 4;
    }
    for (let k = 1; k < comp; k++) o += rr(-W + (w * k) / comp - t / 2, -D, t, d, 0.3, `fill="${c}"`);
    return o;
  };

  R.wardrobe = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d);
    let o = base(w, d, c, 0.03) + inset(w, d, c, 0.05, 0.02);
    const doors = Math.max(1, Math.round(w / 50));
    for (let i = 1; i < doors; i++) o += line(-W + (w * i) / doors, D - d * 0.08, -W + (w * i) / doors, D, `stroke="${U.shade(c, -0.4)}" stroke-width="${f(s * 0.6)}"`);
    o += rr(-W, D - d * 0.06, w, d * 0.06, 0.5, `fill="${U.shade(c, -0.18)}"`);
    o += line(-W + 4, 0, W - 4, 0, `stroke="#8a9199" stroke-width="${f(Math.max(0.8, d * 0.02))}"`);
    for (let x = -W + 8; x < W - 6; x += Math.max(4, w / 18)) o += `<path d="M ${f(x)} ${f(-d * 0.32)} L ${f(x + 1)} ${f(d * 0.32)}" stroke="${U.shade(c, -0.35)}" stroke-width="${f(s * 0.5)}" opacity="0.6"/>`;
    return o;
  };

  R.crib = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), t = Math.max(2, Math.min(w, d) * 0.06);
    let o = base(w, d, c, 0.06);
    o += rr(-W + t, -D + t, w - 2 * t, d - 2 * t, 2, `fill="#fbfaf7"`);
    o += rr(-W + t * 2, -D + t * 2, w - 4 * t, d * 0.13, 4, `fill="#fff" stroke="#e0dcd4" stroke-width="0.5"`);
    o += rr(-W + t, -D + d * 0.4, w - 2 * t, D + d * 0.1 - t, 3, `fill="#f6c8d0" stroke="#e0a7b2" stroke-width="0.5"`);
    for (let x = -W + t + 4; x < W - t - 2; x += 6) o += line(x, -D + 0.5, x, -D + t - 0.5, `stroke="${U.shade(c, -0.3)}" stroke-width="0.7"`) + line(x, D - t + 0.5, x, D - 0.5, `stroke="${U.shade(c, -0.3)}" stroke-width="0.7"`);
    return o;
  };

  R.bench = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d);
    let o = base(w, d, c, 0.1);
    const n = Math.max(2, Math.round(d / 9));
    for (let i = 1; i < n; i++) o += line(-W + 2, -D + (d * i) / n, W - 2, -D + (d * i) / n, `stroke="${U.shade(c, -0.25)}" stroke-width="${f(s * 0.7)}"`);
    return o;
  };

  R.barstool = (w, d, c) => {
    const m = Math.min(w, d), s = sw(w, d);
    let o = ell(0, 0, w / 2, d / 2, `fill="none" stroke="#7d868f" stroke-width="${f(m * 0.05)}"`);
    o += ell(0, 0, w * 0.36, d * 0.36, `fill="${c}" stroke="${U.shade(c, -0.4)}" stroke-width="${s}"`);
    o += ell(0, 0, w * 0.26, d * 0.26, `fill="${U.shade(c, 0.15)}"`);
    return o;
  };

  R.cornerdesk = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), dt = Math.min(d * 0.55, 75), lt = Math.min(w * 0.4, 65);
    let o = `<path d="M ${f(-W)} ${f(-D)} H ${f(W)} V ${f(-D + dt)} H ${f(-W + lt)} V ${f(D)} H ${f(-W)} Z" fill="${c}" stroke="${U.shade(c, -0.4)}" stroke-width="${s}" stroke-linejoin="round"/>`;
    const mw = Math.min(w * 0.3, 60), mx = -W + lt + (W - (-W + lt)) * 0.3, my = -D + dt * 0.18;
    o += rr(mx - mw * 0.12, my - 2, mw * 0.24, dt * 0.12, 1.5, `fill="#3a3f46"`);
    o += rr(mx - mw / 2, my, mw, Math.max(2, dt * 0.06), 1, `fill="#1f2328"`);
    const kw = Math.min(mw * 0.7, 44), kh = Math.min(dt * 0.2, 15);
    o += rr(mx - kw / 2, -D + dt * 0.55, kw, kh, 1.2, `fill="#3b4048" stroke="#22262b" stroke-width="0.4"`);
    o += rr(-W + lt * 0.2, -D + dt + (d - dt) * 0.3, lt * 0.5, lt * 0.35, 1, `fill="#f5f5f2" stroke="#c9c9c4" stroke-width="0.4" transform="rotate(6 ${f(-W + lt * 0.45)} ${f(-D + dt + (d - dt) * 0.45)})"`);
    return o;
  };

  R.counter = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d);
    let o = base(w, d, c, 0.02, -0.35);
    for (let i = 0; i < Math.round((w * d) / 400); i++) o += circ(-W + ((i * 37) % 100) / 100 * w, -D + ((i * 61) % 100) / 100 * d, 0.5, `fill="${U.shade(c, -0.2)}" opacity="0.5"`);
    o += rr(-W, D - d * 0.07, w, d * 0.07, 0.5, `fill="${U.shade(c, -0.22)}"`);
    const doors = Math.max(1, Math.round(w / 60));
    for (let i = 1; i < doors; i++) o += line(-W + (w * i) / doors, D - d * 0.07, -W + (w * i) / doors, D, `stroke="${U.shade(c, -0.45)}" stroke-width="${f(s * 0.6)}"`);
    return o;
  };

  R.sink = (w, d, c) => {
    const W = w / 2, D = d / 2, m = Math.min(w, d);
    let o = R.counter(w, d, c);
    const bw = Math.min(w * 0.7, 55), bd = d * 0.6;
    o += rr(-bw / 2, -D + d * 0.22, bw, bd, m * 0.08, `fill="#d9dee3" stroke="#8d969f" stroke-width="0.8"`);
    o += rr(-bw / 2 + 2, -D + d * 0.22 + 2, bw - 4, bd - 4, m * 0.06, `fill="#eef1f4"`);
    o += circ(0, -D + d * 0.22 + bd * 0.55, m * 0.03, `fill="#8d969f"`);
    o += faucet(0, -D + d * 0.1, m);
    return o;
  };

  R.stove = (w, d, c) => {
    const W = w / 2, D = d / 2, m = Math.min(w, d);
    let o = base(w, d, c, 0.03, -0.5);
    o += rr(-W + m * 0.05, -D + m * 0.05, w - m * 0.1, d - m * 0.18, m * 0.03, `fill="#202326"`);
    const r1 = m * 0.15, r2 = m * 0.11;
    [[-0.24, -0.2, r1], [0.24, -0.2, r2], [-0.24, 0.2, r2], [0.24, 0.2, r1]].forEach(([x, y, r]) => {
      o += circ(x * w, y * d - m * 0.04, r, `fill="none" stroke="#5d646c" stroke-width="${f(m * 0.02)}"`);
      o += circ(x * w, y * d - m * 0.04, r * 0.55, `fill="none" stroke="#c75b3a" stroke-width="${f(m * 0.012)}" opacity="0.8"`);
    });
    for (let i = 0; i < 4; i++) o += circ(-W + (w * (i + 0.5)) / 4, D - m * 0.065, m * 0.03, `fill="#cfd4d9"`);
    return o;
  };

  R.fridge = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), m = Math.min(w, d);
    let o = base(w, d, c, 0.05, -0.3);
    o += rr(-W + m * 0.06, -D + m * 0.06, w - m * 0.12, d * 0.75, m * 0.04, `fill="${U.shade(c, 0.4)}"`);
    o += rr(-W, D - d * 0.12, w, d * 0.12, m * 0.03, `fill="${U.shade(c, -0.12)}" stroke="${U.shade(c, -0.35)}" stroke-width="${f(s * 0.5)}"`);
    o += rr(W - w * 0.18, D - d * 0.1, w * 0.04, d * 0.08, 0.5, `fill="#8d969f"`);
    o += rr(-w * 0.3, -d * 0.1, w * 0.6, d * 0.08, 1, `fill="${U.shade(c, -0.08)}"`);
    return o;
  };

  R.dishwasher = (w, d, c) => {
    const W = w / 2, D = d / 2, m = Math.min(w, d);
    let o = base(w, d, c, 0.03, -0.35);
    for (let i = 1; i < 6; i++) o += line(-W + (w * i) / 6, -D + 4, -W + (w * i) / 6, D - d * 0.15, `stroke="${U.shade(c, -0.12)}" stroke-width="0.5"`);
    o += rr(-W, D - d * 0.1, w, d * 0.1, 0.5, `fill="${U.shade(c, -0.3)}"`);
    o += rr(-w * 0.3, D - d * 0.07, w * 0.6, d * 0.03, 0.5, `fill="#c7cdd4"`);
    o += circ(W - m * 0.1, D - d * 0.05, m * 0.02, `fill="#4fc3f7"`);
    return o;
  };

  R.island = (w, d, c) => {
    const W = w / 2, D = d / 2;
    let o = R.counter(w, d, c);
    o += line(-W + 2, D - d * 0.3, W - 2, D - d * 0.3, `stroke="${U.shade(c, -0.15)}" stroke-width="0.8" stroke-dasharray="3 2"`);
    o += rr(-W * 0.4, -D + d * 0.18, w * 0.2, d * 0.3, 2, `fill="${U.shade(c, -0.15)}" opacity="0.7"`);
    return o;
  };

  R.toilet = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), edge = U.shade(c, -0.3);
    let o = rr(-W, -D, w, d * 0.3, Math.min(w, d) * 0.08, `fill="${c}" stroke="${edge}" stroke-width="${s}"`);
    o += circ(0, -D + d * 0.15, Math.min(w, d) * 0.06, `fill="${U.shade(c, -0.15)}"`);
    o += `<path d="M ${f(-W * 0.85)} ${f(-D + d * 0.3)} C ${f(-W * 0.95)} ${f(D * 0.55)} ${f(-W * 0.5)} ${f(D)} 0 ${f(D)} C ${f(W * 0.5)} ${f(D)} ${f(W * 0.95)} ${f(D * 0.55)} ${f(W * 0.85)} ${f(-D + d * 0.3)} Z" fill="${c}" stroke="${edge}" stroke-width="${s}"/>`;
    o += ell(0, d * 0.12, W * 0.55, d * 0.25, `fill="${U.shade(c, -0.08)}" stroke="${U.shade(c, -0.2)}" stroke-width="${f(s * 0.6)}"`);
    return o;
  };

  R.basin = (w, d, c) => {
    const W = w / 2, D = d / 2, m = Math.min(w, d), s = sw(w, d);
    let o = base(w, d, c, 0.15, -0.25);
    o += ell(0, d * 0.08, W * 0.72, D * 0.62, `fill="${U.shade(c, -0.06)}" stroke="${U.shade(c, -0.25)}" stroke-width="${f(s * 0.6)}"`);
    o += circ(0, d * 0.1, m * 0.035, `fill="#8d969f"`);
    o += faucet(0, -D + d * 0.1, m);
    return o;
  };

  R.bathtub = (w, d, c) => {
    const W = w / 2, D = d / 2, m = Math.min(w, d), s = sw(w, d);
    let o = base(w, d, c, 0.12, -0.25);
    o += rr(-W + m * 0.1, -D + m * 0.1, w - m * 0.2, d - m * 0.2, m * 0.3, `fill="${U.shade(c, -0.05)}" stroke="${U.shade(c, -0.25)}" stroke-width="${f(s * 0.6)}"`);
    o += rr(-W + m * 0.16, -D + m * 0.16, w - m * 0.32, d - m * 0.32, m * 0.25, `fill="#dfeef7"`);
    const horiz = w >= d;
    o += horiz ? circ(-W + m * 0.3, 0, m * 0.04, `fill="#8d969f"`) + faucet(-W + m * 0.06, -m * 0.04, m) : circ(0, -D + m * 0.3, m * 0.04, `fill="#8d969f"`) + faucet(0, -D + m * 0.04, m);
    return o;
  };

  R.shower = (w, d, c) => {
    const W = w / 2, D = d / 2, m = Math.min(w, d), s = sw(w, d);
    let o = base(w, d, c, 0.03, -0.25);
    o += rr(-W + m * 0.06, -D + m * 0.06, w - m * 0.12, d - m * 0.12, m * 0.02, `fill="${U.shade(c, -0.04)}"`);
    [[-W, -D], [W, -D], [W, D], [-W, D]].forEach(([x, y]) => (o += line(x * 0.9, y * 0.9, 0, 0, `stroke="${U.shade(c, -0.18)}" stroke-width="0.6"`)));
    o += circ(0, 0, m * 0.05, `fill="#9aa3ad" stroke="#6d757e" stroke-width="0.5"`);
    o += line(-W, D - 0.8, W, D - 0.8, `stroke="#7fb8d6" stroke-width="${f(Math.max(1.2, s * 1.2))}" opacity="0.8"`);
    o += circ(-W + m * 0.15, -D + m * 0.15, m * 0.07, `fill="#c7cdd4" stroke="#7d868f" stroke-width="0.5"`);
    return o;
  };

  R.washer = (w, d, c) => {
    const W = w / 2, D = d / 2, m = Math.min(w, d), s = sw(w, d);
    let o = base(w, d, c, 0.06, -0.3);
    o += rr(-W, -D, w, d * 0.16, m * 0.05, `fill="${U.shade(c, -0.08)}"`);
    o += circ(W - m * 0.15, -D + d * 0.08, m * 0.04, `fill="#8d969f"`);
    o += rr(-W + m * 0.1, -D + d * 0.05, m * 0.25, d * 0.06, 0.5, `fill="#4a525b"`);
    o += circ(0, d * 0.08, m * 0.3, `fill="${U.shade(c, -0.1)}" stroke="#8d969f" stroke-width="${f(m * 0.03)}"`);
    o += circ(0, d * 0.08, m * 0.21, `fill="#b7c7d3"`);
    return o;
  };

  R.door = (w, d, c) => {
    const W = w / 2, D = d / 2, r = Math.min(w, d), s = sw(w, d), t = Math.max(2, r * 0.045);
    let o = `<path d="M ${f(-W)} ${f(D)} L ${f(-W + r)} ${f(D)} A ${f(r)} ${f(r)} 0 0 0 ${f(-W)} ${f(D - r)} Z" fill="${c}" opacity="0.12"/>`;
    o += `<path d="M ${f(-W + r)} ${f(D)} A ${f(r)} ${f(r)} 0 0 0 ${f(-W)} ${f(D - r)}" fill="none" stroke="${U.shade(c, -0.3)}" stroke-width="${f(s * 0.6)}" stroke-dasharray="${f(r * 0.04)} ${f(r * 0.03)}"/>`;
    o += rr(-W, D - r, t, r, 0.5, `fill="${c}" stroke="${U.shade(c, -0.4)}" stroke-width="${f(s * 0.6)}"`);
    o += line(-W, D, -W + r, D, `stroke="#5b6168" stroke-width="${f(s * 0.8)}"`);
    o += circ(-W + t / 2, D, t * 0.6, `fill="#5b6168"`);
    return o;
  };

  R.piano = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d);
    let o = base(w, d * 0.62, c, 0.04, -0.5).replace(/y="[^"]+"/, `y="${f(-D)}"`);
    o += rr(-W + 2, -D + 2, w - 4, d * 0.12, 1, `fill="${U.shade(c, 0.12)}"`);
    const ky = -D + d * 0.62, kh = d * 0.38;
    const kw = w - 6;
    o += rr(-W + 3, ky, kw, kh, 0.8, `fill="#fbfbf8" stroke="#3a3a3a" stroke-width="${f(s * 0.5)}"`);
    const n = 52, step = kw / n;
    for (let i = 1; i < n; i++) o += line(-W + 3 + i * step, ky, -W + 3 + i * step, ky + kh, `stroke="#c9c9c4" stroke-width="0.25"`);
    const black = [1, 0, 1, 1, 0, 1, 1];
    for (let i = 0; i < n - 1; i++) if (black[i % 7]) o += rr(-W + 3 + (i + 1) * step - step * 0.3, ky, step * 0.6, kh * 0.6, 0.2, `fill="#1b1b1b"`);
    return o;
  };

  R.clothesrack = (w, d, c) => {
    const W = w / 2, D = d / 2, s = sw(w, d), m = Math.min(w, d);
    let o = rr(-W, -D, m * 0.25, d, 1, `fill="#7d868f"`) + rr(W - m * 0.25, -D, m * 0.25, d, 1, `fill="#7d868f"`);
    o += line(-W, 0, W, 0, `stroke="#5b6168" stroke-width="${f(Math.max(1, m * 0.06))}"`);
    const cols = ['#5c7a99', '#c0504d', '#e8dfcf', '#3d4450', '#9bbb59', '#e8c14a'];
    let i = 0;
    for (let x = -W + m * 0.4; x < W - m * 0.4; x += Math.max(4, w / 14), i++) o += rr(x - 1.5, -D * 0.85, 3, d * 0.85, 1.2, `fill="${cols[i % cols.length]}" opacity="0.9"`);
    return o;
  };

  // ---- catalogue ----
  const TYPES = [
    // Living room
    { cat: 'Living room', type: 'sofa', name: 'Sofa', w: 220, d: 95, color: '#7f8fa6', render: R.sofa },
    { cat: 'Living room', type: 'cornersofa', name: 'Corner sofa', w: 270, d: 200, color: '#7f8fa6', render: R.cornersofa },
    { cat: 'Living room', type: 'armchair', name: 'Armchair', w: 85, d: 85, color: '#a3866a', render: R.sofa },
    { cat: 'Living room', type: 'coffeetable', name: 'Coffee table', w: 110, d: 60, color: '#b98b5e', render: R.coffeetable, shapes: ['rect', 'round'] },
    { cat: 'Living room', type: 'sidetable', name: 'Side table', w: 45, d: 45, color: '#c9a27a', render: R.sidetable },
    { cat: 'Living room', type: 'pouf', name: 'Pouf', w: 50, d: 50, color: '#b5838d', render: R.pouf },
    { cat: 'Living room', type: 'tvbench', name: 'TV bench + TV', w: 180, d: 42, color: '#e8e4dc', render: R.tvbench },
    { cat: 'Living room', type: 'bookshelf', name: 'Bookshelf', w: 80, d: 30, color: '#c9a27a', render: R.bookshelf },
    { cat: 'Living room', type: 'sideboard', name: 'Sideboard', w: 160, d: 45, color: '#9c7b5b', render: R.dresser },
    { cat: 'Living room', type: 'piano', name: 'Upright piano', w: 150, d: 60, color: '#2b2522', render: R.piano },
    { cat: 'Living room', type: 'rug', name: 'Rug', w: 200, d: 140, color: '#b5838d', render: R.rug, shapes: ['rect', 'round'] },
    { cat: 'Living room', type: 'plant', name: 'Plant pot', w: 45, d: 45, color: '#c96f4a', render: R.plant },
    // Dining
    { cat: 'Dining', type: 'table', name: 'Kitchen table', w: 180, d: 90, color: '#b98b5e', render: R.table, shapes: ['rect', 'round'] },
    { cat: 'Dining', type: 'kchair', name: 'Kitchen chair', w: 45, d: 50, color: '#8b6b4a', render: R.kchair },
    { cat: 'Dining', type: 'bench', name: 'Bench', w: 140, d: 35, color: '#b98b5e', render: R.bench },
    { cat: 'Dining', type: 'barstool', name: 'Bar stool', w: 40, d: 40, color: '#3d4450', render: R.barstool },
    // Bedroom
    { cat: 'Bedroom', type: 'bed', name: 'Bed', w: 160, d: 200, color: '#9fb7c9', render: R.bed },
    { cat: 'Bedroom', type: 'singlebed', name: 'Single bed', w: 90, d: 200, color: '#9fb7c9', render: R.bed },
    { cat: 'Bedroom', type: 'crib', name: 'Baby cot', w: 66, d: 126, color: '#e8e4dc', render: R.crib },
    { cat: 'Bedroom', type: 'nightstand', name: 'Nightstand', w: 45, d: 40, color: '#a07d5c', render: R.nightstand },
    { cat: 'Bedroom', type: 'dresser', name: 'Dresser', w: 120, d: 50, color: '#9c7b5b', render: R.dresser },
    { cat: 'Bedroom', type: 'wardrobe', name: 'Wardrobe', w: 100, d: 60, color: '#e8e4dc', render: R.wardrobe },
    { cat: 'Bedroom', type: 'clothesrack', name: 'Clothes rail', w: 110, d: 45, color: '#7d868f', render: R.clothesrack },
    // Office
    { cat: 'Office', type: 'desk', name: 'Work desk', w: 160, d: 80, color: '#c9a27a', render: R.desk },
    { cat: 'Office', type: 'cornerdesk', name: 'Corner desk', w: 160, d: 120, color: '#c9a27a', render: R.cornerdesk },
    { cat: 'Office', type: 'chair', name: 'Work chair', w: 65, d: 65, color: '#3d4450', render: R.chair },
    { cat: 'Office', type: 'simrig', name: 'Sim rig', w: 70, d: 150, color: '#2f343c', render: R.simrig },
    // Kitchen
    { cat: 'Kitchen', type: 'counter', name: 'Kitchen counter', w: 120, d: 60, color: '#e8e4dc', render: R.counter },
    { cat: 'Kitchen', type: 'sink', name: 'Kitchen sink', w: 80, d: 60, color: '#e8e4dc', render: R.sink },
    { cat: 'Kitchen', type: 'stove', name: 'Stove', w: 60, d: 60, color: '#3a3f46', render: R.stove },
    { cat: 'Kitchen', type: 'fridge', name: 'Fridge', w: 60, d: 65, color: '#dfe3e8', render: R.fridge },
    { cat: 'Kitchen', type: 'dishwasher', name: 'Dishwasher', w: 60, d: 60, color: '#dfe3e8', render: R.dishwasher },
    { cat: 'Kitchen', type: 'island', name: 'Kitchen island', w: 180, d: 90, color: '#e8e4dc', render: R.island },
    // Bathroom & laundry
    { cat: 'Bathroom & laundry', type: 'toilet', name: 'Toilet', w: 38, d: 65, color: '#ffffff', render: R.toilet },
    { cat: 'Bathroom & laundry', type: 'basin', name: 'Wash basin', w: 60, d: 45, color: '#ffffff', render: R.basin },
    { cat: 'Bathroom & laundry', type: 'bathtub', name: 'Bathtub', w: 170, d: 75, color: '#ffffff', render: R.bathtub },
    { cat: 'Bathroom & laundry', type: 'shower', name: 'Shower', w: 90, d: 90, color: '#eef1f4', render: R.shower },
    { cat: 'Bathroom & laundry', type: 'washer', name: 'Washing machine', w: 60, d: 60, color: '#ffffff', render: R.washer },
    { cat: 'Bathroom & laundry', type: 'dryer', name: 'Tumble dryer', w: 60, d: 60, color: '#dfe3e8', render: R.washer },
    // Other
    { cat: 'Other', type: 'door', name: 'Door swing', w: 90, d: 90, color: '#c9a27a', render: R.door },
    { cat: 'Other', type: 'light', name: 'Light source', w: 30, d: 30, color: '#ffd54f', render: R.light, isLight: true },
  ];  const byType = {};
  TYPES.forEach((t) => (byType[t.type] = t));

  const Furniture = {
    TYPES,
    R,
    SWATCHES: ['#ffffff', '#e8e4dc', '#c9a27a', '#9c7b5b', '#6d4c41', '#2f343c', '#3d4450', '#7f8fa6', '#9fb7c9', '#5b8c6b', '#b5838d', '#c96f4a', '#e5b94e', '#ffd54f', '#d64545', '#111418'],
  };

  // Resolve a type definition (built-in or project custom type).
  Furniture.def = (project, type) => {
    if (byType[type]) return byType[type];
    const ct = project && (project.customTypes || []).find((t) => t.type === type);
    if (ct) return Object.assign({ render: R.custom, shapes: ['rect', 'rounded', 'round'], custom: true }, ct);
    return { type, name: 'Item', w: 60, d: 60, color: '#9aa5b1', render: R.custom, shapes: ['rect', 'rounded', 'round'], custom: true };
  };

  Furniture.allTypes = (project) => {
    const list = TYPES.slice();
    (project && project.customTypes ? project.customTypes : []).forEach((ct) => list.push(Furniture.def(project, ct.type)));
    return list;
  };

  // Defaults for a new item of a type, honouring per-project remembered sizes.
  Furniture.defaults = (project, type) => {
    const def = Furniture.def(project, type);
    const td = (project && project.typeDefaults && project.typeDefaults[type]) || {};
    return {
      w: td.w || def.w,
      d: td.d || def.d,
      color: td.color || def.color,
      shape: td.shape || def.shape || (def.shapes ? def.shapes[0] : undefined),
    };
  };

  Furniture.renderItem = (project, item) => {
    const def = Furniture.def(project, item.type);
    try {
      return def.render(Math.max(1, item.w), Math.max(1, item.d), item.color || def.color, item);
    } catch (e) {
      console.error(e);
      return R.custom(item.w, item.d, item.color || '#999', item);
    }
  };

  Furniture.thumb = (project, type, size = 64) => {
    const def = Furniture.def(project, type);
    const dd = Furniture.defaults(project, type);
    const pad = 0.12 * Math.max(dd.w, dd.d);
    const vb = Math.max(dd.w, dd.d) + pad * 2;
    return `<svg viewBox="${f(-vb / 2)} ${f(-vb / 2)} ${f(vb)} ${f(vb)}" width="${size}" height="${size}">${def.render(dd.w, dd.d, dd.color, { shape: dd.shape })}</svg>`;
  };

  Furniture.isLight = (item) => item && item.type === 'light';

  FP.Furniture = Furniture;
})(window.FP);
