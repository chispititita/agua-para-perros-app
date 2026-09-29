// Emparejamiento, partidas en curso, relojes y reparto del bote. El servidor es el árbitro:
// valida cada jugada con chess.js y es el único que toca las monedas.
import crypto from "node:crypto";
import { Chess } from "chess.js";
import { CONFIG } from "./config.js";
import { db, moverMonedas, publico, usuarioPorId } from "./db.js";

const PRIMERA_JUGADA_MS = 30_000; // si alguien no hace su primera jugada en 30 s, la partida se anula

export class Arena {
  constructor(io) {
    this.io = io;
    this.colas = new Map(CONFIG.mesas.map((m) => [m, []])); // apuesta -> [usuarioId]
    this.partidaDe = new Map(); // usuarioId -> Partida
    this.desconexiones = new Map(); // usuarioId -> timeout
  }

  aviso(usuarioId, evento, datos) {
    this.io.to(`u:${usuarioId}`).emit(evento, datos);
  }

  // ------------------------------------------------------------ conexión
  conectado(usuarioId) {
    clearTimeout(this.desconexiones.get(usuarioId));
    this.desconexiones.delete(usuarioId);
    const p = this.partidaDe.get(usuarioId);
    if (p) this.aviso(usuarioId, "partida", p.estadoPara(usuarioId));
  }

  desconectado(usuarioId, quedanSockets) {
    if (quedanSockets) return;
    this.cancelarBusqueda(usuarioId);
    const p = this.partidaDe.get(usuarioId);
    if (!p) return;
    this.aviso(p.rivalDe(usuarioId), "rival_desconectado", { segundos: CONFIG.graciaDesconexionSeg });
    this.desconexiones.set(usuarioId, setTimeout(() => {
      this.desconexiones.delete(usuarioId);
      if (!p.terminada) p.terminar(p.colorDe(usuarioId) === "w" ? "0-1" : "1-0", "abandono");
    }, CONFIG.graciaDesconexionSeg * 1000));
  }

  // ------------------------------------------------------------ emparejamiento
  buscar(usuarioId, apuesta) {
    apuesta = Number(apuesta);
    if (!this.colas.has(apuesta)) throw new Error("Esa mesa no existe");
    if (this.partidaDe.has(usuarioId)) throw new Error("Ya estás jugando una partida");
    const usuario = usuarioPorId(usuarioId);
    if (usuario.monedas < apuesta) throw new Error("No tienes monedas suficientes para esta mesa");
    this.cancelarBusqueda(usuarioId);

    const cola = this.colas.get(apuesta);
    while (cola.length) {
      const rivalId = cola.shift();
      const rival = usuarioPorId(rivalId);
      if (rival && rival.monedas >= apuesta && !this.partidaDe.has(rivalId)) {
        this.empezar(rivalId, usuarioId, apuesta);
        return;
      }
      if (rival) this.aviso(rivalId, "busqueda_cancelada", { motivo: "saldo insuficiente" });
    }
    cola.push(usuarioId);
    this.aviso(usuarioId, "buscando", { apuesta });
  }

  cancelarBusqueda(usuarioId) {
    for (const cola of this.colas.values()) {
      const i = cola.indexOf(usuarioId);
      if (i >= 0) cola.splice(i, 1);
    }
  }

  empezar(idA, idB, apuesta) {
    const [blancas, negras] = Math.random() < 0.5 ? [idA, idB] : [idB, idA];
    const id = crypto.randomUUID();
    // Las dos apuestas se retienen a la vez: o se cobran ambas o ninguna.
    db.transaction(() => {
      db.prepare("INSERT INTO partidas (id, blancas_id, negras_id, apuesta) VALUES (?, ?, ?, ?)")
        .run(id, blancas, negras, apuesta);
      moverMonedas(blancas, -apuesta, "apuesta", id);
      moverMonedas(negras, -apuesta, "apuesta", id);
    })();
    const p = new Partida(this, id, blancas, negras, apuesta);
    this.partidaDe.set(blancas, p);
    this.partidaDe.set(negras, p);
    for (const uid of [blancas, negras]) this.aviso(uid, "partida", p.estadoPara(uid));
  }

  partidaActiva(usuarioId, partidaId) {
    const p = this.partidaDe.get(usuarioId);
    if (!p || p.id !== partidaId) throw new Error("No estás en esa partida");
    return p;
  }
}

