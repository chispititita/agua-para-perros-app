"""
Orquesta el flujo completo para una tienda de desarrollo YA CREADA
manualmente por ti en el Dev Dashboard de Shopify Partners:

  1. Sube el producto con variantes y precios calculados
  2. Genera y publica las 4 páginas legales
  3. (El tema se aplica aparte con aplicar_tema.py, vía CLI)

Uso:
    python main.py --config config/config.json --producto config/producto_ejemplo.json
"""
import argparse
import json
from datetime import datetime, timezone

from lib.shopify_client import ShopifyClient
from creacion_tienda.subir_producto import subir_producto
from creacion_tienda.paginas_legales import crear_paginas_legales
from testeo.economia import calcular_umbrales

LOG_PATH = "logs/historial_productos.json"


def cargar_json(ruta: str) -> dict:
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)


def registrar_en_historial(entrada: dict) -> None:
    try:
        with open(LOG_PATH, "r", encoding="utf-8") as f:
            historial = json.load(f)
    except FileNotFoundError:
        historial = []

    historial.append(entrada)
    with open(LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(historial, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/config.json")
    parser.add_argument("--producto", required=True, help="ruta al JSON con los datos del producto")
    args = parser.parse_args()

    config = cargar_json(args.config)
    producto = cargar_json(args.producto)

    client = ShopifyClient(
        tienda_dominio=config["tienda_dominio"],
        admin_api_token=config["admin_api_token"],
        api_version=config.get("api_version", "2026-01"),
    )

    print(f"→ Subiendo producto '{producto['titulo']}' a {config['tienda_dominio']}...")
    resultado_producto = subir_producto(client, config, producto)
    print(f"  Producto creado: {resultado_producto['handle']} ({resultado_producto['product_id']})")

    print("→ Creando páginas legales...")
    paginas = crear_paginas_legales(client, config)
    for p in paginas:
        print(f"  Página creada: {p['title']} (/{p['handle']})")

    # Economía unitaria y umbrales de matar/escalar, calculados a partir
    # de la primera variante — antes de gastar un solo euro en ads.
    primera_variante = producto.get("variantes", [{}])[0]
    costo = primera_variante.get("costo", producto.get("costo_unitario"))
    precio = primera_variante.get("precio") or (costo * config.get("margen_objetivo", {}).get("multiplicador", 4.0) if costo else None)
    umbrales_texto = ""
    if costo and precio:
        u = calcular_umbrales(costo, precio)
        print(f"\n→ Economía del test (variante '{primera_variante.get('opcion', 'Default')}'):")
        print(f"  Margen bruto: {u.gross_margin:.2f}€ | CPA objetivo: {u.cpa_objetivo:.2f}€ | ROAS de equilibrio: {u.breakeven_roas}x")
        print(f"  Matar si: {u.kill_sin_atc}€ sin ATC | {u.kill_sin_venta}€ sin ventas | CPA real > objetivo tras {u.kill_por_cpa:.2f}€")
        print(f"  Presupuesto de test recomendado: {u.presupuesto_test_min:.0f}-{u.presupuesto_test_max:.0f}€")
        umbrales_texto = f"cpa_objetivo={u.cpa_objetivo:.2f}"

    registrar_en_historial({
        "fecha": datetime.now(timezone.utc).isoformat(),
        "tienda": config["tienda_dominio"],
        "producto": producto["titulo"],
        "product_id": resultado_producto["product_id"],
        "estado": "creado_draft",  # actualiza a mano: testeado / descartado / escalado
        "umbrales": umbrales_texto,
    })

    print("\nListo. El producto quedó como DRAFT — revísalo, aplica el tema con "
          "aplicar_tema.py, y publícalo manualmente cuando esté a punto.")
    print("Antes de gastar en ads: python testeo/velocidad_pagina.py --url <link-de-la-ficha>")
    print("Para registrar cada lectura del test: python testeo/registro_tests.py registrar --producto ... --costo ... --precio ... --canal ... --gasto ...")


if __name__ == "__main__":
    main()
