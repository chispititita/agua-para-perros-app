"""
Conectar una tienda de Shopify con un clic (OAuth Authorization Code Grant)
en vez de pedir al usuario que copie y pegue un token a mano.

Requiere SHOPIFY_CLIENT_ID y SHOPIFY_CLIENT_SECRET en el entorno (ver
.env.example) — se obtienen creando una app una sola vez en tu Shopify
Partners Dashboard. Ver README para los pasos exactos.
"""
import hashlib
import hmac
import os
import re
import secrets
import urllib.parse

import requests

SCOPES = "read_products,write_products,write_content,read_locations,write_inventory"
PATRON_DOMINIO = re.compile(r"^[a-z0-9][a-z0-9\-]*\.myshopify\.com$")


def dominio_valido(dominio: str) -> bool:
    return bool(PATRON_DOMINIO.match(dominio.strip().lower()))


def credenciales_configuradas() -> bool:
    return bool(os.environ.get("SHOPIFY_CLIENT_ID")) and bool(os.environ.get("SHOPIFY_CLIENT_SECRET"))


def generar_state() -> str:
    return secrets.token_urlsafe(24)


def url_autorizacion(dominio: str, redirect_uri: str, state: str) -> str:
    client_id = os.environ["SHOPIFY_CLIENT_ID"]
    params = {
        "client_id": client_id,
        "scope": SCOPES,
        "redirect_uri": redirect_uri,
        "state": state,
    }
    return f"https://{dominio}/admin/oauth/authorize?{urllib.parse.urlencode(params)}"


def hmac_valido(parametros: dict) -> bool:
    """Verifica la firma HMAC que Shopify añade a la redirección de vuelta,
    siguiendo el algoritmo documentado por Shopify para el flujo OAuth."""
    client_secret = os.environ.get("SHOPIFY_CLIENT_SECRET", "")
    hmac_recibido = parametros.get("hmac", "")
    if not hmac_recibido:
        return False

    resto = {k: v for k, v in parametros.items() if k not in ("hmac", "signature")}
    mensaje = "&".join(f"{k}={v}" for k, v in sorted(resto.items()))
    digest = hmac.new(client_secret.encode(), mensaje.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, hmac_recibido)


def intercambiar_codigo_por_token(dominio: str, code: str) -> str:
    client_id = os.environ["SHOPIFY_CLIENT_ID"]
    client_secret = os.environ["SHOPIFY_CLIENT_SECRET"]
    resp = requests.post(
        f"https://{dominio}/admin/oauth/access_token",
        json={"client_id": client_id, "client_secret": client_secret, "code": code},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]