class Partida {
  constructor(arena, id, blancas, negras, apuesta) {
    Object.assign(this, { arena, id, apuesta });
    this.ids = { w: blancas, b: negras };
    this.nombres = { w: usuarioPorId(blancas).nombre, b: usuarioPorId(negras).nombre };
    this.elos = { w: usuarioPorId(blancas).elo, b: usuarioPorId(negras).elo };
    this.chess = new Chess();
    const ms = CONFIG.minutosPorJugador * 60_000;
    this.reloj = { w: ms, b: ms };
    this.desde = Date.now();
    this.ofertaTablas = null;
    this.terminada = false;
    this.temporizador = setTimeout(() => this.terminar(null, "anulada"), PRIMERA_JUGADA_MS);
  }

  colorDe(uid) { return this.ids.w === uid ? "w" : "b"; }
  rivalDe(uid) { return this.ids.w === uid ? this.ids.b : this.ids.w; }
  get bote() { return this.apuesta * 2; }
  get comision() { return Math.round(this.bote * CONFIG.comision); }
  get relojEnMarcha() { return this.chess.history().length >= 2; }

  relojes() {
    const r = { ...this.reloj };
    if (this.relojEnMarcha && !this.terminada) r[this.chess.turn()] -= Date.now() - this.desde;
    return { w: Math.max(0, r.w), b: Math.max(0, r.b) };
  }

  estadoPara(uid) {
    const color = this.colorDe(uid);
    const rival = color === "w" ? "b" : "w";
    return {
      id: this.id,
      color,
      apuesta: this.apuesta,
      bote: this.bote,
      premio: this.bote - this.comision,
      yo: { nombre: this.nombres[color], elo: this.elos[color] },
      rival: { nombre: this.nombres[rival], elo: this.elos[rival] },
      fen: this.chess.fen(),
      jugadas: this.chess.history({ verbose: true }).map((m) => ({ from: m.from, to: m.to, san: m.san })),
      turno: this.chess.turn(),
      relojes: this.relojes(),
      relojEnMarcha: this.relojEnMarcha,
      ofertaTablas: this.ofertaTablas,
    };
  }

  emitir(evento, datos) {
    for (const uid of Object.values(this.ids)) this.arena.aviso(uid, evento, datos);
  }

  programarReloj() {
    clearTimeout(this.temporizador);
    if (this.terminada) return;
    if (!this.relojEnMarcha) {
      this.temporizador = setTimeout(() => this.terminar(null, "anulada"), PRIMERA_JUGADA_MS);
      return;
    }
    const color = this.chess.turn();
    this.temporizador = setTimeout(() => this.sinTiempo(color), this.reloj[color] + 50);
  }

  mover(uid, { from, to, promotion }) {
    if (this.terminada) throw new Error("La partida ya ha terminado");
    const color = this.colorDe(uid);
    if (this.chess.turn() !== color) throw new Error("No es tu turno");
    const ahora = Date.now();
    if (this.relojEnMarcha) {
      this.reloj[color] -= ahora - this.desde;
      if (this.reloj[color] <= 0) return this.sinTiempo(color);
    }
    let jugada;
    try {
      jugada = this.chess.move({ from, to, promotion: promotion || "q" });
    } catch {
      throw new Error("Jugada no válida");
    }
    if (this.relojEnMarcha) this.reloj[color] += CONFIG.incrementoSegundos * 1000;
    this.desde = ahora;
    this.ofertaTablas = null;
    this.emitir("movimiento", {
      id: this.id, from: jugada.from, to: jugada.to, promotion: jugada.promotion, san: jugada.san, fen: this.chess.fen(),
      turno: this.chess.turn(), relojes: this.relojes(), relojEnMarcha: this.relojEnMarcha,
    });
    if (this.chess.isGameOver()) return this.finPorTablero();
    this.programarReloj();
  }

  finPorTablero() {
    const c = this.chess;
    if (c.isCheckmate()) return this.terminar(c.turn() === "w" ? "0-1" : "1-0", "jaque mate");
    if (c.isStalemate()) return this.terminar("1/2-1/2", "rey ahogado");
    if (c.isInsufficientMaterial()) return this.terminar("1/2-1/2", "material insuficiente");
    if (c.isThreefoldRepetition()) return this.terminar("1/2-1/2", "triple repetición");
    return this.terminar("1/2-1/2", "regla de los 50 movimientos");
  }

