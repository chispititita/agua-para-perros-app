/* JARVIS — interfaz, paneles y control por voz */
const $ = (sel) => document.querySelector(sel);
const euros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const guardado = {
  leer(k, def) { try { const v = localStorage.getItem("jarvis." + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  escribir(k, v) { try { localStorage.setItem("jarvis." + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

function aviso(texto) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = texto;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function fechaCorta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) +
    (iso.length > 10 ? " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "");
}

/* ================================================================ Pestañas */
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("activa", x === b));
  document.querySelectorAll(".seccion").forEach((s) => s.classList.toggle("activa", s.id === b.dataset.seccion));
  guardado.escribir("pestana", b.dataset.seccion);
  refrescar(b.dataset.seccion);
}));

function refrescar(seccion) {
  const cargas = { jarvis: cargarPanorama, dinero: cargarDinero, vicios: cargarVicios, tareas: cargarTareas, estudio: cargarMedia, ajustes: cargarMemoria };
  (seccion ? [cargas[seccion]] : Object.values(cargas)).forEach((f) => f && f().catch((e) => console.error(e)));
}

/* ================================================================ Estado y panorama */
let estadoApp = {};
async function cargarEstado() {
  estadoApp = await api("/api/estado");
  const filas = [["claude", "Cerebro (Claude)"], ["replicate", "Imagen / vídeo"], ["shopify", "Shopify"]];
  $("#conexiones").innerHTML = filas.map(([k, n]) => `<div><span class="punto ${estadoApp[k] ? "ok" : ""}"></span>${n}</div>`).join("");
  $("#detalleConexiones").innerHTML = filas.map(([k, n]) =>
    `<div class="interruptor"><span class="punto ${estadoApp[k] ? "ok" : ""}"></span>${n}: ${estadoApp[k] ? "conectado" : "sin configurar"}</div>`).join("");
  $("#palabraClave").textContent = capitalizar(estadoApp.palabra_clave || "jarvis");
  if (!estadoApp.claude) mensaje("jarvis", "Me falta la clave de Claude (ANTHROPIC_API_KEY) en el archivo .env para poder pensar. Mira el README.", { error: true });
}
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

async function cargarPanorama() {
  const p = await api("/api/panorama");
  const vicios = Object.entries(p.vicios);
  const peorVicio = vicios.sort((a, b) => a[1].dias_sin_caer - b[1].dias_sin_caer)[0];
  $("#miniPanel").innerHTML = [
    tarjeta("Saldo", euros.format(p.dinero.saldo_actual), `Gastos 30 días: ${euros.format(p.dinero.gastos_periodo)}`, p.dinero.saldo_actual < 0 ? "negativo" : ""),
    tarjeta("Tareas pendientes", p.tareas_pendientes, p.tareas_vencidas.length ? `${p.tareas_vencidas.length} vencida(s)` : "Nada vencido", p.tareas_vencidas.length ? "negativo" : ""),
    peorVicio ? tarjeta(`Sin ${peorVicio[0]}`, `${peorVicio[1].dias_sin_caer} días`, `Hoy: ${peorVicio[1].hoy}`, peorVicio[1].limite_superado_hoy ? "negativo" : "positivo")
      : tarjeta("Vicios", "—", "Aún no controlas ninguno"),
  ].join("");
}
const tarjeta = (etq, valor, sub = "", clase = "") =>
  `<div class="tarjeta"><div class="etiqueta">${esc(etq)}</div><div class="valor ${clase}">${esc(valor)}</div><div class="sub">${esc(sub)}</div></div>`;

/* ================================================================ Dinero */
async function cargarDinero() {
  const d = await api("/api/dinero");
  $("#tarjetasDinero").innerHTML = [
    tarjeta("Saldo actual", euros.format(d.saldo_actual), "", d.saldo_actual < 0 ? "negativo" : "positivo"),
    tarjeta("Ingresos 30 días", euros.format(d.ingresos_periodo), "", "positivo"),
    tarjeta("Gastos 30 días", euros.format(d.gastos_periodo), "", "negativo"),
    tarjeta("Balance 30 días", euros.format(d.ingresos_periodo - d.gastos_periodo)),
  ].join("");
  const max = Math.max(1, ...d.gastos_por_categoria.map((c) => c.total));
  $("#barrasCategorias").innerHTML = d.gastos_por_categoria.map((c) => `
    <div class="barra"><div class="cabecera"><span>${esc(c.categoria)}</span><span>${euros.format(c.total)}</span></div>
    <div class="relleno" style="width:${(c.total / max) * 100}%"></div></div>`).join("") || `<p class="ayuda">Sin gastos todavía.</p>`;
  $("#listaMovimientos").innerHTML = d.movimientos.map((m) => `
    <li><div class="crece">${esc(m.descripcion || m.categoria)}<div class="meta">${esc(m.categoria)} · ${fechaCorta(m.fecha)}</div></div>
    <b class="${m.tipo === "ingreso" ? "positivo" : "negativo"}">${m.tipo === "ingreso" ? "+" : "−"}${euros.format(m.cantidad)}</b>
    <button class="peligro" data-borrar-mov="${m.id}" title="Borrar">✕</button></li>`).join("") || `<p class="ayuda">Aún no hay movimientos. Empieza apuntando tu saldo actual como ingreso con categoría «saldo inicial».</p>`;
}

$("#formDinero").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  try { await api("/api/dinero", { method: "POST", body: f }); e.target.reset(); cargarDinero(); cargarPanorama(); }
  catch (err) { aviso(err.message); }
});
$("#listaMovimientos").addEventListener("click", async (e) => {
  const id = e.target.dataset.borrarMov;
  if (id && confirm("¿Borrar este movimiento?")) { await api(`/api/dinero/${id}`, { method: "DELETE" }); cargarDinero(); cargarPanorama(); }
});

