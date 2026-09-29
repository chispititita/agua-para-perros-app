import { Chess } from "chess.js";
import { api, conectarSocket, sesion, SERVIDOR } from "./api.js";
import { glifo, Tablero } from "./tablero.js";
import { comprar, iniciarTienda, precio, tiendaDisponible } from "./tienda.js";

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Number(n).toLocaleString("es-ES");

const estado = {
  usuario: null,
  config: null,
  socket: null,
  modo: null, // 'online' | 'maquina'
  partida: null, // datos de la partida online
  chess: new Chess(),
  ultima: null,
  relojes: null, // { w, b, momento, enMarcha }
  miColor: "w",
  nivel: 2,
  terminada: false,
};

/* ================================================================ Navegación */
let pantallaActual = null;
function mostrar(nombre, { historial = true } = {}) {
  document.querySelectorAll(".pantalla").forEach((p) => p.classList.toggle("activa", p.id === `p-${nombre}`));
  if (historial && pantallaActual && pantallaActual !== nombre) history.pushState({ p: nombre }, "");
  pantallaActual = nombre;
  if (nombre === "inicio") refrescarInicio();
  if (nombre === "mesas") pintarMesas();
  if (nombre === "ranking") cargarRanking();
  if (nombre === "tienda") pintarTienda();
  if (nombre === "perfil") pintarPerfil();
}

window.addEventListener("popstate", () => {
  // Botón «atrás» de Android.
  if (pantallaActual === "partida" && !estado.terminada) {
    history.pushState({ p: "partida" }, "");
    return toast("Para salir de la partida, pulsa Rendirse");
  }
  if (pantallaActual === "buscando") estado.socket?.emit("cancelar_busqueda");
  mostrar(pantallaActual === "inicio" || pantallaActual === "bienvenida" ? pantallaActual : "inicio", { historial: false });
});

document.addEventListener("click", (e) => {
  const destino = e.target.closest("[data-ir]")?.dataset.ir;
  if (destino) mostrar(destino);
});

function toast(texto) {
  const t = $("#toast");
  t.textContent = texto;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 3000);
}

function modal(titulo, texto, botones = [{ texto: "Aceptar" }]) {
  return new Promise((resolve) => {
    $("#modal-titulo").textContent = titulo;
    $("#modal-texto").innerHTML = texto;
    $("#modal-botones").innerHTML = "";
    botones.forEach((b, i) => {
      const el = document.createElement("button");
      el.className = `boton ${b.clase || (i === botones.length - 1 ? "oro" : "")}`;
      el.textContent = b.texto;
      el.onclick = () => { $("#modal").hidden = true; resolve(b.valor ?? i); };
      $("#modal-botones").appendChild(el);
    });
    $("#modal").hidden = false;
  });
}

function actualizarUsuario(u) {
  if (!u) return;
  estado.usuario = u;
  $("#i-nombre").textContent = u.nombre;
  $("#i-elo").textContent = `ELO ${u.elo}`;
  $("#i-monedas").textContent = fmt(u.monedas);
  document.querySelectorAll(".monedas").forEach((el) => (el.textContent = fmt(u.monedas)));
}

/* ================================================================ Inicio y cuenta */
async function refrescarInicio() {
  try {
    const r = await api("/api/yo");
    actualizarUsuario(r.usuario);
    $("#b-bonus").hidden = !r.bonusDisponible;
    $("#i-bonus").textContent = fmt(estado.config?.bonusDiario ?? 0);
  } catch (e) {
    if (e.status === 401) { sesion.token = null; mostrar("bienvenida"); }
  }
}

$("#b-bonus").addEventListener("click", async () => {
  const r = await api("/api/bonus", { metodo: "POST" }).catch((e) => toast(e.message));
  if (r?.ok) { actualizarUsuario(r.usuario); toast(`+${fmt(estado.config.bonusDiario)} monedas`); }
  $("#b-bonus").hidden = true;
});

$("#form-nombre").addEventListener("submit", async (e) => {
  e.preventDefault();
  const boton = e.target.querySelector("button");
  boton.disabled = true;
  try {
    const r = await api("/api/registro", { metodo: "POST", datos: { nombre: $("#nombre").value } });
    sesion.token = r.token;
    actualizarUsuario(r.usuario);
    conectar();
    mostrar("inicio");
  } catch (err) {
    toast(err.message);
  }
  boton.disabled = false;
});

