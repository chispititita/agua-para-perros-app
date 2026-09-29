// Comunicación con el servidor.
import { io } from "socket.io-client";

// Dirección del servidor. Se fija al compilar con VITE_SERVIDOR (ver README).
export const SERVIDOR = (import.meta.env.VITE_SERVIDOR || "http://localhost:3000").replace(/\/$/, "");

const guardar = {
  leer(k) { try { return localStorage.getItem(`jaque.${k}`); } catch { return null; } },
  escribir(k, v) { try { v === null ? localStorage.removeItem(`jaque.${k}`) : localStorage.setItem(`jaque.${k}`, v); } catch { /* sin almacenamiento */ } },
};

export const sesion = {
  get token() { return guardar.leer("token"); },
  set token(v) { guardar.escribir("token", v); },
};

export async function api(ruta, { metodo = "GET", datos } = {}) {
  let r;
  try {
    r = await fetch(SERVIDOR + ruta, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(sesion.token ? { Authorization: `Bearer ${sesion.token}` } : {}) },
      body: datos ? JSON.stringify(datos) : undefined,
    });
  } catch {
    throw new Error("No hay conexión con el servidor");
  }
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const error = new Error(json.error || `Error ${r.status}`);
    error.status = r.status;
    throw error;
  }
  return json;
}

export function conectarSocket() {
  return io(SERVIDOR, { auth: { token: sesion.token }, transports: ["websocket"], reconnectionDelayMax: 3000 });
}
