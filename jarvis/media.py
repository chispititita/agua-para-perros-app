"""Generación de imágenes y vídeos para la tienda.

Sin claves (gratis):
  - Imágenes: servicio gratuito Pollinations (https://pollinations.ai), sin registro.
  - Vídeos: montaje en tu propio ordenador (zoom cinematográfico sobre una imagen + texto), con ffmpeg.
Con REPLICATE_API_TOKEN en .env (de pago, opcional):
  - Imágenes y vídeos generados por modelos de IA de Replicate (https://replicate.com).
"""
import base64
import io
import mimetypes
import os
import subprocess
import tempfile
import threading
import time
import urllib.parse

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
    """Siempre hay alguna forma de generar: Replicate si hay token, si no la vía gratuita."""
    return True


def usar_replicate() -> bool:
    return bool(os.getenv("REPLICATE_API_TOKEN", "").strip())


def modo() -> str:
    return "Replicate (IA de pago)" if usar_replicate() else "Gratis (Pollinations + montaje local)"


TAMANOS = {"1:1": (1024, 1024), "4:5": (896, 1120), "9:16": (768, 1344), "16:9": (1344, 768)}


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


def _imagen_gratis(prompt: str, formato: str) -> bytes:
    ancho, alto = TAMANOS.get(formato, TAMANOS["1:1"])
    base = os.getenv("POLLINATIONS_URL", "https://image.pollinations.ai/prompt/")
    url = (f"{base}{urllib.parse.quote(prompt[:1500])}?width={ancho}&height={alto}"
           f"&nologo=true&seed={int(time.time()) % 100000}&model={os.getenv('MODELO_IMAGEN_GRATIS', 'flux')}")
    r = requests.get(url, timeout=240)
    if r.status_code >= 400 or not r.headers.get("content-type", "").startswith("image/"):
        raise RuntimeError(f"El servicio gratuito de imágenes no respondió bien ({r.status_code}). "
                           "Prueba de nuevo en un minuto.")
    return r.content


def generar_imagen(prompt: str, formato: str = "1:1") -> dict:
    """Genera una imagen y espera a tenerla (suele tardar entre 3 y 60 segundos)."""
    if formato not in FORMATOS:
        formato = "1:1"
    media_id = db.crear_media("imagen", prompt)
    db.actualizar_media(media_id, "generando")
    try:
        if usar_replicate():
            url = _ejecutar(os.getenv("MODELO_IMAGEN", "black-forest-labs/flux-schnell"),
                            {"prompt": prompt, "aspect_ratio": formato, "output_format": "png"},
                            limite_segundos=180)
            archivo = _descargar(url, media_id, ".png")
        else:
            archivo = f"{media_id:05d}.jpg"
            (db.MEDIA_DIR / archivo).write_bytes(_a_jpg(_imagen_gratis(prompt, formato)))
        db.actualizar_media(media_id, "lista", archivo=archivo)
    except Exception as e:  # se guarda el error para mostrarlo en el Estudio
        db.actualizar_media(media_id, "error", error=str(e))
    return db.obtener_media(media_id)


def _a_jpg(datos: bytes) -> bytes:
    from PIL import Image
    img = Image.open(io.BytesIO(datos)).convert("RGB")
    salida = io.BytesIO()
    img.save(salida, "JPEG", quality=92)
    return salida.getvalue()


# ---------------------------------------------------------------- Montaje de vídeo local (gratis)