  sinTiempo(color) {
    if (this.terminada) return;
    this.reloj[color] = 0;
    // Si al rival solo le queda el rey, no puede ganar: son tablas.
    const rival = color === "w" ? "b" : "w";
    const piezasRival = this.chess.board().flat().filter((p) => p && p.color === rival);
    if (piezasRival.length === 1) return this.terminar("1/2-1/2", "tiempo agotado sin material para ganar");
    this.terminar(color === "w" ? "0-1" : "1-0", "tiempo agotado");
  }

  rendirse(uid) {
    if (!this.relojEnMarcha) return this.terminar(null, "anulada");
    this.terminar(this.colorDe(uid) === "w" ? "0-1" : "1-0", "rendición");
  }

  ofrecerTablas(uid) {
    const color = this.colorDe(uid);
    if (this.ofertaTablas && this.ofertaTablas !== color) return this.terminar("1/2-1/2", "acuerdo");
    this.ofertaTablas = color;
    this.arena.aviso(this.rivalDe(uid), "tablas_ofrecidas", { id: this.id });
  }

  rechazarTablas(uid) {
    if (this.ofertaTablas && this.ofertaTablas !== this.colorDe(uid)) {
      this.ofertaTablas = null;
      this.arena.aviso(this.rivalDe(uid), "tablas_rechazadas", { id: this.id });
    }
  }

  /** resultado: '1-0', '0-1', '1/2-1/2' o null (anulada: se devuelve todo). */
  terminar(resultado, motivo) {
    if (this.terminada) return;
    this.terminada = true;
    clearTimeout(this.temporizador);
    const { w, b } = this.ids;
    let comision = 0;
    const ganancia = { w: 0, b: 0 };

    db.transaction(() => {
      if (resultado === null) {
        moverMonedas(w, this.apuesta, "devolución (partida anulada)", this.id);
        moverMonedas(b, this.apuesta, "devolución (partida anulada)", this.id);
      } else if (resultado === "1/2-1/2") {
        const mitad = Math.floor(this.comision / 2);
        comision = mitad * 2;
        for (const c of ["w", "b"]) {
          moverMonedas(this.ids[c], this.apuesta - mitad, "tablas", this.id);
          ganancia[c] = -mitad;
        }
      } else {
        comision = this.comision;
        const g = resultado === "1-0" ? "w" : "b";
        const p = g === "w" ? "b" : "w";
        moverMonedas(this.ids[g], this.bote - comision, "premio", this.id);
        ganancia[g] = this.apuesta - comision;
        ganancia[p] = -this.apuesta;
      }
      if (comision) moverMonedas(null, comision, "comisión", this.id);
      if (resultado !== null) this.actualizarEstadisticas(resultado);
      db.prepare("UPDATE partidas SET resultado = ?, motivo = ?, comision = ?, pgn = ?, fin = datetime('now') WHERE id = ?")
        .run(resultado ?? "anulada", motivo, comision, this.chess.pgn(), this.id);
    })();

    for (const c of ["w", "b"]) {
      const uid = this.ids[c];
      this.arena.partidaDe.delete(uid);
      clearTimeout(this.arena.desconexiones.get(uid));
      this.arena.aviso(uid, "fin", {
        id: this.id, resultado, motivo, ganancia: ganancia[c], comision,
        usuario: publico(usuarioPorId(uid)),
      });
    }
  }

  actualizarEstadisticas(resultado) {
    const puntosBlancas = resultado === "1-0" ? 1 : resultado === "0-1" ? 0 : 0.5;
    const esperado = 1 / (1 + 10 ** ((this.elos.b - this.elos.w) / 400));
    const delta = Math.round(32 * (puntosBlancas - esperado));
    const upd = db.prepare("UPDATE usuarios SET elo = MAX(100, elo + ?), partidas = partidas + 1, victorias = victorias + ? WHERE id = ?");
    upd.run(delta, puntosBlancas === 1 ? 1 : 0, this.ids.w);
    upd.run(-delta, puntosBlancas === 0 ? 1 : 0, this.ids.b);
  }
}
