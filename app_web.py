"""
Interfaz web local de aplicacion-dropshipping. En vez de comandos de
terminal, abres esto en el navegador y usas formularios y botones.

Instalación (una sola vez):
    pip install -r requirements.txt

Uso:
    python app_web.py
    Luego abre http://localhost:5000 en tu navegador.
"""
import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, render_template_string, request, redirect, url_for, flash, session

from lib.shopify_client import ShopifyClient
from lib import shopify_oauth
from creacion_tienda.subir_producto import subir_producto
from creacion_tienda.paginas_legales import crear_paginas_legales
from testeo.economia import calcular_umbrales, evaluar_test
from testeo.velocidad_pagina import revisar_velocidad
from investigacion.investigador_ia import generar_candidatos

load_dotenv()

app = Flask(__name__)
app.secret_key = "solo-uso-local-no-hace-falta-mas-seguridad"

CONFIG_PATH = "config/config.json"
LOG_PRODUCTOS = "logs/historial_productos.json"
LOG_TESTS = "logs/tests_anuncios.json"
CANDIDATO_PATH = "investigacion/mi_candidato.json"


# ---------- utilidades de datos ----------

def config_existe() -> bool:
    return os.path.exists(CONFIG_PATH)


def cargar_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def guardar_config(config: dict) -> None:
    os.makedirs("config", exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def cargar_lista(ruta: str) -> list:
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def guardar_lista(ruta: str, datos: list) -> None:
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)


# ---------- plantilla base (todo en un archivo para simplicidad) ----------

BASE = """
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Aplicación Dropshipping</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; background: #fafafa; }
  h1 { font-size: 1.4rem; }
  nav { margin-bottom: 24px; }
  nav a { margin-right: 16px; text-decoration: none; color: #2563eb; font-weight: 600; }
  .card { background: white; border: 1px solid #e5e5e5; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
  label { display: block; margin-top: 12px; font-weight: 600; font-size: 0.9rem; }
  input, textarea, select { width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.95rem; box-sizing: border-box; }
  button { margin-top: 16px; background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-size: 0.95rem; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  .flash { padding: 12px; border-radius: 6px; margin-bottom: 16px; }
  .flash.ok { background: #dcfce7; color: #166534; }
  .flash.error { background: #fee2e2; color: #991b1b; }
  .veredicto { font-weight: 700; padding: 4px 10px; border-radius: 6px; display: inline-block; }
  .v-matar { background: #fee2e2; color: #991b1b; }
  .v-escalar { background: #dcfce7; color: #166534; }
  .v-seguir, .v-esperar { background: #fef9c3; color: #854d0e; }
  .v-cambiar_angulo { background: #dbeafe; color: #1e3a8a; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  td, th { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: left; }
</style>
</head>
<body>
<h1>🐕 Aplicación Dropshipping</h1>
<nav>
  <a href="{{ url_for('inicio') }}">Inicio</a>
  <a href="{{ url_for('configuracion') }}">Configuración</a>
  <a href="{{ url_for('nuevo_producto') }}">Nuevo producto</a>
  <a href="{{ url_for('investigar_productos') }}">Investigar productos (IA)</a>
  <a href="{{ url_for('registrar_test') }}">Registrar test de anuncio</a>
  <a href="{{ url_for('velocidad') }}">Revisar velocidad</a>
</nav>
{% for categoria, mensaje in get_flashed_messages(with_categories=true) %}
  <div class="flash {{ categoria }}">{{ mensaje }}</div>
{% endfor %}
{{ contenido | safe }}
</body>
</html>
"""


def render(contenido: str) -> str:
    return render_template_string(BASE, contenido=contenido)


# ---------- páginas ----------

