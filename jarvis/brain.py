"""El cerebro de Jarvis: herramientas para manejar hábitos, dinero, tareas y memoria (con Claude si hay clave)."""
import json
import os
import threading

import anthropic

import db

MODELO = os.getenv("MODELO_CLAUDE", "claude-opus-5-5")
BETAS = ["server-side-fallback-2026-07-01"]
MAX_PASOS = 12

TOOLS = [
    {"name": "panorama_general",
     "description": "Foto completa del estado del usuario: hábitos, saldo, gastos del mes, tareas vencidas y próximas. "
                    "Úsala al empezar el día, al hacer un repaso o cuando necesites contexto para aconsejar.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "registrar_movimiento",
     "description": "Apunta un ingreso o un gasto de dinero. Para fijar el dinero que tiene ahora mismo, "
                    "registra un ingreso con categoría 'saldo inicial'.",
     "input_schema": {"type": "object", "properties": {
         "tipo": {"type": "string", "enum": ["ingreso", "gasto"]},
         "cantidad": {"type": "number", "description": "Importe en euros, siempre positivo"},
         "categoria": {"type": "string", "description": "p.ej. comida, ocio, casa, transporte, hábitos, sueldo"},
         "descripcion": {"type": "string"},
         "fecha": {"type": "string", "description": "ISO 8601 opcional; por defecto ahora"}},
         "required": ["tipo", "cantidad"]}},
    {"name": "resumen_dinero",
     "description": "Saldo actual, ingresos y gastos del periodo, gastos por categoría y últimos movimientos (con sus id).",
     "input_schema": {"type": "object", "properties": {"dias": {"type": "integer", "description": "Por defecto 30"}}}},
    {"name": "borrar_movimiento",
     "description": "Borra un movimiento de dinero por su id (por ejemplo si se apuntó mal).",
     "input_schema": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"]}},
    {"name": "registrar_habito",
     "description": "Apunta un hábito: algo bueno que ha hecho (gimnasio, leer, meditar, beber agua, caminar...) o "
                    "un mal hábito en el que ha caído (tabaco, alcohol, apuestas, redes, comida basura...). "
                    "Si el hábito no existe se crea con el tipo indicado.",
     "input_schema": {"type": "object", "properties": {
         "nombre": {"type": "string", "description": "Nombre corto y consistente, p.ej. 'gimnasio', 'tabaco', 'agua'"},
         "cantidad": {"type": "number", "description": "Unidades (vasos, cigarros, minutos, páginas...). Por defecto 1"},
         "tipo": {"type": "string", "enum": ["bueno", "malo"], "description": "Solo necesario si el hábito es nuevo"},
         "nota": {"type": "string", "description": "Contexto: cómo se sentía, qué lo provocó"}},
         "required": ["nombre"]}},
    {"name": "configurar_habito",
     "description": "Crea o ajusta un hábito a seguir. Bueno: meta_diaria = cuánto quiere hacer al día. "
                    "Malo: meta_diaria = límite diario (0 si quiere dejarlo del todo) y coste_unidad en euros.",
     "input_schema": {"type": "object", "properties": {
         "nombre": {"type": "string"},
         "tipo": {"type": "string", "enum": ["bueno", "malo"]},
         "meta_diaria": {"type": "number"},
         "coste_unidad": {"type": "number"},
         "objetivo": {"type": "string"}},
         "required": ["nombre"]}},
    {"name": "estado_habitos",
     "description": "Estado de cada hábito. Buenos: hecho hoy, racha de días seguidos y días cumplidos en 7 y 30 días. "
                    "Malos: consumo de hoy, 7 y 30 días, días sin caer, dinero gastado y si superó el límite.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "crear_tarea",
     "description": "Crea un trabajo o tarea pendiente.",
     "input_schema": {"type": "object", "properties": {
         "titulo": {"type": "string"},
         "detalle": {"type": "string"},
         "area": {"type": "string", "description": "personal, salud, estudios, trabajo, casa..."},
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
    if nombre == "registrar_habito":
        return db.registrar_habito(e["nombre"], e.get("cantidad") or 1, e.get("nota", ""), e.get("tipo"))
    if nombre == "configurar_habito":
        return db.configurar_habito(e["nombre"], e.get("tipo"), e.get("meta_diaria"), e.get("coste_unidad"),
                                    e.get("objetivo"))
    if nombre == "estado_habitos":
        return db.estado_habitos()
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
    raise ValueError(f"Herramienta desconocida: {nombre}")


def ejecutar_y_anotar(nombre: str, entrada: dict, acciones: list) -> tuple[str, bool]:
    """Ejecuta una herramienta, anota la acción y devuelve (resultado en JSON, hubo_error)."""
    acciones.append(nombre)
    try:
        salida = _ejecutar_herramienta(nombre, entrada or {})
        return json.dumps(salida, ensure_ascii=False, default=str), False
    except Exception as err:
        return f"Error: {err}", True


def usar_claude() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


def nueva_sesion():
    """Con clave de Claude usa Claude; si no, la IA local gratuita (Ollama)."""
    if usar_claude():
        return Sesion()
    import cerebro_local
    return cerebro_local.SesionLocal()


def prompt_sistema() -> str:
    return _prompt_sistema()


def _prompt_sistema() -> str:
    usuario = os.getenv("USUARIO_NOMBRE", "").strip() or "el usuario"
    recuerdos = "\n".join(f"- [{m['id']}] {m['texto']}" for m in db.listar_memoria()) or "- (todavía nada)"
    return f"""Eres JARVIS, el asistente personal y coach de vida de {usuario}, al estilo del JARVIS de Iron Man:
leal, brillante, con un toque de humor británico elegante, pero cercano y en español de España.

Tu misión:
1. Hábitos (lo más importante): ayudar a {usuario} a construir buenos hábitos (deporte, lectura, sueño, agua...)
   y a dejar los malos (tabaco, alcohol, apuestas, redes...). Celebra las rachas y los días sin caer, sé honesto y
   directo cuando haga falta, y nunca juzgues. Cuando caiga en un mal hábito, regístralo, pregunta qué lo provocó
   y propón una alternativa concreta. Cuando cumpla uno bueno, felicítale y menciona su racha.
2. Dinero: llevar sus ingresos, gastos y saldo, y avisarle si gasta de más o si un mal hábito le cuesta dinero.
3. Tareas: apuntarlas, priorizarlas y recordarle lo que vence.

Reglas:
- Usa las herramientas para leer y guardar datos. Nunca inventes cifras: consúltalas.
- Si {usuario} menciona un hábito, un gasto, un ingreso o una tarea, apúntalo sin preguntar y confírmalo en una frase.
- Usa siempre el mismo nombre para cada hábito (mira estado_habitos si dudas) para no crear duplicados.
- Te habla sobre todo POR VOZ y tus respuestas se leen en voz alta: responde breve y natural (2-4 frases),
  sin markdown, sin listas con asteriscos, sin emojis, sin URLs. Las cantidades dilas como «unos 45 euros».
  Solo te extiendes si te pide un plan o una explicación detallada.
- Guarda con «recordar» lo importante que te cuente de su vida y sus metas.

Lo que recuerdas de {usuario} (id entre corchetes):
{recuerdos}"""


class Sesion:
    """Conversación en curso con Claude. El historial solo crece (se envía tal cual en cada turno)."""

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
        acciones = []
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
                            "acciones": acciones}

                self.mensajes.append({"role": "assistant", "content": resp.content})
                if resp.stop_reason != "tool_use":
                    texto_final = " ".join(b.text for b in resp.content if b.type == "text").strip()
                    return {"texto": texto_final or "Hecho.", "acciones": acciones}

                resultados = []
                for bloque in resp.content:
                    if bloque.type != "tool_use":
                        continue
                    salida, es_error = ejecutar_y_anotar(bloque.name, bloque.input, acciones)
                    resultados.append({"type": "tool_result", "tool_use_id": bloque.id,
                                       "content": salida, "is_error": es_error})
                self.mensajes.append({"role": "user", "content": resultados})
            return {"texto": "Me he liado con demasiados pasos. ¿Me lo repites de otra forma?",
                    "acciones": acciones}
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
