"""
Genera candidatos de producto de dropshipping usando la API de Anthropic.

Requiere la variable de entorno ANTHROPIC_API_KEY (ver .env.example).
Usada por la página "Investigar productos (IA)" de app_web.py.
"""
import json
import os

from anthropic import Anthropic

MODELO = "claude-sonnet-5"

PROMPT_SISTEMA = (
    "Eres un investigador de productos de dropshipping para el mercado "
    "hispanohablante (España y Latinoamérica). Dado un nicho o categoría, "
    "propones candidatos con señales realistas de tendencia, margen y "
    "saturación. Respondes siempre con JSON válido, sin texto fuera del JSON."
)


def generar_candidatos(nicho: str, cantidad: int = 8) -> list:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Falta ANTHROPIC_API_KEY en el entorno. Configúrala (por ejemplo en "
            "un archivo .env, ver .env.example) antes de usar esta función."
        )

    client = Anthropic(api_key=api_key)
    prompt = (
        f"Dame {cantidad} candidatos de producto de dropshipping para el nicho "
        f"'{nicho}', pensados para tiendas en España/Latam. Para cada candidato "
        "incluye estos campos exactos: nombre_producto, angulo_marketing, "
        "costo_estimado (número, EUR), precio_sugerido (número, EUR), "
        "publico_objetivo, nivel_saturacion (bajo/medio/alto) y razon_tendencia. "
        "Responde ÚNICAMENTE con un array JSON de objetos, sin texto adicional "
        "antes ni después."
    )

    mensaje = client.messages.create(
        model=MODELO,
        max_tokens=4096,
        system=PROMPT_SISTEMA,
        messages=[{"role": "user", "content": prompt}],
    )

    texto = "".join(bloque.text for bloque in mensaje.content if bloque.type == "text")
    return json.loads(texto)