@app.route("/")
def inicio():
    tests = cargar_lista(LOG_TESTS)[-10:][::-1]
    productos = cargar_lista(LOG_PRODUCTOS)[-10:][::-1]

    aviso_config = "" if tienda_conectada() else (
        '<div class="card"><b>Todavía no conectaste tu tienda de Shopify.</b> '
        f'Ve a <a href="{url_for("configuracion")}">Configuración</a> para conectarla con un clic.</div>'
    )

    filas_tests = "".join(
        f"<tr><td>{t['fecha'][:10]}</td><td>{t['producto']}</td><td>{t['canal']}</td>"
        f"<td>{t['gasto_acumulado']}€</td><td><span class='veredicto v-{t['veredicto']}'>{t['veredicto']}</span></td></tr>"
        for t in tests
    ) or "<tr><td colspan='5'>Sin tests registrados todavía.</td></tr>"

    filas_productos = "".join(
        f"<tr><td>{p['fecha'][:10]}</td><td>{p['producto']}</td><td>{p.get('estado', '')}</td></tr>"
        for p in productos
    ) or "<tr><td colspan='3'>Sin productos subidos todavía.</td></tr>"

    contenido = f"""
    {aviso_config}
    <div class="card">
      <h3>Últimos tests de anuncios</h3>
      <table><tr><th>Fecha</th><th>Producto</th><th>Canal</th><th>Gasto</th><th>Veredicto</th></tr>{filas_tests}</table>
    </div>
    <div class="card">
      <h3>Últimos productos subidos</h3>
      <table><tr><th>Fecha</th><th>Producto</th><th>Estado</th></tr>{filas_productos}</table>
    </div>
    """
    return render(contenido)


def tienda_conectada() -> bool:
    if not config_existe():
        return False
    config = cargar_config()
    return bool(config.get("tienda_dominio")) and bool(config.get("admin_api_token"))


def redirect_uri_oauth() -> str:
    # request.url_root ya incluye el host:puerto con el que se abrió la
    # app (localhost o 127.0.0.1), tanto en modo navegador como en la
    # ventana de escritorio.
    return f"{request.url_root.rstrip('/')}/oauth/callback"


@app.route("/configuracion", methods=["GET", "POST"])
def configuracion():
    config = cargar_config() if config_existe() else {}

    if request.method == "POST":
        # Solo se editan aquí preferencias de negocio; la conexión con
        # Shopify se hace aparte, con el botón "Conectar con Shopify".
        config["margen_objetivo"] = {"multiplicador": float(request.form.get("multiplicador", 4.0))}
        config["datos_negocio"] = {
            **config.get("datos_negocio", {}),
            "nombre_tienda": request.form.get("nombre_tienda", ""),
            "email_contacto": request.form.get("email_contacto", ""),
            "direccion_legal": request.form.get("direccion_legal", ""),
            "politica_devoluciones_dias": int(request.form.get("politica_devoluciones_dias", 14)),
            "tiempo_envio_estimado": request.form.get("tiempo_envio_estimado", "5-10 días laborables"),
        }
        guardar_config(config)
        flash("Preferencias guardadas.", "ok")
        return redirect(url_for("configuracion"))

    dn = config.get("datos_negocio", {})

    if tienda_conectada():
        bloque_conexion = f"""
        <div class="card">
          <h3>Tienda conectada ✅</h3>
          <p><b>{config['tienda_dominio']}</b></p>
          <form method="post" action="{url_for('desconectar_shopify')}" onsubmit="return confirm('¿Desconectar esta tienda?');">
            <button type="submit" style="background:#991b1b">Desconectar</button>
          </form>
        </div>
        """
    elif not shopify_oauth.credenciales_configuradas():
        bloque_conexion = f"""
        <div class="card">
          <h3>Conectar con Shopify</h3>
          <p>Todavía falta configurar <code>SHOPIFY_CLIENT_ID</code> y
          <code>SHOPIFY_CLIENT_SECRET</code> en tu archivo <code>.env</code>
          (es un paso único — ver el README, sección "Conectar con Shopify").</p>
        </div>
        """
    else:
        bloque_conexion = f"""
        <div class="card">
          <h3>Conectar con Shopify</h3>
          <p>Se abrirá tu navegador normal (Chrome/Edge), no esta ventana
          — así Shopify te deja completar el inicio de sesión y la
          verificación en dos pasos sin bloquearlo. Inicia sesión, acepta
          los permisos, y cuando veas el aviso de "conectado", vuelve
          aquí y actualiza esta página (F5).</p>
          <form method="get" action="{url_for('conectar_shopify')}" target="_blank">
            <label>Dominio de la tienda (.myshopify.com)</label>
            <input name="tienda_dominio" placeholder="mi-tienda.myshopify.com" required>
            <button type="submit">Conectar con Shopify</button>
          </form>
        </div>
        """

    contenido = f"""
    {bloque_conexion}
    <div class="card">
      <h3>Preferencias</h3>
      <form method="post">
        <label>Multiplicador de margen (precio = costo × esto, si no defines precio manual)</label>
        <input name="multiplicador" type="number" step="0.1" value="{config.get('margen_objetivo', {}).get('multiplicador', 4.0)}">

        <label>Nombre de la tienda (para páginas legales — se autocompleta al conectar)</label>
        <input name="nombre_tienda" value="{dn.get('nombre_tienda', '')}">

        <label>Email de contacto (se autocompleta al conectar)</label>
        <input name="email_contacto" value="{dn.get('email_contacto', '')}">

        <label>Dirección legal (se autocompleta al conectar)</label>
        <input name="direccion_legal" value="{dn.get('direccion_legal', '')}">

        <label>Días de política de devoluciones</label>
        <input name="politica_devoluciones_dias" type="number" value="{dn.get('politica_devoluciones_dias', 14)}">

        <label>Tiempo de envío estimado</label>
        <input name="tiempo_envio_estimado" value="{dn.get('tiempo_envio_estimado', '5-10 días laborables')}">

        <button type="submit">Guardar preferencias</button>
      </form>
    </div>
    """
    return render(contenido)