/* ================================================================ Vicios */
async function cargarVicios() {
  const v = await api("/api/vicios");
  $("#rejillaVicios").innerHTML = Object.entries(v).map(([nombre, x]) => `
    <div class="tarjeta vicio ${x.limite_superado_hoy ? "alerta" : ""}">
      <h4>${esc(nombre)} <button class="peligro" data-borrar-vicio="${x.id}" data-nombre="${esc(nombre)}" title="Dejar de controlar">✕</button></h4>
      <div class="racha">${x.dias_sin_caer} días</div><div class="meta">sin caer${x.ultima_vez ? " · última vez " + fechaCorta(x.ultima_vez) : ""}</div>
      ${x.objetivo ? `<div class="sub">🎯 ${esc(x.objetivo)}</div>` : ""}
      <div class="datos">
        <span>Hoy: <b>${x.hoy}</b>${x.limite_diario !== null ? " / " + x.limite_diario : ""}</span>
        <span>7 días: <b>${x.ultimos_7_dias}</b></span>
        <span>30 días: <b>${x.ultimos_30_dias}</b></span>
        <span>Coste 30 d: <b>${euros.format(x.dinero_gastado_30_dias)}</b></span>
      </div>
      <div class="acciones-vicio">
        <input placeholder="¿Qué lo provocó?" data-nota="${esc(nombre)}">
        <button class="mini" data-caida="${esc(nombre)}">+1 He caído</button>
      </div>
    </div>`).join("") || `<p class="ayuda">No controlas ningún vicio todavía. Añade uno abajo o díselo a Jarvis.</p>`;
}

