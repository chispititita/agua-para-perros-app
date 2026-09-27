/* ==========================================================
   Servicios Móviles JC — Imágenes de los móviles
   Cada modelo se dibuja en SVG a escala real (milímetros) a
   partir de sus medidas, su diseño de cámaras y sus colores
   oficiales. No necesita imágenes externas ni conexión.
   ========================================================== */
const PhoneArt = (() => {
  "use strict";

  let uid = 0;
  const n2 = v => Math.round(v * 100) / 100;
  const FONT = "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const DOCK = ["#34c759", "#0a84ff", "#ff9f0a", "#ff375f"];
  const HUE = { Apple: 222, Samsung: 212, Google: 150, Xiaomi: 22, OnePlus: 350, Nothing: 0, Motorola: 190, Honor: 268 };

  /* ---------- Color ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const toRgb = h => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  const toHex = a => "#" + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const A = toRgb(a), B = toRgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const light = (c, t) => mix(c, "#ffffff", t);
  const dark = (c, t) => mix(c, "#000000", t);
  const luma = c => { const [r, g, b] = toRgb(c); return (.299 * r + .587 * g + .114 * b) / 255; };
  function toHsl(c) {
    const [r, g, b] = toRgb(c).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const a = s * Math.min(l, 1 - l);
    const f = k => { const q = (k + h / 30) % 12; return l - a * Math.max(-1, Math.min(q - 3, 9 - q, 1)); };
    return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }

  /* ---------- Hora y fecha de la pantalla de bloqueo ---------- */
  const now = new Date();
  const TIME = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  let DATE = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  DATE = DATE.charAt(0).toUpperCase() + DATE.slice(1);

  /* ---------- Primitivas SVG ---------- */
  const C = (cx, cy, r, a = "") => `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(Math.max(r, 0))}" ${a}/>`;
  const R = (x, y, w, h, rx, a = "") => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(Math.max(w, 0))}" height="${n2(Math.max(h, 0))}" rx="${n2(Math.max(rx, 0))}" ${a}/>`;
  const T = (x, y, str, size, weight, op = 1) => `<text x="${n2(x)}" y="${n2(y)}" font-size="${n2(size)}" font-weight="${weight}" fill="#fff" fill-opacity="${op}" text-anchor="middle" font-family="${FONT}">${str}</text>`;

  function newCtx() { const k = `pa${++uid}-`; return { k, d: {}, url: n => `url(#${k}${n})` }; }
  function def(x, name, markup) {
    if (!x.d[name]) x.d[name] = markup.replace('id="ID"', `id="${x.k}${name}"`);
    return x.url(name);
  }

  /* ---------- Materiales ---------- */
  function paints(x, p, col) {
    const c = col.c, fin = col.fin || p.d.fin || "glass";
    let fc = p.d.frame === "ti" ? mix(c, "#a9abb0", .5) : c;
    if (luma(fc) < .18) fc = light(fc, .14);
    def(x, "frame", `<linearGradient id="ID" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${dark(fc, .5)}"/><stop offset=".07" stop-color="${light(fc, .5)}"/><stop offset=".2" stop-color="${fc}"/><stop offset=".8" stop-color="${dark(fc, .1)}"/><stop offset=".93" stop-color="${light(fc, .35)}"/><stop offset="1" stop-color="${dark(fc, .55)}"/></linearGradient>`);
    def(x, "body", `<linearGradient id="ID" x1="0" y1="0" x2=".85" y2="1"><stop offset="0" stop-color="${light(c, fin === "matte" ? .1 : .2)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${dark(c, .16)}"/></linearGradient>`);
    const a = fin === "glass" ? .42 : fin === "metal" ? .24 : fin === "leather" ? .06 : .14;
    def(x, "shine", `<linearGradient id="ID" x1="0" y1="0" x2="1" y2=".6"><stop offset="0" stop-color="#fff" stop-opacity="${a}"/><stop offset=".32" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/><stop offset=".74" stop-color="#fff" stop-opacity="${n2(a * .45)}"/><stop offset=".86" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
    const rc = mix(fc, "#9a9ca3", .5);
    def(x, "ring", `<linearGradient id="ID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light(rc, .55)}"/><stop offset=".5" stop-color="${rc}"/><stop offset="1" stop-color="${dark(rc, .5)}"/></linearGradient>`);
    def(x, "glass", `<radialGradient id="ID" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#3d4c96"/><stop offset=".35" stop-color="#1b2044"/><stop offset=".72" stop-color="#07080f"/><stop offset="1" stop-color="#000"/></radialGradient>`);
    def(x, "flash", `<radialGradient id="ID" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fffdf3"/><stop offset=".6" stop-color="#eee5c7"/><stop offset="1" stop-color="#b4a987"/></radialGradient>`);
    return { c, fin };
  }
  const leather = x => def(x, "lea", `<pattern id="ID" width="1.4" height="1.4" patternUnits="userSpaceOnUse"><circle cx=".35" cy=".35" r=".3" fill="#000" opacity=".14"/><circle cx="1.05" cy="1.05" r=".26" fill="#fff" opacity=".06"/></pattern>`);

  function islandFill(x, kind, c) {
    if (kind === "dark") return "#15161a";
    if (kind === "glass") return def(x, "iglass", `<linearGradient id="ID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34363d"/><stop offset=".5" stop-color="#141519"/><stop offset="1" stop-color="#08090b"/></linearGradient>`);
    if (kind === "metal") return x.url("frame");
    return def(x, "isame", `<linearGradient id="ID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light(c, .28)}"/><stop offset=".55" stop-color="${light(c, .04)}"/><stop offset="1" stop-color="${dark(c, .12)}"/></linearGradient>`);
  }
  const island = (X, Y, w, h, rx, fill) =>
    R(X + .35, Y + .8, w, h, rx, 'fill="#000" opacity=".22"') +
    R(X, Y, w, h, rx, `fill="${fill}"`) +
    R(X + .3, Y + .3, w - .6, h - .6, rx - .3, 'fill="none" stroke="#fff" stroke-opacity=".32" stroke-width=".35"');

  /* ---------- Piezas de cámara ---------- */
  function lens(x, cx, cy, r) {
    const hx = cx - r * .3, hy = cy - r * .32;
    return C(cx, cy, r, `fill="${x.url("ring")}"`) + C(cx, cy, r * .85, 'fill="#0b0c11"') +
      C(cx, cy, r * .7, `fill="${x.url("glass")}"`) + C(cx, cy, r * .3, 'fill="#020204"') +
      C(cx + r * .12, cy + r * .12, r * .15, 'fill="#5a67d8" opacity=".35"') +
      `<ellipse cx="${n2(hx)}" cy="${n2(hy)}" rx="${n2(r * .22)}" ry="${n2(r * .1)}" transform="rotate(-45 ${n2(hx)} ${n2(hy)})" fill="#fff" opacity=".55"/>`;
  }
  const flash = (x, cx, cy, r) => C(cx, cy, r * 1.25, 'fill="#000" opacity=".25"') + C(cx, cy, r, `fill="${x.url("flash")}"`);
  const sensor = (cx, cy, r) => C(cx, cy, r, 'fill="#0f1013"') + C(cx, cy, r * .5, 'fill="#2a2e3d"');
  const mic = (cx, cy) => C(cx, cy, .45, 'fill="#0a0a0c" opacity=".7"');

  /* ---------- Módulos de cámara de cada diseño ---------- */
  function camera(x, p, c, W, H, Rr) {
    const k = p.d.cam, L = (cx, cy, r) => lens(x, cx, cy, r), F = (cx, cy, r) => flash(x, cx, cy, r);
    let s = "";
    switch (k.t) {
      case "iphone-pro": { // meseta de lado a lado (iPhone 17 Pro / Pro Max)
        const m = 1.5, hp = H * .245;
        s += island(m, m, W - 2 * m, hp, Rr - m, islandFill(x, "same", c));
        const z = hp - 6.5, bx = 4.2, by = m + (hp - z) / 2, r = z * .205;
        s += island(bx, by, z, z, z * .27, islandFill(x, "same", c));
        s += L(bx + z * .28, by + z * .27, r) + L(bx + z * .28, by + z * .73, r) + L(bx + z * .74, by + z * .5, r);
        s += F(W - 10.5, m + hp * .36, 2.3) + sensor(W - 10.5, m + hp * .64, 2.1) + mic(W - 16, m + hp * .5);
        s += R(W * .09, hp + H * .08, W * .82, H * .55, 4, 'fill="#fff" opacity=".06"');
        break;
      }
      case "iphone-air": { // barra horizontal con una cámara
        const h = H * .14, X = 2.4, Y = 4.4;
        s += island(X, Y, W - 2 * X, h, h / 2, islandFill(x, "same", c));
        s += L(X + h * .56, Y + h / 2, h * .34) + F(X + h * 1.25, Y + h / 2, h * .1) + mic(X + h * 1.6, Y + h / 2);
        break;
      }
      case "iphone-single": {
        const r = W * .09, X = W * .17, Y = W * .17;
        s += C(X + .3, Y + .7, r * 1.08, 'fill="#000" opacity=".2"') + L(X, Y, r);
        s += F(X + r * 2.1, Y - r * .45, r * .3) + mic(X + r * 2.1, Y + r * .45);
        break;
      }
      case "pill-v": { // cápsula vertical (iPhone 17, S25 Edge, Galaxy A, Fold7, moto g)
        const n = k.n || 2, iw = W * (k.w || .25), X = W * .075, Y = X, r = iw * .39, pitch = r * 2.12;
        s += island(X, Y, iw, iw + (n - 1) * pitch, iw / 2, islandFill(x, k.island || "same", c));
        for (let i = 0; i < n; i++) s += L(X + iw / 2, Y + iw / 2 + i * pitch, r);
        s += F(X + iw + W * .085, Y + iw * .42, iw * .13) + mic(X + iw + W * .085, Y + iw);
        break;
      }
      case "floating": { // lentes sueltas en vertical (Galaxy S25, S25 FE, A16)
        const n = k.n || 3, r = W * (k.r || .075), X = W * .17, Y = W * .17, pitch = r * 2.45;
        for (let i = 0; i < n; i++) s += C(X + .3, Y + i * pitch + .7, r, 'fill="#000" opacity=".2"') + L(X, Y + i * pitch, r);
        s += F(X + r * 2.3, Y - r * .1, r * .3) + mic(X + r * 2.3, Y + r * .8);
        break;
      }
      case "galaxy-ultra": {
        const r = W * .076, X = W * .165, Y = W * .165, pitch = r * 2.45;
        for (let i = 0; i < 3; i++) s += C(X + .3, Y + i * pitch + .7, r, 'fill="#000" opacity=".2"') + L(X, Y + i * pitch, r);
        s += C(X + r * 2.5 + .3, Y + .7, r * .92, 'fill="#000" opacity=".2"') + L(X + r * 2.5, Y, r * .92);
        s += sensor(X + r * 2.5, Y + pitch * .85, r * .28) + F(X + r * 2.5, Y + pitch * 1.25, r * .32);
        break;
      }
      case "pixel-visor": { // barra de cámaras de Google
        const hv = H * .128, X = W * .07, Y = H * .075, wv = W - 2 * X;
        s += island(X, Y, wv, hv, hv / 2, x.url("frame"));
        const ph = hv * .7, px = X + hv * .16, py = Y + (hv - ph) / 2, pw = wv * .6;
        s += R(px, py, pw, ph, ph / 2, 'fill="#0d0e12"') + R(px + .2, py + .2, pw - .4, ph - .4, ph / 2 - .2, 'fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".3"');
        const n = k.n || 3, r = ph * .4, step = (pw - ph) / (n - 1);
        for (let i = 0; i < n; i++) s += L(px + ph / 2 + i * step, py + ph / 2, r);
        s += F(X + wv - hv * .5, Y + hv / 2, hv * .13) + sensor(X + wv - hv * .9, Y + hv / 2, hv * .08);
        break;
      }
      case "pixel-a": {
        const h = W * .15, X = W * .085, Y = W * .09, w = h * 2.25;
        s += island(X, Y, w, h, h / 2, islandFill(x, "same", c));
        s += L(X + h / 2, Y + h / 2, h * .36) + L(X + w - h / 2, Y + h / 2, h * .36) + F(X + w + h * .45, Y + h / 2, h * .12);
        break;
      }
      case "pixel-fold": {
        const z = W * .42, X = W * .065, Y = X, r = z * .19;
        s += island(X, Y, z, z * .92, z * .2, islandFill(x, "same", c));
        s += L(X + z * .28, Y + z * .27, r) + L(X + z * .72, Y + z * .27, r) + L(X + z * .28, Y + z * .66, r);
        s += F(X + z * .72, Y + z * .6, r * .38) + sensor(X + z * .72, Y + z * .76, r * .25);
        break;
      }
      case "grid": { // módulo cuadrado o circular con 2×2 posiciones
        const z = W * (k.size || .44), circle = k.shape === "circle";
        const X = k.pos === "tc" ? (W - z) / 2 : W * .075, Y = k.pos === "tc" ? H * .055 : W * .075;
        s += island(X, Y, z, z, circle ? z / 2 : z * .25, islandFill(x, k.island || "same", c));
        if (circle) s += C(X + z / 2, Y + z / 2, z / 2 - .9, `fill="none" stroke="${x.url("ring")}" stroke-width="1.3"`);
        const pos = circle ? [[.5, .29], [.29, .67], [.71, .67], [.5, .5]] : [[.29, .29], [.71, .29], [.29, .71], [.71, .71]];
        const r = z * (circle ? .175 : .19);
        [...(k.slots || "LLLF")].forEach((sl, i) => {
          const cx = X + z * pos[i][0], cy = Y + z * pos[i][1];
          if (sl === "L") s += L(cx, cy, r);
          else if (sl === "F") s += F(cx - r * .4, cy, r * .32) + sensor(cx + r * .42, cy, r * .2);
          else if (sl === "S") s += sensor(cx, cy, r * .3);
        });
        if (k.flashOut) s += F(X + z + W * .07, Y + z * .3, z * .06);
        break;
      }
      case "circle-center": { // gran módulo circular centrado (Xiaomi Ultra)
        const z = W * .7, cx = W / 2, cy = H * .045 + z / 2, r = z * .15, o = z * .19;
        s += C(cx + .35, cy + .9, z / 2, 'fill="#000" opacity=".25"') + C(cx, cy, z / 2, `fill="${x.url("frame")}"`);
        s += C(cx, cy, z / 2 - 1.7, `fill="${islandFill(x, "glass", c)}"`) + C(cx, cy, z / 2 - 2.1, 'fill="none" stroke="#fff" stroke-opacity=".2" stroke-width=".35"');
        s += L(cx - o, cy - o * .9, r) + L(cx + o, cy - o * .9, r) + L(cx - o, cy + o * .95, r) + L(cx + o, cy + o * .95, r);
        s += F(cx, cy - z * .38, z * .035) + sensor(cx, cy + z * .38, z * .025);
        break;
      }
      case "nothing": { // trasera transparente con luces Glyph
        const st = `fill="none" stroke="${luma(c) > .5 ? "#000" : "#fff"}" stroke-opacity=".17" stroke-width=".4"`;
        s += R(W * .1, H * .3, W * .8, H * .3, 3, st) + R(W * .28, H * .36, W * .44, H * .18, 9, st) + R(W * .16, H * .66, W * .68, H * .22, 2.5, st);
        [[.14, .33], [.86, .33], [.14, .57], [.86, .57], [.2, .69], [.8, .69]].forEach(([u, v]) => { s += C(W * u, H * v, .9, st) + C(W * u, H * v, .35, 'fill="#8a8a8a" opacity=".6"'); });
        const h = W * .21, w = W * .58, X = (W - w) / 2, Y = H * .075, rr = h / 2 + 2.6, ex = X + w - h / 2;
        const glyph = d => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>`;
        s += glyph(`M${n2(ex)} ${n2(Y - 2.6)} A${n2(rr)} ${n2(rr)} 0 0 1 ${n2(ex)} ${n2(Y + h + 2.6)}`);
        s += glyph(`M${n2(X + 3)} ${n2(Y + h + 4.6)} L${n2(X + w * .55)} ${n2(Y + h + 4.6)}`);
        s += glyph(`M${n2(X - 2.4)} ${n2(Y + h * .2)} L${n2(X - 2.4)} ${n2(Y + h * .8)}`);
        s += island(X, Y, w, h, h / 2, islandFill(x, "glass", c));
        const r = h * .34;
        s += L(X + h * .55, Y + h / 2, r) + L(X + w / 2, Y + h / 2, r * .85) + L(X + w - h * .55, Y + h / 2, r) + F(X + w * .34, Y + h / 2, h * .07);
        break;
      }
    }
    return s;
  }

  /* ---------- Vista trasera ---------- */
  function back(x, p, col) {
    const [H, W] = p.dim, Rr = W * p.d.r, f = .9;
    const { c, fin } = paints(x, p, col);
    if (p.d.cam.t === "flip") return flipCover(x, p, c, W, H, Rr);
    let s = R(0, 0, W, H, Rr, `fill="${x.url("frame")}"`) + R(f, f, W - 2 * f, H - 2 * f, Rr - f, `fill="${x.url("body")}"`);
    if (col.two) {
      const clip = def(x, "clip", `<clipPath id="ID">${R(f, f, W - 2 * f, H - 2 * f, Rr - f)}</clipPath>`);
      s += `<g clip-path="${clip}">${R(0, H * .47, W, H, 0, `fill="${col.two}"`)}${R(0, H * .47, W, H, 0, `fill="${leather(x)}"`)}</g>` +
        R(f, H * .47 - .35, W - 2 * f, .7, 0, `fill="${x.url("frame")}"`);
    }
    if (fin === "leather") s += R(f, f, W - 2 * f, H - 2 * f, Rr - f, `fill="${leather(x)}"`);
    s += R(f, f, W - 2 * f, H - 2 * f, Rr - f, `fill="${x.url("shine")}"`);
    return s + camera(x, p, c, W, H, Rr);
  }

  /* Z Flip cerrado: la cara exterior es la pantalla FlexWindow */
  function flipCover(x, p, c, W, H, Rr) {
    screenPaint(x, p, c);
    const b = 1.6, sx = b, sy = b + 2.6, sw = W - 2 * b, sh = H - 2 * b - 2.6, sr = Rr - b;
    let s = R(0, 0, W, H, Rr, `fill="${x.url("frame")}"`) + R(.7, .7, W - 1.4, H - 1.4, Rr - .7, 'fill="#060608"');
    s += R(sx, sy, sw, sh, sr, `fill="${x.url("wp")}"`) + R(sx, sy, sw, sh, sr, `fill="${x.url("wpa")}"`) + R(sx, sy, sw, sh, sr, `fill="${x.url("wpb")}"`);
    s += T(W * .6, sy + sh * .36, TIME, W * .19, 500) + T(W * .6, sy + sh * .36 + W * .08, DATE.split(",")[0], W * .055, 500, .85);
    const r = W * .078, cy = H - b - r * 1.55;
    [W * .16, W * .37].forEach(cx => { s += C(cx, cy, r * 1.3, 'fill="#060608"') + lens(x, cx, cy, r); });
    s += flash(x, W * .52, cy + r * .5, r * .26);
    s += R(W * .06, 0, W * .88, 2.2, 1.1, `fill="${x.url("frame")}"`);
    s += `<path d="M${n2(sx)} ${n2(sy)} L${n2(sx + sw * .6)} ${n2(sy)} L${n2(sx)} ${n2(sy + sh * .55)} Z" fill="#fff" opacity=".07"/>`;
    return s;
  }

  /* ---------- Pantalla ---------- */
  function screenPaint(x, p, c) {
    let [h, s] = toHsl(c);
    const mono = s < .22 && p.brand === "Nothing";
    if (s < .22) h = HUE[p.brand] ?? 225;
    const a = mono ? "#9a9a9a" : fromHsl(h, .78, .64), b = mono ? "#3a3a3a" : fromHsl(h + 36, .7, .42),
      d = mono ? "#050505" : fromHsl(h - 18, .7, .13), e = mono ? "#d71921" : fromHsl(h + 105, .85, .6);
    def(x, "wp", `<linearGradient id="ID" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`);
    def(x, "wpa", `<radialGradient id="ID" cx=".18" cy=".3" r=".6"><stop offset="0" stop-color="${light(a, .5)}" stop-opacity=".9"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>`);
    def(x, "wpb", `<radialGradient id="ID" cx=".88" cy=".74" r=".62"><stop offset="0" stop-color="${e}" stop-opacity=".7"/><stop offset="1" stop-color="${e}" stop-opacity="0"/></radialGradient>`);
  }

  /* ---------- Vista frontal (plegables: abiertos; cover=true: cerrados) ---------- */
  function front(x, p, col, cover) {
    const d = p.d, { c } = paints(x, p, col);
    screenPaint(x, p, c);
    let type = d.front, dims = p.dim;
    if (p.open && !cover) dims = p.open;
    else if (cover && type === "fold") type = "punch";
    const [H, W] = dims, fold = type === "fold";
    const Rr = p.dim[1] * d.r * (fold ? .7 : 1);
    const bz = d.bz || 1.5, u = Math.min(W, H * .5);
    const sx = bz, sy = bz, sw = W - 2 * bz, sh = H - 2 * bz - (d.chin || 0), sr = Math.max(1.2, Rr - bz);
    let s = R(0, 0, W, H, Rr, `fill="${x.url("frame")}"`) + R(.6, .6, W - 1.2, H - 1.2, Rr - .6, 'fill="#050507"');
    s += R(sx, sy, sw, sh, sr, `fill="${x.url("wp")}"`) + R(sx, sy, sw, sh, sr, `fill="${x.url("wpa")}"`) + R(sx, sy, sw, sh, sr, `fill="${x.url("wpb")}"`);

    const ios = p.os === "iOS", cx = fold ? sx + sw * .26 : W / 2, ty = sy + sh * (fold ? .24 : .2);
    if (ios) s += T(cx, ty, DATE, u * .052, 600, .85) + T(cx, ty + u * .25, TIME, u * .25, 600);
    else s += T(cx, ty + u * .19, TIME, u * .23, 400) + T(cx, ty + u * .28, DATE, u * .05, 500, .85);

    // Barra de estado: cobertura y batería
    const iy = sy + u * .045, ix = sx + sw - u * .08, base = iy + u * .008;
    s += R(ix - u * .045, iy - u * .018, u * .05, u * .024, u * .006, 'fill="none" stroke="#fff" stroke-width=".3"') + R(ix - u * .042, iy - u * .015, u * .036, u * .018, u * .004, 'fill="#fff"');
    for (let i = 0; i < 4; i++) { const bh = u * (.008 + .005 * i); s += R(ix - u * .13 + i * u * .014, base - bh, u * .009, bh, .1, 'fill="#fff"'); }

    // Cámara frontal
    const top = sy;
    if (type === "island") s += R(W / 2 - u * .165, top + u * .028, u * .33, u * .095, u * .0475, 'fill="#000"') + C(W / 2 + u * .115, top + u * .0755, u * .02, 'fill="#1b1f33"');
    else if (type === "notch") {
      const nw = u * .42, nh = u * .075, nx = W / 2 - nw / 2, q = 2.2;
      s += `<path d="M${n2(nx - q)} ${n2(top)} Q${n2(nx)} ${n2(top)} ${n2(nx)} ${n2(top + q)} L${n2(nx)} ${n2(top + nh - q)} Q${n2(nx)} ${n2(top + nh)} ${n2(nx + q * 1.4)} ${n2(top + nh)} L${n2(nx + nw - q * 1.4)} ${n2(top + nh)} Q${n2(nx + nw)} ${n2(top + nh)} ${n2(nx + nw)} ${n2(top + nh - q)} L${n2(nx + nw)} ${n2(top + q)} Q${n2(nx + nw)} ${n2(top)} ${n2(nx + nw + q)} ${n2(top)} Z" fill="#000"/>` + C(W / 2 + nw * .28, top + nh * .45, u * .018, 'fill="#1b1f33"');
    } else if (type === "drop") {
      const r = u * .03, cy0 = top + r * 1.2;
      s += `<path d="M${n2(W / 2 - r * 2.4)} ${n2(top)} Q${n2(W / 2 - r)} ${n2(top)} ${n2(W / 2 - r)} ${n2(cy0)} A${n2(r)} ${n2(r)} 0 0 0 ${n2(W / 2 + r)} ${n2(cy0)} Q${n2(W / 2 + r)} ${n2(top)} ${n2(W / 2 + r * 2.4)} ${n2(top)} Z" fill="#000"/>` + C(W / 2, cy0, r * .45, 'fill="#1b1f33"');
    } else if (fold) s += C(sx + sw * .78, top + u * .06, u * .018, 'fill="#000" opacity=".45"');
    else s += C(W / 2, top + u * .06, u * .032, 'fill="#000"') + C(W / 2, top + u * .06, u * .013, 'fill="#1b1f33"');

    // Pliegue de los plegables
    const crease = v => `<linearGradient id="ID" x1="0" y1="0" x2="${v ? 0 : 1}" y2="${v ? 1 : 0}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
    if (fold) {
      s += R(W / 2 - 1.5, sy, 3, sh, 0, `fill="${def(x, "crv", crease(false))}"`);
      for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) s += R(sx + sw * .56 + q * u * .19, sy + sh * .2 + r * u * .21, u * .13, u * .13, u * .04, `fill="${DOCK[(r + q) % 4]}" opacity=".9"`);
    }
    if (type === "flip") s += R(sx, H / 2 - 1.5, sw, 3, 0, `fill="${def(x, "crh", crease(true))}"`);

    // Parte inferior: accesos rápidos (iPhone) o dock de apps (Android)
    if (ios) {
      s += C(sx + u * .15, sy + sh - u * .17, u * .062, 'fill="#000" opacity=".3"') + C(sx + sw - u * .15, sy + sh - u * .17, u * .062, 'fill="#000" opacity=".3"');
      s += R(W / 2 - u * .17, sy + sh - u * .04, u * .34, u * .013, u * .0065, 'fill="#fff" opacity=".9"');
    } else {
      const sz = u * .13, gap = u * .06, tw = 4 * sz + 3 * gap, x0 = (fold ? sx + sw * .75 : W / 2) - tw / 2, y0 = sy + sh - u * .24;
      DOCK.forEach((dc, i) => { s += R(x0 + i * (sz + gap), y0, sz, sz, p.brand === "Google" ? sz / 2 : sz * .3, `fill="${dc}"`); });
      s += R(W / 2 - u * .12, sy + sh - u * .035, u * .24, u * .01, u * .005, 'fill="#fff" opacity=".8"');
    }
    s += `<path d="M${n2(sx)} ${n2(sy)} L${n2(sx + sw * .6)} ${n2(sy)} L${n2(sx)} ${n2(sy + sh * .45)} Z" fill="#fff" opacity=".06"/>`;
    return { s, W, H, Rr };
  }

  /* ---------- Perfil lateral (grosor) ---------- */
  function side(x, p, col, H, t) {
    paints(x, p, col);
    const k = p.d.cam, bump = k.bump ?? 2, len = (k.len ?? .24) * H;
    let s = "";
    if (bump > 0) s += R(t - .6, H * .035, bump + .6, len, Math.min(1.4, (bump + .6) / 2), `fill="${x.url("frame")}"`);
    s += R(0, 0, t, H, Math.min(t * .45, 3.2), `fill="${x.url("frame")}"`);
    s += R(-.7, H * .2, 1, H * .09, .4, `fill="${x.url("frame")}"`) + R(-.7, H * .315, 1, H * .055, .4, `fill="${x.url("frame")}"`);
    return s;
  }

  /* ---------- API pública ----------
     view: "duo" (trasera + frontal), "back", "front" o
     "pocket" (cerrado, con perfil lateral, para comparar tamaños) */
  function svg(p, o = {}) {
    const x = newCtx(), view = o.view || "duo";
    const cc = p.colors[o.color] || p.colors[0], col = Object.assign({ n: cc[0], c: cc[1] }, cc[2] || {});
    const [Hb, Wb, t] = p.dim;
    let body, vw, vh;
    if (view === "back") { body = back(x, p, col); vw = Wb; vh = Hb; }
    else if (view === "front") { const f = front(x, p, col); body = f.s; vw = f.W; vh = f.H; }
    else if (view === "pocket") {
      const f = p.d.cam.t === "flip" ? back(x, p, col) : front(x, p, col, true).s;
      body = f + `<g transform="translate(${n2(Wb + 5)} 0)">${side(x, p, col, Hb, t)}</g>`;
      vw = Wb + 5 + t + (p.d.cam.bump ?? 2) + .5; vh = Hb;
    } else {
      // Trasera detrás (arriba a la izquierda) y frontal delante, con una sombra suave entre ambos
      const f = front(x, p, col), bk = back(x, p, col), off = Wb * .8, flip = Hb < f.H * .7;
      const h = flip ? f.H + 2 : Math.max(f.H, Hb) * 1.04, by = flip ? h - Hb : 0, fy = h - f.H;
      const shade = R(-1.6, 1, f.W, f.H, f.Rr, 'fill="#000" opacity=".1"') + R(-.8, .5, f.W, f.H, f.Rr, 'fill="#000" opacity=".12"');
      vw = off + f.W; vh = h;
      body = `<g transform="translate(0 ${n2(by)})">${bk}</g><g transform="translate(${n2(off)} ${n2(fy)})">${shade}${f.s}</g>`;
    }
    const m = 1.6, W2 = n2(vw + 2 * m), H2 = n2(vh + 2 * m);
    const label = `Ilustración del ${p.name} en color ${col.n}`.replace(/"/g, "&quot;");
    return `<svg class="${o.cls || "art"}" viewBox="${-m} ${-m} ${W2} ${H2}" style="aspect-ratio:${W2}/${H2}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><defs>${Object.values(x.d).join("")}</defs>${body}</svg>`;
  }

  return { svg };
})();
