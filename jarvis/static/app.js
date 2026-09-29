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
  const cargas = { jarvis: cargarPanorama, dinero: cargarDinero, habitos: cargarHabitos, tareas: cargarTareas, ajustes: cargarMemoria };
  (seccion ? [cargas[seccion]] : Object.values(cargas)).forEach((f) => f && f().catch((e) => console.error(e)));
}

/* ================================================================ Estado y panorama */
let estadoApp = {};
async function cargarEstado() {
  estadoApp = await api("/api/estado");
  const filas = [
    ["Cerebro", estadoApp.cerebro.ok, estadoApp.cerebro.motivo],
  ];
  $("#conexiones").innerHTML = filas.map(([n, ok, det]) => `<div title="${esc(det)}"><span class="punto ${ok ? "ok" : ""}"></span>${n}</div>`).join("");
  $("#detalleConexiones").innerHTML = filas.map(([n, ok, det]) =>
    `<div class="interruptor"><span class="punto ${ok ? "ok" : ""}"></span>${n}: ${esc(det)}</div>`).join("");
  $("#palabraClave").textContent = capitalizar(estadoApp.palabra_clave || "jarvis");
  if (!estadoApp.cerebro.ok) mensaje("jarvis", "Todavía no puedo pensar: " + estadoApp.cerebro.motivo + ". Mira el README.", { error: true });
}
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

