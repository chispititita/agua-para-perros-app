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

**No necesitas ninguna clave ni pagar nada.**

1. Instala **Python** desde <https://www.python.org/downloads/>.
   En Windows, marca la casilla **«Add Python to PATH»** en el instalador.
2. Usa **Google Chrome** o **Microsoft Edge** (son los navegadores que permiten hablar por voz).
3. Pon la carpeta `jarvis` en tu Escritorio.

## 2. Arrancar

- **Windows**: doble clic en `iniciar.bat`.
- **Mac**: doble clic en `iniciar.command` (si macOS lo bloquea: clic derecho → Abrir).

La primera vez tarda un rato porque se descarga solo:
- **Ollama**, un programa gratuito que hace funcionar la IA **dentro de tu ordenador**.
  Si no se instala solo, descárgalo de <https://ollama.com/download> y vuelve a abrir Jarvis.
- El **cerebro de Jarvis** (modelo `qwen2.5:7b`, unos 5 GB).

Después, Jarvis se abre en su propia ventana. Cuando te pida permiso para el **micrófono**, dale a «Permitir».

**¿Qué ordenador hace falta?** Para el cerebro local, al menos **8 GB de RAM** (con 16 GB va más fluido;
con tarjeta gráfica, mucho más rápido). Si va lento, abre el archivo `.env` y cambia
`MODELO_LOCAL=qwen2.5:7b` por `MODELO_LOCAL=qwen2.5:3b` (más rápido, algo menos listo).

## 3. Qué es gratis y qué es opcional

| Parte | Gratis, sin claves | Mejora opcional (de pago por uso, con clave en `.env`) |
|---|---|---|
| Cerebro / conversación | IA local en tu PC (Ollama) | `ANTHROPIC_API_KEY` → Claude, mucho más listo |
| Imágenes | Servicio gratuito Pollinations (necesita internet) | `REPLICATE_API_TOKEN` → modelos de Replicate |
| Vídeos | Montaje en tu PC: zoom cinematográfico + texto grande, formato reel | `REPLICATE_API_TOKEN` → vídeo generado por IA |
| Voz | Reconocimiento y voz del navegador | — |
| Shopify | — | `SHOPIFY_TIENDA` + `SHOPIFY_TOKEN` para leer productos y ventas |

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
- **«Todavía no puedo pensar»**: abre la aplicación Ollama (o vuelve a abrir `iniciar.bat` / `iniciar.command`).
- **Responde lento**: es normal en ordenadores sin tarjeta gráfica. Usa `qwen2.5:3b` (ver arriba) o pon una clave de Claude.
- **No me salen las imágenes**: el servicio gratuito necesita internet y a veces está saturado; espera un minuto.
- **Quiero otro modelo de vídeo o imagen de pago**: cambia `MODELO_VIDEO` / `MODELO_IMAGEN` en `.env`
  por cualquier modelo de <https://replicate.com>. Si el modelo de vídeo usa otro nombre para la imagen
  de partida, cámbialo en `MODELO_VIDEO_CLAVE_IMAGEN` (lo verás en la pestaña «API» de la página del modelo).
- **Quiero que piense más a fondo** (solo con Claude): pon `ESFUERZO_CLAUDE=medium` en `.env`.
- **Copia de seguridad**: copia la carpeta `data/`.

## Para quien quiera tocar el código

```
jarvis.py      servidor local (Flask) y arranque de la ventana
brain.py       herramientas del asistente + cerebro con Claude (si hay clave)
cerebro_local.py  cerebro gratuito con Ollama (sin clave)
db.py          base de datos SQLite local
media.py       imágenes (Pollinations gratis o Replicate) y vídeos (montaje local con ffmpeg o Replicate)
shopify.py     lectura de productos y pedidos (Admin API GraphQL)
static/        interfaz y control por voz (Web Speech API)
```

Arrancar sin abrir ventana: `python jarvis.py --sin-ventana` y entra en <http://127.0.0.1:5757>.
