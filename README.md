# aplicacion-dropshipping

Automatiza la parte repetitiva de montar una tienda de testeo por
producto, con una **interfaz web local con botones y formularios** —
no necesitas escribir comandos.

## Cómo abrirla (para usar todos los días)

### Como una app de escritorio (Windows, recomendado)

1. **Una sola vez:** haz doble clic en `instalar.bat`. Instala todo lo
   necesario y deja un icono llamado **"Agua Para Perros"** en tu
   Escritorio (con su propio ícono de gota de agua).
2. **A partir de ahí:** abre la app haciendo doble clic en ese icono,
   como cualquier otro programa. Se abre en su propia ventana (sin
   pestaña de navegador ni ventana negra de consola).
3. Para cerrarla, cierra la ventana de la app.

Si necesitas volver a crear el icono (por ejemplo, si lo borraste),
haz doble clic en `crear_acceso_directo.vbs`.

*Nota:* la ventana usa el motor Microsoft Edge WebView2, que ya viene
incluido en Windows 10/11 actualizados. Si la ventana no llega a
abrirse, instala el "WebView2 Runtime" desde la web de Microsoft y
vuelve a intentarlo.

### Alternativa: en el navegador, con la terminal a la vista

Útil si algo falla y quieres ver los mensajes de error del servidor.

**Windows, sin escribir comandos:** doble clic en `iniciar_app.bat`.
Se abre una ventana negra (el servidor; déjala abierta) y tu navegador
se abre solo en `http://localhost:5000`.

**Por terminal (cualquier sistema):**
```bash
pip install -r requirements.txt   # solo la primera vez
python app_web.py
```

Con cualquiera de los métodos, verás en la app:
- **Configuración** — conecta tu tienda de Shopify con un clic (ver abajo)
- **Nuevo producto** — formulario para subir un producto con variantes
- **Investigar productos (IA)** — genera candidatos de producto con la API de Anthropic
- **Registrar test de anuncio** — mete tus números de gasto/ATC/ventas y te dice si matar, seguir o escalar
- **Revisar velocidad** — chequea la ficha del producto antes de gastar en ads

Todo lo demás en este README es la explicación técnica de por dentro,
por si algún día quieres ajustar algo en el código.

## Configurar la clave de Anthropic (para "Investigar productos")

Solo la página "Investigar productos (IA)" necesita esto — el resto de
la app (subir productos, registrar tests, revisar velocidad) funciona
sin ninguna clave de Anthropic.

```bash
cp .env.example .env
# Edita .env y pega tu ANTHROPIC_API_KEY
```

`app_web.py` carga automáticamente `.env` al arrancar (vía
`python-dotenv`). El archivo `.env` está en `.gitignore`: nunca lo
subas al repositorio.

## Conectar con Shopify (configuración única, ~5 minutos)

La app conecta tu tienda con OAuth real — inicias sesión en Shopify y
aceptas los permisos, sin copiar ningún token a mano, y de paso se
autocompletan nombre, email, dirección y ubicación de inventario.

Para que el botón "Conectar con Shopify" funcione, Shopify exige que
exista una app registrada con un Client ID y Client Secret. Esto se
hace **una sola vez, para siempre** (sirve para conectar cualquier
tienda que quieras después, no solo la primera):

1. Entra a [partners.shopify.com](https://partners.shopify.com) (crea
   una cuenta de Partners gratis si no tienes una) → **Apps** → **Create app**.
2. Elige **"Create app manually"**, ponle un nombre (ej. "Mi App Dropshipping").
3. En **App setup**, en "Allowed redirection URL(s)" añade exactamente:
   ```
   http://localhost:5000/oauth/callback
   http://127.0.0.1:5000/oauth/callback
   ```
   (Shopify permite `localhost` como excepción a su regla de HTTPS,
   pensado justo para apps que corren en tu propio PC).
4. En **Client credentials**, copia el **Client ID** y el **Client secret**.
5. Pégalos en tu archivo `.env` (créalo con `cp .env.example .env` si
   no lo tienes):
   ```
   SHOPIFY_CLIENT_ID=...
   SHOPIFY_CLIENT_SECRET=...
   ```
6. Reinicia la app (cierra la ventana y vuelve a abrir el icono, o
   vuelve a correr `python app_web.py`). En **Configuración**, pon el
   dominio de tu tienda y pulsa **"Conectar con Shopify"** — el resto
   es iniciar sesión y aceptar.

Si tu tienda es de desarrollo (la creaste desde el Dev Dashboard de
Partners → Stores → "Store for testing"), el mismo flujo funciona
igual — Shopify no distingue tiendas de desarrollo a la hora de
autorizar una app.

## Flujo completo (por dentro)

