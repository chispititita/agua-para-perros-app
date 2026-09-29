// Compra de monedas con Google Play (solo funciona dentro de la app instalada desde Play Store).
// Los productos se crean en Play Console con estos mismos ids (ver README).
import { api } from "./api.js";

let listo = false;
let alComprar = () => {};

export function tiendaDisponible() {
  return typeof window.CdvPurchase !== "undefined";
}

export async function iniciarTienda(ids, { onCompra, onError }) {
  if (!tiendaDisponible() || listo) return;
  alComprar = onCompra;
  const { store, ProductType, Platform } = window.CdvPurchase;
  store.register(ids.map((id) => ({ id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
  store.when().approved(async (transaccion) => {
    const productId = transaccion.products?.[0]?.id;
    const purchaseToken = transaccion.parentReceipt?.purchaseToken || transaccion.nativePurchase?.purchaseToken;
    try {
      // El servidor comprueba el pago con Google antes de dar las monedas.
      const r = await api("/api/compras/google", { metodo: "POST", datos: { productId, purchaseToken } });
      await transaccion.finish();
      alComprar(r.usuario);
    } catch (e) {
      onError(e.message);
    }
  });
  store.error((e) => onError(e.message));
  await store.initialize([Platform.GOOGLE_PLAY]);
  listo = true;
}

export function precio(id) {
  if (!tiendaDisponible()) return null;
  return window.CdvPurchase.store.get(id)?.pricing?.price || null;
}

export async function comprar(id) {
  const producto = window.CdvPurchase.store.get(id);
  const oferta = producto?.getOffer();
  if (!oferta) throw new Error("Este paquete todavía no está disponible");
  const error = await oferta.order();
  if (error && error.code !== window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) throw new Error(error.message);
}
