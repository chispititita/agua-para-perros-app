// Pruebas de extremo a extremo: dos clientes reales juegan contra el servidor.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { io as conectar } from "socket.io-client";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jaque-"));
process.env.MINUTOS = "0.05"; // 3 segundos por jugador, para probar la derrota por tiempo
process.env.INCREMENTO = "0";
process.env.GRACIA_DESCONEXION = "1";
process.env.ADMIN_KEY = "clave-test";

const { crearServidor } = await import("../src/index.js");
const { servidor } = crearServidor();
let base;

before(async () => {
  await new Promise((r) => servidor.listen(0, r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

const api = async (ruta, { token, ...opciones } = {}) => {
  const r = await fetch(base + ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return { status: r.status, json: await r.json() };
};

const esperar = (socket, evento) => new Promise((resolve) => socket.once(evento, resolve));

async function jugador(nombre) {
  const { json } = await api("/api/registro", { method: "POST", body: JSON.stringify({ nombre }) });
  const socket = conectar(base, { auth: { token: json.token }, transports: ["websocket"] });
  await esperar(socket, "connect");
  return { ...json, socket };
}

async function emparejar(apuesta = 100) {
  const a = await jugador("Ana");
  const b = await jugador("Beto");
  const pa = esperar(a.socket, "partida");
  const pb = esperar(b.socket, "partida");
  a.socket.emit("buscar", { apuesta });
  await esperar(a.socket, "buscando");
  b.socket.emit("buscar", { apuesta });
  const [ea, eb] = await Promise.all([pa, pb]);
  const [blancas, negras] = ea.color === "w" ? [a, b] : [b, a];
  return { blancas, negras, id: ea.id, estado: ea, estadoB: eb };
}

async function jugar(p, jugadas) {
  let turno = p.blancas;
  for (const [from, to] of jugadas) {
    const aviso = esperar(p.blancas.socket, "movimiento");
    turno.socket.emit("mover", { id: p.id, from, to });
    await aviso;
    turno = turno === p.blancas ? p.negras : p.blancas;
  }
}

const saldo = async (j) => (await api("/api/yo", { token: j.token })).json.usuario.monedas;
const cerrar = (p) => { p.blancas.socket.close(); p.negras.socket.close(); };

test("el ganador se lleva el bote menos un 10 % de comisión", async () => {
  const p = await emparejar(100);
  assert.equal(p.estado.bote, 200);
  assert.equal(p.estado.premio, 180);
  assert.equal(await saldo(p.blancas), 900, "la apuesta se retiene al empezar");
  const fin = esperar(p.negras.socket, "fin");
  await jugar(p, [["f2", "f3"], ["e7", "e5"], ["g2", "g4"]]);
  p.negras.socket.emit("mover", { id: p.id, from: "d8", to: "h4" }); // mate del pastor al revés
  const r = await fin;
  assert.equal(r.resultado, "0-1");
  assert.equal(r.motivo, "jaque mate");
  assert.equal(r.ganancia, 80);
  assert.equal(await saldo(p.negras), 1080);
  assert.equal(await saldo(p.blancas), 900);
  cerrar(p);
});

test("jugadas ilegales o fuera de turno se rechazan", async () => {
  const p = await emparejar(50);
  const err1 = esperar(p.negras.socket, "error_msg");
  p.negras.socket.emit("mover", { id: p.id, from: "e7", to: "e5" });
  assert.equal((await err1).mensaje, "No es tu turno");
  const err2 = esperar(p.blancas.socket, "error_msg");
  p.blancas.socket.emit("mover", { id: p.id, from: "e2", to: "e5" });
  assert.equal((await err2).mensaje, "Jugada no válida");
  const fin = esperar(p.blancas.socket, "fin");
  p.blancas.socket.emit("rendirse", { id: p.id }); // antes de la 2ª jugada: se anula y se devuelve todo
  const r = await fin;
  assert.equal(r.motivo, "anulada");
  assert.equal(r.comision, 0);
  assert.equal(await saldo(p.blancas), 1000);
  assert.equal(await saldo(p.negras), 1000);
  cerrar(p);
});

test("tablas de mutuo acuerdo: cada uno recupera su apuesta menos media comisión", async () => {
  const p = await emparejar(100);
  await jugar(p, [["e2", "e4"], ["e7", "e5"]]);
  const oferta = esperar(p.negras.socket, "tablas_ofrecidas");
  p.blancas.socket.emit("ofrecer_tablas", { id: p.id });
  await oferta;
  const fin = esperar(p.blancas.socket, "fin");
  p.negras.socket.emit("ofrecer_tablas", { id: p.id }); // aceptar = ofrecer también
  const r = await fin;
  assert.equal(r.resultado, "1/2-1/2");
  assert.equal(await saldo(p.blancas), 990);
  assert.equal(await saldo(p.negras), 990);
  cerrar(p);
});

test("no se puede entrar en una mesa sin monedas suficientes", async () => {
  const a = await jugador("Pobre");
  const err = esperar(a.socket, "error_msg");
  a.socket.emit("buscar", { apuesta: 5000 });
  assert.match((await err).mensaje, /monedas suficientes/);
  a.socket.close();
});

test("quien se queda sin tiempo pierde", async () => {
  const p = await emparejar(100);
  await jugar(p, [["e2", "e4"], ["e7", "e5"]]);
  const r = await esperar(p.blancas.socket, "fin"); // las blancas no juegan y se les acaba el reloj
  assert.equal(r.resultado, "0-1");
  assert.equal(r.motivo, "tiempo agotado");
  cerrar(p);
});

test("quien se desconecta y no vuelve pierde por abandono", async () => {
  const p = await emparejar(100);
  await jugar(p, [["d2", "d4"], ["d7", "d5"]]);
  const fin = esperar(p.negras.socket, "fin");
  p.blancas.socket.close();
  const r = await fin;
  assert.equal(r.motivo, "abandono");
  assert.equal(r.resultado, "0-1");
  p.negras.socket.close();
});

test("bonus diario una sola vez y resumen de comisiones para el dueño", async () => {
  const { json } = await api("/api/registro", { method: "POST", body: JSON.stringify({ nombre: "Bono" }) });
  const r1 = await api("/api/bonus", { method: "POST", token: json.token });
  const r2 = await api("/api/bonus", { method: "POST", token: json.token });
  assert.equal(r1.json.usuario.monedas, 1200);
  assert.equal(r2.json.ok, false);
  assert.equal((await api("/api/admin/resumen")).status, 403);
  const res = await api("/api/admin/resumen", { token: "clave-test" });
  // 20 (mate) + 20 (tablas) + 20 (tiempo) + 20 (abandono)
  assert.equal(res.json.comisiones_totales_monedas, 80);
});

test("borrar la cuenta invalida la sesión", async () => {
  const { json } = await api("/api/registro", { method: "POST", body: JSON.stringify({ nombre: "Adiós" }) });
  assert.equal((await api("/api/cuenta", { method: "DELETE", token: json.token })).status, 200);
  assert.equal((await api("/api/yo", { token: json.token })).status, 401);
});