$("#rejillaVicios").addEventListener("click", async (e) => {
  const nombre = e.target.dataset.caida;
  if (nombre) {
    const nota = document.querySelector(`[data-nota="${CSS.escape(nombre)}"]`)?.value || "";
    await api("/api/vicios/registrar", { method: "POST", body: { nombre, nota } });
    aviso("Apuntado. Mañana es otro día: tú puedes.");
    cargarVicios(); cargarPanorama();
  }
  const id = e.target.dataset.borrarVicio;
  if (id && confirm(`¿Dejar de controlar «${e.target.dataset.nombre}» y borrar su historial?`)) {
    await api(`/api/vicios/${id}`, { method: "DELETE" }); cargarVicios(); cargarPanorama();
  }
});
$("#formVicio").addEventListener("submit", async (e) => {
  e.preventDefault();
  try { await api("/api/vicios", { method: "POST", body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); cargarVicios(); cargarPanorama(); }
  catch (err) { aviso(err.message); }
});

/* ================================================================ Tareas */
async function cargarTareas() {
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const verHechas = $("#verHechas").checked;
  const t = (await api("/api/tareas")).filter((x) => verHechas || !x.hecha);
  $("#listaTareas").innerHTML = t.map((x) => {
    const vencida = !x.hecha && x.fecha_limite && x.fecha_limite.slice(0, 10) < hoy;
    return `<li class="${x.hecha ? "hecha" : ""} ${vencida ? "vencida" : ""}">
      <input type="checkbox" data-tarea="${x.id}" ${x.hecha ? "checked" : ""}>
      <div class="crece">${esc(x.titulo)}<div class="meta">${esc(x.area)}${x.fecha_limite ? " · " + (vencida ? "venció " : "para ") + fechaCorta(x.fecha_limite) : ""}${x.detalle ? " · " + esc(x.detalle) : ""}</div></div>
      <span class="prioridad ${x.prioridad}">${x.prioridad}</span>
      <button class="peligro" data-borrar-tarea="${x.id}" title="Borrar">✕</button></li>`;
  }).join("") || `<p class="ayuda">Nada pendiente. ¡Bien hecho!</p>`;
}
$("#verHechas").addEventListener("change", cargarTareas);
$("#formTarea").addEventListener("submit", async (e) => {
  e.preventDefault();
  try { await api("/api/tareas", { method: "POST", body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); cargarTareas(); cargarPanorama(); }
  catch (err) { aviso(err.message); }
});
$("#listaTareas").addEventListener("click", async (e) => {
  if (e.target.dataset.tarea) {
    await api(`/api/tareas/${e.target.dataset.tarea}/hecha`, { method: "POST", body: { hecha: e.target.checked } });
    if (e.target.checked) aviso("Tarea completada. Una menos.");
    cargarTareas(); cargarPanorama();
  }
  if (e.target.dataset.borrarTarea && confirm("¿Borrar esta tarea?")) {
    await api(`/api/tareas/${e.target.dataset.borrarTarea}`, { method: "DELETE" }); cargarTareas(); cargarPanorama();
  }
});

/* ================================================================ Estudio */
let hayPendientes = false;
async function cargarMedia() {
  const lista = await api("/api/media");
  hayPendientes = lista.some((m) => m.estado === "pendiente" || m.estado === "generando");
  $("#galeria").innerHTML = lista.map((m) => {
    let visual;
    if (m.estado === "lista") {
      visual = m.tipo === "imagen" ? `<a href="/media/${esc(m.archivo)}" target="_blank"><img src="/media/${esc(m.archivo)}" loading="lazy" alt=""></a>`
        : `<video src="/media/${esc(m.archivo)}" controls loop playsinline></video>`;
    } else if (m.estado === "error") {
      visual = `<div class="cargando error">✕ ${esc(m.error)}</div>`;
    } else {
      visual = `<div class="cargando">⟳ Generando ${m.tipo}…${m.tipo === "video" ? "<br><small>puede tardar varios minutos</small>" : ""}</div>`;
    }
    return `<div class="pieza">${visual}<div class="pie"><p title="${esc(m.prompt)}">#${m.id} · ${esc(m.prompt)}</p>
      <div class="fila">${m.estado === "lista" ? `<a href="/media/${esc(m.archivo)}" download>⬇ Descargar</a>` : ""}
      ${m.estado === "lista" && m.tipo === "imagen" ? `<a href="#" data-animar="${m.id}">▶ Animar en vídeo</a>` : ""}</div></div></div>`;
  }).join("") || `<p class="ayuda">Todavía no has creado nada.</p>`;
  actualizarImagenesBase(lista);
}

let productosShopify = null;
async function actualizarImagenesBase(lista) {
  const sel = $("#imagenBase");
  const actual = sel.value;
  if (productosShopify === null && estadoApp.shopify) productosShopify = await api("/api/shopify/productos").catch(() => []);
  const imagenes = lista.filter((m) => m.tipo === "imagen" && m.estado === "lista");
  sel.innerHTML = `<option value="">Sin imagen de partida</option>` +
    imagenes.map((m) => `<option value="id:${m.id}">Imagen #${m.id}: ${esc(m.prompt.slice(0, 50))}</option>`).join("") +
    (productosShopify || []).filter((p) => p.imagen_url).map((p) => `<option value="url:${esc(p.imagen_url)}">Producto: ${esc(p.titulo)}</option>`).join("");
  sel.value = actual;
}

document.querySelectorAll('[name="tipo"]').forEach((r) => r.addEventListener("change", () => {
  const video = document.querySelector('[name="tipo"]:checked').value === "video";
  $("#formato").hidden = video;
  $("#imagenBase").hidden = !video;
}));

$("#galeria").addEventListener("click", (e) => {
  const id = e.target.dataset.animar;
  if (!id) return;
  e.preventDefault();
  document.querySelector('[name="tipo"][value="video"]').checked = true;
  document.querySelector('[name="tipo"][value="video"]').dispatchEvent(new Event("change"));
  $("#imagenBase").value = `id:${id}`;
  $("#promptEstudio").focus();
  aviso("Describe el movimiento que quieres y pulsa Generar");
});

$("#mejorarPrompt").addEventListener("click", async (e) => {
  const idea = $("#promptEstudio").value.trim();
  if (!idea) return aviso("Escribe primero tu idea");
  e.target.disabled = true; $("#avisoEstudio").textContent = "Jarvis está escribiendo el prompt…";
  try {
    const tipo = document.querySelector('[name="tipo"]:checked').value;
    $("#promptEstudio").value = (await api("/api/media/mejorar-prompt", { method: "POST", body: { idea, tipo } })).prompt;
  } catch (err) { aviso(err.message); }
  e.target.disabled = false; $("#avisoEstudio").textContent = "";
});

$("#formEstudio").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const boton = e.target.querySelector('[type="submit"]');
  boton.disabled = true;
  $("#avisoEstudio").textContent = f.tipo === "imagen" ? "Generando imagen…" : "Enviando vídeo a generar…";
  try {
    if (f.tipo === "imagen") {
      const m = await api("/api/media/imagen", { method: "POST", body: { prompt: f.prompt, formato: f.formato } });
      if (m.estado === "error") aviso(m.error);
    } else {
      const base = f.imagen_base || "";
      await api("/api/media/video", { method: "POST", body: {
        prompt: f.prompt,
        imagen_base_id: base.startsWith("id:") ? Number(base.slice(3)) : null,
        imagen_url: base.startsWith("url:") ? base.slice(4) : null,
      } });
      aviso("Vídeo en marcha. Te aparecerá aquí cuando esté listo.");
    }
  } catch (err) { aviso(err.message); }
  boton.disabled = false; $("#avisoEstudio").textContent = "";
  cargarMedia();
});

