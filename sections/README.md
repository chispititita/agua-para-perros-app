# Secciones Shopify — Agua Para Perros

4 secciones listas para Online Store 2.0, configurables 100% desde el Theme Editor (sin tocar código).

## Instalación

1. En el admin de Shopify: **Tienda online → Temas → ⋮ → Editar código**.
2. Dentro de la carpeta `sections/`, crea un archivo nuevo por cada `.liquid` de aquí (mismo nombre) y pega el contenido.
3. Ve al **Editor de temas**, entra a la página donde quieras usarla (home, producto, etc.) y pulsa **Agregar sección**. Cada una aparece con su preset ya cargado con contenido de ejemplo.

## Secciones incluidas

| Archivo | Qué hace | Dónde usarla |
|---|---|---|
| `hero-banner.liquid` | Portada con imagen (desktop/mobile), título, subtítulo y hasta 2 botones. | Home |
| `product-features.liquid` | Grid de beneficios con ícono/emoji + título + texto (bloques repetibles). | Home o página de producto |
| `social-proof.liquid` | Reseñas de clientes con estrellas, foto opcional y avatar. Cuadrícula o carrusel deslizable. | Home o página de producto |
| `size-comparator.liquid` | Comparador visual de tamaños/variantes (300ml/350ml/550ml) con precio, características y CTA. Destaca el "más vendido". | Página de producto |

## Notas técnicas

- Todo el CSS va scoped por `#shopify-section-{{ section.id }}`, así que no chocan entre sí ni con el tema.
- No dependen de JavaScript ni de librerías externas.
- Los botones del comparador de tamaños usan `button_link` manual: pega la URL del producto con `?variant=ID` para preseleccionar la variante (sacas el ID desde **Productos → variante → URL** en el admin).
- Imágenes con `srcset`/`sizes` y `loading="lazy"` (excepto el hero, que carga `eager`/`fetchpriority="high"` por ser LCP).
