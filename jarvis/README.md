# J.A.R.V.I.S. — tu asistente personal

Un programa para tu ordenador que funciona como el JARVIS de Iron Man:

- **Coach de vida**: te motiva, te hace el repaso del día, te ayuda a salir de tus vicios y recuerda tus metas.
- **Dinero**: lleva tu saldo, ingresos y gastos por categorías.
- **Vicios**: cuenta los días sin caer, lo que consumes cada día y semana, y cuánto dinero te cuesta.
- **Tareas y trabajos**: con prioridades, fechas límite y avisos de lo que está vencido.
- **Estudio de contenido con IA**: crea imágenes y vídeos para tu tienda Shopify (anuncios, reels, TikTok, banners).
  Puede animar en vídeo una imagen que haya creado o la foto de un producto de tu tienda.
- **Voz**: le hablas y te contesta en voz alta. En **modo manos libres** está siempre escuchando y se activa
  cuando dices «**Jarvis**», sin tocar nada.

Todos tus datos se guardan **solo en tu ordenador** (carpeta `data/`).

---

## 1. Instalar (una sola vez)

1. Instala **Python** desde <https://www.python.org/downloads/>.
   En Windows, marca la casilla **«Add Python to PATH»** en el instalador.
2. Instala **Google Chrome** o usa **Microsoft Edge** (son los navegadores que permiten hablar por voz).
3. Descarga esta carpeta `jarvis` a tu ordenador.

## 2. Conseguir las claves

Jarvis usa estos servicios (se pagan por uso, normalmente céntimos por conversación o imagen):

| Para qué | Dónde conseguirla | ¿Obligatoria? |
|---|---|---|
| El cerebro de Jarvis (Claude) | <https://platform.claude.com/> → API Keys | **Sí** |
| Crear imágenes y vídeos | <https://replicate.com/account/api-tokens> | Para el Estudio |
| Leer productos y ventas de Shopify | Panel de Shopify → Configuración → Apps y canales de venta → Desarrollar apps → Crear app → permisos `read_products` y `read_orders` → Instalar → copia el «Admin API access token» | Opcional |

## 3. Arrancar

- **Windows**: doble clic en `iniciar.bat`.
- **Mac**: doble clic en `iniciar.command` (si macOS lo bloquea: clic derecho → Abrir).

La primera vez instala lo necesario y abre el archivo `.env` para que pegues tus claves.
Guárdalo, cierra el Bloc de notas y Jarvis se abrirá en su propia ventana.
Cuando te pida permiso para el **micrófono**, dale a «Permitir».

> Para cambiar las claves más adelante, edita el archivo `.env` y vuelve a abrir Jarvis.

## 4. Cómo usarlo

**Hablar**: pulsa el círculo brillante y habla. O activa **«Modo manos libres»** y di, por ejemplo:

- «Jarvis, buenos días» → repaso de dinero, vicios y tareas y por dónde empezar.
- «Jarvis, tengo 850 euros en la cuenta» → fija tu saldo.
- «Jarvis, me he gastado 12 euros en comida» → lo apunta.
- «Jarvis, quiero dejar el tabaco, cada cigarro me cuesta 25 céntimos» → lo empieza a controlar.
- «Jarvis, me he fumado dos cigarros» → lo registra y te pregunta qué lo provocó.
- «Jarvis, apúntame grabar un vídeo para la tienda el viernes, prioridad alta».
- «Jarvis, créame una imagen para Instagram de un perro bebiendo de nuestra botella en la playa».
- «Jarvis, hazme un vídeo para TikTok con la foto del producto».
- «Jarvis, ¿cómo van las ventas esta semana?»
- «Jarvis, recuerda que mi meta es llegar a 50 ventas al mes».

Después de contestarte, se queda unos segundos escuchando por si quieres seguir hablando sin repetir «Jarvis».
Pulsa el círculo mientras habla para interrumpirle.

**Sin voz**: también puedes escribirle, o usar las pestañas Dinero, Vicios, Tareas y Estudio a mano.

## 5. Preguntas frecuentes

- **No me oye**: usa Chrome o Edge, revisa que el micrófono tenga permiso (icono del candado en la barra)
  y que tengas internet (el reconocimiento de voz del navegador funciona en línea).
- **La voz suena rara**: elige otra voz en el desplegable bajo el círculo (en Windows suelen ir bien
  «Microsoft Pablo» o «Google español»).
- **Quiero otro modelo de vídeo o imagen**: cambia `MODELO_VIDEO` / `MODELO_IMAGEN` en `.env`
  por cualquier modelo de <https://replicate.com>. Si el modelo de vídeo usa otro nombre para la imagen
  de partida, cámbialo en `MODELO_VIDEO_CLAVE_IMAGEN` (lo verás en la pestaña «API» de la página del modelo).
- **Quiero que piense más a fondo**: pon `ESFUERZO_CLAUDE=medium` en `.env` (responderá algo más lento).
- **Copia de seguridad**: copia la carpeta `data/`.

## Para quien quiera tocar el código

```
jarvis.py      servidor local (Flask) y arranque de la ventana
brain.py       cerebro: Claude con herramientas (dinero, vicios, tareas, memoria, contenidos, Shopify)
db.py          base de datos SQLite local
media.py       imágenes y vídeos con Replicate
shopify.py     lectura de productos y pedidos (Admin API GraphQL)
static/        interfaz y control por voz (Web Speech API)
```

Arrancar sin abrir ventana: `python jarvis.py --sin-ventana` y entra en <http://127.0.0.1:5757>.
