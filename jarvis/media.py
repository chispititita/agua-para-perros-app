"""Generación de imágenes y vídeos con IA a través de Replicate (https://replicate.com).

Los modelos se configuran en el archivo .env, así que puedes cambiar a otro modelo
(Kling, Veo, Flux Pro...) sin tocar código.
"""
import base64
import mimetypes
import os
import threading
import time

import requests

import db

API = "https://api.replicate.com/v1"
FORMATOS = ("1:1", "4:5", "9:16", "16:9")


def _token() -> str:
    token = os.getenv("REPLICATE_API_TOKEN", "").strip()
    if not token:
        raise RuntimeError("Falta REPLICATE_API_TOKEN en el archivo .env (consíguelo en replicate.com/account/api-tokens)")
    return token


def disponible() -> bool:
    return bool(os.getenv("REPLICATE_API_TOKEN", "").strip())


def _cabeceras(esperar: int | None = None) -> dict:
    h = {"Authorization": f"Bearer {_token()}", "Content-Type": "application/json"}
    if esperar:
        h["Prefer"] = f"wait={esperar}"
    return h


def _ejecutar(modelo: str, entrada: dict, limite_segundos: int) -> str:
    """Lanza una predicción en Replicate, espera a que termine y devuelve la URL del resultado."""
    r = requests.post(f"{API}/models/{modelo}/predictions", json={"input": entrada},
                      headers=_cabeceras(esperar=60), timeout=90)
    if r.status_code >= 400:
        raise RuntimeError(f"Replicate respondió {r.status_code}: {r.text[:300]}")
    pred = r.json()
    inicio = time.time()
    while pred.get("status") not in ("succeeded", "failed", "canceled"):
        if time.time() - inicio > limite_segundos:
            raise RuntimeError("La generación tardó demasiado y se canceló")
        time.sleep(4)
        pred = requests.get(pred["urls"]["get"], headers=_cabeceras(), timeout=30).json()
    if pred["status"] != "succeeded":
        raise RuntimeError(f"La generación falló: {pred.get('error') or pred['status']}")
    salida = pred.get("output")
    if isinstance(salida, list):
        salida = salida[0] if salida else None
    if isinstance(salida, dict):
        salida = salida.get("url") or next(iter(salida.values()), None)
    if not isinstance(salida, str):
        raise RuntimeError(f"Respuesta inesperada del modelo: {pred.get('output')!r:.200}")
    return salida


def _descargar(url: str, media_id: int, extension_defecto: str) -> str:
    r = requests.get(url, timeout=300)
    r.raise_for_status()
    ext = os.path.splitext(url.split("?")[0])[1] or extension_defecto
    nombre = f"{media_id:05d}{ext}"
    (db.MEDIA_DIR / nombre).write_bytes(r.content)
    return nombre


def _imagen_local_como_data_uri(media_id: int) -> str:
    m = db.obtener_media(media_id)
    if not m or m["tipo"] != "imagen" or not m["archivo"]:
        raise ValueError(f"No existe una imagen generada con id {media_id}")
    ruta = db.MEDIA_DIR / m["archivo"]
    tipo = mimetypes.guess_type(ruta.name)[0] or "image/png"
    return f"data:{tipo};base64,{base64.b64encode(ruta.read_bytes()).decode()}"


def generar_imagen(prompt: str, formato: str = "1:1") -> dict:
    """Genera una imagen y espera a tenerla (suele tardar entre 3 y 30 segundos)."""
    _token()
    if formato not in FORMATOS:
        formato = "1:1"
    media_id = db.crear_media("imagen", prompt)
    db.actualizar_media(media_id, "generando")
    try:
        url = _ejecutar(os.getenv("MODELO_IMAGEN", "black-forest-labs/flux-schnell"),
                        {"prompt": prompt, "aspect_ratio": formato, "output_format": "png"},
                        limite_segundos=180)
        archivo = _descargar(url, media_id, ".png")
        db.actualizar_media(media_id, "lista", archivo=archivo)
    except Exception as e:  # se guarda el error para mostrarlo en el Estudio
        db.actualizar_media(media_id, "error", error=str(e))
    return db.obtener_media(media_id)


def generar_video(prompt: str, imagen_base_id: int | None = None, imagen_url: str | None = None) -> dict:
    """Lanza la generación de un vídeo en segundo plano (tarda varios minutos) y devuelve su id."""
    _token()
    entrada = {"prompt": prompt}
    clave_imagen = os.getenv("MODELO_VIDEO_CLAVE_IMAGEN", "first_frame_image")
    if imagen_base_id:
        entrada[clave_imagen] = _imagen_local_como_data_uri(int(imagen_base_id))
    elif imagen_url:
        entrada[clave_imagen] = imagen_url
    media_id = db.crear_media("video", prompt)

    def trabajo():
        db.actualizar_media(media_id, "generando")
        try:
            url = _ejecutar(os.getenv("MODELO_VIDEO", "minimax/video-01"), entrada, limite_segundos=1200)
            db.actualizar_media(media_id, "lista", archivo=_descargar(url, media_id, ".mp4"))
        except Exception as e:
            db.actualizar_media(media_id, "error", error=str(e))

    threading.Thread(target=trabajo, daemon=True).start()
    return db.obtener_media(media_id)
