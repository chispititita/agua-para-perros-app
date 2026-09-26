/* ============================================================================
   MAIN.JS — Interactividad de la demo de Restaurante Badila.
   Menú móvil, aparición al hacer scroll (con red de seguridad), lightbox
   de galería, resaltado de sección activa y botón de volver arriba.
   ============================================================================ */

(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $all = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function initMobileNav() {
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
  }

  function initActiveNav() {
    const secciones = $all("section[id]");
    const navLinks = $all(".nav a");
    if (!("IntersectionObserver" in window)) return;
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
  }

  function initReveal() {
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
      // Red de seguridad: si por lo que sea el observer no dispara a tiempo,
      // el contenido se muestra igualmente pasado un momento.
      setTimeout(() => revealEls.forEach((el) => el.classList.add("is-visible")), 2500);
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }
  }

  function initGallery() {
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

  function initBackToTop() {
    const backToTop = $("#back-to-top");
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("is-visible", window.scrollY > 500);
    });
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function initFooterYear() {
    const el = $("#footer-copy");
    if (el) el.textContent = `© ${new Date().getFullYear()} Restaurante Badila. Todos los derechos reservados.`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMobileNav();
    initActiveNav();
    initReveal();
    initGallery();
    initBackToTop();
    initFooterYear();
  });
})();