function pintarPerfil() {
  const u = estado.usuario;
  const derrotas = u.partidas - u.victorias;
  $("#datos-perfil").innerHTML = `<h2>${esc(u.nombre)}</h2>
    <p>ELO: <b>${u.elo}</b></p><p>Monedas: <b>${fmt(u.monedas)}</b></p>
    <p>Partidas online: <b>${u.partidas}</b> · Victorias: <b>${u.victorias}</b> · Resto: <b>${derrotas}</b></p>`;
  $("#enlace-privacidad").href = `${SERVIDOR}/privacidad`;
}

$("#b-borrar-cuenta").addEventListener("click", async () => {
  const ok = await modal("Borrar cuenta", "Se borrarán tu nombre y tus monedas. No se puede deshacer.",
    [{ texto: "Cancelar", valor: false }, { texto: "Borrar", valor: true, clase: "peligro" }]);
  if (!ok) return;
  try {
    await api("/api/cuenta", { metodo: "DELETE" });
    sesion.token = null;
    estado.socket?.disconnect();
    mostrar("bienvenida");
  } catch (e) { toast(e.message); }
});

/* ================================================================ Mesas y emparejamiento */
function pintarMesas() {
  const c = estado.config;
  $("#texto-mesas").textContent = `Partidas de ${c.minutos} min + ${c.incremento} s. El ganador se lleva el bote ` +
    `menos un ${Math.round(c.comision * 100)} % de comisión.`;
  $("#lista-mesas").innerHTML = c.mesas.map((m) => {
    const premio = m * 2 - Math.round(m * 2 * c.comision);
    const puede = estado.usuario.monedas >= m;
    return `<button class="mesa ${puede ? "" : "bloqueada"}" data-mesa="${m}">
      <span class="apuesta"><span class="moneda">●</span> ${fmt(m)}</span>
      <span class="premio">Ganas ${fmt(premio)}</span></button>`;
  }).join("");
}

$("#lista-mesas").addEventListener("click", (e) => {
  const mesa = Number(e.target.closest("[data-mesa]")?.dataset.mesa);
  if (!mesa) return;
  if (estado.usuario.monedas < mesa) return toast("No tienes monedas suficientes. Consigue más en la Tienda.");
  if (!estado.socket?.connected) return toast("Sin conexión con el servidor");
  estado.socket.emit("buscar", { apuesta: mesa });
});

$("#b-cancelar-busqueda").addEventListener("click", () => estado.socket?.emit("cancelar_busqueda"));

