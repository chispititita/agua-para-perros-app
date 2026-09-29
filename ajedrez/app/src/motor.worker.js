// Rival de la máquina (se ejecuta aparte para no congelar la pantalla).
// Búsqueda alfa-beta con tablas de posición sencillas. Nivel 1 = 1 jugada, 2 = 2, 3 = 3 de profundidad.
import { Chess } from "chess.js";

const VALOR = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Bonificaciones por casilla (desde el punto de vista de las blancas; fila 8 primero).
const TABLAS = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20,
    20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40,
    -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5,
    5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10,
    -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0,
    0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

function evaluar(chess) {
  let total = 0;
  chess.board().forEach((fila, f) => fila.forEach((p, c) => {
    if (!p) return;
    const indice = p.color === "w" ? f * 8 + c : (7 - f) * 8 + c;
    const v = VALOR[p.type] + TABLAS[p.type][indice];
    total += p.color === "w" ? v : -v;
  }));
  return total;
}

const ordenar = (jugadas) => jugadas.sort((a, b) =>
  (b.captured ? VALOR[b.captured] * 10 - VALOR[b.piece] : 0) - (a.captured ? VALOR[a.captured] * 10 - VALOR[a.piece] : 0));

function alfabeta(chess, profundidad, alfa, beta, maximiza) {
  if (chess.isCheckmate()) return maximiza ? -100000 - profundidad : 100000 + profundidad;
  if (chess.isDraw()) return 0;
  if (profundidad === 0) return evaluar(chess);
  const jugadas = ordenar(chess.moves({ verbose: true }));
  let mejor = maximiza ? -Infinity : Infinity;
  for (const j of jugadas) {
    chess.move(j);
    const v = alfabeta(chess, profundidad - 1, alfa, beta, !maximiza);
    chess.undo();
    if (maximiza) { mejor = Math.max(mejor, v); alfa = Math.max(alfa, v); } else { mejor = Math.min(mejor, v); beta = Math.min(beta, v); }
    if (beta <= alfa) break;
  }
  return mejor;
}

self.onmessage = ({ data: { fen, nivel } }) => {
  const chess = new Chess(fen);
  const blancas = chess.turn() === "w";
  const jugadas = ordenar(chess.moves({ verbose: true }));
  let mejores = [];
  let mejorValor = -Infinity;
  for (const j of jugadas) {
    chess.move(j);
    let v = alfabeta(chess, nivel - 1, -Infinity, Infinity, !blancas);
    chess.undo();
    if (!blancas) v = -v;
    if (nivel === 1) v += Math.random() * 60; // en fácil se equivoca a menudo
    if (v > mejorValor + 5) { mejorValor = v; mejores = [j]; } else if (v > mejorValor - 5) mejores.push(j);
  }
  const elegida = mejores[Math.floor(Math.random() * mejores.length)];
  self.postMessage({ from: elegida.from, to: elegida.to, promotion: elegida.promotion });
};