async function cargarPanorama() {
  const p = await api("/api/panorama");
  const habitos = Object.entries(p.habitos);
  const buenos = habitos.filter(([, h]) => h.tipo === "bueno");
  const malos = habitos.filter(([, h]) => h.tipo === "malo");
  const hechosHoy = buenos.filter(([, h]) => h.cumplido_hoy).length;
  const mejorRacha = buenos.sort((a, b) => b[1].racha_dias - a[1].racha_dias)[0];
  const peorMalo = malos.sort((a, b) => a[1].dias_sin_caer - b[1].dias_sin_caer)[0];
  $("#miniPanel").innerHTML = [
    buenos.length ? tarjeta("Hábitos de hoy", `${hechosHoy} / ${buenos.length}`,
      mejorRacha ? `Mejor racha: ${mejorRacha[0]}, ${mejorRacha[1].racha_dias} ${mejorRacha[1].racha_dias === 1 ? "día" : "días"}` : "", hechosHoy === buenos.length ? "positivo" : "")
      : tarjeta("Hábitos", "—", "Aún no sigues ninguno"),
    peorMalo ? tarjeta(`Sin ${peorMalo[0]}`, `${peorMalo[1].dias_sin_caer} días`, `Hoy: ${peorMalo[1].hoy}`, peorMalo[1].limite_superado_hoy ? "negativo" : "positivo") : "",
    tarjeta("Saldo", euros.format(p.dinero.saldo_actual), `Gastos 30 días: ${euros.format(p.dinero.gastos_periodo)}`, p.dinero.saldo_actual < 0 ? "negativo" : ""),
    tarjeta("Tareas pendientes", p.tareas_pendientes, p.tareas_vencidas.length ? `${p.tareas_vencidas.length} vencida(s)` : "Nada vencido", p.tareas_vencidas.length ? "negativo" : ""),
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

/* ================================================================ Hábitos */
function tarjetaHabito(nombre, x) {
  const borrar = `<button class="peligro" data-borrar-habito="${x.id}" data-nombre="${esc(nombre)}" title="Dejar de seguir">✕</button>`;
  const objetivo = x.objetivo ? `<div class="sub">🎯 ${esc(x.objetivo)}</div>` : "";
  if (x.tipo === "bueno") {
    const meta = x.meta_diaria ? ` / ${x.meta_diaria}` : "";
    return `<div class="tarjeta habito bueno ${x.cumplido_hoy ? "cumplido" : ""}">
      <h4>${esc(nombre)} ${borrar}</h4>
      <div class="racha">${x.racha_dias} ${x.racha_dias === 1 ? "día" : "días"}</div><div class="meta">de racha${x.cumplido_hoy ? " · ✓ hecho hoy" : " · pendiente hoy"}</div>
      ${objetivo}
      <div class="datos">
        <span>Hoy: <b>${x.hoy}</b>${meta}</span>
        <span>Cumplido 7 d: <b>${x.dias_cumplidos_7}/7</b></span>
        <span>Cumplido 30 d: <b>${x.dias_cumplidos_30}/30</b></span>
        <span>Total 30 d: <b>${x.ultimos_30_dias}</b></span>
      </div>
      <div class="acciones-habito">
        <input type="number" min="0" step="0.5" value="1" data-cantidad="${esc(nombre)}" title="Cantidad">
        <button class="mini" data-apuntar="${esc(nombre)}">✓ Hecho</button>
      </div></div>`;
  }
  return `<div class="tarjeta habito malo ${x.limite_superado_hoy ? "alerta" : ""}">
    <h4>${esc(nombre)} ${borrar}</h4>
    <div class="racha">${x.dias_sin_caer} días</div><div class="meta">sin caer${x.ultima_vez ? " · última vez " + fechaCorta(x.ultima_vez) : ""}</div>
    ${objetivo}
    <div class="datos">
      <span>Hoy: <b>${x.hoy}</b>${x.meta_diaria !== null ? " / " + x.meta_diaria : ""}</span>
      <span>7 días: <b>${x.ultimos_7_dias}</b></span>
      <span>30 días: <b>${x.ultimos_30_dias}</b></span>
      <span>Coste 30 d: <b>${euros.format(x.dinero_gastado_30_dias)}</b></span>
    </div>
    <div class="acciones-habito">
      <input placeholder="¿Qué lo provocó?" data-nota="${esc(nombre)}">
      <button class="mini" data-apuntar="${esc(nombre)}">+1 He caído</button>
    </div></div>`;
}

async function cargarHabitos() {
  const h = Object.entries(await api("/api/habitos"));
  $("#rejillaBuenos").innerHTML = h.filter(([, x]) => x.tipo === "bueno").map(([n, x]) => tarjetaHabito(n, x)).join("")
    || `<p class="ayuda">Añade un buen hábito abajo (gimnasio, leer, beber agua…) o díselo a Jarvis.</p>`;
  $("#rejillaMalos").innerHTML = h.filter(([, x]) => x.tipo === "malo").map(([n, x]) => tarjetaHabito(n, x)).join("")
    || `<p class="ayuda">Ninguno. Si quieres dejar algo (tabaco, alcohol, apuestas…), añádelo abajo.</p>`;
}

$("#habitos").addEventListener("click", async (e) => {
  const nombre = e.target.dataset.apuntar;
  if (nombre) {
    const sel = CSS.escape(nombre);
    const nota = document.querySelector(`[data-nota="${sel}"]`)?.value || "";
    const cantidad = Number(document.querySelector(`[data-cantidad="${sel}"]`)?.value || 1);
    await api("/api/habitos/registrar", { method: "POST", body: { nombre, nota, cantidad } });
    aviso(e.target.closest(".malo") ? "Apuntado. Una caída no borra tu progreso: mañana es otro día." : "¡Bien hecho! Sigue así.");
    cargarHabitos(); cargarPanorama();
  }
  const id = e.target.dataset.borrarHabito;
  if (id && confirm(`¿Dejar de seguir «${e.target.dataset.nombre}» y borrar su historial?`)) {
    await api(`/api/habitos/${id}`, { method: "DELETE" }); cargarHabitos(); cargarPanorama();
  }
});
$("#formHabito [name=tipo]").addEventListener("change", (e) => {
  const malo = e.target.value === "malo";
  $("#metaHabito").placeholder = malo ? "Límite al día (0 = dejarlo)" : "Meta al día";
  $("#costeHabito").hidden = !malo;
});
$("#formHabito").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/habitos", { method: "POST", body: Object.fromEntries(new FormData(e.target)) });
    const tipo = e.target.tipo.value;
    e.target.reset(); e.target.tipo.value = tipo;
    cargarHabitos(); cargarPanorama();
  } catch (err) { aviso(err.message); }
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
  borrar_movimiento: "movimiento borrado", registrar_habito: "hábito apuntado", configurar_habito: "hábito configurado",
  estado_habitos: "consulta de hábitos", crear_tarea: "tarea creada", completar_tarea: "tarea actualizada",
  listar_tareas: "consulta de tareas", borrar_tarea: "tarea borrada", recordar: "guardado en memoria", olvidar: "recuerdo borrado",
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
      + "activar el modo manos libres o escribirme. Dime qué hábito quieres empezar o cuál quieres dejar, y empezamos.");
  }
})();
