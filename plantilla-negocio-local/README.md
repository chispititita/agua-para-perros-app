# Plantilla Negocio Local

Plantilla web profesional, lista para vender a negocios locales (barberías,
restaurantes, talleres, centros de estética, etc.). No necesita servidor,
base de datos ni instalación: son archivos HTML/CSS/JS puros que funcionan
en cualquier hosting.

## Estructura

```
plantilla-negocio-local/
├── index.html                  → la web (no se toca para personalizar)
├── aviso-legal.html            → página legal (edítala si hace falta)
├── politica-privacidad.html    → página legal (edítala si hace falta)
├── politica-cookies.html       → página legal (edítala si hace falta)
├── css/
│   └── styles.css              → estilos (no se toca para personalizar)
├── js/
│   ├── config.js               → ★ AQUÍ SE EDITA TODO EL CONTENIDO ★
│   └── main.js                 → motor de la plantilla (no se toca)
└── images/
    ├── logo.svg                → sustituir por el logo del cliente
    ├── hero.svg                → sustituir por foto de portada
    ├── about.svg                → sustituir por foto "sobre nosotros"
    └── galeria-1.svg … galeria-6.svg → sustituir por fotos de trabajo
```

## Personalizar una web para un cliente nuevo

1. Copia toda la carpeta `plantilla-negocio-local` y ponle el nombre del cliente.
2. Abre `js/config.js` y cambia los datos: nombre, teléfono, WhatsApp,
   dirección, horario, colores, servicios y precios, textos, redes sociales.
3. Sustituye las imágenes dentro de `images/` por las fotos reales del
   negocio, manteniendo los mismos nombres de archivo (o cambia la ruta en
   `config.js` si prefieres otros nombres).
4. Abre `index.html` en el navegador para comprobar el resultado.

No hace falta tocar `index.html`, `styles.css` ni `main.js` para una
personalización normal.

## Notas técnicas

- El botón de WhatsApp usa el formato `https://wa.me/<numero>` con el
  mensaje predefinido en `config.js` (`contacto.whatsappMensaje`).
- El mapa de la sección de contacto usa un iframe de Google Maps
  (`contacto.mapaEmbedUrl`). Instrucciones para obtenerlo dentro del propio
  `config.js`.
- Los colores se aplican mediante variables CSS (`--color-primario`, etc.)
  que `main.js` sincroniza automáticamente con `CONFIG.colores`.
- El efecto de aparición al hacer scroll está protegido con una clase `js`
  y un temporizador de seguridad: si JavaScript fallara por cualquier
  motivo, el contenido se muestra igualmente.