@app.route("/conectar-shopify")
def conectar_shopify():
    if not shopify_oauth.credenciales_configuradas():
        flash("Falta configurar SHOPIFY_CLIENT_ID y SHOPIFY_CLIENT_SECRET en .env (ver README).", "error")
        return redirect(url_for("configuracion"))

    dominio = request.args.get("tienda_dominio", "").strip().lower()
    if not shopify_oauth.dominio_valido(dominio):
        flash("Dominio inválido. Debe terminar en .myshopify.com", "error")
        return redirect(url_for("configuracion"))

    state = shopify_oauth.generar_state()
    session["oauth_state"] = state
    session["oauth_dominio"] = dominio

    url = shopify_oauth.url_autorizacion(dominio, redirect_uri_oauth(), state)
    return redirect(url)


@app.route("/oauth/callback")
def oauth_callback():
    parametros = shopify_oauth.parametros_callback(request.query_string)
    dominio = parametros.get("shop", "")
    code = parametros.get("code")

    if not shopify_oauth.dominio_valido(dominio):
        flash("Respuesta de Shopify con un dominio inválido.", "error")
        return redirect(url_for("configuracion"))

    if parametros.get("state") != session.get("oauth_state") or dominio != session.get("oauth_dominio"):
        flash("La conexión no se pudo verificar (state inválido). Inténtalo de nuevo.", "error")
        return redirect(url_for("configuracion"))

    if not shopify_oauth.hmac_valido(parametros):
        flash("La respuesta de Shopify no pasó la verificación de seguridad (HMAC).", "error")
        return redirect(url_for("configuracion"))

    try:
        access_token = shopify_oauth.intercambiar_codigo_por_token(dominio, code)

        api_version = "2026-01"
        client = ShopifyClient(dominio, access_token, api_version)
        tienda = client.obtener_tienda().get("shop", {})
        ubicaciones = client.listar_ubicaciones().get("locations", [])
        location_id = ubicaciones[0]["id"] if ubicaciones else None

        direccion = ", ".join(filter(None, [
            tienda.get("address1"), tienda.get("city"), tienda.get("province"), tienda.get("country_name"),
        ]))

        config = cargar_config() if config_existe() else {}
        config.update({
            "tienda_dominio": dominio,
            "admin_api_token": access_token,
            "api_version": api_version,
            "location_id": location_id,
            "idioma": "es",
            "moneda": tienda.get("currency", "EUR"),
            "pais_envio": tienda.get("country_code", "ES"),
            "margen_objetivo": config.get("margen_objetivo", {"multiplicador": 4.0}),
            "datos_negocio": {
                "nombre_tienda": tienda.get("name", dominio),
                "email_contacto": tienda.get("email", ""),
                "direccion_legal": direccion,
                "politica_devoluciones_dias": config.get("datos_negocio", {}).get("politica_devoluciones_dias", 14),
                "tiempo_envio_estimado": config.get("datos_negocio", {}).get("tiempo_envio_estimado", "5-10 días laborables"),
            },
        })
        guardar_config(config)
        flash(f"¡Tienda '{tienda.get('name', dominio)}' conectada con éxito!", "ok")
    except Exception as e:
        flash(f"No se pudo completar la conexión con Shopify: {e}", "error")
    finally:
        session.pop("oauth_state", None)
        session.pop("oauth_dominio", None)

    return redirect(url_for("configuracion"))