setInterval(() => { if (hayPendientes) cargarMedia(); }, 6000);

/* ================================================================ Memoria */
async function cargarMemoria() {
  const m = await api("/api/memoria");
  $("#listaMemoria").innerHTML = m.map((x) => `<li><div class="crece">${esc(x.texto)}<div class="meta">${fechaCorta(x.creada)}</div></div>
    <button class="peligro" data-olvidar="${x.id}" title="Olvidar">✕</button></li>`).join("") || `<p class="ayuda">Aún no recuerda nada. Cuéntale tus metas.</p>`;
}
$("#listaMemoria").addEventListener("click", async (e) => {
  if (e.target.dataset.olvidar) { await api(`/api/memoria/${e.target.dataset.olvidar}`, { method: "DELETE" }); cargarMemoria(); }
});

/* ================================================================ Chat */
const NOMBRES_ACCION = {
  panorama_general: "repaso general", registrar_movimiento: "dinero apuntado", resumen_dinero: "consulta de dinero",
  borrar_movimiento: "movimiento borrado", registrar_vicio: "vicio apuntado", configurar_vicio: "vicio configurado",
  estado_vicios: "consulta de vicios", crear_tarea: "tarea creada", completar_tarea: "tarea actualizada",
  listar_tareas: "consulta de tareas", borrar_tarea: "tarea borrada", recordar: "guardado en memoria", olvidar: "recuerdo borrado",
  generar_imagen: "imagen generada", generar_video: "vídeo en marcha", estado_contenido: "estado de contenido",
  shopify_productos: "productos de Shopify", shopify_ventas: "ventas de Shopify",
};

