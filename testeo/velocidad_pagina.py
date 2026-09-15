"""
Revisa la velocidad de una ficha de producto con la API de Google PageSpeed
Insights antes de gastar en ads.

Uso:
    python testeo/velocidad_pagina.py --url https://tu-tienda.myshopify.com/products/tu-producto
"""
import argparse
import json
import os

import requests

PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

UMBRAL_LCP_S = 2.5
UMBRAL_CLS = 0.1
UMBRAL_TBT_MS = 200  # proxy de INP en un análisis de laboratorio (no hay INP real sin CrUX)


def revisar_velocidad(url: str, estrategia: str = "mobile") -> dict:
    params = {"url": url, "strategy": estrategia, "category": "PERFORMANCE"}
    api_key = os.environ.get("PAGESPEED_API_KEY")
    if api_key:
        params["key"] = api_key

    resp = requests.get(PAGESPEED_URL, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()

    resultado_lighthouse = data["lighthouseResult"]
    score = round(resultado_lighthouse["categories"]["performance"]["score"] * 100)
    audits = resultado_lighthouse["audits"]

    lcp_s = audits.get("largest-contentful-paint", {}).get("numericValue", 0) / 1000
    cls = audits.get("cumulative-layout-shift", {}).get("numericValue", 0)
    tbt_ms = audits.get("total-blocking-time", {}).get("numericValue", 0)

    alertas = []
    if lcp_s > UMBRAL_LCP_S:
        alertas.append(f"LCP alto: {lcp_s:.1f}s (objetivo ≤{UMBRAL_LCP_S}s)")
    if cls > UMBRAL_CLS:
        alertas.append(f"CLS alto: {cls:.2f} (objetivo ≤{UMBRAL_CLS})")
    if tbt_ms > UMBRAL_TBT_MS:
        alertas.append(f"TBT alto: {tbt_ms:.0f}ms, proxy de INP (objetivo ≤{UMBRAL_TBT_MS}ms)")

    return {
        "lighthouse_performance_score": score,
        "lcp_s": round(lcp_s, 2),
        "cls": round(cls, 3),
        "tbt_ms": round(tbt_ms),
        "alertas": alertas,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--estrategia", default="mobile", choices=["mobile", "desktop"])
    args = parser.parse_args()

    resultado = revisar_velocidad(args.url, args.estrategia)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
