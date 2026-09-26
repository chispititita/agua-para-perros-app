/* ============================================================================
   CONFIG.JS — ÚNICO ARCHIVO QUE HAY QUE EDITAR PARA REUTILIZAR ESTA PLANTILLA
   ============================================================================
   Todo el contenido de la web (nombre, contacto, colores, permisos, FAQ...)
   sale de este objeto CONFIG. Para adaptar la plantilla a otro negocio local,
   normalmente basta con cambiar los valores de aquí y las imágenes de /images.

   Los valores marcados como "PENDIENTE DE CONFIRMAR" son placeholders: esta
   es una demo comercial, no la web oficial de Párraga, así que no se han
   inventado teléfono, horario, precios ni dirección exacta reales.
   ============================================================================ */

const CONFIG = {

  // --------------------------------------------------------------------
  // IDENTIDAD DEL NEGOCIO
  // --------------------------------------------------------------------
  businessName: "Párraga",
  businessTagline: "AUTOESCUELA", // texto pequeño bajo el logo
  businessType: "Autoescuela",
  city: "Guadarrama, Madrid",

  // --------------------------------------------------------------------
  // CONTACTO — PENDIENTE DE CONFIRMAR CON EL PROPIETARIO
  // --------------------------------------------------------------------
  address: "Guadarrama, Madrid — dirección exacta pendiente de confirmar",
  // Número de teléfono real del negocio. Se usa tal cual en enlaces "tel:".
  phone: "+34600000000",
  phoneDisplay: "Teléfono pendiente de confirmar",
  // WhatsApp SIN "+", sin espacios ni guiones. Ejemplo real: 34600000000
  whatsapp: "34600000000",
  whatsappDisplay: "WhatsApp pendiente de confirmar",
  whatsappMessage: "Hola, quiero información para sacarme el carnet de conducir.",
  email: "info@example.com", // PENDIENTE DE CONFIRMAR
  openingHours: [
    { day: "Lunes - Viernes", hours: "Horario pendiente de confirmar" },
    { day: "Sábado", hours: "Horario pendiente de confirmar" },
  ],
  // Texto de búsqueda para el mapa (no inventamos una dirección exacta)
  mapsQuery: "Guadarrama, Madrid",

  // --------------------------------------------------------------------
  // COLORES Y TIPOGRAFÍA
  // --------------------------------------------------------------------
  primaryColor: "#0a2540",   // azul oscuro — cabecera, títulos, footer
  secondaryColor: "#2563eb", // azul eléctrico — botones y detalles
  accentColor: "#25d366",    // verde WhatsApp — CTA de contacto directo
  fontHeadings: "'Sora', sans-serif",
  fontBody: "'Inter', sans-serif",

  // --------------------------------------------------------------------
  // IMÁGENES
  // --------------------------------------------------------------------
  logo: "images/logo.svg",
  heroImage: "images/hero.svg",       // ilustración genérica — sustituir por foto real
  secondaryImage: "images/nosotros.svg", // ilustración genérica — sustituir por foto real

  // --------------------------------------------------------------------
  // HERO
  // --------------------------------------------------------------------
  hero: {
    title: "Tu carnet empieza aquí.",
    subtitle: "Aprende a conducir con confianza y prepárate para conseguir tu permiso de conducir.",
    ctaPrimary: "Quiero información",
    ctaSecondary: "Hablar por WhatsApp",
  },

  // --------------------------------------------------------------------
  // BLOQUE DE CONFIANZA
  // --------------------------------------------------------------------
  trustCards: [
    { icon: "target", title: "Formación personalizada", text: "Un aprendizaje adaptado a tu ritmo y tu nivel de partida." },
    { icon: "book", title: "Preparación teórica", text: "Repaso y práctica de los contenidos del examen teórico." },
    { icon: "car", title: "Clases prácticas", text: "Sesiones al volante para coger soltura y seguridad real." },
    { icon: "heart", title: "Atención cercana", text: "Acompañamiento directo durante todo el proceso." },
  ],

  // --------------------------------------------------------------------
  // PERMISOS — no se confirma la oferta real de Párraga; se deja preparado
  // --------------------------------------------------------------------
  permits: [
    {
      name: "Permiso B",
      description: "Información sobre permisos — consultar disponibilidad.",
      icon: "car",
    },
    {
      name: "Otros permisos",
      description: "Información sobre permisos — consultar disponibilidad.",
      icon: "license",
    },
  ],

  // --------------------------------------------------------------------
  // POR QUÉ ELEGIR PÁRRAGA
  // --------------------------------------------------------------------
  whyUs: [
    { title: "Atención personalizada", text: "Cada alumno avanza a su propio ritmo, con seguimiento individual." },
    { title: "Formación clara y práctica", text: "Contenidos explicados de forma sencilla, sin tecnicismos innecesarios." },
    { title: "Acompañamiento durante el proceso", text: "Apoyo en cada etapa, desde la teoría hasta el examen práctico." },
    { title: "Atención cercana", text: "Trato directo y cercano, típico de una autoescuela de barrio." },
  ],

  // --------------------------------------------------------------------
  // PROCESO
  // --------------------------------------------------------------------
  process: [
    { step: "1", title: "Infórmate", text: "Contacta con nosotros y cuéntanos qué permiso te interesa." },
    { step: "2", title: "Prepárate", text: "Estudia la teoría con material y apoyo adaptado a ti." },
    { step: "3", title: "Practica", text: "Coge experiencia real al volante con clases prácticas." },
    { step: "4", title: "Consigue tu permiso", text: "Preséntate al examen con la preparación necesaria." },
  ],

  // --------------------------------------------------------------------
  // CTA FINAL
  // --------------------------------------------------------------------
  ctaFinal: {
    title: "¿Preparado para empezar?",
    text: "Cuéntanos qué permiso quieres conseguir y te informamos sobre el proceso.",
  },

  // --------------------------------------------------------------------
  // PREGUNTAS FRECUENTES — sin precios, horarios ni condiciones inventadas
  // --------------------------------------------------------------------
  faq: [
    {
      q: "¿Qué permiso puedo obtener?",
      a: "Trabajamos distintos tipos de permiso de conducir. Cuéntanos qué te interesa y te confirmamos la disponibilidad y los requisitos concretos.",
    },
    {
      q: "¿Cómo puedo solicitar información?",
      a: "Puedes escribirnos por WhatsApp, llamarnos por teléfono o dejarnos tus datos en el formulario de contacto. Te responderemos con toda la información que necesites.",
    },
    {
      q: "¿Cómo funcionan las clases prácticas?",
      a: "Las clases prácticas se organizan de forma personalizada según tu disponibilidad y tu ritmo de aprendizaje. Consulta con Párraga los detalles concretos de organización.",
    },
    {
      q: "¿Cuánto cuesta sacarse el carnet?",
      a: "Consulta directamente con Párraga para conocer las condiciones y precios actuales.",
    },
    {
      q: "¿Cómo puedo contactar con la autoescuela?",
      a: "Puedes llamar, escribir por WhatsApp o consultar la ubicación en el apartado de contacto de esta misma página.",
    },
  ],

  // --------------------------------------------------------------------
  // REDES SOCIALES — deja vacío "" el enlace que no exista, no se mostrará
  // --------------------------------------------------------------------
  socialLinks: {
    instagram: "",
    facebook: "",
  },

  // --------------------------------------------------------------------
  // DATOS FISCALES PARA AVISO LEGAL / PRIVACIDAD (placeholders)
  // --------------------------------------------------------------------
  legal: {
    fiscalName: "Párraga Autoescuela — PENDIENTE DE CONFIRMAR",
    nif: "PENDIENTE DE CONFIRMAR",
  },
};
