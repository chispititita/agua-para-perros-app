"""Genera y publica las 4 páginas legales básicas de una tienda."""
from lib.shopify_client import ShopifyClient


def crear_paginas_legales(client: ShopifyClient, config: dict) -> list:
    dn = config.get("datos_negocio", {})
    nombre = dn.get("nombre_tienda") or config.get("tienda_dominio", "la tienda")
    email = dn.get("email_contacto", "")
    direccion = dn.get("direccion_legal", "")
    dias_devolucion = dn.get("politica_devoluciones_dias", 14)
    tiempo_envio = dn.get("tiempo_envio_estimado", "5-10 días laborables")

    paginas = [
        {
            "title": "Aviso Legal",
            "body_html": f"""
            <p>Esta tienda es operada por {nombre}.</p>
            <p>Dirección: {direccion}</p>
            <p>Contacto: {email}</p>
            """,
        },
        {
            "title": "Política de Privacidad",
            "body_html": f"""
            <p>{nombre} recopila los datos necesarios para procesar tus pedidos
            (nombre, dirección, email) y no los comparte con terceros salvo
            para completar el envío y el cobro.</p>
            <p>Para cualquier consulta sobre tus datos, escribe a {email}.</p>
            """,
        },
        {
            "title": "Política de Envíos",
            "body_html": f"""
            <p>El tiempo de envío estimado es de {tiempo_envio}.</p>
            <p>Recibirás un número de seguimiento en cuanto tu pedido salga
            de nuestro almacén.</p>
            """,
        },
        {
            "title": "Política de Devoluciones",
            "body_html": f"""
            <p>Dispones de {dias_devolucion} días desde la recepción del
            pedido para solicitar una devolución.</p>
            <p>Escríbenos a {email} indicando tu número de pedido.</p>
            """,
        },
    ]

    creadas = []
    for p in paginas:
        resultado = client.crear_pagina(p["title"], p["body_html"])
        pagina = resultado["page"]
        creadas.append({"title": pagina["title"], "handle": pagina["handle"]})
    return creadas
