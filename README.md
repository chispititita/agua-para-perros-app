# aplicacion-dropshipping

Automatiza la parte repetitiva de montar una tienda de testeo por
producto, con una **interfaz web local con botones y formularios** —
no necesitas escribir comandos.

## Cómo abrirla (para usar todos los días)

**En Windows, sin usar cmd:** haz doble clic en `iniciar_app.bat`. La
primera vez tarda un poco más porque instala las dependencias solas; se
abre una ventana negra (déjala abierta mientras usas la app, es el
servidor) y tu navegador se abre solo en `http://localhost:5000`. Para
apagar la app, cierra esa ventana.

Consejo: crea un acceso directo en el escritorio para no tener que
buscar la carpeta cada vez — clic derecho sobre `iniciar_app.bat` →
"Enviar a" → "Escritorio (crear acceso directo)".

**Por terminal (cualquier sistema):**
```bash
pip install -r requirements.txt   # solo la primera vez
python app_web.py
```

Con cualquiera de los dos métodos, verás en **http://localhost:5000**:
- **Configuración** — pega tu dominio de tienda y token una sola vez
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

## Flujo completo (por dentro)

1. **Crea la tienda de desarrollo a mano** en tu Partner Dashboard →
   Dev Dashboard → Stores → Create store → "Store for testing"
   (2-3 minutos, gratis, ilimitadas).
2. En esa tienda nueva, ve a **Configuración → Apps y canales de
   venta → Desarrollar apps** y crea una app personalizada con scopes
   `write_products`, `write_content`, `read_products`. Copia el
   **Admin API access token**.
3. Copia `config/config.example.json` a `config/config.json` y
   rellena: dominio de la tienda, token, `location_id` (lo ves en
   Configuración → Ubicaciones, o vía la query `locations` de la API),
   y tus datos de negocio para las páginas legales.
4. Copia `config/producto_ejemplo.json` y edítalo con los datos del
   producto que vas a testear.
5. Instala dependencias: `pip install -r requirements.txt`.
6. Ejecuta:
   ```bash
   python main.py --config config/config.json --producto config/mi_producto.json
   ```
   Esto crea el producto (en estado `DRAFT`) y las 4 páginas legales.
7. Aplica tu tema de pago (requiere Shopify CLI):
   ```bash
   npm install -g @shopify/cli   # una sola vez
   shopify auth login             # una sola vez
   python creacion_tienda/aplicar_tema.py --tienda mi-tienda-dev.myshopify.com --carpeta-tema ./mi-tema
   ```
8. Revisa todo en el admin, publica el producto y el tema
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
- Resolver `location_id` automáticamente vía la query `locations` en
  vez de pedirlo a mano en el config.
- Mover el token de la Admin API a variable de entorno en vez de
  dejarlo en texto plano en `config.json`.
- Un comando `--resumen` que liste productos por estado desde
  `historial_productos.json`, para no perderles la pista con el
  tiempo.
