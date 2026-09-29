// Verificación de compras de monedas con la API de Google Play (Android Publisher).
// Necesita una cuenta de servicio de Google Cloud con acceso a tu app en Play Console
// (variable GOOGLE_SERVICE_ACCOUNT_JSON con el contenido del archivo JSON de la cuenta).
import crypto from "node:crypto";
import { CONFIG } from "./config.js";

let tokenCache = { valor: null, caduca: 0 };

function base64url(datos) {
  return Buffer.from(datos).toString("base64url");
}

async function tokenAcceso() {
  if (tokenCache.valor && Date.now() < tokenCache.caduca) return tokenCache.valor;
  const cuenta = JSON.parse(CONFIG.cuentaServicioGoogle);
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const datos = base64url(JSON.stringify({
    iss: cuenta.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: ahora,
    exp: ahora + 3600,
  }));
  const firma = crypto.createSign("RSA-SHA256").update(`${cabecera}.${datos}`).sign(cuenta.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cabecera}.${datos}.${firma}`,
    }),
  });
  if (!r.ok) throw new Error(`Google rechazó la cuenta de servicio (${r.status})`);
  const json = await r.json();
  tokenCache = { valor: json.access_token, caduca: Date.now() + (json.expires_in - 60) * 1000 };
  return tokenCache.valor;
}

export function comprasConfiguradas() {
  return Boolean(CONFIG.cuentaServicioGoogle);
}

/** Devuelve true si la compra es real, está pagada y todavía no se ha consumido. */
export async function verificarCompra(productId, purchaseToken) {
  if (!comprasConfiguradas()) throw new Error("Las compras todavía no están activadas en el servidor");
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(CONFIG.paqueteAndroid)}/purchases/products/${encodeURIComponent(productId)}` +
    `/tokens/${encodeURIComponent(purchaseToken)}`;
  const cabeceras = { Authorization: `Bearer ${await tokenAcceso()}` };
  const r = await fetch(base, { headers: cabeceras });
  if (!r.ok) return false;
  const compra = await r.json();
  if (compra.purchaseState !== 0 || compra.consumptionState === 1) return false;
  // Se consume en el servidor para que se pueda volver a comprar el mismo paquete.
  await fetch(`${base}:consume`, { method: "POST", headers: cabeceras });
  return true;
}
