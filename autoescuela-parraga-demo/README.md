# Párraga Autoescuela — Demo conceptual

Demo comercial (no oficial) de página web para una autoescuela local. Sirve
como plantilla reutilizable: todo el contenido sale de `js/config.js`.

## Estructura

```
autoescuela-parraga-demo/
├── index.html          → la web
├── privacidad.html      → página legal (placeholder)
├── cookies.html          → página legal (placeholder)
├── css/style.css         → estilos (no se toca para personalizar)
├── js/
│   ├── config.js         → ★ AQUÍ SE EDITA TODO EL CONTENIDO ★
│   └── main.js           → motor de la plantilla (no se toca)
└── images/
    ├── logo.svg, favicon.svg
    ├── hero.svg           → ilustración genérica, sustituir por foto real
    └── nosotros.svg       → ilustración genérica, sustituir por foto real
```

## Reutilizar para otro negocio

1. Copia la carpeta y edita `js/config.js`: nombre, ciudad, teléfono,
   WhatsApp, colores, permisos/servicios, proceso, FAQ, etc.
2. Sustituye las imágenes de `images/` por las del negocio real.
3. Cambia los textos de `privacidad.html` / `cookies.html` si hace falta.

No hace falta tocar `index.html`, `style.css` ni `main.js` para una
personalización normal.

## Nota sobre esta demo

Todos los datos de contacto, horario y permisos son placeholders
("pendiente de confirmar") porque no se confirmaron con el propietario.
No se han inventado precios, reseñas, premios ni años de experiencia.
