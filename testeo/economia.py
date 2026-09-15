"""
Economía unitaria y veredicto de test de anuncios.

Umbrales basados en prácticas comunes de dropshippers solo-operador
(ver README). Ajústalos aquí si aprendes algo distinto sobre tu nicho.
"""
from dataclasses import dataclass

GASTO_KILL_SIN_ATC = 40.0       # punto medio del rango 30-50€ del README
GASTO_KILL_SIN_VENTA = 125.0    # punto medio del rango 100-150€ del README
ANGULOS_MIN_ANTES_DE_MATAR = 3  # no matar por falta de ventas sin haber probado varios ángulos
ANGULOS_MAX_ANTES_DE_MATAR_POR_ATC = 5
TOLERANCIA_CPA = 1.3            # CPA real hasta un 30% por encima del objetivo aún se deja correr
PRESUPUESTO_TEST_MIN = 100.0
PRESUPUESTO_TEST_MAX = 300.0


@dataclass
class Umbrales:
    gross_margin: float
    cpa_objetivo: float
    breakeven_roas: float
    kill_sin_atc: float
    kill_sin_venta: float
    kill_por_cpa: float
    presupuesto_test_min: float
    presupuesto_test_max: float


def calcular_umbrales(costo: float, precio: float) -> Umbrales:
    gross_margin = precio - costo
    cpa_objetivo = round(gross_margin * 0.7, 2) if gross_margin > 0 else 0.0
    breakeven_roas = round(precio / gross_margin, 2) if gross_margin > 0 else None

    return Umbrales(
        gross_margin=round(gross_margin, 2),
        cpa_objetivo=cpa_objetivo,
        breakeven_roas=breakeven_roas,
        kill_sin_atc=GASTO_KILL_SIN_ATC,
        kill_sin_venta=GASTO_KILL_SIN_VENTA,
        kill_por_cpa=round(cpa_objetivo * TOLERANCIA_CPA, 2),
        presupuesto_test_min=PRESUPUESTO_TEST_MIN,
        presupuesto_test_max=PRESUPUESTO_TEST_MAX,
    )


def evaluar_test(umbrales: Umbrales, gasto: float, atc: int, ventas: int, angulos: int) -> dict:
    if ventas > 0:
        cpa_real = gasto / ventas
        if cpa_real <= umbrales.cpa_objetivo:
            return {
                "veredicto": "escalar",
                "razon": f"CPA real ({cpa_real:.2f}€) está en o por debajo del objetivo ({umbrales.cpa_objetivo:.2f}€).",
            }
        if cpa_real <= umbrales.kill_por_cpa:
            return {
                "veredicto": "seguir",
                "razon": f"CPA real ({cpa_real:.2f}€) por encima del objetivo pero dentro de tolerancia (hasta {umbrales.kill_por_cpa:.2f}€).",
            }
        return {
            "veredicto": "matar",
            "razon": f"CPA real ({cpa_real:.2f}€) supera con margen el objetivo ({umbrales.cpa_objetivo:.2f}€).",
        }

    if atc == 0 and gasto >= umbrales.kill_sin_atc:
        if angulos < ANGULOS_MAX_ANTES_DE_MATAR_POR_ATC:
            return {
                "veredicto": "cambiar_angulo",
                "razon": f"Gastados {gasto:.2f}€ sin ningún ATC con este ángulo ({umbrales.kill_sin_atc}€ es el umbral) — el hook no funciona, prueba otro ángulo.",
            }
        return {
            "veredicto": "matar",
            "razon": f"Gastados {gasto:.2f}€ sin ATC tras probar {angulos} ángulos distintos — el producto no engancha.",
        }

    if gasto >= umbrales.kill_sin_venta:
        if angulos < ANGULOS_MIN_ANTES_DE_MATAR:
            return {
                "veredicto": "cambiar_angulo",
                "razon": f"Gastados {gasto:.2f}€ sin ventas pero solo se probaron {angulos} ángulo(s) — prueba {ANGULOS_MIN_ANTES_DE_MATAR}-5 antes de descartar.",
            }
        return {
            "veredicto": "matar",
            "razon": f"Gastados {gasto:.2f}€ sin ninguna venta tras probar {angulos} ángulos — sin señal de conversión.",
        }

    if atc > 0:
        return {
            "veredicto": "seguir",
            "razon": f"Hay {atc} ATC y el gasto ({gasto:.2f}€) todavía no llega al umbral de matar ({umbrales.kill_sin_venta}€) — sigue corriendo el test.",
        }

    return {
        "veredicto": "esperar",
        "razon": "Todavía no hay suficientes datos (sin ATC ni ventas, gasto bajo) — espera antes de juzgar.",
    }
