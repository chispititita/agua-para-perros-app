"""El cerebro de Jarvis: Claude con herramientas para manejar dinero, vicios, tareas, contenidos y la tienda."""
import json
import os
import threading

import anthropic

import db
import media
import shopify

MODELO = os.getenv("MODELO_CLAUDE", "claude-opus-5-5")
BETAS = ["server-side-fallback-2026-07-01"]
MAX_PASOS = 12

TOOLS = [
    {"name": "panorama_general",
     "description": "Foto completa del estado del usuario: saldo, gastos del mes, vicios, tareas vencidas y próximas. "
                    "Úsala al empezar el día, al hacer un repaso o cuando necesites contexto para aconsejar.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "registrar_movimiento",
     "description": "Apunta un ingreso o un gasto de dinero. Para fijar el dinero que tiene ahora mismo, "
                    "registra un ingreso con categoría 'saldo inicial'.",
     "input_schema": {"type": "object", "properties": {
         "tipo": {"type": "string", "enum": ["ingreso", "gasto"]},
         "cantidad": {"type": "number", "description": "Importe en euros, siempre positivo"},
         "categoria": {"type": "string", "description": "p.ej. comida, ocio, tienda, anuncios, transporte, vicios, sueldo, ventas"},
         "descripcion": {"type": "string"},
         "fecha": {"type": "string", "description": "ISO 8601 opcional; por defecto ahora"}},
         "required": ["tipo", "cantidad"]}},
    {"name": "resumen_dinero",
     "description": "Saldo actual, ingresos y gastos del periodo, gastos por categoría y últimos movimientos (con sus id).",
     "input_schema": {"type": "object", "properties": {"dias": {"type": "integer", "description": "Por defecto 30"}}}},
    {"name": "borrar_movimiento",
     "description": "Borra un movimiento de dinero por su id (por ejemplo si se apuntó mal).",
     "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]}},
    {"name": "registrar_vicio",
     "description": "Apunta que el usuario ha caído en un vicio (tabaco, alcohol, apuestas, redes, porros, azúcar...). "
                    "Si el vicio no existe se crea.",
     "input_schema": {"type": "object", "properties": {
         "nombre": {"type": "string"},
         "cantidad": {"type": "number", "description": "Unidades (cigarros, cervezas, horas...). Por defecto 1"},
         "nota": {"type": "string", "description": "Contexto: cómo se sentía, qué lo provocó"}},
         "required": ["nombre"]}},
    {"name": "configurar_vicio",
     "description": "Crea o ajusta un vicio a controlar: límite diario, coste por unidad y objetivo.",
     "input_schema": {"type": "object", "properties": {
         "nombre": {"type": "string"},
         "limite_diario": {"type": "number", "description": "0 si el objetivo es dejarlo del todo"},
         "coste_unidad": {"type": "number", "description": "Euros por unidad, para calcular lo que le cuesta"},
         "objetivo": {"type": "string"}},
         "required": ["nombre"]}},
    {"name": "estado_vicios",
     "description": "Estado de cada vicio: consumo de hoy, 7 y 30 días, dinero gastado, días sin caer y si superó el límite.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "crear_tarea",
     "description": "Crea un trabajo o tarea pendiente.",
     "input_schema": {"type": "object", "properties": {
         "titulo": {"type": "string"},
         "detalle": {"type": "string"},
         "area": {"type": "string", "description": "tienda, personal, salud, estudios, trabajo..."},
         "prioridad": {"type": "string", "enum": ["alta", "media", "baja"]},
         "fecha_limite": {"type": "string", "description": "Fecha AAAA-MM-DD (o AAAA-MM-DDTHH:MM)"}},
         "required": ["titulo"]}},
    {"name": "completar_tarea",
     "description": "Marca una tarea como hecha (o la reabre con hecha=false).",
     "input_schema": {"type": "object", "properties": {
         "id": {"type": "integer"}, "hecha": {"type": "boolean"}}, "required": ["id"]}},
    {"name": "listar_tareas",
     "description": "Lista las tareas con su id, ordenadas por prioridad y fecha.",
     "input_schema": {"type": "object", "properties": {"incluir_hechas": {"type": "boolean"}}}},
    {"name": "borrar_tarea",
     "description": "Elimina una tarea por su id.",
     "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]}},
    {"name": "recordar",
     "description": "Guarda en la memoria permanente algo importante sobre el usuario (metas, gustos, situación, "
                    "compromisos). Se lo recordarás en futuras conversaciones.",
     "input_schema": {"type": "object", "properties": {"texto": {"type": "string"}}, "required": ["texto"]}},
    {"name": "olvidar",
     "description": "Borra un recuerdo de la memoria por su id.",
     "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]}},
    {"name": "generar_imagen",
     "description": "Genera una imagen con IA para la tienda (producto, anuncio, post, banner). Escribe el prompt "
                    "en INGLÉS, muy visual y detallado: sujeto, escena, luz, estilo fotográfico, encuadre. "
                    "Tarda unos segundos y devuelve el id de la imagen.",
     "input_schema": {"type": "object", "properties": {
         "prompt": {"type": "string"},
         "formato": {"type": "string", "enum": list(media.FORMATOS),
                     "description": "1:1 feed, 4:5 post Instagram, 9:16 stories/reels/TikTok, 16:9 banner web"}},
         "required": ["prompt"]}},
    {"name": "generar_video",
     "description": "Genera un vídeo corto con IA (anuncio, reel, TikTok). Prompt en INGLÉS describiendo la acción y "
                    "el movimiento de cámara. Puede partir de una imagen generada antes (imagen_base_id) o de la "
                    "foto de un producto de Shopify (imagen_url). Tarda varios minutos: se genera en segundo plano "
                    "y aparecerá en el Estudio.",
     "input_schema": {"type": "object", "properties": {
         "prompt": {"type": "string"},
         "imagen_base_id": {"type": "integer"},
         "imagen_url": {"type": "string"}},
         "required": ["prompt"]}},
    {"name": "estado_contenido",
     "description": "Consulta si una imagen o vídeo generado ya está listo.",
     "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]}},
    {"name": "shopify_productos",
     "description": "Lista los productos de la tienda Shopify: título, precio, stock, descripción y URL de la foto.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "shopify_ventas",
     "description": "Pedidos y facturación de la tienda Shopify en los últimos días.",
     "input_schema": {"type": "object", "properties": {"dias": {"type": "integer", "description": "Por defecto 7"}}}},
]


def _ejecutar_herramienta(nombre: str, e: dict):
    if nombre == "panorama_general":
        return db.panorama()
    if nombre == "registrar_movimiento":
        return db.registrar_movimiento(e["tipo"], e["cantidad"], e.get("categoria", "otros"),
                                       e.get("descripcion", ""), e.get("fecha"))
    if nombre == "resumen_dinero":
        return db.resumen_dinero(e.get("dias") or 30)
    if nombre == "borrar_movimiento":
        return {"borrado": db.borrar_movimiento(e["id"]), "saldo_actual": db.saldo()}
    if nombre == "registrar_vicio":
        return db.registrar_vicio(e["nombre"], e.get("cantidad") or 1, e.get("nota", ""))
    if nombre == "configurar_vicio":
        return db.configurar_vicio(e["nombre"], e.get("limite_diario"), e.get("coste_unidad"), e.get("objetivo"))
    if nombre == "estado_vicios":
        return db.estado_vicios()
    if nombre == "crear_tarea":
        return db.crear_tarea(e["titulo"], e.get("detalle", ""), e.get("area", "personal"),
                              e.get("prioridad", "media"), e.get("fecha_limite"))
    if nombre == "completar_tarea":
        return db.completar_tarea(e["id"], e.get("hecha", True)) or {"error": "No existe esa tarea"}
    if nombre == "listar_tareas":
        return db.listar_tareas(bool(e.get("incluir_hechas")))
    if nombre == "borrar_tarea":
        return {"borrada": db.borrar_tarea(e["id"])}
    if nombre == "recordar":
        return {"id": db.recordar(e["texto"])}
    if nombre == "olvidar":
        return {"olvidado": db.olvidar(e["id"])}
    if nombre == "generar_imagen":
        return media.generar_imagen(e["prompt"], e.get("formato", "1:1"))
    if nombre == "generar_video":
        return media.generar_video(e["prompt"], e.get("imagen_base_id"), e.get("imagen_url"))
    if nombre == "estado_contenido":
        return db.obtener_media(e["id"]) or {"error": "No existe ese contenido"}
    if nombre == "shopify_productos":
        return shopify.productos()
    if nombre == "shopify_ventas":
        return shopify.ventas(e.get("dias") or 7)
    raise ValueError(f"Herramienta desconocida: {nombre}")


def _prompt_sistema() -> str:
    usuario = os.getenv("USUARIO_NOMBRE", "").strip() or "el usuario"
    tienda = os.getenv("TIENDA_NOMBRE", "mi tienda").strip()
    desc_tienda = os.getenv("TIENDA_DESCRIPCION", "").strip()
    recuerdos = "\n".join(f"- [{m['id']}] {m['texto']}" for m in db.listar_memoria()) or "- (todavía nada)"
    return f"""Eres JARVIS, el asistente personal y coach de vida de {usuario}, al estilo del JARVIS de Iron Man:
leal, brillante, con un toque de humor británico elegante, pero cercano y en español de España.

Tu misión:
1. Coach de vida: ayudar a {usuario} a tener disciplina, salir de sus vicios, organizar su día y cumplir sus metas.
   Sé honesto y directo cuando haga falta, celebra los avances (días sin caer, tareas hechas, ahorro) y nunca juzgues.
   Cuando caiga en un vicio, regístralo, pregunta qué lo provocó y propón una alternativa concreta.
2. Finanzas: llevar su dinero (ingresos, gastos, saldo) y avisarle si gasta de más o si un vicio le cuesta dinero.
3. Trabajos y tareas: apuntarlas, priorizarlas y recordarle lo que vence.
4. Su tienda Shopify «{tienda}»{': ' + desc_tienda if desc_tienda else ''}. Ayúdale con ideas de marketing,
   y crea imágenes y vídeos con IA para anuncios, reels, TikTok y la web.

Reglas:
- Usa las herramientas para leer y guardar datos. Nunca inventes cifras: consúltalas.
- Si {usuario} menciona un gasto, un ingreso, un vicio o una tarea, apúntalo sin preguntar y confírmalo en una frase.
- Te habla sobre todo POR VOZ y tus respuestas se leen en voz alta: responde breve y natural (2-4 frases),
  sin markdown, sin listas con asteriscos, sin emojis, sin URLs. Las cantidades dilas como «unos 45 euros».
  Solo te extiendes si te pide un plan o una explicación detallada.
- Para imágenes y vídeos escribe tú el prompt en inglés con mucho detalle, pensando en que venda el producto.
- Guarda con «recordar» lo importante que te cuente de su vida y sus metas.

Lo que recuerdas de {usuario} (id entre corchetes):
{recuerdos}"""


class Sesion:
    """Conversación en curso. El historial solo crece (se envía tal cual a Claude en cada turno)."""

    def __init__(self):
        self.cliente = None
        self.lock = threading.Lock()
        self.reiniciar()

    def reiniciar(self):
        self.sistema = _prompt_sistema()
        self.mensajes: list = []

    def hablar(self, texto: str) -> dict:
        with self.lock:
            return self._turno(texto)

    def _turno(self, texto: str) -> dict:
        inicio = len(self.mensajes)
        self.mensajes.append({"role": "user", "content": f"[{db.fecha_legible()}] {texto}"})
        acciones, contenidos = [], []
        try:
            if self.cliente is None:
                self.cliente = anthropic.Anthropic()
            for _ in range(MAX_PASOS):
                resp = self.cliente.beta.messages.create(
                    model=MODELO,
                    max_tokens=16000,
                    system=self.sistema,
                    tools=TOOLS,
                    messages=self.mensajes,
                    thinking={"type": "adaptive"},
                    output_config={"effort": os.getenv("ESFUERZO_CLAUDE", "low")},
                    cache_control={"type": "ephemeral"},
                    betas=BETAS,
                    fallbacks="default",
                )
                if resp.stop_reason == "refusal":
                    del self.mensajes[inicio:]
                    return {"texto": "Prefiero no ayudar con eso. ¿Seguimos con otra cosa?",
                            "acciones": acciones, "contenidos": contenidos}

                self.mensajes.append({"role": "assistant", "content": resp.content})
                if resp.stop_reason != "tool_use":
                    texto_final = " ".join(b.text for b in resp.content if b.type == "text").strip()
                    return {"texto": texto_final or "Hecho.", "acciones": acciones, "contenidos": contenidos}

                resultados = []
                for bloque in resp.content:
                    if bloque.type != "tool_use":
                        continue
                    acciones.append(bloque.name)
                    try:
                        salida = _ejecutar_herramienta(bloque.name, bloque.input)
                        if bloque.name in ("generar_imagen", "generar_video") and isinstance(salida, dict):
                            contenidos.append(salida)
                        resultados.append({"type": "tool_result", "tool_use_id": bloque.id,
                                           "content": json.dumps(salida, ensure_ascii=False, default=str)})
                    except Exception as err:
                        resultados.append({"type": "tool_result", "tool_use_id": bloque.id,
                                           "content": f"Error: {err}", "is_error": True})
                self.mensajes.append({"role": "user", "content": resultados})
            return {"texto": "Me he liado con demasiados pasos. ¿Me lo repites de otra forma?",
                    "acciones": acciones, "contenidos": contenidos}
        except anthropic.AuthenticationError:
            del self.mensajes[inicio:]
            return {"texto": "No puedo conectarme a mi cerebro: revisa la ANTHROPIC_API_KEY del archivo .env.",
                    "error": True}
        except anthropic.RateLimitError:
            del self.mensajes[inicio:]
            return {"texto": "Estoy saturado ahora mismo. Dame unos segundos y vuelve a intentarlo.", "error": True}
        except anthropic.APIStatusError as err:
            del self.mensajes[inicio:]
            return {"texto": f"Ha fallado la conexión con la IA (código {err.status_code}).", "error": True}
        except anthropic.APIConnectionError:
            del self.mensajes[inicio:]
            return {"texto": "No tengo conexión a internet ahora mismo.", "error": True}
        except TypeError as err:  # el SDK no encuentra ninguna clave configurada
            del self.mensajes[inicio:]
            self.cliente = None
            if "authentication" in str(err):
                return {"texto": "Me falta la ANTHROPIC_API_KEY en el archivo .env para poder pensar.", "error": True}
            raise


def mejorar_prompt(idea: str, tipo: str) -> str:
    """Convierte una idea en español en un prompt profesional en inglés para el generador de imagen o vídeo."""
    tienda = os.getenv("TIENDA_NOMBRE", "").strip()
    desc = os.getenv("TIENDA_DESCRIPCION", "").strip()
    resp = anthropic.Anthropic().beta.messages.create(
        model=MODELO,
        max_tokens=4000,
        thinking={"type": "adaptive"},
        output_config={"effort": "low"},
        betas=BETAS,
        fallbacks="default",
        system=(f"Escribes prompts para generadores de {'vídeo' if tipo == 'video' else 'imagen'} con IA, para "
                f"anuncios de la tienda online «{tienda}» ({desc}). Devuelve SOLO el prompt, en inglés, "
                "en un único párrafo muy visual: sujeto, escena, iluminación, estilo, encuadre"
                f"{' y movimiento de cámara' if tipo == 'video' else ''}. Sin comillas ni explicaciones."),
        messages=[{"role": "user", "content": idea}],
    )
    if resp.stop_reason == "refusal":
        return idea
    return " ".join(b.text for b in resp.content if b.type == "text").strip() or idea