@app.route("/desconectar-shopify", methods=["POST"])
def desconectar_shopify():
    if config_existe():
        os.remove(CONFIG_PATH)
    flash("Tienda desconectada.", "ok")
    return redirect(url_for("configuracion"))


@app.route("/nuevo-producto", methods=["GET", "POST"])
def nuevo_producto():
    if not tienda_conectada():
        flash("Conecta tu tienda de Shopify primero.", "error")
        return redirect(url_for("configuracion"))

    if request.method == "POST":
        try:
            config = cargar_config()
            variantes = []
            for opcion, costo in zip(request.form.getlist("variante_opcion"), request.form.getlist("variante_costo")):
                if opcion.strip():
                    variantes.append({"opcion": opcion.strip(), "costo": float(costo), "stock": 20})

            producto = {
                "titulo": request.form["titulo"],
                "descripcion_html": f"<p>{request.form['descripcion']}</p>",
                "imagenes": [u.strip() for u in request.form.get("imagenes", "").split(",") if u.strip()],
                "variantes": variantes or [{"opcion": "Default", "costo": float(request.form["costo_default"]), "stock": 20}],
            }

            client = ShopifyClient(config["tienda_dominio"], config["admin_api_token"], config.get("api_version", "2026-01"))
            resultado = subir_producto(client, config, producto)
            crear_paginas_legales(client, config)

            log = cargar_lista(LOG_PRODUCTOS)
            log.append({
                "fecha": datetime.now(timezone.utc).isoformat(),
                "tienda": config["tienda_dominio"],
                "producto": producto["titulo"],
                "product_id": resultado["product_id"],
                "estado": "creado_draft",
            })
            guardar_lista(LOG_PRODUCTOS, log)

            flash(f"Producto '{producto['titulo']}' creado como DRAFT: {resultado['handle']}", "ok")
            return redirect(url_for("inicio"))
        except Exception as e:
            flash(f"Error al crear el producto: {e}", "error")

    candidato_html = ""
    if os.path.exists(CANDIDATO_PATH):
        with open(CANDIDATO_PATH, "r", encoding="utf-8") as f:
            candidato = json.load(f)
        candidato_html = f"""
        <div class="card">
          <b>Último candidato guardado desde "Investigar productos":</b> {candidato.get('nombre_producto', '')}
          — costo estimado {candidato.get('costo_estimado', '')}€, precio sugerido {candidato.get('precio_sugerido', '')}€.
          <br>Puedes rellenar el formulario de abajo con esos datos, o convertirlo directamente por terminal con
          <code>python investigacion/convertir_a_producto.py --candidato investigacion/mi_candidato.json --salida config/producto_a_testear.json</code>.
        </div>
        """

    contenido = f"""
    {candidato_html}
    <div class="card">
      <h3>Nuevo producto</h3>
      <form method="post">
        <label>Título</label>
        <input name="titulo" required>

        <label>Descripción</label>
        <textarea name="descripcion" rows="3"></textarea>

        <label>Imágenes (URLs separadas por coma)</label>
        <input name="imagenes" placeholder="https://.../foto1.jpg, https://.../foto2.jpg">

        <label>Costo por defecto (si no defines variantes abajo)</label>
        <input name="costo_default" type="number" step="0.01" value="6.0">

        <label>Variante 1 — nombre</label>
        <input name="variante_opcion">
        <label>Variante 1 — costo</label>
        <input name="variante_costo" type="number" step="0.01">

        <label>Variante 2 — nombre</label>
        <input name="variante_opcion">
        <label>Variante 2 — costo</label>
        <input name="variante_costo" type="number" step="0.01">

        <button type="submit">Crear producto (queda como DRAFT)</button>
      </form>
    </div>
    """
    return render(contenido)


