"""Cerebro gratuito y sin claves: un modelo de IA que corre en tu propio ordenador con Ollama (https://ollama.com).

Usa las mismas herramientas que la versión con Claude (dinero, vicios, tareas, memoria, contenidos, Shopify).
"""
import json
import os
import re
import threading

import requests

import brain
import db

MAX_PASOS = 8
MAX_MENSAJES = 24  # los modelos locales tienen menos memoria: se quedan los últimos mensajes


def _url() -> str:
    return os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")


def _modelo() -> str:
    return os.getenv("MODELO_LOCAL", "qwen2.5:7b")


def estado() -> dict:
    """¿Está Ollama abierto y el modelo descargado?"""
    try:
        r = requests.get(f"{_url()}/api/tags", timeout=3)
        nombres = {m["name"] for m in r.json().get("models", [])}
    except (requests.RequestException, ValueError):
        return {"ok": False, "motivo": "Ollama no está abierto o no está instalado (ollama.com)"}
    modelo = _modelo()
    if modelo not in nombres and f"{modelo}:latest" not in nombres:
        return {"ok": False, "motivo": f"Falta descargar el modelo: abre una terminal y escribe  ollama pull {modelo}"}
    return {"ok": True, "motivo": f"IA local ({modelo})"}


TOOLS = [{"type": "function", "function": {
    "name": t["name"], "description": t["description"], "parameters": t["input_schema"]}} for t in brain.TOOLS]

INSTRUCCIONES_EXTRA = """

Importante sobre las herramientas: cuando necesites datos o guardar algo, LLAMA a la herramienta adecuada en vez de
decir que lo vas a hacer. Nunca te inventes números: si no los tienes, usa una herramienta para consultarlos."""


def _chat(mensajes: list, herramientas: bool = True) -> dict:
    cuerpo = {"model": _modelo(), "messages": mensajes, "stream": False,
              "options": {"temperature": 0.5, "num_ctx": int(os.getenv("CONTEXTO_LOCAL", "8192"))}}
    if herramientas:
        cuerpo["tools"] = TOOLS
    r = requests.post(f"{_url()}/api/chat", json=cuerpo, timeout=600)
    if r.status_code == 404:
        raise RuntimeError(f"Falta descargar el modelo. Abre una terminal y escribe: ollama pull {_modelo()}")
    if r.status_code >= 400:
        raise RuntimeError(f"La IA local respondió {r.status_code}: {r.text[:200]}")
    return r.json()["message"]


def _llamadas(mensaje: dict) -> list[tuple[str, dict]]:
    """Extrae las llamadas a herramientas. Algunos modelos pequeños las escriben como texto: también se aceptan."""
    llamadas = []
    for tc in mensaje.get("tool_calls") or []:
        f = tc.get("function", {})
        args = f.get("arguments") or {}
        if isinstance(args, str):
            try:
                args = json.loads(args)
            except ValueError:
                args = {}
        llamadas.append((f.get("name", ""), args))
    if llamadas:
        return llamadas
    texto = (mensaje.get("content") or "").strip()
    nombres = {t["name"] for t in brain.TOOLS}
    for bloque in re.findall(r"\{.*\}", re.sub(r"</?tool_call>", "", texto), flags=re.S):
        try:
            datos = json.loads(bloque)
        except ValueError:
            continue
        if isinstance(datos, dict) and datos.get("name") in nombres:
            llamadas.append((datos["name"], datos.get("arguments") or datos.get("parameters") or {}))
    return llamadas


def _limpiar(texto: str) -> str:
    texto = re.sub(r"<think>.*?</think>", "", texto or "", flags=re.S)
    return re.sub(r"</?tool_call>", "", texto).strip()


class SesionLocal:
    def __init__(self):
        self.lock = threading.Lock()
        self.reiniciar()

    def reiniciar(self):
        self.sistema = brain.prompt_sistema() + INSTRUCCIONES_EXTRA
        self.mensajes: list = []

    def hablar(self, texto: str) -> dict:
        with self.lock:
            return self._turno(texto)

    def _recortar(self):
        if len(self.mensajes) <= MAX_MENSAJES:
            return
        corte = len(self.mensajes) - MAX_MENSAJES
        while corte < len(self.mensajes) and self.mensajes[corte]["role"] != "user":
            corte += 1
        del self.mensajes[:corte]

    def _turno(self, texto: str) -> dict:
        inicio = len(self.mensajes)
        self.mensajes.append({"role": "user", "content": f"[{db.fecha_legible()}] {texto}"})
        acciones, contenidos = [], []
        try:
            for _ in range(MAX_PASOS):
                msg = _chat([{"role": "system", "content": self.sistema}] + self.mensajes)
                llamadas = _llamadas(msg)
                self.mensajes.append({"role": "assistant", "content": msg.get("content") or "",
                                      **({"tool_calls": msg["tool_calls"]} if msg.get("tool_calls") else {})})
                if not llamadas:
                    self._recortar()
                    return {"texto": _limpiar(msg.get("content")) or "Hecho.",
                            "acciones": acciones, "contenidos": contenidos}
                for nombre, args in llamadas:
                    salida, _ = brain.ejecutar_y_anotar(nombre, args, acciones, contenidos)
                    self.mensajes.append({"role": "tool", "content": salida, "tool_name": nombre})
            self._recortar()
            return {"texto": "Me he liado con demasiados pasos. ¿Me lo repites de otra forma?",
                    "acciones": acciones, "contenidos": contenidos}
        except requests.ConnectionError:
            del self.mensajes[inicio:]
            return {"texto": "No encuentro mi cerebro local. Abre la aplicación Ollama y vuelve a intentarlo.",
                    "error": True}
        except (requests.RequestException, RuntimeError, KeyError, ValueError) as err:
            del self.mensajes[inicio:]
            return {"texto": f"Ha fallado la IA local: {err}", "error": True}


def completar(sistema: str, texto: str) -> str:
    """Una respuesta simple, sin herramientas (para mejorar prompts)."""
    msg = _chat([{"role": "system", "content": sistema}, {"role": "user", "content": texto}], herramientas=False)
    return _limpiar(msg.get("content"))
