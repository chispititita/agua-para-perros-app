# Servicios Móviles JC — Comparador de móviles

Web estática (HTML + CSS + JavaScript, sin dependencias) para ayudar a elegir, comparar y comprar móviles.

## Cómo abrirla
Descomprime el ZIP y abre `index.html` con doble clic en cualquier navegador. Para publicarla, sube la carpeta completa a cualquier hosting (Netlify, GitHub Pages, Hostinger, etc.).

## Funciones
- **Imágenes de todos los móviles**: cada modelo está dibujado a escala real (medidas oficiales en mm) con su diseño de cámaras y sus **colores oficiales**, que se pueden cambiar desde el catálogo, la ficha o el comparador. Vistas de conjunto, trasera, frontal y perfil (grosor).
- **Asistente** de 4 pasos (presupuesto, prioridades, sistema, extras) con recomendaciones y % de afinidad.
- **Rankings**: top 5 por categoría (global, calidad/precio, cámara, batería, rendimiento, menos de 400 €, compactos y plegables).
- **Explora por marca** con acceso directo al catálogo filtrado.
- **Catálogo** de 31 móviles (2024-2025) con filtros por precio (y accesos rápidos por rango), marca, sistema, batería, RAM, carga inalámbrica, IP68, teleobjetivo, carga rápida, compacto, ligero, plegable, actualizaciones y favoritos. 9 criterios de orden y «vistos recientemente».
- **Comparador** de hasta 4 móviles: gráfico radar, veredicto por categoría, **diferencias clave** explicadas en frases, **tamaño y grosor a escala**, tabla con el mejor dato resaltado, enlace compartible e impresión/PDF.
- **Ficha de cada móvil**: galería con colores, puntuaciones, pros/contras, «ideal para», especificaciones completas, **dónde comprar** (tienda oficial, Amazon, PcComponentes, MediaMarkt, El Corte Inglés, Fnac, Idealo, Google Shopping, Back Market y Wallapop), calculadora de financiación, **alternativas** y «comparar con…».
- Búsqueda instantánea con miniaturas, enlaces directos a cada ficha (`#movil=id`), modo claro/oscuro y diseño adaptado a móvil.

## Añadir fotos reales (opcional)
Las imágenes son ilustraciones propias, así que no hay problemas de derechos. Si tienes fotos con permiso de uso:
1. Guárdalas en `img/moviles/` (JPG, PNG o WEBP; mejor con fondo transparente o blanco).
2. Añade la ruta en `js/fotos.js`, por ejemplo: `"pixel-10-pro": "img/moviles/pixel-10-pro.webp",`

La foto aparecerá en el catálogo y como primera vista de la ficha; los dibujos a escala se siguen usando para comparar tamaños.

## Editar datos
Todos los móviles están en `js/data.js`. Para añadir uno, copia un bloque y cambia sus valores: especificaciones, medidas (`dim`), colores (`colors`) y diseño del dibujo (`d`).
Los precios son de lanzamiento y orientativos; los enlaces llevan al precio real de cada tienda.
