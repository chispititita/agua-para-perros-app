"""
Arranca la app en una ventana de escritorio nativa (sin pestaña de
navegador ni ventana de consola), usando pywebview.

No lo abras directamente con doble clic: usa el acceso directo del
Escritorio que crea `instalar.bat` la primera vez.
"""
import threading
import time

import webview

from app_web import app

PUERTO = 5000


def arrancar_servidor():
    app.run(port=PUERTO, host="127.0.0.1", debug=False, use_reloader=False)


def main():
    hilo_servidor = threading.Thread(target=arrancar_servidor, daemon=True)
    hilo_servidor.start()
    time.sleep(1)  # da tiempo a que Flask levante antes de abrir la ventana

    webview.create_window(
        "Agua Para Perros — Dropshipping",
        f"http://127.0.0.1:{PUERTO}",
        width=1100,
        height=780,
        min_size=(700, 500),
    )
    webview.start()


if __name__ == "__main__":
    main()