function mensaje(quien, texto, extra = {}) {
  const div = document.createElement("div");
  div.className = `msg ${quien} ${extra.error ? "error" : ""} ${extra.pensando ? "pensando" : ""}`;
  div.textContent = texto;
  if (extra.acciones?.length) {
    const a = document.createElement("span");
    a.className = "acciones";
    a.textContent = "⚙ " + [...new Set(extra.acciones.map((x) => NOMBRES_ACCION[x] || x))].join(" · ");
    div.appendChild(a);
  }
  for (const c of extra.contenidos || []) {
    if (c.estado === "lista" && c.tipo === "imagen") {
      div.insertAdjacentHTML("beforeend", `<a href="/media/${esc(c.archivo)}" target="_blank"><img src="/media/${esc(c.archivo)}" alt=""></a>`);
    } else if (c.tipo === "video") {
      div.insertAdjacentHTML("beforeend", `<span class="acciones">🎬 Vídeo #${c.id} generándose: lo verás en la pestaña Estudio.</span>`);
    } else if (c.estado === "error") {
      div.insertAdjacentHTML("beforeend", `<span class="acciones negativo">✕ ${esc(c.error)}</span>`);
    }
  }
  $("#chat").appendChild(div);
  $("#chat").scrollTop = $("#chat").scrollHeight;
  return div;
}

let ocupado = false;
async function enviar(texto) {
  texto = texto.trim();
  if (!texto || ocupado) return;
  ocupado = true;
  voz.poner("pensando");
  mensaje("usuario", texto);
  const pensando = mensaje("jarvis", "Pensando…", { pensando: true });
  let r;
  try { r = await api("/api/chat", { method: "POST", body: { texto } }); }
  catch (err) { r = { texto: "No he podido procesarlo: " + err.message, error: true }; }
  pensando.remove();
  mensaje("jarvis", r.texto, r);
  ocupado = false;
  if (r.acciones?.length) refrescar();
  if (r.contenidos?.length) cargarMedia();
  if ($("#leerRespuestas").checked) voz.decir(r.texto, () => voz.trasResponder());
  else voz.trasResponder();
}

$("#formChat").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $("#textoChat").value;
  $("#textoChat").value = "";
  voz.callar();
  enviar(t);
});
document.querySelectorAll("[data-rapido]").forEach((b) => b.addEventListener("click", () => { voz.callar(); enviar(b.dataset.rapido); }));
$("#nuevaConversacion").addEventListener("click", async () => {
  await api("/api/chat/reiniciar", { method: "POST" });
  $("#chat").innerHTML = "";
  mensaje("jarvis", "Conversación nueva. Sigo recordando tus datos y lo que me has pedido que recuerde.");
});

/* ================================================================ Voz (tipo JARVIS) */
const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;

