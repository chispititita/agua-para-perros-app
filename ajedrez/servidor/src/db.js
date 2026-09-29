// Base de datos (SQLite). Cada movimiento de monedas queda registrado en `movimientos` para poder auditarlo.
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";

fs.mkdirSync(CONFIG.carpetaDatos, { recursive: true });
export const db = new Database(path.join(CONFIG.carpetaDatos, "jaque-arena.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  monedas INTEGER NOT NULL CHECK (monedas >= 0),
  elo INTEGER NOT NULL DEFAULT 1200,
  partidas INTEGER NOT NULL DEFAULT 0,
  victorias INTEGER NOT NULL DEFAULT 0,
  ultimo_bonus TEXT,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,              -- NULL = la casa (comisiones)
  cantidad INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  partida_id TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS partidas (
  id TEXT PRIMARY KEY,
  blancas_id INTEGER NOT NULL,
  negras_id INTEGER NOT NULL,
  apuesta INTEGER NOT NULL,
  comision INTEGER,
  resultado TEXT,                  -- '1-0', '0-1', '1/2-1/2'
  motivo TEXT,
  pgn TEXT,
  inicio TEXT NOT NULL DEFAULT (datetime('now')),
  fin TEXT
);
CREATE TABLE IF NOT EXISTS compras (
  token_compra TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  producto TEXT NOT NULL,
  monedas INTEGER NOT NULL,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS mov_usuario ON movimientos (usuario_id);
`);

const q = {
  crear: db.prepare("INSERT INTO usuarios (token, nombre, monedas) VALUES (?, ?, ?)"),
  porToken: db.prepare("SELECT * FROM usuarios WHERE token = ?"),
  porId: db.prepare("SELECT * FROM usuarios WHERE id = ?"),
  sumar: db.prepare("UPDATE usuarios SET monedas = monedas + ? WHERE id = ?"),
  movimiento: db.prepare("INSERT INTO movimientos (usuario_id, cantidad, motivo, partida_id) VALUES (?, ?, ?, ?)"),
};

export function limpiarNombre(nombre) {
  const limpio = String(nombre || "").replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 20);
  return limpio.length >= 2 ? limpio : `Jugador${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function publico(u) {
  return u && { id: u.id, nombre: u.nombre, monedas: u.monedas, elo: u.elo, partidas: u.partidas, victorias: u.victorias };
}

export const crearUsuario = db.transaction((nombre) => {
  const token = crypto.randomBytes(32).toString("hex");
  const { lastInsertRowid } = q.crear.run(token, limpiarNombre(nombre), CONFIG.monedasIniciales);
  q.movimiento.run(lastInsertRowid, CONFIG.monedasIniciales, "regalo de bienvenida", null);
  return { token, usuario: q.porId.get(lastInsertRowid) };
});

export const usuarioPorToken = (token) => (token ? q.porToken.get(String(token)) : undefined);
export const usuarioPorId = (id) => q.porId.get(id);

/** Suma (o resta, si es negativa) monedas y lo apunta. Falla si el saldo quedaría negativo. */
export function moverMonedas(usuarioId, cantidad, motivo, partidaId = null) {
  if (usuarioId !== null) q.sumar.run(cantidad, usuarioId);
  q.movimiento.run(usuarioId, cantidad, motivo, partidaId);
}

export const cobrarBonusDiario = db.transaction((usuarioId) => {
  const u = q.porId.get(usuarioId);
  const hoy = new Date().toISOString().slice(0, 10);
  if (u.ultimo_bonus === hoy) return { ok: false, usuario: u };
  db.prepare("UPDATE usuarios SET ultimo_bonus = ? WHERE id = ?").run(hoy, usuarioId);
  moverMonedas(usuarioId, CONFIG.bonusDiario, "bonus diario");
  return { ok: true, usuario: q.porId.get(usuarioId) };
});

export function ranking(limite = 50) {
  return db.prepare("SELECT id, nombre, elo, partidas, victorias FROM usuarios WHERE partidas > 0 " +
    "ORDER BY elo DESC LIMIT ?").all(limite);
}

export const borrarUsuario = db.transaction((usuarioId) => {
  // Se anonimiza en vez de borrar para no romper el historial de partidas de los rivales.
  db.prepare("UPDATE usuarios SET token = ?, nombre = 'Cuenta borrada', monedas = 0 WHERE id = ?")
    .run(`borrado-${crypto.randomBytes(16).toString("hex")}`, usuarioId);
});

export const registrarCompra = db.transaction((tokenCompra, usuarioId, producto, monedas) => {
  const ya = db.prepare("SELECT 1 FROM compras WHERE token_compra = ?").get(tokenCompra);
  if (ya) return false;
  db.prepare("INSERT INTO compras (token_compra, usuario_id, producto, monedas) VALUES (?, ?, ?, ?)")
    .run(tokenCompra, usuarioId, producto, monedas);
  moverMonedas(usuarioId, monedas, `compra ${producto}`);
  return true;
});

export function resumenAdmin() {
  const uno = (sql) => db.prepare(sql).get();
  return {
    usuarios: uno("SELECT COUNT(*) n FROM usuarios").n,
    partidas_terminadas: uno("SELECT COUNT(*) n FROM partidas WHERE fin IS NOT NULL").n,
    comisiones_totales_monedas: uno("SELECT COALESCE(SUM(cantidad),0) n FROM movimientos WHERE usuario_id IS NULL").n,
    comisiones_hoy_monedas: uno("SELECT COALESCE(SUM(cantidad),0) n FROM movimientos WHERE usuario_id IS NULL AND fecha >= date('now')").n,
    compras: uno("SELECT COUNT(*) n, COALESCE(SUM(monedas),0) monedas FROM compras"),
    monedas_en_circulacion: uno("SELECT COALESCE(SUM(monedas),0) n FROM usuarios").n,
  };
}
