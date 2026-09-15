"""
Convierte un candidato (formato investigacion/plantilla_candidato.json) al
formato de producto que esperan main.py y app_web.py.

Uso:
    python investigacion/convertir_a_producto.py \\
        --candidato investigacion/mi_candidato.json \\
        --salida config/producto_a_testear.json
"""
import argparse
import json


def convertir(candidato: dict) -> dict:
    descripcion = f"<p>{candidato.get('razon_tendencia', '')}</p>"
    if candidato.get("angulo_marketing"):
        descripcion += f"<p>Ángulo: {candidato['angulo_marketing']}</p>"

    return {
        "titulo": candidato["nombre_producto"],
        "descripcion_html": descripcion,
        "imagenes": candidato.get("imagenes", []),
        "variantes": candidato.get("variantes") or [{
            "opcion": "Default",
            "costo": candidato.get("costo_estimado", 0),
            "precio": candidato.get("precio_sugerido"),
            "stock": 20,
        }],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidato", required=True)
    parser.add_argument("--salida", required=True)
    args = parser.parse_args()

    with open(args.candidato, "r", encoding="utf-8") as f:
        candidato = json.load(f)

    producto = convertir(candidato)

    with open(args.salida, "w", encoding="utf-8") as f:
        json.dump(producto, f, ensure_ascii=False, indent=2)

    print(f"Producto guardado en {args.salida}")


if __name__ == "__main__":
    main()
