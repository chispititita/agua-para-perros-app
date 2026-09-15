"""Sube un producto (con variantes, costos e inventario) como DRAFT en Shopify."""
from lib.shopify_client import ShopifyClient, id_numerico


def subir_producto(client: ShopifyClient, config: dict, producto: dict) -> dict:
    multiplicador = config.get("margen_objetivo", {}).get("multiplicador", 4.0)
    variantes = producto.get("variantes") or [
        {"opcion": "Default", "costo": producto.get("costo_unitario", 0), "stock": 20}
    ]

    payload_variantes = []
    for v in variantes:
        costo = float(v["costo"])
        precio = float(v.get("precio") or round(costo * multiplicador, 2))
        payload_variantes.append({
            "option1": v.get("opcion", "Default"),
            "price": f"{precio:.2f}",
            "inventory_management": "shopify",
            "inventory_policy": "deny",
        })

    payload = {
        "title": producto["titulo"],
        "body_html": producto.get("descripcion_html", ""),
        "status": "draft",
        "images": [{"src": url} for url in producto.get("imagenes", [])],
        "options": [{"name": "Variante"}],
        "variants": payload_variantes,
    }

    respuesta = client.crear_producto(payload)
    producto_creado = respuesta["product"]

    location_id = config.get("location_id")
    for variante_config, variante_creada in zip(variantes, producto_creado["variants"]):
        inventory_item_id = variante_creada["inventory_item_id"]
        client.actualizar_costo_variante(inventory_item_id, float(variante_config["costo"]))
        if location_id:
            client.establecer_inventario(inventory_item_id, id_numerico(location_id), int(variante_config.get("stock", 20)))

    return {
        "product_id": producto_creado["id"],
        "handle": producto_creado["handle"],
    }
