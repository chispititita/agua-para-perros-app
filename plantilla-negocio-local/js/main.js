/* ============================================================================
   MAIN.JS — Motor de la plantilla.
   Lee el objeto CONFIG (definido en config.js) y construye toda la web.
   No necesitas editar este archivo para personalizar tu web: todo el
   contenido se controla desde config.js.
   ============================================================================ */

(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $all = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function whatsappUrl(numero, mensaje) {
    const limpio = String(numero || "").replace(/[^\d]/g, "");
    const texto = encodeURIComponent(mensaje || "");
    return `https://wa.me/${limpio}${texto ? "?text=" + texto : ""}`;
  }

  function telUrl(telefono) {
    return `tel:${String(telefono || "").replace(/\s+/g, "")}`;
  }

  // Set de iconos genéricos en SVG, válidos para cualquier tipo de negocio
  const ICONS = {
    star: '<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.6z"/>',
    scissors: '<path d="M9.6 12 3 5.4 4.4 4l7.6 7.6L14.6 9A3 3 0 1 1 16 10.4l-2.6 2.6L16 15.6A3 3 0 1 1 14.6 17l-3-3-7.2 7.2L3 19.8 9.6 13.2 12 15.6 9.6 12zM19 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM19 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>',
    tool: '<path d="M21.7 17.3 14.4 10a5 5 0 0 0-6.1-6.1L11 6.6 9.6 8 6.6 5A5 5 0 0 0 10 14.4l7.3 7.3a1 1 0 0 0 1.4 0l3-3a1 1 0 0 0 0-1.4z"/>',
    heart: '<path d="M12 21s-7.5-4.6-10-9.1C.4 8.6 2 5 5.6 5 8 5 9.6 6.5 12 9c2.4-2.5 4-4 6.4-4C22 5 23.6 8.6 22 11.9 19.5 16.4 12 21 12 21z"/>',
    food: '<path d="M6 2v8a3 3 0 0 0 2 2.8V22h2v-9.2A3 3 0 0 0 12 10V2h-2v6H9V2H7v6H6V2zm12 0c-2.2 0-4 2.6-4 6 0 2.8 1.3 5 3 5.8V22h2V13.8c1.7-.8 3-3 3-5.8 0-3.4-1.8-6-4-6z"/>',
    clock: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.6 4.2 2.5-.7 1.2L11 13V6h2v6.6z"/>',
    sparkle: '<path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>',
    calendar: '<path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm12 8v10H5V10z"/>',
  };
  function iconSvg(name) {
    return `<svg viewBox="0 0 24 24" class="icon">${ICONS[name] || ICONS.star}</svg>`;
  }
  function starsHtml(n) {
    const total = Math.max(0, Math.min(5, Number(n) || 5));
    return "★★★★★☆☆☆☆☆".slice(5 - total, 10 - total);
  }

  // ------------------------------------------------------------------
  // 1. Aplicar colores y fuentes como variables CSS
  // ------------------------------------------------------------------
  function aplicarEstilos(c) {
    const root = document.documentElement.style;
    const colores = c.colores || {};
    const map = {
      primario: "--color-primario",
      secundario: "--color-secundario",
      acento: "--color-acento",
      texto: "--color-texto",
      textoSuave: "--color-texto-suave",
      fondo: "--color-fondo",
      fondoAlt: "--color-fondo-alt",
      borde: "--color-borde",
    };
    Object.keys(map).forEach((k) => {
      if (colores[k]) root.setProperty(map[k], colores[k]);
    });
    if (c.fuentes && c.fuentes.titulos) root.setProperty("--fuente-titulos", c.fuentes.titulos);
    if (c.fuentes && c.fuentes.texto) root.setProperty("--fuente-texto", c.fuentes.texto);
  }

  // ------------------------------------------------------------------
  // 2. Metadatos de la página (título, descripción, favicon)
  // ------------------------------------------------------------------
  function aplicarMeta(c) {
    if (c.negocio?.tituloPagina) document.title = c.negocio.tituloPagina;
    if (c.negocio?.descripcionMeta) {
      let meta = $('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = c.negocio.descripcionMeta;
    }
  }

  // ------------------------------------------------------------------
  // 3. Cabecera / marca / navegación
  // ------------------------------------------------------------------
  function pintarCabecera(c) {
    $("#brand-name").textContent = c.negocio?.nombre || "";
    $("#brand-logo").src = c.imagenes?.logo || "";
    $("#brand-logo").alt = c.negocio?.nombre || "Logo";
    $("#footer-logo").src = c.imagenes?.logo || "";

    const tel = c.contacto?.telefono;
    const telVisible = c.contacto?.telefonoVisible || tel;
    const wa = whatsappUrl(c.contacto?.whatsapp, c.contacto?.whatsappMensaje);

    $("#header-phone").href = telUrl(tel);
    $("#header-phone-text").textContent = telVisible;
    $("#header-whatsapp").href = wa;
    $("#mobile-whatsapp").href = wa;
    $("#float-whatsapp").href = wa;
    $("#cta-final-whatsapp").href = wa;

    if (c.avisoSuperior) {
      $("#topbar").classList.add("is-visible");
      $("#topbar-text").textContent = c.avisoSuperior;
    }
  }

  // ------------------------------------------------------------------
  // 4. Hero
  // ------------------------------------------------------------------
  function pintarHero(c) {
    const h = c.hero || {};
    $("#hero-image").src = c.imagenes?.hero || "";
    $("#hero-eyebrow").textContent = h.eyebrow || "";
    $("#hero-title").textContent = h.titulo || "";
    $("#hero-subtitle").textContent = h.subtitulo || "";

    const wa = whatsappUrl(c.contacto?.whatsapp, c.contacto?.whatsappMensaje);
    const ctaP = $("#hero-cta-primary");
    ctaP.href = wa;
    ctaP.target = "_blank";
    ctaP.rel = "noopener";
    ctaP.textContent = h.ctaPrimarioTexto || "Contactar";

    const ctaS = $("#hero-cta-secondary");
    ctaS.href = telUrl(c.contacto?.telefono);
    ctaS.textContent = h.ctaSecundarioTexto || "Llamar";

    $("#hero-rating").textContent = h.valoracion || "";
  }

  // ------------------------------------------------------------------
  // 5. Estadísticas
  // ------------------------------------------------------------------
  function pintarStats(c) {
    const cont = $("#stats-grid");
    cont.innerHTML = (c.estadisticas || [])
      .map(
        (s) => `
      <div class="stat">
        <div class="stat__number">${s.numero}</div>
        <div class="stat__label">${s.texto}</div>
      </div>`
      )
      .join("");
  }

  // ------------------------------------------------------------------
  // 6. Servicios
  // ------------------------------------------------------------------
  function pintarServicios(c) {
    const s = c.servicios || {};
    $("#services-eyebrow").textContent = s.eyebrow || "";
    $("#services-title").textContent = s.titulo || "";
    $("#services-subtitle").textContent = s.subtitulo || "";

    $("#services-grid").innerHTML = (s.lista || [])
      .map(
        (item) => `
      <div class="service-card">
        <div class="service-card__icon">${iconSvg(item.icono)}</div>
        <h3>${item.nombre}</h3>
        <p>${item.descripcion}</p>
        <div class="service-card__footer">
          <span class="service-card__price">${item.precio}</span>
        </div>
      </div>`
      )
      .join("");
  }

  // ------------------------------------------------------------------
  // 7. Sobre nosotros
  // ------------------------------------------------------------------
  function pintarSobreNosotros(c) {
    const a = c.sobreNosotros || {};
    $("#about-image").src = c.imagenes?.sobreNosotros || "";
    $("#about-eyebrow").textContent = a.eyebrow || "";
    $("#about-title").textContent = a.titulo || "";
    $("#about-text").textContent = a.texto || "";
    $("#about-points").innerHTML = (a.puntos || []).map((p) => `<li>${p}</li>`).join("");

    const ctaBtn = $("#about-cta");
    const ig = c.redesSociales?.instagram;
    if (a.ctaTexto && ig) {
      ctaBtn.textContent = a.ctaTexto;
      ctaBtn.href = ig;
      ctaBtn.target = "_blank";
      ctaBtn.rel = "noopener";
    } else {
      ctaBtn.style.display = "none";
    }
  }

  // ------------------------------------------------------------------
  // 8. Galería
  // ------------------------------------------------------------------
  function pintarGaleria(c) {
    const g = c.galeria || {};
    $("#gallery-eyebrow").textContent = g.eyebrow || "";
    $("#gallery-title").textContent = g.titulo || "";

    const imgs = c.imagenes?.galeria || [];
    $("#gallery-grid").innerHTML = imgs
      .map(
        (src, i) => `
      <div class="gallery__item" data-src="${src}" role="button" tabindex="0" aria-label="Ampliar imagen ${i + 1}">
        <img src="${src}" alt="Foto de trabajo ${i + 1}" loading="lazy">
      </div>`
      )
      .join("");

    const lightbox = $("#lightbox");
    const lightboxImg = $("#lightbox-image");

    function abrir(src) {
      lightboxImg.src = src;
      lightbox.classList.add("is-open");
    }
    function cerrar() {
      lightbox.classList.remove("is-open");
    }

    $all(".gallery__item").forEach((el) => {
      el.addEventListener("click", () => abrir(el.dataset.src));
      el.addEventListener("keypress", (e) => {
        if (e.key === "Enter") abrir(el.dataset.src);
      });
    });
    $("#lightbox-close").addEventListener("click", cerrar);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) cerrar();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cerrar();
    });
  }

  // ------------------------------------------------------------------
  // 9. Testimonios
  // ------------------------------------------------------------------
  function pintarTestimonios(c) {
    const t = c.testimonios || {};
    $("#testimonials-eyebrow").textContent = t.eyebrow || "";
    $("#testimonials-title").textContent = t.titulo || "";

    $("#testimonials-track").innerHTML = (t.lista || [])
      .map(
        (item) => `
      <div class="testimonial-card">
        <div class="testimonial-card__stars">${starsHtml(item.valoracion)}</div>
        <p>&ldquo;${item.texto}&rdquo;</p>
        <div class="testimonial-card__author">${item.nombre}</div>
      </div>`
      )
      .join("");
  }

  // ------------------------------------------------------------------
  // 10. CTA final
  // ------------------------------------------------------------------
  function pintarCtaFinal(c) {
    const cta = c.ctaFinal || {};
    $("#cta-final-title").textContent = cta.titulo || "";
    $("#cta-final-subtitle").textContent = cta.subtitulo || "";
    $("#cta-final-phone").href = telUrl(c.contacto?.telefono);
    $("#cta-final-phone").textContent = "Llamar: " + (c.contacto?.telefonoVisible || "");
  }

  // ------------------------------------------------------------------
  // 11. Contacto / horario / mapa / redes
  // ------------------------------------------------------------------
  function pintarContacto(c) {
    $("#contact-address").textContent = c.contacto?.direccion || "";
    $("#contact-phone").textContent = c.contacto?.telefonoVisible || "";
    $("#contact-phone").href = telUrl(c.contacto?.telefono);
    $("#contact-email").textContent = c.contacto?.email || "";
    $("#contact-email").href = "mailto:" + (c.contacto?.email || "");
    $("#map-frame").src = c.contacto?.mapaEmbedUrl || "";

    $("#hours-list").innerHTML = (c.horario || [])
      .map((h) => `<div class="hours__row"><span>${h.dia}</span><span>${h.horas}</span></div>`)
      .join("");

    const redes = c.redesSociales || {};
    const iconosRedes = {
      instagram:
        '<svg viewBox="0 0 24 24" class="icon"><path d="M12 2c2.7 0 3 0 4.1.1 1.1 0 1.8.2 2.5.5.7.3 1.2.6 1.8 1.2.6.6.9 1.1 1.2 1.8.3.7.5 1.4.5 2.5.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1.1-.2 1.8-.5 2.5-.3.7-.6 1.2-1.2 1.8-.6.6-1.1.9-1.8 1.2-.7.3-1.4.5-2.5.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1.1 0-1.8-.2-2.5-.5-.7-.3-1.2-.6-1.8-1.2-.6-.6-.9-1.1-1.2-1.8-.3-.7-.5-1.4-.5-2.5C2 15 2 14.7 2 12s0-3 .1-4.1c0-1.1.2-1.8.5-2.5.3-.7.6-1.2 1.2-1.8.6-.6 1.1-.9 1.8-1.2.7-.3 1.4-.5 2.5-.5C9 2 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z"/></svg>',
      facebook:
        '<svg viewBox="0 0 24 24" class="icon"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.2-1.5 1.6-1.5h1.6V3.7c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.2H7.3V13H10v8z"/></svg>',
      tiktok:
        '<svg viewBox="0 0 24 24" class="icon"><path d="M14 3c.4 2 1.8 3.6 4 4v2.6c-1.4 0-2.8-.4-4-1.2v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .5 0 .8.1v2.7a3 3 0 1 0 2.1 2.8V3z"/></svg>',
      google:
        '<svg viewBox="0 0 24 24" class="icon"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2A10 10 0 0 0 3.1 7.4l3.3 2.6C7.2 7.6 9.4 5.8 12 5.8z"/></svg>',
    };
    const links = Object.keys(iconosRedes)
      .filter((key) => redes[key])
      .map((key) => `<a href="${redes[key]}" target="_blank" rel="noopener" aria-label="${key}">${iconosRedes[key]}</a>`)
      .join("");
    $("#socials").innerHTML = links;
    $("#footer-socials").innerHTML = links;
  }

  // ------------------------------------------------------------------
  // 12. Footer
  // ------------------------------------------------------------------
  function pintarFooter(c) {
    $("#footer-name").textContent = c.negocio?.nombre || "";
    $("#footer-tagline").textContent = c.negocio?.eslogan || "";
    const year = new Date().getFullYear();
    $("#footer-copy").textContent = `© ${year} ${c.negocio?.nombre || ""}. Todos los derechos reservados.`;
  }

  // ------------------------------------------------------------------
  // 13. Interactividad: menú móvil, scroll, reveal, back-to-top
  // ------------------------------------------------------------------
  function inicializarInteraccion() {
    const hamburger = $("#hamburger");
    const mobileNav = $("#mobile-nav");
    hamburger.addEventListener("click", () => {
      const abierto = mobileNav.classList.toggle("is-open");
      hamburger.setAttribute("aria-expanded", String(abierto));
    });
    $all("#mobile-nav a").forEach((a) =>
      a.addEventListener("click", () => {
        mobileNav.classList.remove("is-open");
        hamburger.setAttribute("aria-expanded", "false");
      })
    );

    // Resaltar enlace activo del menú según la sección visible
    const secciones = $all("section[id]");
    const navLinks = $all(".nav a");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((l) => l.classList.remove("is-active"));
            const activo = navLinks.find((l) => l.getAttribute("href") === "#" + entry.target.id);
            if (activo) activo.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    secciones.forEach((s) => observer.observe(s));

    // Animación de aparición al hacer scroll (con red de seguridad:
    // si por lo que sea el navegador no dispara el observer a tiempo,
    // el contenido se muestra igualmente pasado un momento).
    const revealEls = $all(".reveal");
    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      revealEls.forEach((el) => revealObserver.observe(el));
      setTimeout(() => revealEls.forEach((el) => el.classList.add("is-visible")), 2500);
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    // Botón volver arriba
    const backToTop = $("#back-to-top");
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("is-visible", window.scrollY > 500);
    });
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // ------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------
  function init() {
    if (typeof CONFIG === "undefined") {
      console.error("No se ha encontrado CONFIG. Revisa que js/config.js se cargue antes que js/main.js.");
      return;
    }
    aplicarEstilos(CONFIG);
    aplicarMeta(CONFIG);
    pintarCabecera(CONFIG);
    pintarHero(CONFIG);
    pintarStats(CONFIG);
    pintarServicios(CONFIG);
    pintarSobreNosotros(CONFIG);
    pintarGaleria(CONFIG);
    pintarTestimonios(CONFIG);
    pintarCtaFinal(CONFIG);
    pintarContacto(CONFIG);
    pintarFooter(CONFIG);
    inicializarInteraccion();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
