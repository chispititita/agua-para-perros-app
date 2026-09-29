// Tablero táctil: toca una pieza y luego la casilla de destino. Muestra jugadas legales, última jugada y jaque.
const PIEZAS = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const TEXTO = "︎"; // fuerza el dibujo como texto (no emoji) en Android
const COLUMNAS = "abcdefgh";

export class Tablero {
  constructor(elemento, { alMover, elegirPromocion }) {
    this.el = elemento;
    this.alMover = alMover;
    this.elegirPromocion = elegirPromocion;
    this.orientacion = "w";
    this.chess = null;
    this.miColor = "w";
    this.bloqueado = true;
    this.seleccion = null;
    this.ultima = null;
    this.el.addEventListener("click", (e) => this.tocar(e));
  }

  poner(chess, { miColor, ultima = null, bloqueado = false } = {}) {
    this.chess = chess;
    if (miColor) { this.miColor = miColor; this.orientacion = miColor; }
    this.ultima = ultima;
    this.bloqueado = bloqueado;
    this.seleccion = null;
    this.dibujar();
  }

  dibujar() {
    const filas = this.orientacion === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const cols = this.orientacion === "w" ? [...COLUMNAS] : [...COLUMNAS].reverse();
    const destinos = new Set(this.seleccion ? this.chess.moves({ square: this.seleccion, verbose: true }).map((m) => m.to) : []);
    const reyEnJaque = this.chess.inCheck()
      ? this.chess.board().flat().find((p) => p && p.type === "k" && p.color === this.chess.turn())?.square : null;
    let html = "";
    filas.forEach((fila, i) => cols.forEach((col, j) => {
      const casilla = `${col}${fila}`;
      const pieza = this.chess.get(casilla);
      const clases = ["casilla", (COLUMNAS.indexOf(col) + fila) % 2 ? "clara" : "oscura"];
      if (this.ultima && (this.ultima.from === casilla || this.ultima.to === casilla)) clases.push("ultima");
      if (this.seleccion === casilla) clases.push("seleccionada");
      if (destinos.has(casilla)) clases.push(pieza ? "captura" : "destino");
      if (reyEnJaque === casilla) clases.push("jaque");
      html += `<div class="${clases.join(" ")}" data-c="${casilla}">`;
      if (j === 0) html += `<span class="coord fila">${fila}</span>`;
      if (i === 7) html += `<span class="coord col">${col}</span>`;
      if (pieza) html += `<span class="pieza ${pieza.color === "w" ? "blanca" : "negra"}">${PIEZAS[pieza.type]}${TEXTO}</span>`;
      html += "</div>";
    }));
    this.el.innerHTML = html;
  }

  async tocar(e) {
    const casilla = e.target.closest(".casilla")?.dataset.c;
    if (!casilla || this.bloqueado || !this.chess || this.chess.turn() !== this.miColor) return;
    const pieza = this.chess.get(casilla);
    if (this.seleccion) {
      const jugada = this.chess.moves({ square: this.seleccion, verbose: true }).find((m) => m.to === casilla);
      if (jugada) {
        const origen = this.seleccion;
        this.seleccion = null;
        const promocion = jugada.promotion ? await this.elegirPromocion(this.miColor) : undefined;
        if (jugada.promotion && !promocion) return this.dibujar();
        this.alMover({ from: origen, to: casilla, promotion: promocion });
        return;
      }
    }
    this.seleccion = pieza && pieza.color === this.miColor && this.seleccion !== casilla ? casilla : null;
    this.dibujar();
  }
}

export const glifo = (tipo) => PIEZAS[tipo] + TEXTO;