1. Conecta tu tienda como se explica arriba.
2. Copia `config/producto_ejemplo.json` y edítalo con los datos del
   producto que vas a testear (o usa "Nuevo producto" / "Investigar
   productos (IA)" en la web app).
3. Ejecuta:
   ```bash
   python main.py --producto config/mi_producto.json
   ```
   Esto crea el producto (en estado `DRAFT`) y las 4 páginas legales.
4. Aplica tu tema de pago (requiere Shopify CLI):
   ```bash
   npm install -g @shopify/cli   # una sola vez
   shopify auth login             # una sola vez
   python creacion_tienda/aplicar_tema.py --tienda mi-tienda-dev.myshopify.com --carpeta-tema ./mi-tema
   ```
5. Revisa todo en el admin, publica el producto y el tema
   manualmente, y decide si el producto pasa a plan pagado o se
   descarta.

## Qué queda registrado

Cada ejecución de `main.py` añade una entrada a
`logs/historial_productos.json` con fecha, tienda, producto y estado.
Edita el campo `estado` a mano conforme avance el testeo
(`testeado_sin_tráfico`, `escalado_a_pagado`, `descartado`, etc.) para
no repetir productos ya probados.

## Limitaciones conocidas (de la API de Shopify, no de este script)

- No se puede crear la tienda de desarrollo por API — solo desde el
  Dev Dashboard.
- No se puede invitar staff/colaboradores por API — solo desde
  Configuración → Usuarios.
- No se puede publicar un tema por API sin la Shopify CLI.
- Los productos se crean como `DRAFT` a propósito, para que siempre
  los revises antes de publicar.

## Investigación de productos (antes del paso 1)

Dos formas de investigar productos:

- **Desde la web app**: la página "Investigar productos (IA)" llama a
  la API de Anthropic con el nicho que le pases y devuelve 8-10
  candidatos con ángulo de marketing, costo/precio estimado, público
  objetivo y saturación. Puedes guardar uno como
  `investigacion/mi_candidato.json` con un clic.
- **Desde el chat**: usa la skill `investigador-productos` (ya la
  tienes disponible) para obtener candidatos con señales reales de
  tendencia, margen y saturación conversando con Claude.

Luego, con cualquiera de las dos:

```bash
# 1. Guarda el candidato elegido siguiendo investigacion/plantilla_candidato.json
# 2. Conviértelo al formato de producto:
python investigacion/convertir_a_producto.py \
    --candidato investigacion/mi_candidato.json \
    --salida config/producto_a_testear.json

# 3. Sigue el flujo normal:
python main.py --producto config/producto_a_testear.json
```

## Testeo de anuncios: cuándo matar o escalar un producto

Basado en investigación de prácticas reales de dropshippers solo-operador
(ver criterios abajo). Esto es lo que decide si un producto pasa de
"tienda de desarrollo" a "plan pagado", o se descarta.

**Umbrales usados (ajustables en `testeo/economia.py` si aprendes algo distinto):**
- Gasto de 30-50€ sin ningún "añadir al carrito" → matar (el hook/creativo no funciona)
- Gasto de 100-150€ sin ninguna venta → matar (sin señal de conversión), pero solo tras probar 3-5 ángulos de anuncio distintos
- No juzgar nada en las primeras 12-24h de un anuncio (fase de aprendizaje)
- Presupuesto de test recomendado: 100-300€ por producto (TikTok más barato que Meta)

**Antes de gastar en ads**, revisa la velocidad de la ficha del producto:
```bash
python testeo/velocidad_pagina.py --url https://tu-tienda.myshopify.com/products/tu-producto
```
Umbrales "buenos" de Google: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1. Una
ficha lenta en móvil (70-80% del tráfico de ads suele ser móvil) puede
perder a la mitad de las visitas antes de que cargue.

**Mientras corres el test**, registra cada lectura y obtén un veredicto automático:
```bash
python testeo/registro_tests.py registrar \
    --producto "Botella Bebedero" --costo 6 --precio 24.95 \
    --canal tiktok --gasto 45 --ctr 1.2 --atc 2 --ventas 0 --angulos 1
```
Esto te dice si `matar`, `seguir`, `cambiar_angulo` o `escalar`, y queda
guardado en `logs/tests_anuncios.json` para no perder la pista con el
tiempo. Consulta el historial de un producto con:
```bash
python testeo/registro_tests.py historial --producto "Botella Bebedero"
```

`main.py` ya calcula e imprime estos umbrales automáticamente al subir
cada producto nuevo, usando el costo/precio de la primera variante.

## Próximos pasos sugeridos

- Manejo de errores en `subir_producto.py`: si la creación de
  variantes falla después de crear el producto, hoy queda un
  producto huérfano — falta rollback o al menos marcarlo en el log.
- Refrescar el token de Shopify si la tienda revoca el acceso
  (hoy hay que volver a pulsar "Conectar con Shopify" a mano).
- Un comando `--resumen` que liste productos por estado desde
  `historial_productos.json`, para no perderles la pista con el
  tiempo.
