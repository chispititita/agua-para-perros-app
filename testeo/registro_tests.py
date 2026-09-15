"""
CLI para registrar lecturas de tests de anuncios y consultar el historial
(alternativa por terminal a "Registrar test de anuncio" en app_web.py).

Uso:
    python testeo/registro_tests.py registrar --producto "Botella Bebedero" \\
        --costo 6 --precio 24.95 --canal tiktok --gasto 45 --ctr 1.2 --atc 2 --ventas 0 --angulos 1

    python testeo/registro_tests.py historial --producto "Botella Bebedero"
"""
import argparse
import json
import os
from datetime import datetime, timezone

from testeo.economia import calcular_umbrales, evaluar_test

LOG_PATH = "logs/tests_anuncios.json"


def cargar() -> list:
    try:
        with open(LOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def guardar(datos: list) -> None:
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)


def registrar(args):
    umbrales = calcular_umbrales(args.costo, args.precio)
    veredicto = evaluar_test(umbrales, args.gasto, args.atc, args.ventas, args.angulos)

    log = cargar()
    log.append({
        "fecha": datetime.now(timezone.utc).isoformat(),
        "producto": args.producto,
        "canal": args.canal,
        "gasto_acumulado": args.gasto,
        "ctr_pct": args.ctr,
        "atc_acumulado": args.atc,
        "ventas_acumuladas": args.ventas,
        "angulos_probados": args.angulos,
        "cpa_objetivo": umbrales.cpa_objetivo,
        "veredicto": veredicto["veredicto"],
        "razon": veredicto["razon"],
    })
    guardar(log)

    print(f"Veredicto: {veredicto['veredicto'].upper()}")
    print(f"  {veredicto['razon']}")
    print(f"  CPA objetivo: {umbrales.cpa_objetivo:.2f}€ | Margen bruto: {umbrales.gross_margin:.2f}€ | ROAS de equilibrio: {umbrales.breakeven_roas}x")


def historial(args):
    log = cargar()
    if args.producto:
        log = [t for t in log if t["producto"] == args.producto]

    if not log:
        print("Sin tests registrados.")
        return

    for t in log:
        print(f"{t['fecha'][:10]} | {t['producto']} | {t['canal']} | gasto={t['gasto_acumulado']}€ | {t['veredicto']}")


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="comando", required=True)

    p_reg = sub.add_parser("registrar")
    p_reg.add_argument("--producto", required=True)
    p_reg.add_argument("--costo", type=float, required=True)
    p_reg.add_argument("--precio", type=float, required=True)
    p_reg.add_argument("--canal", required=True, choices=["tiktok", "meta", "google"])
    p_reg.add_argument("--gasto", type=float, required=True)
    p_reg.add_argument("--ctr", type=float, default=None)
    p_reg.add_argument("--atc", type=int, default=0)
    p_reg.add_argument("--ventas", type=int, default=0)
    p_reg.add_argument("--angulos", type=int, default=1)
    p_reg.set_defaults(func=registrar)

    p_hist = sub.add_parser("historial")
    p_hist.add_argument("--producto", default=None)
    p_hist.set_defaults(func=historial)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
