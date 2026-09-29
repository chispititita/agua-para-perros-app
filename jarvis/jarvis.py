"""JARVIS — coach de vida por voz: hábitos, dinero y tareas.

Ejecuta:  python jarvis.py
y se abrirá la aplicación en una ventana de Chrome/Edge (necesario para hablar por voz).
"""
import os
import shutil
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

from dotenv import load_dotenv

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")

from flask import Flask, jsonify, request, send_from_directory  # noqa: E402

import brain  # noqa: E402
import db  # noqa: E402

app = Flask(__name__, static_folder=str(BASE / "static"), static_url_path="/static")
sesion = None


def _sesion():
    global sesion
    if sesion is None:
        sesion = brain.nueva_sesion()
    return sesion


def _json() -> dict:
    return request.get_json(silent=True) or {}


def _error(msg: str, codigo: int = 400):
    return jsonify({"error": msg}), codigo


@app.get("/")
def inicio():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/api/estado")
def estado():
    if brain.usar_claude():
        cerebro = {"ok": True, "motivo": "Claude (con clave)"}
    else:
        import cerebro_local
        cerebro = cerebro_local.estado()
    return jsonify({
        "cerebro": cerebro,
        "usuario": os.getenv("USUARIO_NOMBRE", ""),
        "palabra_clave": os.getenv("PALABRA_ACTIVACION", "jarvis"),
    })


@app.get("/api/panorama")
def panorama():
    return jsonify(db.panorama())


# ---------------------------------------------------------------- Chat / voz

@app.post("/api/chat")
def chat():
    texto = (_json().get("texto") or "").strip()
    if not texto:
        return _error("Mensaje vacío")
    return jsonify(_sesion().hablar(texto))


@app.post("/api/chat/reiniciar")
def reiniciar_chat():
    _sesion().reiniciar()
    return jsonify({"ok": True})


# ---------------------------------------------------------------- Dinero

@app.get("/api/dinero")
def dinero():
    dias = request.args.get("dias", 30, type=int)
    datos = db.resumen_dinero(dias)
    datos["movimientos"] = db.listar_movimientos(200)
    return jsonify(datos)


@app.post("/api/dinero")
def nuevo_movimiento():
    d = _json()
    try:
        return jsonify(db.registrar_movimiento(d.get("tipo"), float(d.get("cantidad", 0)),
                                               d.get("categoria") or "otros", d.get("descripcion") or ""))
    except (TypeError, ValueError) as e:
        return _error(str(e))


@app.delete("/api/dinero/<int:mov_id>")
def borrar_movimiento(mov_id):
    return jsonify({"ok": db.borrar_movimiento(mov_id)})


# ---------------------------------------------------------------- Hábitos

@app.get("/api/habitos")
def habitos():
    return jsonify(db.estado_habitos())


@app.post("/api/habitos")
def configurar_habito():
    d = _json()
    if not (d.get("nombre") or "").strip():
        return _error("Falta el nombre")
    num = lambda k: float(d[k]) if d.get(k) not in (None, "") else None
    try:
        return jsonify(db.configurar_habito(d["nombre"], d.get("tipo") or None, num("meta_diaria"),
                                            num("coste_unidad"), d.get("objetivo")))
    except ValueError as e:
        return _error(str(e))


@app.post("/api/habitos/registrar")
def registrar_habito():
    d = _json()
    if not (d.get("nombre") or "").strip():
        return _error("Falta el nombre")
    return jsonify(db.registrar_habito(d["nombre"], float(d.get("cantidad") or 1), d.get("nota") or ""))


@app.delete("/api/habitos/<int:habito_id>")
def borrar_habito(habito_id):
    return jsonify({"ok": db.borrar_habito(habito_id)})


# ---------------------------------------------------------------- Tareas

@app.get("/api/tareas")
def tareas():
    return jsonify(db.listar_tareas(incluir_hechas=True))


@app.post("/api/tareas")
def nueva_tarea():
    d = _json()
    if not (d.get("titulo") or "").strip():
        return _error("Falta el título")
    return jsonify(db.crear_tarea(d["titulo"].strip(), d.get("detalle") or "", d.get("area") or "personal",
                                  d.get("prioridad") or "media", d.get("fecha_limite") or None))


@app.post("/api/tareas/<int:tarea_id>/hecha")
def marcar_tarea(tarea_id):
    return jsonify(db.completar_tarea(tarea_id, bool(_json().get("hecha", True))))


@app.delete("/api/tareas/<int:tarea_id>")
def borrar_tarea(tarea_id):
    return jsonify({"ok": db.borrar_tarea(tarea_id)})


# ---------------------------------------------------------------- Memoria

@app.get("/api/memoria")
def memoria():
    return jsonify(db.listar_memoria())


@app.delete("/api/memoria/<int:mem_id>")
def borrar_memoria(mem_id):
    return jsonify({"ok": db.olvidar(mem_id)})


# ---------------------------------------------------------------- Arranque

def _abrir_ventana(url: str) -> None:
    """Abre la app en modo ventana con Chrome o Edge (son los que permiten el reconocimiento de voz)."""
    candidatos = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ] + [shutil.which(n) or "" for n in ("google-chrome", "chromium", "chromium-browser", "microsoft-edge")]
    for ruta in candidatos:
        if ruta and os.path.exists(ruta):
            try:
                subprocess.Popen([ruta, f"--app={url}", "--window-size=1280,860"])
                return
            except OSError:
                pass
    webbrowser.open(url)


def main() -> None:
    db.init()
    puerto = int(os.getenv("PUERTO", "5757"))
    url = f"http://127.0.0.1:{puerto}"
    if brain.usar_claude():
        print("Cerebro: Claude (clave encontrada en .env)")
    else:
        import cerebro_local
        e = cerebro_local.estado()
        print(f"Cerebro: IA local gratuita — {e['motivo']}")
    print(f"JARVIS en marcha en {url}  (cierra esta ventana para apagarlo)")
    if "--sin-ventana" not in sys.argv:
        threading.Timer(1.2, _abrir_ventana, args=(url,)).start()
    app.run(host="127.0.0.1", port=puerto, debug=False, threaded=True)


if __name__ == "__main__":
    main()