@app.route("/investigar-productos", methods=["GET", "POST"])
def investigar_productos():
    resultado_html = ""
    if request.method == "POST":
        if request.form.get("accion") == "guardar":
            try:
                candidatos = json.loads(request.form["candidatos_json"])
                indice = int(request.form["indice"])
                os.makedirs("investigacion", exist_ok=True)
                with open(CANDIDATO_PATH, "w", encoding="utf-8") as f:
                    json.dump(candidatos[indice], f, ensure_ascii=False, indent=2)
                flash(f"Candidato '{candidatos[indice]['nombre_producto']}' guardado en {CANDIDATO_PATH}.", "ok")
                return redirect(url_for("nuevo_producto"))
            except Exception as e:
                flash(f"No se pudo guardar el candidato: {e}", "error")
        else:
            try:
                nicho = request.form["nicho"].strip()
                cantidad = int(request.form.get("cantidad", 8))
                candidatos = generar_candidatos(nicho, cantidad)
                candidatos_json = json.dumps(candidatos, ensure_ascii=False)

                tarjetas = ""
                for i, c in enumerate(candidatos):
                    tarjetas += f"""
                    <div class="card">
                      <h3>{c.get('nombre_producto', '')}</h3>
                      <p><b>Ángulo:</b> {c.get('angulo_marketing', '')}</p>
                      <p><b>Costo estimado:</b> {c.get('costo_estimado', '')}€ &nbsp; <b>Precio sugerido:</b> {c.get('precio_sugerido', '')}€</p>
                      <p><b>Público objetivo:</b> {c.get('publico_objetivo', '')}</p>
                      <p><b>Saturación:</b> {c.get('nivel_saturacion', '')}</p>
                      <p><b>Por qué está en tendencia:</b> {c.get('razon_tendencia', '')}</p>
                      <form method="post">
                        <input type="hidden" name="accion" value="guardar">
                        <input type="hidden" name="indice" value="{i}">
                        <input type="hidden" name="candidatos_json" value='{candidatos_json.replace("'", "&#39;")}'>
                        <button type="submit">Guardar como candidato a testear</button>
                      </form>
                    </div>
                    """
                resultado_html = tarjetas or "<div class='card'>La IA no devolvió candidatos.</div>"
            except Exception as e:
                flash(f"Error al investigar productos: {e}", "error")

    contenido = f"""
    <div class="card">
      <h3>Investigar productos con IA</h3>
      <p>Genera candidatos de producto con señales de tendencia, margen y saturación usando la API de Anthropic.
      Requiere la variable de entorno <code>ANTHROPIC_API_KEY</code> configurada antes de arrancar la app.</p>
      <form method="post">
        <label>Nicho o categoría</label>
        <input name="nicho" placeholder="accesorios para perros, gadgets de cocina..." required>
        <label>Cantidad de candidatos</label>
        <input name="cantidad" type="number" value="8" min="1" max="15">
        <button type="submit">Generar candidatos</button>
      </form>
    </div>
    {resultado_html}
    """
    return render(contenido)


