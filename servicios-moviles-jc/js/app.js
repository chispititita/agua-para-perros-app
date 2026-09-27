/* ==========================================================
   Servicios Móviles JC — Lógica de la aplicación
   ========================================================== */
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const MAX_COMPARE = 4;
  const CMP_COLORS = ["#4f6bff", "#e2475b", "#12a76a", "#e0892a"];
  const PHOTOS = typeof FOTOS !== "undefined" ? FOTOS : {};
  const PHOTO_NOTE = typeof FOTOS_NOTA !== "undefined" ? FOTOS_NOTA : "Foto del móvil";
  const eur = n => n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const num = n => n.toLocaleString("es-ES");
  const dec = n => String(n).replace(".", ",");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  const pageUrl = () => location.href.split("#")[0];

  /* ---------- Puntuaciones derivadas ---------- */
  const overall = p => Math.round(p.s.perf * .25 + p.s.cam * .27 + p.s.scr * .2 + p.s.bat * .28);
  PHONES.forEach(p => { p.score = overall(p); p.raw = p.score / Math.pow(p.price, .33); });
  const raws = PHONES.map(p => p.raw);
  const rMin = Math.min(...raws), rMax = Math.max(...raws);
  PHONES.forEach(p => { p.value = Math.round(45 + (p.raw - rMin) / (rMax - rMin) * 53); });
  const BEST = PHONES.slice().sort((a, b) => b.score - a.score || a.price - b.price)[0];
  const hasTele = p => /tele|periscopio/i.test(p.cams);
  const byId = id => PHONES.find(p => p.id === id);
  const maxRam = p => Math.max(...p.ram);
  const storLabel = gb => gb >= 1024 ? (gb / 1024) + " TB" : gb + " GB";
  const scoreColor = v => v >= 90 ? "var(--good)" : v >= 75 ? "var(--primary)" : v >= 60 ? "var(--warn)" : "var(--bad)";
  const mm = d => `${dec(d[0])} × ${dec(d[1])} × ${dec(d[2])} mm`;
  const dimTxt = p => mm(p.dim) + (p.open ? ` cerrado · ${mm(p.open)} abierto` : "");
  const listNames = arr => { const n = arr.map(p => p.name); return n.length > 1 ? n.slice(0, -1).join(", ") + " y " + n[n.length - 1] : n[0]; };

  /* ---------- Estado ---------- */
  const state = {
    q: "", priceMin: 0, priceMax: 2100, os: "all", brands: new Set(), batMin: 3000, ramMin: 0,
    feats: new Set(), sort: "score", rank: "global",
    compare: store.get("jc-compare", []).filter(byId).slice(0, MAX_COMPARE),
    favs: new Set(store.get("jc-favs", []).filter(byId)),
    recent: store.get("jc-recent", []).filter(byId),
    colors: store.get("jc-colors", {})
  };
  const colorIdx = p => { const i = state.colors[p.id] | 0; return i < p.colors.length ? i : 0; };

  /* ---------- Imágenes (foto real si existe; si no, ilustración a escala) ---------- */
  function art(p, view = "duo") {
    const photo = PHOTOS[p.id];
    if (photo && (view === "photo" || view === "duo" || view === "thumb")) return `<img class="art" src="${esc(photo)}" alt="${esc(p.name)}" loading="lazy">`;
    return PhoneArt.svg(p, { view: view === "thumb" || view === "photo" ? "back" : view, color: colorIdx(p) });
  }
  const artBox = (p, view = "duo", cls = "art-box", attrs = "") => `<div class="${cls}" data-art="${p.id}" data-view="${view}" ${attrs}>${art(p, view)}</div>`;

  function swatches(p, withName = true) {
    const cur = colorIdx(p);
    return `<div class="swatches" role="group" aria-label="Colores del ${esc(p.name)}">${p.colors.map((c, i) => {
      const bg = c[2] && c[2].two ? `linear-gradient(180deg, ${c[1]} 50%, ${c[2].two} 50%)` : c[1];
      return `<button class="sw ${i === cur ? "on" : ""}" style="background:${bg}" data-pid="${p.id}" data-color="${i}" title="${esc(c[0])}" aria-label="Color ${esc(c[0])}" aria-pressed="${i === cur}"></button>`;
    }).join("")}${withName ? `<span class="sw-name" data-pid="${p.id}">${esc(p.colors[cur][0])}</span>` : ""}</div>`;
  }
  function setColor(id, i) {
    const p = byId(id);
    state.colors[id] = i;
    store.set("jc-colors", state.colors);
    $$(`[data-art="${id}"]`).forEach(el => { el.innerHTML = art(p, el.dataset.view); });
    $$(`.sw[data-pid="${id}"]`).forEach(s => { const on = +s.dataset.color === i; s.classList.toggle("on", on); s.setAttribute("aria-pressed", on); });
    $$(`.sw-name[data-pid="${id}"]`).forEach(n => { n.textContent = p.colors[i][0]; });
  }
  document.addEventListener("click", e => {
    const s = e.target.closest(".sw[data-pid]");
    if (s) setColor(s.dataset.pid, +s.dataset.color);
  });

  /* ---------- Componentes ---------- */
  const ring = (v, cls = "") => `<div class="ring ${cls}" style="--v:${v};--ring-c:${scoreColor(v)}"><b>${v}</b></div>`;
  const bar = (label, v) => `<div class="bar"><span>${label}</span><div class="bar__track"><div class="bar__fill" style="--v:${v}"></div></div><b>${v}</b></div>`;
  const heart = `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>`;
  const cmpLabel = id => state.compare.includes(id) ? "✓ Comparando" : "+ Comparar";

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function copyLink(url, okMsg) {
    const fallback = () => prompt("Copia este enlace:", url);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(() => toast(okMsg), fallback);
    else fallback();
  }

  /* ==========================================================
     TEMA Y MENÚ
     ========================================================== */
  function applyTheme(t) {
    const root = document.documentElement;
    if (t) root.setAttribute("data-theme", t); else root.removeAttribute("data-theme");
    const active = t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.body.setAttribute("data-theme-active", active);
    if (state.compare.length >= 2) drawRadar();
  }
  $("#themeBtn").addEventListener("click", () => {
    const next = document.body.getAttribute("data-theme-active") === "dark" ? "light" : "dark";
    store.set("jc-theme", next);
    applyTheme(next);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyTheme(store.get("jc-theme", null)));

  $("#menuBtn").addEventListener("click", e => {
    const open = $("#nav").classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", open);
  });
  $$("#nav a").forEach(a => a.addEventListener("click", () => $("#nav").classList.remove("open")));

  const toTop = $("#toTop");
  window.addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 900), { passive: true });
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

  /* ==========================================================
     HERO, MARCAS Y BÚSQUEDA RÁPIDA
     ========================================================== */
  const brands = [...new Set(PHONES.map(p => p.brand))];
  function renderHero() {
    const pick = (id, view, color) => { const p = byId(id); return p ? PhoneArt.svg(p, { view, color }) : ""; };
    $("#heroArt").innerHTML = `
      <div class="hv hv1">${pick("iphone-17-pro-max", "back", 0)}</div>
      <div class="hv hv2">${pick("galaxy-s25-ultra", "front", 0)}</div>
      <div class="hv hv3">${pick("pixel-10-pro", "back", 1)}</div>
      <div class="hero__card">${ring(BEST.score)}<div><small>Mejor valorado</small><b>${esc(BEST.name)}</b><small>desde ${eur(BEST.price)}</small></div></div>`;
    $("#statPhones").textContent = PHONES.length;
    $("#statPhonesPill").textContent = PHONES.length;
    $("#statBrands").textContent = brands.length;
    $("#year").textContent = new Date().getFullYear();
  }

  function renderBrands() {
    $("#brandBand").innerHTML = brands.map(b => {
      const ps = PHONES.filter(p => p.brand === b), top = ps.slice().sort((x, y) => y.score - x.score)[0];
      return `<button class="card brand-tile" data-brand="${esc(b)}">${artBox(top, "thumb", "art-box brand-tile__art")}<b>${esc(b)}</b><small>${ps.length} ${ps.length === 1 ? "modelo" : "modelos"}</small><small>desde ${eur(Math.min(...ps.map(p => p.price)))}</small></button>`;
    }).join("");
  }
  $("#brandBand").addEventListener("click", e => {
    const t = e.target.closest("[data-brand]"); if (!t) return;
    state.brands = new Set([t.dataset.brand]);
    syncFilterUI(); renderCatalog();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  });

  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const matches = (p, q) => norm(`${p.brand} ${p.name} ${p.chip} ${p.tags.join(" ")} ${p.colors.map(c => c[0]).join(" ")}`).includes(norm(q));
  const hs = $("#heroSearch"), hr = $("#heroResults");
  let hIdx = -1;
  function renderHeroSearch() {
    const q = hs.value.trim();
    if (!q) { hr.classList.remove("open"); return; }
    const res = PHONES.filter(p => matches(p, q)).slice(0, 7);
    hIdx = -1;
    hr.innerHTML = res.length
      ? res.map(p => `<li role="option" data-id="${p.id}"><span class="art-box sr-art">${art(p, "thumb")}</span><span><b>${esc(p.name)}</b><br><small>${esc(p.brand)} · ${p.year} · ${p.score}/100</small></span><span class="sr-price">${eur(p.price)}</span></li>`).join("")
      : `<li>No encontramos «${esc(q)}». Prueba con otra marca o modelo.</li>`;
    hr.classList.add("open");
  }
  hs.addEventListener("input", renderHeroSearch);
  hs.addEventListener("focus", renderHeroSearch);
  hs.addEventListener("keydown", e => {
    const items = $$("li[data-id]", hr);
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      hIdx = (hIdx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((li, i) => li.classList.toggle("active", i === hIdx));
    } else if (e.key === "Enter") {
      openModal(items[Math.max(hIdx, 0)].dataset.id);
      hr.classList.remove("open");
    } else if (e.key === "Escape") hr.classList.remove("open");
  });
  hr.addEventListener("click", e => {
    const li = e.target.closest("li[data-id]");
    if (li) { openModal(li.dataset.id); hr.classList.remove("open"); }
  });
  document.addEventListener("click", e => { if (!e.target.closest(".search")) hr.classList.remove("open"); });

  /* ==========================================================
     ASISTENTE (QUIZ)
     ========================================================== */
  const quiz = { step: 0, budget: 700, prio: [], os: "any", extras: [] };
  const PRIOS = [
    { v: "cam", emo: "📸", t: "Cámara", d: "Fotos y vídeos de calidad" },
    { v: "bat", emo: "🔋", t: "Batería", d: "Que dure todo el día (o más)" },
    { v: "perf", emo: "🎮", t: "Rendimiento", d: "Juegos y multitarea fluida" },
    { v: "scr", emo: "🎬", t: "Pantalla", d: "Series, vídeos y lectura" },
    { v: "light", emo: "🪶", t: "Compacto y ligero", d: "Fácil de usar con una mano" },
    { v: "long", emo: "🛡️", t: "Que dure años", d: "Muchas actualizaciones y resistencia" }
  ];
  const OSES = [
    { v: "any", emo: "🤷", t: "Me da igual", d: "Quiero el mejor para mí" },
    { v: "iOS", emo: "🍎", t: "iPhone (iOS)", d: "Uso el ecosistema Apple" },
    { v: "Android", emo: "🤖", t: "Android", d: "Más variedad y opciones" }
  ];
  const EXTRAS = [
    { v: "wireless", emo: "⚡", t: "Carga inalámbrica", d: "" },
    { v: "ip68", emo: "💧", t: "Resistencia IP68", d: "" },
    { v: "tele", emo: "🔭", t: "Zoom óptico", d: "Teleobjetivo" },
    { v: "fast", emo: "🚀", t: "Carga ultrarrápida", d: "65 W o más" },
    { v: "fold", emo: "📖", t: "Plegable", d: "Pantalla que se dobla" },
    { v: "esim", emo: "📶", t: "eSIM", d: "" }
  ];
  const optBtn = (o, on) => `<button class="option ${on ? "on" : ""}" data-v="${o.v}" aria-pressed="${on}"><span class="emo">${o.emo}</span><b>${o.t}</b>${o.d ? `<small>${o.d}</small>` : ""}</button>`;

  function renderQuiz() {
    const el = $("#quiz"), total = 4;
    const prog = `<div class="quiz__progress"><span style="width:${Math.min(quiz.step, total) / total * 100}%"></span></div>`;
    let body = "";
    if (quiz.step === 0) {
      body = `<div class="quiz__step">Paso 1 de 4</div><h3>¿Cuál es tu presupuesto máximo?</h3><p class="quiz__hint">Mueve el control. Te mostraremos opciones hasta ese precio.</p>
        <div class="budget"><output id="qBudgetOut">${eur(quiz.budget)}</output>
        <input type="range" id="qBudget" min="200" max="2100" step="50" value="${quiz.budget}" aria-label="Presupuesto">
        <div class="budget__marks"><span>200 €</span><span>600 €</span><span>1000 €</span><span>1500 €</span><span>2100 €</span></div></div>`;
    } else if (quiz.step === 1) {
      body = `<div class="quiz__step">Paso 2 de 4</div><h3>¿Qué es lo más importante para ti?</h3><p class="quiz__hint">Elige hasta 2 prioridades.</p>
        <div class="options" data-group="prio">${PRIOS.map(o => optBtn(o, quiz.prio.includes(o.v))).join("")}</div>`;
    } else if (quiz.step === 2) {
      body = `<div class="quiz__step">Paso 3 de 4</div><h3>¿Tienes preferencia de sistema?</h3><p class="quiz__hint">Si ya usas Mac, iPad o Apple Watch, iPhone suele encajar mejor.</p>
        <div class="options" data-group="os">${OSES.map(o => optBtn(o, quiz.os === o.v)).join("")}</div>`;
    } else if (quiz.step === 3) {
      body = `<div class="quiz__step">Paso 4 de 4</div><h3>¿Algún extra imprescindible?</h3><p class="quiz__hint">Opcional. Marca todos los que necesites.</p>
        <div class="options" data-group="extras">${EXTRAS.map(o => optBtn(o, quiz.extras.includes(o.v))).join("")}</div>`;
    } else {
      body = renderQuizResults();
    }
    const nav = quiz.step < 4
      ? `<div class="quiz__nav"><button class="btn btn--ghost btn--sm" id="qBack" ${quiz.step === 0 ? "disabled style='visibility:hidden'" : ""}>← Atrás</button>
         <button class="btn btn--primary" id="qNext">${quiz.step === 3 ? "Ver mis recomendaciones" : "Siguiente →"}</button></div>`
      : `<div class="quiz__nav"><button class="btn btn--ghost btn--sm" id="qRestart">↺ Repetir test</button>${quiz.top ? `<a href="#comparar" class="btn btn--primary btn--sm" id="qCompareAll">Comparar el top ${quiz.top.length}</a>` : ""}</div>`;
    el.innerHTML = prog + body + nav;
  }

  function featOk(p, f) {
    switch (f) {
      case "wireless": return p.wchg > 0;
      case "ip68": return /IP68/.test(p.ip);
      case "tele": return hasTele(p);
      case "fast": return p.chg >= 65;
      case "compact": return p.size <= 6.3 && !p.fold;
      case "light": return p.weight <= 190;
      case "fold": return p.fold;
      case "upd": return p.upd >= 6;
      case "esim": return p.esim !== "No";
      case "fav": return state.favs.has(p.id);
    }
    return true;
  }

  function quizScore(p) {
    let s = p.score;
    const w = {
      cam: p.s.cam, bat: p.s.bat, perf: p.s.perf, scr: p.s.scr,
      light: Math.max(0, 100 - (p.weight - 160) * 1.2 - (p.size - 6.1) * 25),
      long: p.upd * 10 + (/IP68/.test(p.ip) ? 25 : 0)
    };
    if (quiz.prio.length) s = s * .35 + quiz.prio.reduce((a, k) => a + w[k], 0) / quiz.prio.length * .65;
    s += (p.value - 70) * .15;
    s -= quiz.extras.filter(f => !featOk(p, f)).length * 12;
    if (p.fold && !quiz.extras.includes("fold")) s -= 8;
    return Math.max(0, Math.min(99, Math.round(s)));
  }

  function quizMatches() {
    return PHONES
      .filter(p => p.price <= quiz.budget && (quiz.os === "any" || p.os === quiz.os))
      .map(p => ({ p, m: quizScore(p) }))
      .sort((a, b) => b.m - a.m)
      .slice(0, 3);
  }

  function reason(p) {
    const r = [];
    const labels = { cam: "cámara", bat: "batería", perf: "rendimiento", scr: "pantalla" };
    quiz.prio.forEach(k => {
      if (labels[k] && p.s[k] >= 85) r.push(`${labels[k]} sobresaliente (${p.s[k]}/100)`);
      if (k === "light" && p.weight <= 190) r.push(`solo ${p.weight} g`);
      if (k === "long") r.push(`${p.upd} años de actualizaciones`);
    });
    quiz.extras.forEach(f => { if (featOk(p, f)) r.push({ wireless: "carga inalámbrica", ip68: "IP68", tele: "teleobjetivo", fast: `carga de ${p.chg} W`, fold: "plegable", esim: "eSIM" }[f]); });
    if (p.value >= 80) r.push("excelente calidad/precio");
    return r.length ? r.slice(0, 4).join(" · ") : p.pros[0];
  }

  function renderQuizResults() {
    const res = quizMatches();
    if (!res.length) {
      quiz.top = null;
      return `<h3>No hay modelos con esos criterios 😕</h3><p class="quiz__hint">Prueba a subir el presupuesto o a cambiar la preferencia de sistema.</p>`;
    }
    quiz.top = res.map(r => r.p.id);
    return `<h3>Tus recomendaciones personalizadas</h3><p class="quiz__hint">Presupuesto hasta ${eur(quiz.budget)}${quiz.os !== "any" ? " · " + quiz.os : ""}. Ordenadas por afinidad contigo.</p>
      <div class="results">${res.map(({ p, m }, i) => `
        <div class="result">
          ${artBox(p, "thumb", "art-box result__art", `data-open="${p.id}"`)}
          <div>
            ${i === 0 ? `<span class="crown">★ Nuestra recomendación</span>` : ""}
            <h4>${esc(p.name)} <span class="muted" style="font-weight:600">· ${eur(p.price)}</span></h4>
            <p>${esc(reason(p))}</p>
            <div class="result__btns">
              <button class="btn btn--ghost btn--sm" data-open="${p.id}">Ver ficha y tiendas</button>
              <button class="btn btn--ghost btn--sm" data-cmp="${p.id}">${cmpLabel(p.id)}</button>
            </div>
          </div>
          <div class="result__match">${ring(m)}<small>afinidad</small></div>
        </div>`).join("")}</div>`;
  }

  $("#quiz").addEventListener("input", e => {
    if (e.target.id === "qBudget") { quiz.budget = +e.target.value; $("#qBudgetOut").textContent = eur(quiz.budget); }
  });
  $("#quiz").addEventListener("click", e => {
    const opt = e.target.closest(".option");
    if (opt) {
      const g = opt.parentElement.dataset.group, v = opt.dataset.v;
      if (g === "os") quiz.os = v;
      else {
        const arr = quiz[g], i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1);
        else { if (g === "prio" && arr.length >= 2) arr.shift(); arr.push(v); }
      }
      renderQuiz();
      return;
    }
    if (e.target.id === "qNext") { quiz.step++; renderQuiz(); $("#asistente").scrollIntoView({ behavior: "smooth" }); }
    if (e.target.id === "qBack") { quiz.step--; renderQuiz(); }
    if (e.target.id === "qRestart") { Object.assign(quiz, { step: 0, prio: [], os: "any", extras: [], top: null }); renderQuiz(); }
    if (e.target.id === "qCompareAll" && quiz.top) { state.compare = quiz.top.slice(0, MAX_COMPARE); syncCompare(); }
    const c = e.target.closest("[data-cmp]");
    if (c) return toggleCompare(c.dataset.cmp);
    const o = e.target.closest("[data-open]");
    if (o) openModal(o.dataset.open);
  });

  /* ==========================================================
     RANKINGS
     ========================================================== */
  const RANKS = [
    { k: "global", t: "🏆 Mejor global", m: p => p.score, lbl: "Puntuación JC" },
    { k: "value", t: "💰 Calidad/precio", m: p => p.value, lbl: "Nota calidad/precio" },
    { k: "cam", t: "📸 Cámara", m: p => p.s.cam, lbl: "Nota de cámara" },
    { k: "bat", t: "🔋 Batería", m: p => p.s.bat, lbl: "Nota de autonomía" },
    { k: "perf", t: "🎮 Rendimiento", m: p => p.s.perf, lbl: "Nota de rendimiento" },
    { k: "cheap", t: "🪙 Menos de 400 €", m: p => p.score, f: p => p.price <= 400, lbl: "Puntuación JC" },
    { k: "compact", t: "🤏 Compactos", m: p => p.score, f: p => p.size <= 6.3 && !p.fold, lbl: "Puntuación JC" },
    { k: "fold", t: "📖 Plegables", m: p => p.score, f: p => p.fold, lbl: "Puntuación JC" }
  ];
  function renderRanks() {
    const r = RANKS.find(x => x.k === state.rank) || RANKS[0];
    const list = PHONES.filter(r.f || (() => true)).sort((a, b) => r.m(b) - r.m(a) || a.price - b.price).slice(0, 5);
    $("#rankTabs").innerHTML = RANKS.map(x => `<button role="tab" aria-selected="${x.k === r.k}" class="${x.k === r.k ? "on" : ""}" data-rank="${x.k}">${x.t}</button>`).join("");
    const [p1, ...rest] = list;
    if (!p1) { $("#rankList").innerHTML = ""; return; }
    $("#rankList").innerHTML = `
      <article class="card rank-hero">
        <div class="rank-hero__art" data-open="${p1.id}"><span class="rank-pos">#1</span>${artBox(p1, "duo")}</div>
        <div class="rank-hero__info">
          <div class="pcard__brand">${esc(p1.brand)} · ${p1.year}</div>
          <h3>${esc(p1.name)}</h3>
          <p class="muted">${esc(p1.pros[0])}.</p>
          <div class="rank-metric">${ring(r.m(p1), "ring--lg")}<div><b>${r.lbl}</b><small>Precio de referencia: ${eur(p1.price)}</small></div></div>
          ${swatches(p1)}
          <div class="m-actions"><button class="btn btn--primary btn--sm" data-open="${p1.id}">Ver ficha</button><button class="btn btn--ghost btn--sm" data-cmp="${p1.id}">${cmpLabel(p1.id)}</button></div>
        </div>
      </article>
      <ol class="rank-rest">${rest.map((p, i) => `
        <li class="card rank-row" data-open="${p.id}" tabindex="0" role="button" aria-label="Ver ficha del ${esc(p.name)}">
          <span class="rank-num">${i + 2}</span>
          ${artBox(p, "thumb", "art-box rank-thumb")}
          <div class="rank-info"><b>${esc(p.name)}</b><small>${esc(p.brand)} · ${eur(p.price)}</small><div class="bar__track"><div class="bar__fill" style="--v:${r.m(p)}"></div></div></div>
          <b class="rank-score">${r.m(p)}</b>
        </li>`).join("")}</ol>`;
  }
  $("#rankTabs").addEventListener("click", e => { const b = e.target.closest("[data-rank]"); if (b) { state.rank = b.dataset.rank; renderRanks(); } });
  $("#rankList").addEventListener("click", e => {
    if (e.target.closest(".sw")) return;
    const c = e.target.closest("[data-cmp]"); if (c) return toggleCompare(c.dataset.cmp);
    const o = e.target.closest("[data-open]"); if (o) openModal(o.dataset.open);
  });
  $("#rankList").addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".rank-row")) { e.preventDefault(); openModal(e.target.dataset.open); }
  });

  /* ==========================================================
     CATÁLOGO + FILTROS
     ========================================================== */
  $("#fBrands").innerHTML = brands.map(b => `<button class="chip" data-b="${esc(b)}">${esc(b)}</button>`).join("");

  function syncFilterUI() {
    $("#fPrice").value = state.priceMax; $("#fPriceVal").textContent = state.priceMax >= 2100 ? "Sin límite" : eur(state.priceMax);
    $("#fBat").value = state.batMin; $("#fBatVal").textContent = num(state.batMin) + " mAh";
    $("#fSearch").value = state.q;
    $("#fRam").value = state.ramMin;
    $("#fSort").value = state.sort;
    $$("#fOs button").forEach(b => b.classList.toggle("on", b.dataset.v === state.os));
    $$("#fBrands .chip").forEach(b => b.classList.toggle("on", state.brands.has(b.dataset.b)));
    $$(".fFeat").forEach(c => { c.checked = state.feats.has(c.value); });
    $$("#priceChips button").forEach(b => b.classList.toggle("on", +b.dataset.min === state.priceMin && +b.dataset.max === state.priceMax));
  }

  function activeFilters() {
    return (state.q ? 1 : 0) + (state.priceMin > 0 || state.priceMax < 2100 ? 1 : 0) + (state.os !== "all" ? 1 : 0) +
      state.brands.size + (state.batMin > 3000 ? 1 : 0) + (state.ramMin > 0 ? 1 : 0) + state.feats.size;
  }

  function filtered() {
    const list = PHONES.filter(p =>
      (!state.q || matches(p, state.q)) &&
      p.price >= state.priceMin && p.price <= state.priceMax &&
      (state.os === "all" || p.os === state.os) &&
      (!state.brands.size || state.brands.has(p.brand)) &&
      p.bat >= state.batMin &&
      maxRam(p) >= state.ramMin &&
      [...state.feats].every(f => featOk(p, f))
    );
    const sorters = {
      score: (a, b) => b.score - a.score,
      value: (a, b) => b.value - a.value,
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      cam: (a, b) => b.s.cam - a.s.cam,
      bat: (a, b) => b.s.bat - a.s.bat,
      perf: (a, b) => b.s.perf - a.s.perf,
      light: (a, b) => a.weight - b.weight,
      new: (a, b) => b.year - a.year || b.price - a.price
    };
    return list.sort(sorters[state.sort]);
  }

  function card(p) {
    const inCmp = state.compare.includes(p.id), fav = state.favs.has(p.id);
    const flag = p.id === BEST.id ? `<span class="pcard__flag pcard__flag--top">🏆 Mejor valorado</span>`
      : p.value >= 85 ? `<span class="pcard__flag pcard__flag--good">💰 Chollo calidad/precio</span>`
      : p.fold ? `<span class="pcard__flag">📖 Plegable</span>` : "";
    return `<article class="card pcard ${inCmp ? "in-compare" : ""}" data-id="${p.id}">
      <div class="pcard__media" data-open="${p.id}" title="Ver ficha del ${esc(p.name)}">${flag}${artBox(p, "duo")}</div>
      <button class="fav ${fav ? "on" : ""}" data-fav="${p.id}" aria-label="Guardar ${esc(p.name)} en favoritos" aria-pressed="${fav}">${heart}</button>
      <div class="pcard__body">
        ${swatches(p)}
        <div class="pcard__brand">${esc(p.brand)} · ${p.year}</div>
        <h3 data-open="${p.id}">${esc(p.name)}</h3>
        <div class="price-row"><span class="price" title="Precio oficial de lanzamiento"><small>PVP</small> ${eur(p.price)}</span><span class="value-pill" title="Nota de calidad/precio (0-100)">Calidad/precio ${p.value}</span></div>
        <div class="tags">${p.tags.slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <ul class="specs-mini">
          <li>📱 <b>${dec(p.size)}"</b> ${p.hz} Hz</li>
          <li>🔋 <b>${num(p.bat)}</b> mAh</li>
          <li>📸 <b>${p.mainMP} MP</b>${hasTele(p) ? " + zoom" : ""}</li>
          <li>⚡ <b>${p.chg} W</b>${p.wchg ? " · inal." : ""}</li>
          <li>⚖️ <b>${p.weight} g</b> · ${dec(p.dim[2])} mm</li>
          <li>💾 <b>${storLabel(p.sto[0])}</b>${p.sto.length > 1 ? "+" : ""}</li>
          <li style="grid-column:1/-1">⚙️ <b>${esc(p.chip)}</b></li>
        </ul>
        <div class="pcard__score">
          ${ring(p.score)}
          <div class="bars">${bar("Cámara", p.s.cam)}${bar("Batería", p.s.bat)}${bar("Potencia", p.s.perf)}</div>
        </div>
        <div class="pcard__actions">
          <button class="btn btn--ghost" data-open="${p.id}">Detalles</button>
          <button class="btn btn--ghost btn--compare ${inCmp ? "on" : ""}" data-cmp="${p.id}">${cmpLabel(p.id)}</button>
        </div>
      </div>
    </article>`;
  }

  function renderCatalog() {
    const list = filtered();
    $("#resultCount").innerHTML = `<b>${list.length}</b> ${list.length === 1 ? "móvil encontrado" : "móviles encontrados"}`;
    const n = activeFilters();
    $("#filtersCount").textContent = n ? n : "";
    $("#grid").innerHTML = list.length ? list.map(card).join("") :
      `<div class="empty"><div class="emo">🔍</div><h3>Sin resultados</h3><p>Ningún móvil cumple todos los filtros. Prueba a relajar alguno.</p><button class="btn btn--primary btn--sm" id="emptyReset">Limpiar filtros</button></div>`;
  }

  function resetFilters() {
    Object.assign(state, { q: "", priceMin: 0, priceMax: 2100, os: "all", batMin: 3000, ramMin: 0, sort: "score" });
    state.brands.clear(); state.feats.clear();
    syncFilterUI(); renderCatalog();
  }

  $("#fSearch").addEventListener("input", e => { state.q = e.target.value.trim(); renderCatalog(); });
  $("#fPrice").addEventListener("input", e => {
    state.priceMax = +e.target.value;
    if (state.priceMax < state.priceMin) state.priceMin = 0;
    syncFilterUI(); renderCatalog();
  });
  $("#fBat").addEventListener("input", e => { state.batMin = +e.target.value; syncFilterUI(); renderCatalog(); });
  $("#fRam").addEventListener("change", e => { state.ramMin = +e.target.value; renderCatalog(); });
  $("#fSort").addEventListener("change", e => { state.sort = e.target.value; renderCatalog(); });
  $("#fOs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.os = b.dataset.v; syncFilterUI(); renderCatalog(); });
  $("#fBrands").addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    state.brands.has(b.dataset.b) ? state.brands.delete(b.dataset.b) : state.brands.add(b.dataset.b);
    syncFilterUI(); renderCatalog();
  });
  $$(".fFeat").forEach(c => c.addEventListener("change", () => { c.checked ? state.feats.add(c.value) : state.feats.delete(c.value); renderCatalog(); }));
  $("#priceChips").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.priceMin = +b.dataset.min; state.priceMax = +b.dataset.max;
    syncFilterUI(); renderCatalog();
  });
  $("#resetFilters").addEventListener("click", resetFilters);
  $("#filtersToggle").addEventListener("click", () => $("#filters").classList.toggle("open"));
  $("#filtersDone").addEventListener("click", () => { $("#filters").classList.remove("open"); $("#grid").scrollIntoView({ behavior: "smooth", block: "start" }); });
  document.addEventListener("click", e => {
    if ($("#filters").classList.contains("open") && !e.target.closest("#filters") && !e.target.closest("#filtersToggle")) $("#filters").classList.remove("open");
  });

  $("#grid").addEventListener("click", e => {
    if (e.target.id === "emptyReset") return resetFilters();
    if (e.target.closest(".sw")) return;
    const f = e.target.closest("[data-fav]"); if (f) return toggleFav(f.dataset.fav);
    const c = e.target.closest("[data-cmp]"); if (c) return toggleCompare(c.dataset.cmp);
    const o = e.target.closest("[data-open]"); if (o) return openModal(o.dataset.open);
  });

  /* ---------- Vistos recientemente ---------- */
  function pushRecent(id) {
    state.recent = [id, ...state.recent.filter(x => x !== id)].slice(0, 8);
    store.set("jc-recent", state.recent);
    renderRecent();
  }
  function renderRecent() {
    const el = $("#recent");
    el.hidden = !state.recent.length;
    if (!state.recent.length) return;
    el.innerHTML = `<span class="recent__t">Vistos recientemente</span>` + state.recent.map(id => {
      const p = byId(id);
      return `<button class="recent__item" data-open="${id}">${artBox(p, "thumb", "art-box recent__art")}${esc(p.name)}</button>`;
    }).join("");
  }
  $("#recent").addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (o) openModal(o.dataset.open); });

  /* ---------- Favoritos ---------- */
  function updateFavBadge() {
    const b = $("#favCount");
    b.textContent = state.favs.size;
    b.dataset.zero = state.favs.size ? "0" : "1";
  }
  function toggleFav(id) {
    const p = byId(id), on = !state.favs.has(id);
    if (on) { state.favs.add(id); toast(`❤ ${p.name} guardado en favoritos`); }
    else { state.favs.delete(id); toast(`${p.name} eliminado de favoritos`); }
    store.set("jc-favs", [...state.favs]);
    updateFavBadge();
    if (state.feats.has("fav")) renderCatalog();
    else $$(`[data-fav="${id}"]`).forEach(b => { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    const mf = $("#modalFav"); if (mf) mf.textContent = on ? "❤ En favoritos" : "♡ Favorito";
  }
  $("#favBtn").addEventListener("click", () => {
    if (!state.favs.size) return toast("Aún no tienes favoritos. Pulsa ♡ en cualquier móvil.");
    state.feats = new Set(["fav"]);
    syncFilterUI(); renderCatalog();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  });

  /* ==========================================================
     COMPARADOR
     ========================================================== */
  function toggleCompare(id) {
    const i = state.compare.indexOf(id);
    if (i >= 0) state.compare.splice(i, 1);
    else {
      if (state.compare.length >= MAX_COMPARE) return toast(`Máximo ${MAX_COMPARE} móviles. Quita uno para añadir otro.`);
      state.compare.push(id);
      toast(`${byId(id).name} añadido al comparador`);
    }
    syncCompare();
  }

  function syncCompare() {
    store.set("jc-compare", state.compare);
    renderTray();
    $$("[data-cmp]").forEach(b => {
      const on = state.compare.includes(b.dataset.cmp);
      b.textContent = on ? "✓ Comparando" : "+ Comparar";
      if (b.classList.contains("btn--compare")) b.classList.toggle("on", on);
    });
    $$(".pcard").forEach(c => c.classList.toggle("in-compare", state.compare.includes(c.dataset.id)));
    renderCompare();
    const mc = $("#modalCmp");
    if (mc) mc.textContent = state.compare.includes(mc.dataset.id) ? "✓ En el comparador" : "+ Añadir al comparador";
  }

  function renderTray() {
    const n = state.compare.length;
    $("#tray").classList.toggle("open", n > 0);
    document.body.classList.toggle("has-tray", n > 0);
    $("#traySlots").innerHTML = state.compare.map(id => {
      const p = byId(id);
      return `<div class="tray__item">${artBox(p, "thumb", "art-box tray__art")}${esc(p.name)}<button data-rm="${id}" aria-label="Quitar ${esc(p.name)}">×</button></div>`;
    }).join("") + Array.from({ length: MAX_COMPARE - n }, () => `<div class="tray__empty">+ Añade móvil</div>`).join("");
    $("#trayGo").textContent = n >= 2 ? `Comparar (${n})` : "Elige al menos 2";
  }
  $("#traySlots").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) toggleCompare(b.dataset.rm); });
  $("#trayClear").addEventListener("click", () => { state.compare = []; syncCompare(); });

  const ROWS = [
    { g: "General" },
    { k: "Precio de referencia", f: p => eur(p.price), n: p => p.price, best: "min" },
    { k: "Puntuación JC", f: p => p.score + " / 100", n: p => p.score, best: "max" },
    { k: "Calidad / precio", f: p => p.value + " / 100", n: p => p.value, best: "max" },
    { k: "Año de lanzamiento", f: p => p.year, n: p => p.year, best: "max" },
    { k: "Sistema operativo", f: p => p.os },
    { k: "Años de actualizaciones", f: p => p.upd + " años", n: p => p.upd, best: "max" },
    { g: "Pantalla" },
    { k: "Tamaño", f: p => dec(p.size) + "\"" },
    { k: "Tipo de panel", f: p => p.panel },
    { k: "Tasa de refresco", f: p => p.hz + " Hz", n: p => p.hz, best: "max" },
    { k: "Resolución", f: p => p.res },
    { k: "Nota pantalla", f: p => p.s.scr, n: p => p.s.scr, best: "max" },
    { g: "Rendimiento" },
    { k: "Procesador", f: p => p.chip },
    { k: "Memoria RAM", f: p => p.ram.join(" / ") + " GB", n: maxRam, best: "max" },
    { k: "Almacenamiento", f: p => p.sto.map(storLabel).join(" / "), n: p => Math.max(...p.sto), best: "max" },
    { k: "Nota rendimiento", f: p => p.s.perf, n: p => p.s.perf, best: "max" },
    { g: "Batería" },
    { k: "Capacidad", f: p => num(p.bat) + " mAh", n: p => p.bat, best: "max" },
    { k: "Carga por cable", f: p => p.chg + " W", n: p => p.chg, best: "max" },
    { k: "Carga inalámbrica", f: p => p.wchg ? dec(p.wchg) + " W" : "No", n: p => p.wchg, best: "max" },
    { k: "Nota autonomía", f: p => p.s.bat, n: p => p.s.bat, best: "max" },
    { g: "Cámaras" },
    { k: "Cámara principal", f: p => p.mainMP + " MP", n: p => p.mainMP, best: "max" },
    { k: "Cámaras traseras", f: p => p.cams },
    { k: "Teleobjetivo", f: p => hasTele(p) ? "Sí" : "No" },
    { k: "Cámara frontal", f: p => dec(p.front) + " MP", n: p => p.front, best: "max" },
    { k: "Nota cámara", f: p => p.s.cam, n: p => p.s.cam, best: "max" },
    { g: "Diseño y conectividad" },
    { k: "Dimensiones", f: dimTxt },
    { k: "Grosor", f: p => dec(p.dim[2]) + " mm" + (p.open ? " (cerrado)" : ""), n: p => p.dim[2], best: "min" },
    { k: "Peso", f: p => p.weight + " g", n: p => p.weight, best: "min" },
    { k: "Colores", f: p => p.colors.map(c => c[0]).join(", ") },
    { k: "Resistencia", f: p => p.ip },
    { k: "Plegable", f: p => p.fold ? "Sí" : "No" },
    { k: "5G", f: () => "Sí" },
    { k: "eSIM", f: p => p.esim }
  ];

  function keyDiffs(sel) {
    const out = [];
    const top = fn => sel.slice().sort((a, b) => fn(b) - fn(a));
    const pr = top(p => -p.price), cheap = pr[0], exp = pr[pr.length - 1];
    if (exp.price - cheap.price >= 50) out.push(["💶", `El <b>${esc(cheap.name)}</b> es <b>${eur(exp.price - cheap.price)}</b> más barato que el ${esc(exp.name)}.`]);
    const bt = top(p => p.bat), bw = bt[bt.length - 1];
    if (bt[0].bat - bw.bat >= 300) out.push(["🔋", `Mayor batería: <b>${esc(bt[0].name)}</b> con ${num(bt[0].bat)} mAh (${num(bt[0].bat - bw.bat)} mAh más que el ${esc(bw.name)}).`]);
    const cg = top(p => p.chg), cw = cg[cg.length - 1];
    if (cg[0].chg - cw.chg >= 15) out.push(["⚡", `Carga más rápida: <b>${esc(cg[0].name)}</b> con ${cg[0].chg} W, frente a ${cw.chg} W del ${esc(cw.name)}.`]);
    const cm = top(p => p.s.cam);
    if (cm[0].s.cam - cm[cm.length - 1].s.cam >= 4) out.push(["📸", `Mejor cámara: <b>${esc(cm[0].name)}</b> (${cm[0].s.cam}/100).`]);
    const tele = sel.filter(hasTele);
    if (tele.length && tele.length < sel.length) out.push(["🔭", `Con teleobjetivo (zoom óptico): <b>${esc(listNames(tele))}</b>.`]);
    const pf = top(p => p.s.perf);
    if (pf[0].s.perf - pf[pf.length - 1].s.perf >= 6) out.push(["🎮", `Más potente: <b>${esc(pf[0].name)}</b> con ${esc(pf[0].chip)}.`]);
    const hz = top(p => p.hz), hw = hz[hz.length - 1];
    if (hz[0].hz > hw.hz) out.push(["🎞️", `Pantalla más fluida: <b>${esc(hz[0].name)}</b> (${hz[0].hz} Hz frente a ${hw.hz} Hz).`]);
    const wt = top(p => -p.weight), heavy = wt[wt.length - 1];
    if (heavy.weight - wt[0].weight >= 10) out.push(["🪶", `El más ligero es el <b>${esc(wt[0].name)}</b>: ${wt[0].weight} g, ${heavy.weight - wt[0].weight} g menos que el ${esc(heavy.name)}.`]);
    const th = top(p => -p.dim[2]);
    if (th[th.length - 1].dim[2] - th[0].dim[2] >= .8) out.push(["📏", `El más fino es el <b>${esc(th[0].name)}</b> con ${dec(th[0].dim[2])} mm de grosor.`]);
    const up = top(p => p.upd), uw = up[up.length - 1];
    if (up[0].upd > uw.upd) out.push(["🛡️", `<b>${esc(up[0].name)}</b> tendrá actualizaciones durante ${up[0].upd} años, frente a ${uw.upd} del ${esc(uw.name)}.`]);
    const noW = sel.filter(p => !p.wchg);
    if (noW.length && noW.length < sel.length) out.push(["🔌", `Sin carga inalámbrica: ${esc(listNames(noW))}.`]);
    const lowIp = sel.filter(p => !/IP6[89]/.test(p.ip));
    if (lowIp.length && lowIp.length < sel.length) out.push(["💧", `Menor resistencia al agua: ${lowIp.map(p => `${esc(p.name)} (${p.ip})`).join(", ")}.`]);
    return out;
  }

  function sizePanel(sel) {
    const maxH = Math.max(...sel.map(p => p.dim[0]));
    return `<div class="card size-panel"><h3>📏 Tamaño y grosor a escala</h3>
      <p class="muted">Vista frontal y de perfil con sus medidas reales${sel.some(p => p.open) ? " (los plegables, cerrados)" : ""}.</p>
      <div class="size-row" style="--maxh:${maxH}">${sel.map((p, i) => `
        <figure class="size-item">
          <div class="art-box size-art" style="--h:${p.dim[0]}" data-art="${p.id}" data-view="pocket">${art(p, "pocket")}</div>
          <figcaption><b><span class="dot" style="background:${CMP_COLORS[i]}"></span>${esc(p.name)}</b><small>${mm(p.dim)} · ${p.weight} g</small></figcaption>
        </figure>`).join("")}</div></div>`;
  }

  const PRESETS = [
    ["Tope de gama", "iphone-17-pro-max,galaxy-s25-ultra,pixel-10-pro-xl,xiaomi-15-ultra"],
    ["Mejores gama media", "pixel-9a,galaxy-a56,nothing-phone-3a,redmi-note-14-pro-plus"],
    ["Compactos premium", "iphone-17,galaxy-s25,xiaomi-15,pixel-10"],
    ["Potencia barata", "poco-f7-pro,oneplus-13r,galaxy-s25-fe"],
    ["Reyes de la batería", "oneplus-15,poco-f7-pro,motorola-edge-60-pro,iphone-17-pro-max"],
    ["Plegables", "galaxy-z-fold7,pixel-10-pro-fold,galaxy-z-flip7"],
    ["Ultrafinos", "iphone-air,galaxy-s25-edge"]
  ];

  function renderCompare() {
    const area = $("#compareArea"), sel = state.compare.map(byId);
    const opts = PHONES.filter(p => !state.compare.includes(p.id)).map(p => `<option value="${p.id}">${esc(p.name)} — ${eur(p.price)}</option>`).join("");
    const slots = Array.from({ length: MAX_COMPARE }, (_, i) => {
      const p = sel[i];
      if (p) return `<div class="cmp-slot filled"><button class="x" data-rm="${p.id}" aria-label="Quitar ${esc(p.name)}">×</button>
        ${artBox(p, "thumb", "art-box cmp-slot__art", `data-open="${p.id}"`)}
        <h4><span class="dot" style="background:${CMP_COLORS[i]}"></span>${esc(p.name)}</h4>
        <div class="price">${eur(p.price)}</div>
        ${swatches(p, false)}</div>`;
      return `<div class="cmp-slot"><span style="font-size:28px">＋</span><b>Añadir móvil</b><select data-add aria-label="Añadir móvil al comparador"><option value="">Selecciona un modelo…</option>${opts}</select></div>`;
    }).join("");

    if (sel.length < 2) {
      area.innerHTML = `<div class="cmp-pickers">${slots}</div>
        <div class="card empty" style="padding:36px"><div class="emo">⚖️</div><h3>Elige al menos 2 móviles</h3><p>Usa los selectores de arriba o pulsa «+ Comparar» en el catálogo.</p>
        <p><b>Comparativas populares:</b></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${PRESETS.map(([t, ids]) => `<button class="btn btn--ghost btn--sm" data-preset="${ids}">${t}</button>`).join("")}</div></div>`;
      return;
    }

    const cats = [["Rendimiento", p => p.s.perf], ["Cámara", p => p.s.cam], ["Pantalla", p => p.s.scr], ["Autonomía", p => p.s.bat], ["Calidad / precio", p => p.value], ["Más ligero", p => -p.weight], ["Más barato", p => -p.price]];
    const winner = fn => sel.reduce((a, b) => fn(b) > fn(a) ? b : a);
    const overallWin = winner(p => p.score), valueWin = winner(p => p.value);
    const diffs = keyDiffs(sel);

    const rows = ROWS.map(r => {
      if (r.g) return `<tr class="grp"><th colspan="${sel.length + 1}">${r.g}</th></tr>`;
      const vals = sel.map(r.f);
      const same = vals.every(v => String(v) === String(vals[0]));
      let bestIdx = [];
      if (r.n && !same) {
        const ns = sel.map(r.n), target = r.best === "min" ? Math.min(...ns) : Math.max(...ns);
        bestIdx = ns.map((v, i) => v === target ? i : -1).filter(i => i >= 0);
      }
      return `<tr class="${same ? "same" : ""}"><th scope="row">${r.k}</th>${vals.map((v, i) => `<td class="${bestIdx.includes(i) ? "best" : ""}">${esc(v)}</td>`).join("")}</tr>`;
    }).join("");

    area.innerHTML = `
      <div class="cmp-pickers">${slots}</div>
      <div class="cmp-top">
        <div class="card cmp-chart">
          <h3>Perfil de cada móvil</h3>
          <canvas id="radar" width="420" height="420" role="img" aria-label="Gráfico radar comparando rendimiento, cámara, pantalla, autonomía y calidad/precio"></canvas>
          <div class="legend">${sel.map((p, i) => `<span><i style="background:${CMP_COLORS[i]}"></i>${esc(p.name)}</span>`).join("")}</div>
        </div>
        <div class="card verdict">
          <h3>Veredicto JC</h3>
          <ul>${cats.map(([k, fn]) => `<li><span>${k}</span><b>${esc(winner(fn).name)}</b></li>`).join("")}</ul>
          <div class="verdict__winner"><b>🏆 Ganador global: ${esc(overallWin.name)} (${overallWin.score}/100)</b>
          <p>${overallWin.id === valueWin.id ? "Además es el que mejor relación calidad/precio ofrece." : `Si buscas ahorrar, ${esc(valueWin.name)} es la compra más inteligente (${valueWin.value}/100 en calidad/precio).`}</p></div>
        </div>
      </div>
      <div class="cmp-mid">
        <div class="card diffs"><h3>🔎 Diferencias clave</h3>${diffs.length ? `<ul>${diffs.map(([i, t]) => `<li><span>${i}</span><div>${t}</div></li>`).join("")}</ul>` : `<p class="muted">Son móviles muy parecidos: revisa la tabla para ver los matices.</p>`}</div>
        ${sizePanel(sel)}
      </div>
      <div class="cmp-toolbar">
        <label class="check"><input type="checkbox" id="onlyDiff" checked> Ocultar filas iguales</label>
        <button class="btn btn--ghost btn--sm" id="copyLink">🔗 Copiar enlace</button>
        <button class="btn btn--ghost btn--sm" id="printCmp">🖨️ Imprimir / PDF</button>
      </div>
      <div class="table-wrap"><table class="ctable" id="ctable">
        <thead><tr><th>Especificación</th>${sel.map((p, i) => `<th>${artBox(p, "thumb", "art-box th-art")}<span class="dot" style="background:${CMP_COLORS[i]}"></span>${esc(p.name)}</th>`).join("")}</tr></thead>
        <tbody>${rows}
          <tr class="grp"><th colspan="${sel.length + 1}">Comprar</th></tr>
          <tr><th scope="row">Dónde comprar</th>${sel.map(p => `<td><button class="btn btn--primary btn--sm" data-open="${p.id}" data-tab="buy">Ver tiendas</button></td>`).join("")}</tr>
        </tbody></table></div>`;
    drawRadar();
  }

  function drawRadar() {
    const cv = $("#radar"); if (!cv) return;
    const sel = state.compare.map(byId), dpr = window.devicePixelRatio || 1, size = 420;
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    const cs = getComputedStyle(document.documentElement);
    const grid = cs.getPropertyValue("--border").trim() || "#ddd", txt = cs.getPropertyValue("--muted").trim() || "#666";
    const axes = [["Rendimiento", p => p.s.perf], ["Cámara", p => p.s.cam], ["Pantalla", p => p.s.scr], ["Autonomía", p => p.s.bat], ["Calidad/precio", p => p.value]];
    const cx = size / 2, cy = size / 2 + 8, R = 140, min = 40;
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / axes.length, r = R * Math.max(0, (v - min) / (100 - min)); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    ctx.clearRect(0, 0, size, size);
    ctx.lineWidth = 1; ctx.strokeStyle = grid;
    [55, 70, 85, 100].forEach(l => { ctx.beginPath(); axes.forEach((_, i) => { const [x, y] = pt(i, l); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke(); });
    ctx.font = "600 13px Inter, system-ui, sans-serif"; ctx.fillStyle = txt; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    axes.forEach(([label], i) => {
      const [x, y] = pt(i, 100); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      const [lx, ly] = pt(i, 116), half = ctx.measureText(label).width / 2 + 4;
      ctx.fillText(label, Math.min(size - half, Math.max(half, lx)), ly);
    });
    sel.forEach((p, k) => {
      const c = CMP_COLORS[k];
      ctx.beginPath();
      axes.forEach(([, fn], i) => { const [x, y] = pt(i, fn(p)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.fillStyle = c + "26"; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.stroke();
      axes.forEach(([, fn], i) => { const [x, y] = pt(i, fn(p)); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); });
    });
  }

  $("#compareArea").addEventListener("change", e => {
    if (e.target.matches("[data-add]") && e.target.value) toggleCompare(e.target.value);
    if (e.target.id === "onlyDiff") $("#ctable").classList.toggle("show-all", !e.target.checked);
  });
  $("#compareArea").addEventListener("click", e => {
    if (e.target.closest(".sw")) return;
    const rm = e.target.closest("[data-rm]"); if (rm) return toggleCompare(rm.dataset.rm);
    const pr = e.target.closest("[data-preset]"); if (pr) { state.compare = pr.dataset.preset.split(",").filter(byId).slice(0, MAX_COMPARE); return syncCompare(); }
    const o = e.target.closest("[data-open]"); if (o) return openModal(o.dataset.open, o.dataset.tab);
    if (e.target.id === "copyLink") copyLink(`${pageUrl()}#comparar=${state.compare.join(",")}`, "Enlace copiado. ¡Compártelo!");
    if (e.target.id === "printCmp") window.print();
  });

  /* ==========================================================
     FICHA DE DETALLE (MODAL)
     ========================================================== */
  function alternatives(p) {
    const others = PHONES.filter(o => o.id !== p.id), out = [];
    const add = (o, why) => { if (o && !out.some(x => x.o.id === o.id)) out.push({ o, why }); };
    add(others.filter(o => o.price < p.price * .85 && o.score >= p.score - 5).sort((a, b) => b.score - a.score)[0], "Casi igual de bueno y más barato");
    add(others.filter(o => Math.abs(o.price - p.price) <= p.price * .15 && o.score > p.score).sort((a, b) => b.score - a.score)[0], "Mejor por un precio similar");
    add(others.filter(o => o.price <= p.price * 1.2 && o.s.cam > p.s.cam).sort((a, b) => b.s.cam - a.s.cam)[0], "Mejor cámara");
    add(others.filter(o => o.price <= p.price * 1.2 && o.s.bat > p.s.bat).sort((a, b) => b.s.bat - a.s.bat)[0], "Más autonomía");
    add(others.filter(o => o.os !== p.os).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))[0], `Alternativa en ${p.os === "iOS" ? "Android" : "iOS"}`);
    add(others.filter(o => o.brand === p.brand).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))[0], `Otra opción de ${p.brand}`);
    return out.slice(0, 6);
  }

  function idealFor(p) {
    const r = [];
    if (p.s.cam >= 90) r.push("amantes de la fotografía");
    if (p.s.perf >= 90) r.push("gamers y usuarios exigentes");
    if (p.s.bat >= 90) r.push("quien pasa muchas horas fuera de casa");
    if (p.value >= 80) r.push("quien busca la mejor compra por su dinero");
    if (p.fold) r.push("productividad y multitarea en formato plegable");
    if (p.weight <= 175) r.push("quien prefiere un móvil ligero");
    if (p.price <= 320) r.push("un primer smartphone o uso básico");
    if (p.upd >= 7) r.push("quien quiere mantenerlo muchos años");
    return r.length ? r.slice(0, 3).join(", ") : "uso general equilibrado";
  }

  function specTable(p) {
    return `<table class="spec-table"><tbody>${ROWS.map(r => r.g
      ? `<tr class="grp"><th colspan="2">${r.g}</th></tr>`
      : `<tr><th>${r.k}</th><td>${esc(r.f(p))}</td></tr>`).join("")}</tbody></table>`;
  }

  function buyTab(p) {
    const q = encodeURIComponent(p.name), recent = p.year >= 2025;
    const round = v => Math.round(v / 10) * 10;
    const est = s => s.type === "Reacondicionado" ? `${eur(round(p.price * (recent ? .72 : .6)))} – ${eur(round(p.price * (recent ? .85 : .75)))}<small>estimado</small>`
      : s.type === "Segunda mano" ? `desde ~${eur(round(p.price * (recent ? .6 : .5)))}<small>estimado</small>`
      : s.type === "Comparador" ? `Ver mejor precio<small>en tiempo real</small>`
      : `${eur(round(p.price * .88))} – ${eur(p.price)}<small>rango habitual</small>`;
    const rows = [
      `<div class="store"><div><b>Tienda oficial ${esc(p.brand)}</b><small>Precio oficial, personalización y programas de recompra</small></div><div class="store__est">${eur(p.price)}<small>PVP oficial</small></div><a class="btn btn--primary btn--sm" href="${OFFICIAL[p.brand]}" target="_blank" rel="noopener">Ir</a></div>`,
      ...STORES.map(s => `<div class="store"><div><b>${s.name} <span class="store__type t-${s.type.replace(/\s/g, "")}">${s.type}</span></b><small>${s.note}</small></div><div class="store__est">${est(s)}</div><a class="btn btn--ghost btn--sm" href="${s.url(q)}" target="_blank" rel="noopener">Buscar</a></div>`)
    ];
    return `<div class="buy-grid">
      <div><h3>Alternativas de compra</h3><p class="muted">Pulsa en cada tienda para ver el precio actual del ${esc(p.name)}.</p><div class="stores">${rows.join("")}</div>
      <p class="note">💡 Consejo JC: los precios suelen bajar un 10-20 % a los 3-6 meses del lanzamiento y en campañas como Black Friday, Prime Day o rebajas. Los reacondicionados de ${esc(p.brand)} con garantía son una gran forma de ahorrar.</p></div>
      <aside class="calc">
        <h4>🧮 Calculadora de financiación</h4>
        <label>Precio del móvil (€)<input type="number" id="cPrice" value="${p.price}" min="50" step="10"></label>
        <label>Plazo (meses)<select id="cMonths"><option>6</option><option selected>12</option><option>24</option><option>36</option></select></label>
        <label>TAE aproximada (%)<input type="number" id="cTae" value="0" min="0" max="30" step="0.5"></label>
        <div class="calc__out"><small>Cuota mensual estimada</small><b id="cOut">—</b><small id="cTotal"></small></div>
        <p class="note">Muchas tiendas ofrecen financiación al 0 % TAE en móviles. Cálculo orientativo.</p>
      </aside></div>`;
  }

  function calcFinance() {
    const P = +$("#cPrice").value || 0, n = +$("#cMonths").value, tae = +$("#cTae").value || 0;
    const i = Math.pow(1 + tae / 100, 1 / 12) - 1;
    const m = i ? P * i / (1 - Math.pow(1 + i, -n)) : P / n;
    $("#cOut").textContent = m.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) + "/mes";
    $("#cTotal").textContent = `Total: ${(m * n).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`;
  }

  function altTab(p) {
    return `<h3>Alternativas al ${esc(p.name)}</h3><p class="muted">Otros móviles que deberías considerar antes de decidir.</p>
      <div class="alts">${alternatives(p).map(({ o, why }) => `
        <div class="alt"><span class="alt__why">${why}</span>
          ${artBox(o, "thumb", "art-box alt__art", `data-open="${o.id}"`)}
          <div><h4>${esc(o.name)}</h4><b>${eur(o.price)}</b> <span class="muted">· ${o.score}/100</span></div>
          <div class="bars">${bar("Cámara", o.s.cam)}${bar("Batería", o.s.bat)}</div>
          <button class="btn btn--ghost btn--sm" data-open="${o.id}">Ver ficha</button>
          <button class="link-btn" data-vs="${o.id}">Comparar con el ${esc(p.name)}</button>
        </div>`).join("")}</div>`;
  }

  const VIEWS = [["duo", "Conjunto"], ["back", "Trasera"], ["front", "Frontal"], ["pocket", "Perfil"]];
  let lastFocus = null;

  function openModal(id, tab = "sum") {
    const p = byId(id); if (!p) return;
    if ($("#modal").hidden) lastFocus = document.activeElement;
    pushRecent(id);
    const inCmp = state.compare.includes(id), views = PHOTOS[p.id] ? [["photo", "Foto"], ...VIEWS] : VIEWS, mview = views[0][0];
    $("#modalPanel").innerHTML = `
      <button class="modal__close" data-close aria-label="Cerrar">×</button>
      <div class="m-head">
        <div class="m-gallery">
          <div class="art-box m-stage" id="mStage" data-art="${p.id}" data-view="${mview}">${art(p, mview)}</div>
          <div class="m-views" role="group" aria-label="Cambiar vista">${views.map(([v, l]) => `<button data-mview="${v}" class="${v === mview ? "on" : ""}" aria-pressed="${v === mview}">${l}</button>`).join("")}</div>
          ${swatches(p)}
          <p class="m-note muted">${PHOTOS[p.id] ? esc(PHOTO_NOTE) : "Ilustración a escala"} · ${mm(p.dim)}${p.open ? " (cerrado)" : ""} · ${p.weight} g</p>
        </div>
        <div class="m-info">
          <div class="pcard__brand">${esc(p.brand)} · ${p.year} · ${p.os}</div>
          <h2 id="modalTitle">${esc(p.name)}</h2>
          <div class="tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
          <span class="price">${eur(p.price)} <small>precio de referencia</small></span>
          <div class="m-scores">
            <div style="text-align:center">${ring(p.score, "ring--lg")}<small class="muted">Puntuación JC</small></div>
            <div class="bars">${bar("Rendimiento", p.s.perf)}${bar("Cámara", p.s.cam)}${bar("Pantalla", p.s.scr)}${bar("Autonomía", p.s.bat)}${bar("Calidad/precio", p.value)}</div>
          </div>
          <div class="m-actions">
            <button class="btn btn--primary btn--sm" data-tabgo="buy">🛒 Dónde comprar</button>
            <button class="btn btn--ghost btn--sm" id="modalCmp" data-id="${p.id}">${inCmp ? "✓ En el comparador" : "+ Añadir al comparador"}</button>
            <button class="btn btn--ghost btn--sm" id="modalFav">${state.favs.has(p.id) ? "❤ En favoritos" : "♡ Favorito"}</button>
            <button class="btn btn--ghost btn--sm" id="modalShare">🔗 Compartir</button>
          </div>
          <label class="vs"><span>Comparar con</span><select id="vsSel"><option value="">Elige otro móvil…</option>${PHONES.filter(o => o.id !== p.id).map(o => `<option value="${o.id}">${esc(o.name)} — ${eur(o.price)}</option>`).join("")}</select></label>
        </div>
      </div>
      <nav class="tabs" role="tablist">
        <button data-t="sum">Resumen</button><button data-t="spec">Especificaciones</button><button data-t="buy">Dónde comprar</button><button data-t="alt">Alternativas</button>
      </nav>
      <div class="tabpane" id="tabpane"></div>`;

    const setTab = t => {
      $$(".tabs button").forEach(b => { b.classList.toggle("on", b.dataset.t === t); b.setAttribute("aria-selected", b.dataset.t === t); });
      const pane = $("#tabpane");
      if (t === "sum") pane.innerHTML = `<div class="proscons"><div class="pros"><h4>👍 Puntos fuertes</h4><ul>${p.pros.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div><div class="cons"><h4>👎 Puntos débiles</h4><ul>${p.cons.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div></div>
        <div class="idealfor"><b>🎯 Ideal para:</b> ${esc(idealFor(p))}.</div>
        <ul class="specs-mini" style="margin-top:18px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">
          <li>📱 <b>${dec(p.size)}" ${esc(p.panel)}</b></li><li>⚙️ <b>${esc(p.chip)}</b></li>
          <li>🧠 <b>${p.ram.join("/")} GB RAM</b></li><li>💾 <b>${p.sto.map(storLabel).join(" / ")}</b></li>
          <li>🔋 <b>${num(p.bat)} mAh · ${p.chg} W</b></li><li>📸 <b>${p.mainMP} MP${hasTele(p) ? " + teleobjetivo" : ""}</b></li>
          <li>💧 <b>${p.ip}</b></li><li>🔄 <b>${p.upd} años de actualizaciones</b></li>
          <li>🎨 <b>${p.colors.length} colores</b></li><li>⚖️ <b>${p.weight} g · ${dec(p.dim[2])} mm</b></li></ul>`;
      if (t === "spec") pane.innerHTML = specTable(p);
      if (t === "buy") { pane.innerHTML = buyTab(p); calcFinance(); }
      if (t === "alt") pane.innerHTML = altTab(p);
    };

    const panel = $("#modalPanel");
    panel.onclick = e => {
      const mv = e.target.closest("[data-mview]");
      if (mv) {
        const st = $("#mStage");
        st.dataset.view = mv.dataset.mview;
        st.innerHTML = art(p, mv.dataset.mview);
        $$("[data-mview]").forEach(b => { b.classList.toggle("on", b === mv); b.setAttribute("aria-pressed", b === mv); });
        return;
      }
      if (e.target.closest(".sw")) return;
      const tb = e.target.closest("[data-t]"); if (tb) return setTab(tb.dataset.t);
      const tg = e.target.closest("[data-tabgo]"); if (tg) { setTab(tg.dataset.tabgo); $(".tabs").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (e.target.id === "modalCmp") return toggleCompare(p.id);
      if (e.target.id === "modalFav") return toggleFav(p.id);
      if (e.target.id === "modalShare") return copyLink(`${pageUrl()}#movil=${p.id}`, "Enlace a la ficha copiado");
      const vs = e.target.closest("[data-vs]");
      if (vs) return goCompare([p.id, vs.dataset.vs]);
      const o = e.target.closest("[data-open]"); if (o && o.dataset.open !== p.id) openModal(o.dataset.open);
    };
    panel.oninput = e => { if (["cPrice", "cMonths", "cTae"].includes(e.target.id)) calcFinance(); };
    panel.onchange = e => { if (e.target.id === "vsSel" && e.target.value) goCompare([p.id, e.target.value]); };
    setTab(tab || "sum");
    $("#modal").hidden = false;
    document.body.style.overflow = "hidden";
    panel.scrollTop = 0;
    $(".modal__close").focus();
  }

  function goCompare(ids) {
    state.compare = ids;
    syncCompare();
    closeModal();
    $("#comparar").scrollIntoView({ behavior: "smooth" });
  }
  function closeModal() {
    $("#modal").hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  $("#modal").addEventListener("click", e => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", e => {
    if ($("#modal").hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab") {
      const f = $$("#modalPanel button, #modalPanel a, #modalPanel input, #modalPanel select").filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ==========================================================
     INICIO
     ========================================================== */
  const hash = decodeURIComponent(location.hash);
  if (hash.startsWith("#comparar=")) {
    const ids = hash.slice(10).split(",").filter(byId).slice(0, MAX_COMPARE);
    if (ids.length) state.compare = ids;
  }
  applyTheme(store.get("jc-theme", null));
  renderHero();
  renderBrands();
  syncFilterUI();
  updateFavBadge();
  renderQuiz();
  renderRanks();
  renderRecent();
  renderCatalog();
  syncCompare();
  if (hash.startsWith("#comparar")) setTimeout(() => $("#comparar").scrollIntoView(), 60);
  if (hash.startsWith("#movil=")) setTimeout(() => openModal(hash.slice(7)), 60);
})();
