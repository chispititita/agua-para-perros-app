/* ============================================================================
   MAIN.JS — Motor de la plantilla. Lee CONFIG (config.js) y construye la web.
   No hace falta editar este archivo para personalizar el contenido.
   ============================================================================ */

(function () {
  "use strict";

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

  // Set de iconos genéricos (no específicos de ninguna autoescuela real)
  const ICONS = {
    target: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 16a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
    book: '<path d="M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M20 4h-1v13h1z"/>',
    car: '<path d="M5 11 6.5 6h11L19 11zM4 12h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1v1a1 1 0 0 1-2 0v-1H7v1a1 1 0 0 1-2 0v-1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zm2.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',
    heart: '<path d="M12 21s-7.5-4.6-10-9.1C.4 8.6 2 5 5.6 5 8 5 9.6 6.5 12 9c2.4-2.5 4-4 6.4-4C22 5 23.6 8.6 22 11.9 19.5 16.4 12 21 12 21z"/>',
    license: '<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm2 3v2h6V8zm0 4v2h10v-2z"/>',
    check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  };
  function iconSvg(name) {
    return `<svg viewBox="0 0 24 24" class="icon">${ICONS[name] || ICONS.check}</svg>`;
  }

  function aplicarEstilos(c) {
    const root = document.documentElement.style;
    if (c.primaryColor) root.setProperty("--color-primary", c.primaryColor);
    if (c.secondaryColor) root.setProperty("--color-secondary", c.secondaryColor);
    if (c.accentColor) root.setProperty("--color-accent", c.accentColor);
    if (c.fontHeadings) root.setProperty("--font-headings", c.fontHeadings);
    if (c.fontBody) root.setProperty("--font-body", c.fontBody);
  }

  function pintarCabecera(c) {
    const wa = whatsappUrl(c.whatsapp, c.whatsappMessage);
    $("#header-whatsapp").href = wa;
    $("#mobile-whatsapp").href = wa;
    $("#hero-whatsapp").href = wa;
    $("#cta-final-whatsapp").href = wa;
  }

  function pintarTrust(c) {
    $("#trust-grid").innerHTML = (c.trustCards || [])
      .map(
        (t) => `
      <div class="trust-card reveal">
        <div class="trust-card__icon">${iconSvg(t.icon)}</div>
        <h3>${t.title}</h3>
        <p>${t.text}</p>
      </div>`
      )
      .join("");
  }

  function pintarPermits(c) {
    $("#permits-grid").innerHTML = (c.permits || [])
      .map(
        (p) => `
      <div class="permit-card reveal">
        <div class="permit-card__icon">${iconSvg(p.icon)}</div>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <a href="#contacto" class="btn btn--ghost">Más información</a>
      </div>`
      )
      .join("");
  }

  function pintarWhyUs(c) {
    $("#why-list").innerHTML = (c.whyUs || [])
      .map(
        (item) => `
      <div class="why-item">
        <span class="why-item__check">${iconSvg("check")}</span>
        <div>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </div>
      </div>`
      )
      .join("");
  }

  function pintarProceso(c) {
    $("#process-grid").innerHTML = (c.process || [])
      .map(
        (p) => `
      <div class="process-step reveal">
        <div class="process-step__number">${p.step}</div>
        <h3>${p.title}</h3>
        <p>${p.text}</p>
      </div>`
      )
      .join("");
  }

  function pintarCtaFinal(c) {
    $("#cta-final-title").textContent = c.ctaFinal?.title || "";
    $("#cta-final-text").textContent = c.ctaFinal?.text || "";
  }

  function pintarFaq(c) {
    $("#faq-list").innerHTML = (c.faq || [])
      .map(
        (item, i) => `
      <details class="faq-item reveal" ${i === 0 ? "open" : ""}>
        <summary>${item.q}</summary>
        <p>${item.a}</p>
      </details>`
      )
      .join("");
  }

  function pintarContacto(c) {
    $("#contact-city").textContent = c.city || "";
    $("#contact-phone-text").textContent = c.phoneDisplay || c.phone || "";
    $("#contact-whatsapp-text").textContent = c.whatsappDisplay || c.whatsapp || "";
    $("#contact-email").textContent = c.email || "";

    $("#hours-list").innerHTML = (c.openingHours || [])
      .map((h) => `<div class="hours__row"><span>${h.day}</span><span>${h.hours}</span></div>`)
      .join("");

    const tel = telUrl(c.phone);
    const wa = whatsappUrl(c.whatsapp, c.whatsappMessage);
    const directions = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(c.mapsQuery || c.city || "");
    const mapSrc = "https://www.google.com/maps?q=" + encodeURIComponent(c.mapsQuery || c.city || "") + "&output=embed";

    $("#contact-call").href = tel;
    $("#contact-whatsapp").href = wa;
    $("#contact-directions").href = directions;
    $("#map-frame").src = mapSrc;

    $("#mobile-bar-call").href = tel;
    $("#mobile-bar-whatsapp").href = wa;
  }

  function pintarFooter(c) {
    $("#footer-city").textContent = c.city || "";
    const year = new Date().getFullYear();
    $("#footer-copy").textContent = `© ${year} ${c.businessName || ""} ${c.businessType || ""}.`;
  }

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

    const secciones = $all("section[id]");
    const navLinks = $all(".nav a");
    if ("IntersectionObserver" in window) {
      const navObserver = new IntersectionObserver(
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
      secciones.forEach((s) => navObserver.observe(s));
    }

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

    const backToTop = $("#back-to-top");
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("is-visible", window.scrollY > 500);
    });
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function init() {
    if (typeof CONFIG === "undefined") {
      console.error("No se ha encontrado CONFIG. Revisa que js/config.js se cargue antes que js/main.js.");
      return;
    }
    aplicarEstilos(CONFIG);
    pintarCabecera(CONFIG);
    pintarTrust(CONFIG);
    pintarPermits(CONFIG);
    pintarWhyUs(CONFIG);
    pintarProceso(CONFIG);
    pintarCtaFinal(CONFIG);
    pintarFaq(CONFIG);
    pintarContacto(CONFIG);
    pintarFooter(CONFIG);
    inicializarInteraccion();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