@app.route("/registrar-test", methods=["GET", "POST"])
def registrar_test():
    resultado_html = ""
    if request.method == "POST":
        try:
            costo = float(request.form["costo"])
            precio = float(request.form["precio"])
            gasto = float(request.form["gasto"])
            atc = int(request.form.get("atc", 0))
            ventas = int(request.form.get("ventas", 0))
            angulos = int(request.form.get("angulos", 1))
            ctr = request.form.get("ctr")
            ctr = float(ctr) if ctr else None

            umbrales = calcular_umbrales(costo, precio)
            veredicto = evaluar_test(umbrales, gasto, atc, ventas, angulos)

            log = cargar_lista(LOG_TESTS)
            log.append({
                "fecha": datetime.now(timezone.utc).isoformat(),
                "producto": request.form["producto"],
                "canal": request.form["canal"],
                "gasto_acumulado": gasto,
                "ctr_pct": ctr,
                "atc_acumulado": atc,
                "ventas_acumuladas": ventas,
                "angulos_probados": angulos,
                "cpa_objetivo": umbrales.cpa_objetivo,
                "veredicto": veredicto["veredicto"],
                "razon": veredicto["razon"],
            })
            guardar_lista(LOG_TESTS, log)

            resultado_html = f"""
            <div class="card">
              <h3>Veredicto: <span class="veredicto v-{veredicto['veredicto']}">{veredicto['veredicto'].upper()}</span></h3>
              <p>{veredicto['razon']}</p>
              <p>CPA objetivo: {umbrales.cpa_objetivo:.2f}€ | Margen bruto: {umbrales.gross_margin:.2f}€ | ROAS de equilibrio: {umbrales.breakeven_roas}x</p>
            </div>
            """
        except Exception as e:
            flash(f"Error: {e}", "error")

    contenido = f"""
    <div class="card">
      <h3>Registrar lectura de un test de anuncio</h3>
      <form method="post">
        <label>Producto</label>
        <input name="producto" required>

        <label>Costo por unidad (€)</label>
        <input name="costo" type="number" step="0.01" required>

        <label>Precio de venta (€)</label>
        <input name="precio" type="number" step="0.01" required>

        <label>Canal</label>
        <select name="canal">
          <option value="tiktok">TikTok</option>
          <option value="meta">Meta (Facebook/Instagram)</option>
          <option value="google">Google</option>
        </select>

        <label>Gasto acumulado (€)</label>
        <input name="gasto" type="number" step="0.01" required>

        <label>CTR del enlace (%, opcional)</label>
        <input name="ctr" type="number" step="0.01">

        <label>Añadir al carrito (ATC) acumulados</label>
        <input name="atc" type="number" value="0">

        <label>Ventas acumuladas</label>
        <input name="ventas" type="number" value="0">

        <label>Ángulos de anuncio distintos probados</label>
        <input name="angulos" type="number" value="1">

        <button type="submit">Evaluar y registrar</button>
      </form>
    </div>
    {resultado_html}
    """
    return render(contenido)


@app.route("/velocidad", methods=["GET", "POST"])
def velocidad():
    resultado_html = ""
    if request.method == "POST":
        try:
            r = revisar_velocidad(request.form["url"], request.form.get("estrategia", "mobile"))
            alertas = "".join(f"<li>{a}</li>" for a in r["alertas"]) or "<li>Sin alertas — dentro de los umbrales recomendados.</li>"
            resultado_html = f"""
            <div class="card">
              <h3>Puntuación Lighthouse: {r['lighthouse_performance_score']}/100</h3>
              <ul>{alertas}</ul>
            </div>
            """
        except Exception as e:
            flash(f"No se pudo consultar PageSpeed Insights: {e}", "error")

    contenido = f"""
    <div class="card">
      <h3>Revisar velocidad de una página (antes de gastar en ads)</h3>
      <form method="post">
        <label>URL de la ficha del producto</label>
        <input name="url" placeholder="https://tu-tienda.myshopify.com/products/tu-producto" required>
        <label>Estrategia</label>
        <select name="estrategia">
          <option value="mobile">Móvil</option>
          <option value="desktop">Escritorio</option>
        </select>
        <button type="submit">Revisar</button>
      </form>
    </div>
    {resultado_html}
    """
    return render(contenido)


if __name__ == "__main__":
    import threading
    import webbrowser

    port = int(os.environ.get("PORT", 5000))

    def abrir_navegador():
        try:
            webbrowser.open(f"http://localhost:{port}")
        except Exception:
            pass

    threading.Timer(1.0, abrir_navegador).start()
    # use_reloader=False evita que Flask arranque un segundo proceso (el
    # reloader de depuración), que abriría el navegador dos veces.
    app.run(debug=True, port=port, host="0.0.0.0", use_reloader=False)