const voz = {
  estado: "inactivo", // inactivo | vigilando (espera la palabra clave) | escuchando | pensando | hablando
  rec: null,
  activo: false,
  temporizador: null,
  vozElegida: null,

  iniciar() {
    if (!Reconocimiento) {
      $("#estadoVoz").textContent = "Tu navegador no permite voz: abre Jarvis con Chrome o Edge";
      $("#escuchaContinua").disabled = true;
      return;
    }
    this.rec = new Reconocimiento();
    this.rec.lang = "es-ES";
    this.rec.continuous = true;
    this.rec.interimResults = true;
    this.rec.onstart = () => { this.activo = true; };
    this.rec.onend = () => {
      this.activo = false;
      if (this.estado === "vigilando" || this.estado === "escuchando") setTimeout(() => this.arrancarRec(), 250);
    };
    this.rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        $("#escuchaContinua").checked = false;
        this.poner("inactivo");
        $("#estadoVoz").textContent = "Permite el micrófono en el navegador para hablar conmigo";
      } else if (e.error === "network") {
        $("#estadoVoz").textContent = "El reconocimiento de voz necesita internet";
      }
    };
    this.rec.onresult = (e) => this.alOir(e);
    this.cargarVoces();
    speechSynthesis.onvoiceschanged = () => this.cargarVoces();
  },

  arrancarRec() {
    if (this.activo || !this.rec) return;
    try { this.rec.start(); } catch { /* ya estaba arrancado */ }
  },

  pararRec() {
    if (this.rec && this.activo) this.rec.abort();
  },

  poner(estado) {
    this.estado = estado;
    clearTimeout(this.temporizador);
    const orbe = $("#orbe");
    orbe.className = "orbe " + { escuchando: "escuchando", pensando: "pensando", hablando: "hablando", vigilando: "en-espera" }[estado];
    const palabra = capitalizar(estadoApp.palabra_clave || "jarvis");
    $("#estadoVoz").textContent = {
      inactivo: "Pulsa el círculo para hablar",
      vigilando: `Di «${palabra}» cuando me necesites`,
      escuchando: "Te escucho…",
      pensando: "Procesando…",
      hablando: "Pulsa el círculo para interrumpirme",
    }[estado];
    if (estado === "escuchando" || estado === "vigilando") this.arrancarRec();
    else this.pararRec();
    if (estado === "escuchando") {
      this.temporizador = setTimeout(() => this.reposo(), 9000);
    }
  },

  reposo() {
    $("#transcripcion").textContent = "";
    this.poner($("#escuchaContinua").checked ? "vigilando" : "inactivo");
  },

  escuchar() {
    this.callar();
    pitido(880);
    this.poner("escuchando");
  },

  alOir(e) {
    let provisional = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const texto = e.results[i][0].transcript;
      if (!e.results[i].isFinal) { provisional += texto; continue; }
      this.procesarFrase(texto);
    }
    if (provisional && (this.estado === "escuchando" || this.estado === "vigilando")) {
      $("#transcripcion").textContent = provisional;
      if (this.estado === "escuchando") { clearTimeout(this.temporizador); this.temporizador = setTimeout(() => this.reposo(), 9000); }
    }
  },

  procesarFrase(texto) {
    const { encontrada, resto } = separarPalabraClave(texto);
    if (this.estado === "escuchando") {
      const orden = encontrada ? resto : texto.trim();
      if (orden.length > 1) { $("#transcripcion").textContent = ""; enviar(orden); }
    } else if (this.estado === "vigilando" && encontrada) {
      if (resto.length > 2) { pitido(880); $("#transcripcion").textContent = ""; enviar(resto); }
      else this.escuchar();
    }
  },

  trasResponder() {
    // En manos libres, deja unos segundos para contestar sin repetir la palabra clave (como una conversación).
    if ($("#escuchaContinua").checked) this.poner("escuchando");
    else this.poner("inactivo");
  },

  cargarVoces() {
    const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("es"));
    if (!voces.length) return;
    const preferida = guardado.leer("voz", null);
    const porDefecto = voces.find((v) => /pablo|alvaro|álvaro|jorge|raul|raúl/i.test(v.name))
      || voces.find((v) => v.lang === "es-ES" && /google/i.test(v.name)) || voces.find((v) => v.lang === "es-ES") || voces[0];
    this.vozElegida = voces.find((v) => v.name === preferida) || porDefecto;
    $("#selectorVoz").innerHTML = voces.map((v) => `<option ${v === this.vozElegida ? "selected" : ""}>${esc(v.name)}</option>`).join("");
  },

  decir(texto, alTerminar = () => {}) {
    speechSynthesis.cancel();
    const limpio = texto.replace(/https?:\/\/\S+/g, "").replace(/[*_#`>|]/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
    const frases = limpio.split(/(?<=[.!?;:])\s+/).filter((f) => f.trim());
    if (!frases.length) return alTerminar();
    this.poner("hablando");
    let terminado = false;
    const fin = () => { if (!terminado && this.estado === "hablando") { terminado = true; alTerminar(); } };
    frases.forEach((frase, i) => {
      const u = new SpeechSynthesisUtterance(frase);
      u.lang = "es-ES";
      if (this.vozElegida) u.voice = this.vozElegida;
      u.rate = 1.05;
      u.pitch = 0.9;
      if (i === frases.length - 1) u.onend = fin;
      speechSynthesis.speak(u);
    });
    // Red de seguridad: algunos navegadores no avisan cuando terminan de hablar.
    setTimeout(fin, 3000 + limpio.length * 90);
  },

  callar() {
    if (this.estado === "hablando") { speechSynthesis.cancel(); this.estado = "inactivo"; }
  },
};

function normalizar(t) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function separarPalabraClave(texto) {
  const clave = normalizar(estadoApp.palabra_clave || "jarvis");
  const variantes = [clave, ...(clave === "jarvis" ? ["yarvis", "jarvi", "harvis", "jarbis", "yarbis", "charvis", "jervis"] : [])];
  const sinTildes = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const v of variantes) {
    const m = new RegExp(`(^|[^a-z])${v}([^a-z]|$)`, "i").exec(sinTildes);
    if (m) {
      // Se corta el texto original (con tildes) por la misma posición.
      const fin = m.index + m[1].length + v.length;
      const resto = cortarDesde(texto, fin);
      return { encontrada: true, resto: resto.replace(/^[\s,.:;!?¡¿]+/, "").trim() };
    }
  }
  return { encontrada: false, resto: texto };
}