def _fuente(tamano: int):
    from PIL import ImageFont
    for nombre in ("arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "Helvetica.ttc", "arial.ttf"):
        try:
            return ImageFont.truetype(nombre, tamano)
        except OSError:
            continue
    return ImageFont.load_default(size=tamano)


def _capa_texto(texto: str, ancho: int, alto: int, ruta: str) -> None:
    """PNG transparente con el texto grande en la parte baja, estilo reel."""
    from PIL import Image, ImageDraw
    capa = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    fuente = _fuente(int(ancho * 0.075))
    palabras, lineas, actual = texto.upper().split(), [], ""
    for p in palabras:
        prueba = f"{actual} {p}".strip()
        if d.textlength(prueba, font=fuente) > ancho * 0.86 and actual:
            lineas.append(actual)
            actual = p
        else:
            actual = prueba
    lineas.append(actual)
    alto_linea = int(ancho * 0.095)
    y = int(alto * 0.78) - alto_linea * len(lineas) // 2
    for linea in lineas:
        w = d.textlength(linea, font=fuente)
        d.text(((ancho - w) / 2, y), linea, font=fuente, fill="white",
               stroke_width=max(3, ancho // 160), stroke_fill="black")
        y += alto_linea
    capa.save(ruta)


def _montar_video(imagen: bytes, formato: str, texto: str, destino) -> None:
    import imageio_ffmpeg
    from PIL import Image, ImageOps
    ancho, alto = {"9:16": (1080, 1920), "1:1": (1080, 1080), "4:5": (1080, 1350), "16:9": (1920, 1080)}.get(
        formato, (1080, 1920))
    segundos = float(os.getenv("DURACION_VIDEO", "6"))
    fps = 30
    with tempfile.TemporaryDirectory() as tmp:
        base = os.path.join(tmp, "base.png")
        # Se amplía al doble para que el zoom sea suave.
        ImageOps.fit(Image.open(io.BytesIO(imagen)).convert("RGB"), (ancho * 2, alto * 2),
                     Image.LANCZOS).save(base)
        frames = int(segundos * fps)
        zoom = (f"zoompan=z='1+0.18*on/{frames}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                f":s={ancho}x{alto}:fps={fps}")
        cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loop", "1", "-i", base]
        if texto:
            capa = os.path.join(tmp, "texto.png")
            _capa_texto(texto, ancho, alto, capa)
            cmd += ["-loop", "1", "-i", capa, "-filter_complex",
                    f"[0:v]{zoom}[v];[1:v]format=rgba,fade=in:st=0.4:d=0.6:alpha=1[t];[v][t]overlay=0:0,format=yuv420p"]
        else:
            cmd += ["-vf", f"{zoom},format=yuv420p"]
        cmd += ["-t", str(segundos), "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-movflags", "+faststart", str(destino)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f"No se pudo montar el vídeo: {r.stderr[-300:]}")


def generar_video(prompt: str, imagen_base_id: int | None = None, imagen_url: str | None = None,
                  texto: str = "", formato: str = "9:16") -> dict:
    """Lanza la generación de un vídeo en segundo plano y devuelve su id.

    Con Replicate lo crea un modelo de IA de vídeo. Sin claves, se monta gratis en tu ordenador:
    zoom cinematográfico sobre la imagen de partida (o una imagen nueva creada a partir del prompt) + texto.
    """
    if formato not in FORMATOS:
        formato = "9:16"
    if usar_replicate():
        entrada = {"prompt": prompt}
        clave_imagen = os.getenv("MODELO_VIDEO_CLAVE_IMAGEN", "first_frame_image")
        if imagen_base_id:
            entrada[clave_imagen] = _imagen_local_como_data_uri(int(imagen_base_id))
        elif imagen_url:
            entrada[clave_imagen] = imagen_url
    elif imagen_base_id:
        _imagen_local_como_data_uri(int(imagen_base_id))  # valida que exista antes de empezar
    media_id = db.crear_media("video", prompt)

    def trabajo():
        db.actualizar_media(media_id, "generando")
        try:
            if usar_replicate():
                url = _ejecutar(os.getenv("MODELO_VIDEO", "minimax/video-01"), entrada, limite_segundos=1200)
                archivo = _descargar(url, media_id, ".mp4")
            else:
                if imagen_base_id:
                    imagen = (db.MEDIA_DIR / db.obtener_media(int(imagen_base_id))["archivo"]).read_bytes()
                elif imagen_url:
                    r = requests.get(imagen_url, timeout=60)
                    r.raise_for_status()
                    imagen = r.content
                else:
                    imagen = _imagen_gratis(prompt, formato)
                archivo = f"{media_id:05d}.mp4"
                _montar_video(imagen, formato, texto.strip(), db.MEDIA_DIR / archivo)
            db.actualizar_media(media_id, "lista", archivo=archivo)
        except Exception as e:
            db.actualizar_media(media_id, "error", error=str(e))

    threading.Thread(target=trabajo, daemon=True).start()
    return db.obtener_media(media_id)
