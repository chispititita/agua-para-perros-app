"""Lectura de productos y ventas de la tienda Shopify (Admin API, solo lectura)."""
import os
from datetime import date, timedelta

import requests

PRODUCTOS = """
query {
  products(first: 25, sortKey: UPDATED_AT, reverse: true) {
    edges { node {
      title status totalInventory onlineStoreUrl
      description(truncateAt: 400)
      priceRangeV2 { minVariantPrice { amount currencyCode } }
      featuredMedia { preview { image { url } } }
    } }
  }
}
"""

PEDIDOS = """
query ($q: String!) {
  orders(first: 100, query: $q, sortKey: CREATED_AT, reverse: true) {
    edges { node {
      name createdAt displayFinancialStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      lineItems(first: 5) { edges { node { title quantity } } }
    } }
  }
}
"""


def disponible() -> bool:
    return bool(os.getenv("SHOPIFY_TIENDA", "").strip() and os.getenv("SHOPIFY_TOKEN", "").strip())


def _consulta(query: str, variables: dict | None = None) -> dict:
    if not disponible():
        raise RuntimeError("Shopify no está conectado: rellena SHOPIFY_TIENDA y SHOPIFY_TOKEN en el archivo .env")
    tienda = os.getenv("SHOPIFY_TIENDA").strip().removeprefix("https://").rstrip("/")
    version = os.getenv("SHOPIFY_API_VERSION", "2025-07")
    r = requests.post(f"https://{tienda}/admin/api/{version}/graphql.json",
                      json={"query": query, "variables": variables or {}},
                      headers={"X-Shopify-Access-Token": os.getenv("SHOPIFY_TOKEN").strip()}, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"Shopify respondió {r.status_code}: {r.text[:300]}")
    datos = r.json()
    if datos.get("errors"):
        raise RuntimeError(f"Error de Shopify: {datos['errors']}")
    return datos["data"]


def productos() -> list[dict]:
    out = []
    for e in _consulta(PRODUCTOS)["products"]["edges"]:
        n = e["node"]
        precio = n["priceRangeV2"]["minVariantPrice"]
        imagen = ((n.get("featuredMedia") or {}).get("preview") or {}).get("image") or {}
        out.append({
            "titulo": n["title"],
            "estado": n["status"],
            "inventario": n["totalInventory"],
            "precio": f"{precio['amount']} {precio['currencyCode']}",
            "descripcion": n["description"],
            "imagen_url": imagen.get("url"),
            "url": n["onlineStoreUrl"],
        })
    return out


def ventas(dias: int = 7) -> dict:
    desde = (date.today() - timedelta(days=dias)).isoformat()
    pedidos = [e["node"] for e in _consulta(PEDIDOS, {"q": f"created_at:>={desde}"})["orders"]["edges"]]
    total = sum(float(p["totalPriceSet"]["shopMoney"]["amount"]) for p in pedidos)
    moneda = pedidos[0]["totalPriceSet"]["shopMoney"]["currencyCode"] if pedidos else ""
    return {
        "periodo_dias": dias,
        "numero_pedidos": len(pedidos),
        "facturacion": f"{total:.2f} {moneda}".strip(),
        "ticket_medio": f"{(total / len(pedidos)):.2f} {moneda}" if pedidos else None,
        "ultimos_pedidos": [{
            "pedido": p["name"],
            "fecha": p["createdAt"],
            "importe": p["totalPriceSet"]["shopMoney"]["amount"],
            "estado_pago": p["displayFinancialStatus"],
            "productos": [f"{li['node']['quantity']}x {li['node']['title']}" for li in p["lineItems"]["edges"]],
        } for p in pedidos[:10]],
    }