function cortarDesde(texto, posicionSinTildes) {
  // Avanza por el texto original contando solo los caracteres que no son tildes combinadas.
  const nfd = texto.normalize("NFD");
  let cuenta = 0, i = 0;
  while (i < nfd.length && cuenta < posicionSinTildes) {
    if (!/[\u0300-\u036f]/.test(nfd[i])) cuenta++;
    i++;
  }
  while (i < nfd.length && /[\u0300-\u036f]/.test(nfd[i])) i++;
  return nfd.slice(i).normalize("NFC");
}

let audioCtx;
function pitido(freq) {
  try {
    audioCtx = audioCtx || new AudioContext();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; o.type = "sine";
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.25);
  } catch { /* sin audio */ }
}

$("#orbe").addEventListener("click", () => {
  if (!voz.rec) return aviso("Abre Jarvis en Chrome o Edge para usar la voz");
  if (voz.estado === "hablando") return voz.escuchar();
  if (voz.estado === "escuchando") return voz.reposo();
  if (voz.estado !== "pensando") voz.escuchar();
});
$("#escuchaContinua").addEventListener("change", (e) => {
  guardado.escribir("manosLibres", e.target.checked);
  if (voz.estado === "inactivo" || voz.estado === "vigilando") voz.reposo();
});
$("#leerRespuestas").addEventListener("change", (e) => {
  guardado.escribir("leer", e.target.checked);
  if (!e.target.checked) speechSynthesis.cancel();
});
$("#selectorVoz").addEventListener("change", (e) => {
  guardado.escribir("voz", e.target.value);
  voz.cargarVoces();
  voz.decir("Así sueno ahora.", () => voz.reposo());
});

/* ================================================================ Arranque */
(async function arrancar() {
  $("#leerRespuestas").checked = guardado.leer("leer", true);
  $("#escuchaContinua").checked = guardado.leer("manosLibres", false);
  await cargarEstado().catch(() => {});
  voz.iniciar();
  if (voz.rec) voz.reposo();
  refrescar();
  const pestana = guardado.leer("pestana", "jarvis");
  document.querySelector(`.tab[data-seccion="${pestana}"]`)?.click();
  if (!$("#chat").children.length) {
    mensaje("jarvis", `A su servicio${estadoApp.usuario ? ", " + estadoApp.usuario : ""}. Puedes hablarme pulsando el círculo, `
      + "activar el modo manos libres o escribirme. Cuéntame cuánto dinero tienes ahora mismo y empezamos.");
  }
})();
