// Servidor de Jaque Arena: API REST (cuentas, monedas, ranking, compras) + partidas en tiempo real (Socket.IO).
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { CONFIG } from "./config.js";
import {
  borrarUsuario, cobrarBonusDiario, crearUsuario, publico, ranking, registrarCompra, resumenAdmin,
  usuarioPorId, usuarioPorToken,
} from "./db.js";
import { comprasConfiguradas, verificarCompra } from "./googleplay.js";
import { Arena } from "./juego.js";
import { PRIVACIDAD } from "./privacidad.js";

export function crearServidor() {
  const app = express();
  app.use(express.json({ limit: "20kb" }));
  app.use((req, res, next) => {
    // La app de Android se sirve desde su propio origen (https://localhost), así que se permite CORS.
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  const autenticar = (req, res, next) => {
    const token = (req.get("Authorization") || "").replace(/^Bearer /, "");
    req.usuario = usuarioPorToken(token);
    if (!req.usuario) return res.status(401).json({ error: "Sesión no válida" });
    next();
  };

  app.get("/", (req, res) => res.json({ ok: true, app: "Jaque Arena" }));
  app.get("/privacidad", (req, res) => res.type("html").send(PRIVACIDAD));

  app.get("/api/config", (req, res) => res.json({
    mesas: CONFIG.mesas,
    comision: CONFIG.comision,
    minutos: CONFIG.minutosPorJugador,
    incremento: CONFIG.incrementoSegundos,
    bonusDiario: CONFIG.bonusDiario,
    paquetes: CONFIG.paquetesMonedas,
    compras: comprasConfiguradas(),
  }));

  app.post("/api/registro", (req, res) => {
    const { token, usuario } = crearUsuario(req.body?.nombre);
    res.json({ token, usuario: publico(usuario) });
  });

  app.get("/api/yo", autenticar, (req, res) => res.json({
    usuario: publico(req.usuario),
    bonusDisponible: req.usuario.ultimo_bonus !== new Date().toISOString().slice(0, 10),
  }));

  app.post("/api/bonus", autenticar, (req, res) => {
    const r = cobrarBonusDiario(req.usuario.id);
    res.json({ ok: r.ok, usuario: publico(r.usuario) });
  });

  app.get("/api/ranking", (req, res) => res.json(ranking()));

  app.post("/api/compras/google", autenticar, async (req, res) => {
    const { productId, purchaseToken } = req.body || {};
    const monedas = CONFIG.paquetesMonedas[productId];
    if (!monedas || !purchaseToken) return res.status(400).json({ error: "Compra no válida" });
    try {
      if (!(await verificarCompra(productId, purchaseToken))) return res.status(402).json({ error: "Google no confirma el pago" });
      registrarCompra(String(purchaseToken), req.usuario.id, productId, monedas);
      res.json({ ok: true, usuario: publico(usuarioPorId(req.usuario.id)) });
    } catch (e) {
      res.status(503).json({ error: e.message });
    }
  });

  app.delete("/api/cuenta", autenticar, (req, res) => {
    if (arena.partidaDe.has(req.usuario.id)) return res.status(409).json({ error: "Termina tu partida antes de borrar la cuenta" });
    arena.cancelarBusqueda(req.usuario.id);
    borrarUsuario(req.usuario.id);
    res.json({ ok: true });
  });

  app.get("/api/admin/resumen", (req, res) => {
    if (!CONFIG.claveAdmin || req.get("Authorization") !== `Bearer ${CONFIG.claveAdmin}`) {
      return res.status(403).json({ error: "No autorizado" });
    }
    res.json(resumenAdmin());
  });

  const servidor = http.createServer(app);
  const io = new Server(servidor, { cors: { origin: "*" } });
  const arena = new Arena(io);

  io.use((socket, next) => {
    const usuario = usuarioPorToken(socket.handshake.auth?.token);
    if (!usuario) return next(new Error("Sesión no válida"));
    socket.data.usuarioId = usuario.id;
    next();
  });

  io.on("connection", (socket) => {
    const uid = socket.data.usuarioId;
    socket.join(`u:${uid}`);
    arena.conectado(uid);

    // Cada acción responde con un error legible si algo falla.
    const accion = (nombre, fn) => socket.on(nombre, (datos = {}) => {
      try {
        fn(datos);
      } catch (e) {
        socket.emit("error_msg", { accion: nombre, mensaje: e.message });
      }
    });

    accion("buscar", (d) => arena.buscar(uid, d.apuesta));
    accion("cancelar_busqueda", () => { arena.cancelarBusqueda(uid); socket.emit("busqueda_cancelada", {}); });
    accion("mover", (d) => arena.partidaActiva(uid, d.id).mover(uid, d));
    accion("rendirse", (d) => arena.partidaActiva(uid, d.id).rendirse(uid));
    accion("ofrecer_tablas", (d) => arena.partidaActiva(uid, d.id).ofrecerTablas(uid));
    accion("rechazar_tablas", (d) => arena.partidaActiva(uid, d.id).rechazarTablas(uid));

    socket.on("disconnect", async () => {
      const quedan = (await io.in(`u:${uid}`).fetchSockets()).length > 0;
      arena.desconectado(uid, quedan);
    });
  });

  return { app, servidor, io, arena };
}