/* ================================================================ Conexión en tiempo real */
function conectar() {
  estado.socket?.disconnect();
  const s = conectarSocket();
  estado.socket = s;
  s.on("connect", () => ($("#i-conexion").textContent = ""));
  s.on("connect_error", (e) => {
    $("#i-conexion").textContent = "Sin conexión con el servidor. Reintentando…";
    if (e.message === "Sesión no válida") { sesion.token = null; s.disconnect(); mostrar("bienvenida"); }
  });
  s.on("buscando", ({ apuesta }) => {
    $("#texto-buscando").textContent = `Mesa de ${fmt(apuesta)} monedas`;
    mostrar("buscando");
  });
  s.on("busqueda_cancelada", () => { if (pantallaActual === "buscando") mostrar("mesas"); });
  s.on("error_msg", ({ mensaje }) => toast(mensaje));
  s.on("partida", (p) => abrirPartidaOnline(p));
  s.on("movimiento", (m) => {
    if (estado.modo !== "online" || m.id !== estado.partida?.id) return;
    if (estado.chess.fen() !== m.fen) {
      // Mi propia jugada ya estaba aplicada; la del rival se aplica ahora. Si algo no cuadra, manda el servidor.
      try { estado.chess.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch { /* se corrige abajo */ }
      if (estado.chess.fen() !== m.fen) estado.chess.load(m.fen);
    }
    estado.ultima = { from: m.from, to: m.to };
    estado.relojes = { ...m.relojes, momento: Date.now(), enMarcha: m.relojEnMarcha };
    $("#p-aviso").textContent = "";
    pintarPartida();
  });
  s.on("tablas_ofrecidas", async () => {
    const acepta = await modal("Oferta de tablas", "Tu rival te ofrece tablas. ¿Aceptas?",
      [{ texto: "Rechazar", valor: false }, { texto: "Aceptar", valor: true }]);
    s.emit(acepta ? "ofrecer_tablas" : "rechazar_tablas", { id: estado.partida.id });
  });
  s.on("tablas_rechazadas", () => toast("Tu rival ha rechazado las tablas"));
  s.on("rival_desconectado", ({ segundos }) => {
    $("#p-aviso").textContent = `Tu rival se ha desconectado. Si no vuelve en ${segundos} s, ganas.`;
  });
  s.on("fin", finOnline);
}

/* ================================================================ Partida (online y contra la máquina) */
const tablero = new Tablero($("#tablero"), {
  alMover: (jugada) => (estado.modo === "online" ? moverOnline(jugada) : moverContraMaquina(jugada)),
  elegirPromocion,
});

function elegirPromocion(color) {
  return new Promise((resolve) => {
    const caja = $("#promocion-piezas");
    caja.innerHTML = ["q", "r", "b", "n"].map((t) =>
      `<button class="pieza ${color === "w" ? "blanca" : "negra"}" data-t="${t}">${glifo(t)}</button>`).join("");
    $("#promocion").hidden = false;
    caja.onclick = (e) => {
      const t = e.target.closest("[data-t]")?.dataset.t;
      if (!t) return;
      $("#promocion").hidden = true;
      resolve(t);
    };
  });
}

function abrirPartidaOnline(p) {
  estado.modo = "online";
  estado.partida = p;
  estado.terminada = false;
  estado.miColor = p.color;
  estado.chess = new Chess();
  p.jugadas.forEach((j) => estado.chess.move(j.san));
  const ult = p.jugadas.at(-1);
  estado.ultima = ult ? { from: ult.from, to: ult.to } : null;
  estado.relojes = { ...p.relojes, momento: Date.now(), enMarcha: p.relojEnMarcha };
  $("#p-yo-nombre").textContent = p.yo.nombre;
  $("#p-yo-elo").textContent = `(${p.yo.elo})`;
  $("#p-rival-nombre").textContent = p.rival.nombre;
  $("#p-rival-elo").textContent = `(${p.rival.elo})`;
  $("#p-bote").innerHTML = `Bote <span class="moneda">●</span> <b>${fmt(p.bote)}</b> · el ganador se lleva <b>${fmt(p.premio)}</b>`;
  $("#p-aviso").textContent = p.jugadas.length < 2 ? "Haz tu primera jugada en 30 s o la partida se anula" : "";
  $("#b-tablas").hidden = false;
  mostrar("partida");
  pintarPartida();
}

function moverOnline(jugada) {
  estado.socket.emit("mover", { id: estado.partida.id, ...jugada });
  // Se aplica al momento para que se sienta rápido; el servidor lo confirma o lo corrige.
  try { estado.chess.move(jugada); estado.ultima = jugada; } catch { /* el servidor avisará */ }
  pintarPartida();
}

function pintarPartida() {
  tablero.poner(estado.chess, { miColor: estado.miColor, ultima: estado.ultima, bloqueado: estado.terminada });
  const historia = estado.chess.history();
  $("#p-jugadas").innerHTML = historia.map((san, i) => (i % 2 === 0 ? `<span class="num">${i / 2 + 1}.</span>` : "") +
    `<span>${esc(san)}</span>`).join(" ");
  $("#p-jugadas").scrollLeft = $("#p-jugadas").scrollWidth;
  const miTurno = estado.chess.turn() === estado.miColor && !estado.terminada;
  document.querySelector(".jugador.yo").classList.toggle("turno", miTurno);
  document.querySelector(".jugador.rival").classList.toggle("turno", !miTurno && !estado.terminada);
  pintarRelojes();
}

function formatoReloj(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function pintarRelojes() {
  const r = estado.relojes;
  if (estado.modo !== "online" || !r) {
    $("#p-reloj-yo").textContent = $("#p-reloj-rival").textContent = "∞";
    return;
  }
  const actual = { w: r.w, b: r.b };
  if (r.enMarcha && !estado.terminada) actual[estado.chess.turn()] -= Date.now() - r.momento;
  const rival = estado.miColor === "w" ? "b" : "w";
  $("#p-reloj-yo").textContent = formatoReloj(actual[estado.miColor]);
  $("#p-reloj-rival").textContent = formatoReloj(actual[rival]);
  $("#p-reloj-yo").classList.toggle("apurado", actual[estado.miColor] < 20000);
}
setInterval(() => pantallaActual === "partida" && pintarRelojes(), 250);

async function finOnline(f) {
  estado.terminada = true;
  actualizarUsuario(f.usuario);
  pintarPartida();
  const gane = (f.resultado === "1-0" && estado.miColor === "w") || (f.resultado === "0-1" && estado.miColor === "b");
  let titulo, texto;
  if (!f.resultado) {
    titulo = "Partida anulada";
    texto = "Se ha devuelto la apuesta a los dos jugadores.";
  } else if (f.resultado === "1/2-1/2") {
    titulo = "Tablas";
    texto = `Por ${esc(f.motivo)}. Recuperas tu apuesta menos la comisión (${fmt(-f.ganancia)} monedas).`;
  } else if (gane) {
    titulo = "¡Has ganado! 🏆";
    texto = `Por ${esc(f.motivo)}. Ganas <b>+${fmt(f.ganancia)}</b> monedas.`;
  } else {
    titulo = "Has perdido";
    texto = `Por ${esc(f.motivo)}. Pierdes ${fmt(-f.ganancia)} monedas. ¡La próxima es tuya!`;
  }
  const otra = await modal(titulo, `${texto}<br><br>Saldo: <b>${fmt(f.usuario.monedas)}</b> monedas`,
    [{ texto: "Inicio", valor: false }, { texto: "Otra partida", valor: true }]);
  if (otra && estado.usuario.monedas >= estado.partida.apuesta) estado.socket.emit("buscar", { apuesta: estado.partida.apuesta });
  else mostrar(otra ? "mesas" : "inicio");
}

$("#b-rendirse").addEventListener("click", async () => {
  if (estado.terminada) return mostrar("inicio");
  const ok = await modal("Rendirse", "¿Seguro que quieres rendirte?", [{ texto: "No", valor: false }, { texto: "Me rindo", valor: true, clase: "peligro" }]);
  if (!ok) return;
  if (estado.modo === "online") estado.socket.emit("rendirse", { id: estado.partida.id });
  else finMaquina("Te has rendido", "La máquina gana esta vez.");
});

$("#b-tablas").addEventListener("click", () => {
  if (estado.modo !== "online" || estado.terminada) return;
  estado.socket.emit("ofrecer_tablas", { id: estado.partida.id });
  toast("Has ofrecido tablas");
});

/* ================================================================ Contra la máquina */
const motor = new Worker(new URL("./motor.worker.js", import.meta.url), { type: "module" });

document.querySelectorAll("[data-nivel]").forEach((b) => b.addEventListener("click", () => {
  estado.modo = "maquina";
  estado.nivel = Number(b.dataset.nivel);
  estado.miColor = Math.random() < 0.5 ? "w" : "b";
  estado.chess = new Chess();
  estado.ultima = null;
  estado.terminada = false;
  estado.relojes = null;
  $("#p-yo-nombre").textContent = estado.usuario?.nombre || "Tú";
  $("#p-yo-elo").textContent = "";
  $("#p-rival-nombre").textContent = `Máquina (${b.textContent})`;
  $("#p-rival-elo").textContent = "";
  $("#p-bote").textContent = "Partida de entrenamiento · sin apuestas";
  $("#p-aviso").textContent = "";
  $("#b-tablas").hidden = true;
  mostrar("partida");
  pintarPartida();
  if (estado.miColor === "b") turnoMaquina();
}));

function moverContraMaquina(jugada) {
  estado.chess.move(jugada);
  estado.ultima = jugada;
  pintarPartida();
  if (!comprobarFinMaquina()) turnoMaquina();
}

function turnoMaquina() {
  $("#p-aviso").textContent = "La máquina está pensando…";
  const inicio = Date.now();
  motor.onmessage = ({ data }) => {
    setTimeout(() => {
      if (estado.modo !== "maquina" || estado.terminada) return;
      estado.chess.move(data);
      estado.ultima = data;
      $("#p-aviso").textContent = "";
      pintarPartida();
      comprobarFinMaquina();
    }, Math.max(0, 500 - (Date.now() - inicio)));
  };
  motor.postMessage({ fen: estado.chess.fen(), nivel: estado.nivel });
}

function comprobarFinMaquina() {
  const c = estado.chess;
  if (!c.isGameOver()) return false;
  if (c.isCheckmate()) {
    const gane = c.turn() !== estado.miColor;
    finMaquina(gane ? "¡Jaque mate! Has ganado 🏆" : "Jaque mate", gane ? "Buen trabajo. Prueba un nivel más difícil." : "La máquina gana esta vez.");
  } else {
    finMaquina("Tablas", "La partida ha terminado en tablas.");
  }
  return true;
}

async function finMaquina(titulo, texto) {
  estado.terminada = true;
  pintarPartida();
  const otra = await modal(titulo, texto, [{ texto: "Inicio", valor: false }, { texto: "Otra", valor: true }]);
  mostrar(otra ? "maquina" : "inicio");
}

/* ================================================================ Ranking */
async function cargarRanking() {
  $("#lista-ranking").innerHTML = "<li>Cargando…</li>";
  try {
    const lista = await api("/api/ranking");
    $("#lista-ranking").innerHTML = lista.map((j) => `<li class="${j.id === estado.usuario?.id ? "yo" : ""}">
      <span>${esc(j.nombre)}</span><b>${j.elo}</b><small>${j.victorias}/${j.partidas} victorias</small></li>`).join("")
      || "<li>Todavía no hay partidas. ¡Sé el primero!</li>";
  } catch (e) {
    $("#lista-ranking").innerHTML = `<li>${esc(e.message)}</li>`;
  }
}

/* ================================================================ Tienda */
function pintarTienda() {
  const paquetes = Object.entries(estado.config.paquetes);
  const activa = tiendaDisponible() && estado.config.compras;
  $("#lista-paquetes").innerHTML = paquetes.map(([id, monedas], i) => `
    <button class="paquete" data-producto="${id}" ${activa ? "" : "disabled"}>
      <span class="icono">${"🪙".repeat(i + 1)}</span>
      <b>${fmt(monedas)} monedas</b>
      <span class="precio">${esc(precio(id) || (activa ? "…" : "Próximamente"))}</span>
    </button>`).join("") +
    (activa ? "" : `<p class="ayuda">La tienda estará disponible en la versión de Google Play.</p>`) +
    `<button class="paquete gratis" id="b-bonus-tienda"><span class="icono">🎁</span><b>Bonus diario gratis</b><span class="precio">Cada día</span></button>`;
}

$("#lista-paquetes").addEventListener("click", async (e) => {
  if (e.target.closest("#b-bonus-tienda")) return mostrar("inicio");
  const id = e.target.closest("[data-producto]")?.dataset.producto;
  if (!id) return;
  try { await comprar(id); } catch (err) { toast(err.message); }
});

/* ================================================================ Arranque */
(async function arrancar() {
  history.replaceState({ p: "inicio" }, "");
  try {
    estado.config = await api("/api/config");
  } catch (e) {
    await modal("Sin conexión", `No se puede conectar con el servidor (${esc(SERVIDOR)}). Comprueba tu internet.`, [{ texto: "Reintentar" }]);
    return location.reload();
  }
  document.addEventListener("deviceready", () => iniciarTienda(Object.keys(estado.config.paquetes), {
    onCompra: (u) => { actualizarUsuario(u); toast("¡Monedas añadidas!"); pintarTienda(); },
    onError: (m) => toast(m),
  }), { once: true });

  if (!sesion.token) return mostrar("bienvenida", { historial: false });
  try {
    const r = await api("/api/yo");
    actualizarUsuario(r.usuario);
    conectar();
    mostrar("inicio", { historial: false });
  } catch (e) {
    if (e.status === 401) sesion.token = null;
    mostrar("bienvenida", { historial: false });
  }
})();
