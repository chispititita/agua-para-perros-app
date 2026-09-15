"""Cliente mínimo para la Admin API REST de Shopify."""
import requests


def id_numerico(gid_o_id):
    """Convierte un GID de GraphQL (gid://shopify/Location/123) a su ID numérico."""
    if isinstance(gid_o_id, str) and gid_o_id.startswith("gid://"):
        return gid_o_id.rsplit("/", 1)[-1]
    return gid_o_id


class ShopifyClient:
    def __init__(self, tienda_dominio: str, admin_api_token: str, api_version: str = "2026-01"):
        self.tienda_dominio = tienda_dominio
        self.base_url = f"https://{tienda_dominio}/admin/api/{api_version}"
        self.session = requests.Session()
        self.session.headers.update({
            "X-Shopify-Access-Token": admin_api_token,
            "Content-Type": "application/json",
        })

    def _request(self, method: str, path: str, **kwargs) -> dict:
        resp = self.session.request(method, f"{self.base_url}{path}", timeout=30, **kwargs)
        resp.raise_for_status()
        return resp.json() if resp.content else {}

    def crear_producto(self, payload: dict) -> dict:
        return self._request("POST", "/products.json", json={"product": payload})

    def actualizar_costo_variante(self, inventory_item_id: int, costo: float) -> dict:
        return self._request(
            "PUT",
            f"/inventory_items/{inventory_item_id}.json",
            json={"inventory_item": {"cost": f"{costo:.2f}"}},
        )

    def establecer_inventario(self, inventory_item_id: int, location_id, cantidad: int) -> dict:
        return self._request(
            "POST",
            "/inventory_levels/set.json",
            json={
                "location_id": id_numerico(location_id),
                "inventory_item_id": inventory_item_id,
                "available": cantidad,
            },
        )

    def crear_pagina(self, titulo: str, cuerpo_html: str) -> dict:
        return self._request("POST", "/pages.json", json={"page": {"title": titulo, "body_html": cuerpo_html}})

    def listar_ubicaciones(self) -> dict:
        return self._request("GET", "/locations.json")
