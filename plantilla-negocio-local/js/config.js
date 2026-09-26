/* ============================================================================
   CONFIG.JS — ÚNICO ARCHIVO QUE NECESITAS EDITAR PARA CADA CLIENTE
   ============================================================================
   Aquí se define TODO el contenido de la web: nombre del negocio, colores,
   textos, servicios, precios, horario, teléfono, WhatsApp, imágenes, etc.
   No hace falta tocar el HTML ni el CSS: cambia solo los valores de aquí
   (lo que va entre comillas " ") y guarda el archivo.

   Consejo: si algún texto tiene comillas dentro, escápalas con \" o usa
   comillas simples ' ' para envolver el texto.
   ============================================================================ */

const CONFIG = {

  // --------------------------------------------------------------------
  // 1. DATOS BÁSICOS DEL NEGOCIO
  // --------------------------------------------------------------------
  negocio: {
    nombre: "Barbería El Roble",
    eslogan: "Estilo clásico, actitud moderna",
    // Se usa en la pestaña del navegador y para buscadores (SEO)
    tituloPagina: "Barbería El Roble — Barbería en Madrid",
    descripcionMeta: "Barbería El Roble: cortes clásicos y modernos, arreglo de barba y afeitado tradicional en el centro de Madrid. Reserva tu cita por WhatsApp.",
  },

  // --------------------------------------------------------------------
  // 2. CONTACTO
  // --------------------------------------------------------------------
  contacto: {
    telefono: "+34600000000",        // formato internacional, se usa para el enlace de llamada
    telefonoVisible: "600 00 00 00", // como se muestra en pantalla
    // Número de WhatsApp SIN el "+", SIN espacios y SIN guiones. Ejemplo: 34600000000
    whatsapp: "34600000000",
    // Mensaje que aparecerá ya escrito cuando el cliente pulse el botón de WhatsApp
    whatsappMensaje: "Hola, me gustaría pedir información / reservar cita.",
    email: "info@barberiaelroble.com",
    direccion: "Calle Mayor 24, 28013 Madrid",
    // Para obtener tu URL: ve a Google Maps > busca tu negocio > Compartir > Insertar un mapa > copia el enlace del "src"
    mapaEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3037.789!2d-3.7038!3d40.4168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDI1JzAwLjUiTiAzwrA0MicxMy43Ilc!5e0!3m2!1ses!2ses!4v1700000000000",
  },

  // --------------------------------------------------------------------
  // 3. REDES SOCIALES (deja el texto vacío "" en las que no uses y no se mostrarán)
  // --------------------------------------------------------------------
  redesSociales: {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    tiktok: "",
    google: "", // enlace directo a "Escribir una reseña" de Google Business Profile
  },

  // --------------------------------------------------------------------
  // 4. HORARIO (añade o quita líneas según necesites)
  // --------------------------------------------------------------------
  horario: [
    { dia: "Lunes - Viernes", horas: "10:00 - 14:00 y 17:00 - 20:30" },
    { dia: "Sábado", horas: "10:00 - 14:00" },
    { dia: "Domingo", horas: "Cerrado" },
  ],

  // --------------------------------------------------------------------
  // 5. COLORES Y TIPOGRAFÍA — cambia el aspecto de TODA la web al instante
  // --------------------------------------------------------------------
  colores: {
    primario: "#14213d",    // color principal (cabecera, títulos, footer)
    secundario: "#c9a227",  // color de detalles/dorado (líneas, iconos, precios)
    acento: "#e94560",      // color de los botones de acción principales
    texto: "#1c1c1c",
    textoSuave: "#5b5f66",
    fondo: "#ffffff",
    fondoAlt: "#f7f6f3",    // fondo de secciones alternas
    borde: "#e7e4dd",
  },

  fuentes: {
    // Debes asegurarte de que la fuente esté cargada en el <head> de index.html
    // (por defecto ya vienen Playfair Display e Inter desde Google Fonts)
    titulos: "'Playfair Display', serif",
    texto: "'Inter', sans-serif",
  },

  // --------------------------------------------------------------------
  // 6. IMÁGENES — sustituye estos archivos dentro de la carpeta /images
  //    manteniendo el mismo nombre, o cambia aquí la ruta si usas otro nombre
  // --------------------------------------------------------------------
  imagenes: {
    logo: "images/logo.svg",              // recomendado: fondo transparente, formato PNG o SVG
    hero: "images/hero.svg",              // foto grande de portada, recomendado 1920x1080
    sobreNosotros: "images/about.svg",    // foto de la sección "Sobre nosotros", recomendado 900x1000
    galeria: [
      "images/galeria-1.svg",
      "images/galeria-2.svg",
      "images/galeria-3.svg",
      "images/galeria-4.svg",
      "images/galeria-5.svg",
      "images/galeria-6.svg",
    ],
  },

  // --------------------------------------------------------------------
  // 7. SECCIÓN HERO (la primera pantalla que ve el visitante)
  // --------------------------------------------------------------------
  hero: {
    eyebrow: "Barbería en el centro de Madrid",
    titulo: "Cortes con carácter, atención al detalle",
    subtitulo: "Más de 12 años cuidando el estilo de nuestros clientes. Reserva tu cita en segundos por WhatsApp.",
    ctaPrimarioTexto: "Reservar por WhatsApp",
    ctaSecundarioTexto: "Llamar ahora",
    valoracion: "4.9/5 en Google · +300 reseñas",
  },

  // --------------------------------------------------------------------
  // 8. ESTADÍSTICAS / CIFRAS DE CONFIANZA
  // --------------------------------------------------------------------
  estadisticas: [
    { numero: "12+", texto: "Años de experiencia" },
    { numero: "8.000+", texto: "Clientes satisfechos" },
    { numero: "4.9★", texto: "Valoración en Google" },
    { numero: "6", texto: "Barberos profesionales" },
  ],

  // --------------------------------------------------------------------
  // 9. SERVICIOS Y PRECIOS
  //    "icono" puede ser uno de: star, scissors, tool, heart, food, clock,
  //    sparkle, shield, calendar  (si pones otro nombre, se usa uno genérico)
  // --------------------------------------------------------------------
  servicios: {
    eyebrow: "Lo que ofrecemos",
    titulo: "Nuestros servicios",
    subtitulo: "Servicios profesionales adaptados a cada estilo, con productos de primera calidad.",
    lista: [
      {
        icono: "scissors",
        nombre: "Corte clásico",
        descripcion: "Corte a tijera y máquina, incluye lavado y peinado final.",
        precio: "18€",
      },
      {
        icono: "sparkle",
        nombre: "Arreglo de barba",
        descripcion: "Perfilado, recorte y tratamiento hidratante para la barba.",
        precio: "12€",
      },
      {
        icono: "star",
        nombre: "Corte + Barba",
        descripcion: "El pack completo: corte, barba y toalla caliente.",
        precio: "27€",
      },
      {
        icono: "shield",
        nombre: "Afeitado clásico",
        descripcion: "Afeitado tradicional a navaja con toalla caliente y productos premium.",
        precio: "15€",
      },
      {
        icono: "heart",
        nombre: "Coloración",
        descripcion: "Coloración profesional para cabello o barba.",
        precio: "Desde 20€",
      },
      {
        icono: "calendar",
        nombre: "Bono mensual",
        descripcion: "4 cortes al mes con descuento y reserva prioritaria.",
        precio: "60€/mes",
      },
    ],
  },

  // --------------------------------------------------------------------
  // 10. SOBRE NOSOTROS
  // --------------------------------------------------------------------
  sobreNosotros: {
    eyebrow: "Sobre nosotros",
    titulo: "Tradición barberil con un toque moderno",
    texto: "En Barbería El Roble combinamos técnicas clásicas con las últimas tendencias. Nuestro equipo de barberos profesionales se forma constantemente para ofrecerte el mejor resultado, en un ambiente cómodo y sin prisas.",
    puntos: [
      "Barberos con formación continua",
      "Productos profesionales de primera calidad",
      "Ambiente cuidado y relajado",
      "Reserva de cita online en segundos",
    ],
    ctaTexto: "Conócenos en Instagram",
  },

  // --------------------------------------------------------------------
  // 11. OPINIONES DE CLIENTES
  // --------------------------------------------------------------------
  testimonios: {
    eyebrow: "Opiniones",
    titulo: "Lo que dicen nuestros clientes",
    lista: [
      {
        nombre: "Javier M.",
        texto: "El mejor corte que me han hecho en años. Ambiente muy agradable y profesionales de verdad.",
        valoracion: 5,
      },
      {
        nombre: "Carlos R.",
        texto: "Reservé por WhatsApp y en dos minutos tenía cita. Muy recomendable.",
        valoracion: 5,
      },
      {
        nombre: "Alberto S.",
        texto: "Llevo dos años viniendo siempre. Nunca falla el resultado.",
        valoracion: 5,
      },
    ],
  },

  // --------------------------------------------------------------------
  // 12. GALERÍA
  // --------------------------------------------------------------------
  galeria: {
    eyebrow: "Nuestro trabajo",
    titulo: "Galería",
  },

  // --------------------------------------------------------------------
  // 13. LLAMADA A LA ACCIÓN FINAL (antes del contacto)
  // --------------------------------------------------------------------
  ctaFinal: {
    titulo: "¿Reservamos tu próxima cita?",
    subtitulo: "Escríbenos por WhatsApp y te confirmamos hueco al momento.",
  },

  // --------------------------------------------------------------------
  // 14. AVISO SUPERIOR (opcional). Déjalo en "" para ocultarlo.
  // --------------------------------------------------------------------
  avisoSuperior: "",
  // Ejemplo: "📅 Cerrado el próximo lunes por festivo local",

  // --------------------------------------------------------------------
  // 15. TEXTO LEGAL BÁSICO (para las páginas de aviso legal / privacidad / cookies)
  // --------------------------------------------------------------------
  legal: {
    nombreFiscal: "Barbería El Roble S.L.",
    nif: "B00000000",
    direccionFiscal: "Calle Mayor 24, 28013 Madrid",
    emailContacto: "info@barberiaelroble.com",
  },
};
