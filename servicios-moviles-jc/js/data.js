/* ==========================================================
   Servicios Móviles JC — Base de datos de móviles
   Precios de lanzamiento orientativos en España (EUR, IVA incl.)
   Puntuaciones s: perf (rendimiento), cam (cámara), scr (pantalla),
   bat (autonomía) en escala 0-100.
   ========================================================== */
const PHONES = [
  {
    id: "iphone-17-pro-max", brand: "Apple", name: "iPhone 17 Pro Max", year: 2025, os: "iOS",
    price: 1469, size: 6.9, panel: "OLED LTPO Super Retina XDR", hz: 120, res: "2868 × 1320",
    chip: "Apple A19 Pro", ram: [12], sto: [256, 512, 1024, 2048], bat: 4832, chg: 40, wchg: 25,
    mainMP: 48, cams: "48 MP principal + 48 MP ultra gran angular + 48 MP teleobjetivo 4x",
    front: 18, weight: 231, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 99, cam: 97, scr: 96, bat: 97 },
    pros: ["Autonomía excelente, de las mejores del mercado", "Vídeo de referencia (ProRes, Log, 4K120)", "Teleobjetivo 4x de 48 MP muy versátil", "Chasis de aluminio con cámara de vapor: menos calentamiento"],
    cons: ["Precio muy alto", "Pesado (231 g)", "Carga rápida por debajo de rivales Android"],
    color: "#c96a2b", tags: ["Gama alta", "Fotografía", "Vídeo"]
  },
  {
    id: "iphone-17-pro", brand: "Apple", name: "iPhone 17 Pro", year: 2025, os: "iOS",
    price: 1319, size: 6.3, panel: "OLED LTPO Super Retina XDR", hz: 120, res: "2622 × 1206",
    chip: "Apple A19 Pro", ram: [12], sto: [256, 512, 1024], bat: 3998, chg: 40, wchg: 25,
    mainMP: 48, cams: "48 MP principal + 48 MP ultra gran angular + 48 MP teleobjetivo 4x",
    front: 18, weight: 206, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 99, cam: 96, scr: 95, bat: 88 },
    pros: ["Todo lo del Pro Max en formato manejable", "Rendimiento tope de gama", "Sistema de cámaras triple de 48 MP"],
    cons: ["Caro", "Batería menor que el Pro Max", "Solo 256 GB de base con precio elevado"],
    color: "#3d5a80", tags: ["Gama alta", "Compacto", "Fotografía"]
  },
  {
    id: "iphone-air", brand: "Apple", name: "iPhone Air", year: 2025, os: "iOS",
    price: 1219, size: 6.5, panel: "OLED LTPO Super Retina XDR", hz: 120, res: "2736 × 1260",
    chip: "Apple A19 Pro", ram: [12], sto: [256, 512, 1024], bat: 3149, chg: 40, wchg: 20,
    mainMP: 48, cams: "48 MP principal (una sola cámara)",
    front: 18, weight: 165, ip: "IP68", esim: "Solo eSIM", upd: 6, fold: false,
    s: { perf: 96, cam: 84, scr: 95, bat: 78 },
    pros: ["Extremadamente fino (5,6 mm) y ligero", "Diseño en titanio muy premium", "Pantalla grande de 120 Hz"],
    cons: ["Una sola cámara trasera", "Autonomía justa", "Solo eSIM", "Altavoz mono"],
    color: "#9fb7c9", tags: ["Gama alta", "Ligero", "Diseño"]
  },
  {
    id: "iphone-17", brand: "Apple", name: "iPhone 17", year: 2025, os: "iOS",
    price: 959, size: 6.3, panel: "OLED LTPO Super Retina XDR", hz: 120, res: "2622 × 1206",
    chip: "Apple A19", ram: [8], sto: [256, 512], bat: 3692, chg: 40, wchg: 25,
    mainMP: 48, cams: "48 MP principal + 48 MP ultra gran angular",
    front: 18, weight: 177, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 92, cam: 88, scr: 93, bat: 86 },
    pros: ["Por fin 120 Hz ProMotion y Always-On", "256 GB de base", "Gran equilibrio calidad/precio en Apple", "Nueva cámara frontal Center Stage"],
    cons: ["Sin teleobjetivo", "Carga más lenta que la competencia Android"],
    color: "#8fa98c", tags: ["Gama media-alta", "Equilibrado"]
  },
  {
    id: "iphone-16e", brand: "Apple", name: "iPhone 16e", year: 2025, os: "iOS",
    price: 709, size: 6.1, panel: "OLED Super Retina XDR", hz: 60, res: "2532 × 1170",
    chip: "Apple A18", ram: [8], sto: [128, 256, 512], bat: 4005, chg: 20, wchg: 7.5,
    mainMP: 48, cams: "48 MP principal (una sola cámara)",
    front: 12, weight: 167, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 88, cam: 78, scr: 78, bat: 88 },
    pros: ["El iPhone más asequible", "Muy buena autonomía", "Compatible con Apple Intelligence"],
    cons: ["Pantalla de 60 Hz", "Sin MagSafe", "Notch clásico en lugar de Dynamic Island", "Una sola cámara"],
    color: "#e8e8e8", tags: ["Gama media", "Entrada iPhone"]
  },
  {
    id: "galaxy-s25-ultra", brand: "Samsung", name: "Galaxy S25 Ultra", year: 2025, os: "Android",
    price: 1459, size: 6.9, panel: "Dynamic AMOLED 2X LTPO", hz: 120, res: "3120 × 1440",
    chip: "Snapdragon 8 Elite for Galaxy", ram: [12], sto: [256, 512, 1024], bat: 5000, chg: 45, wchg: 15,
    mainMP: 200, cams: "200 MP principal + 50 MP ultra gran angular + 10 MP tele 3x + 50 MP periscopio 5x",
    front: 12, weight: 218, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 7, fold: false,
    s: { perf: 97, cam: 95, scr: 98, bat: 92 },
    pros: ["Pantalla antirreflejos espectacular", "Zoom 5x y 10x de gran calidad", "S Pen incluido", "7 años de actualizaciones"],
    cons: ["Muy caro", "Grande y pesado", "Carga de 45 W sin grandes cambios"],
    color: "#4a4e5a", tags: ["Gama alta", "Productividad", "Zoom"]
  },
  {
    id: "galaxy-s25", brand: "Samsung", name: "Galaxy S25", year: 2025, os: "Android",
    price: 909, size: 6.2, panel: "Dynamic AMOLED 2X", hz: 120, res: "2340 × 1080",
    chip: "Snapdragon 8 Elite for Galaxy", ram: [12], sto: [128, 256, 512], bat: 4000, chg: 25, wchg: 15,
    mainMP: 50, cams: "50 MP principal + 12 MP ultra gran angular + 10 MP tele 3x",
    front: 12, weight: 162, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 7, fold: false,
    s: { perf: 96, cam: 86, scr: 91, bat: 80 },
    pros: ["Compacto y ligero con potencia tope", "Teleobjetivo 3x", "7 años de actualizaciones"],
    cons: ["Batería justa para usuarios intensos", "Carga lenta (25 W)"],
    color: "#7aa2c9", tags: ["Gama alta", "Compacto"]
  },
  {
    id: "galaxy-s25-edge", brand: "Samsung", name: "Galaxy S25 Edge", year: 2025, os: "Android",
    price: 1259, size: 6.7, panel: "Dynamic AMOLED 2X", hz: 120, res: "3120 × 1440",
    chip: "Snapdragon 8 Elite for Galaxy", ram: [12], sto: [256, 512], bat: 3900, chg: 25, wchg: 15,
    mainMP: 200, cams: "200 MP principal + 12 MP ultra gran angular",
    front: 12, weight: 163, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 7, fold: false,
    s: { perf: 95, cam: 85, scr: 95, bat: 74 },
    pros: ["Solo 5,8 mm de grosor", "Muy ligero para su tamaño", "Pantalla QHD+ de gran calidad"],
    cons: ["Sin teleobjetivo", "Autonomía discreta", "Precio elevado"],
    color: "#b8c4ce", tags: ["Gama alta", "Ligero", "Diseño"]
  },
  {
    id: "galaxy-z-fold7", brand: "Samsung", name: "Galaxy Z Fold7", year: 2025, os: "Android",
    price: 2099, size: 8.0, panel: "Dynamic AMOLED 2X plegable (exterior 6,5\")", hz: 120, res: "2184 × 1968",
    chip: "Snapdragon 8 Elite for Galaxy", ram: [12, 16], sto: [256, 512, 1024], bat: 4400, chg: 25, wchg: 15,
    mainMP: 200, cams: "200 MP principal + 12 MP ultra gran angular + 10 MP tele 3x",
    front: 10, weight: 215, ip: "IP48", esim: "Sí (SIM + eSIM)", upd: 7, fold: true,
    s: { perf: 96, cam: 90, scr: 95, bat: 80 },
    pros: ["Plegable libro más fino y ligero de Samsung", "Pantalla interior de 8\" ideal para productividad", "Cámara de 200 MP"],
    cons: ["Precio altísimo", "Sin soporte para S Pen", "Resistencia al polvo limitada (IP48)"],
    color: "#2b3a55", tags: ["Plegable", "Productividad", "Gama alta"]
  },
  {
    id: "galaxy-z-flip7", brand: "Samsung", name: "Galaxy Z Flip7", year: 2025, os: "Android",
    price: 1219, size: 6.9, panel: "Dynamic AMOLED 2X plegable (exterior 4,1\")", hz: 120, res: "2520 × 1080",
    chip: "Samsung Exynos 2500", ram: [12], sto: [256, 512], bat: 4300, chg: 25, wchg: 15,
    mainMP: 50, cams: "50 MP principal + 12 MP ultra gran angular",
    front: 10, weight: 188, ip: "IP48", esim: "Sí (SIM + eSIM)", upd: 7, fold: true,
    s: { perf: 88, cam: 82, scr: 92, bat: 78 },
    pros: ["Pantalla exterior de borde a borde muy útil", "Diseño de concha compacto y con estilo", "Mejor batería de la saga Flip"],
    cons: ["Sin teleobjetivo", "Exynos algo menos eficiente que Snapdragon", "Pliegue visible"],
    color: "#1f6f8b", tags: ["Plegable", "Diseño", "Compacto"]
  },
  {
    id: "galaxy-a56", brand: "Samsung", name: "Galaxy A56 5G", year: 2025, os: "Android",
    price: 499, size: 6.7, panel: "Super AMOLED", hz: 120, res: "2340 × 1080",
    chip: "Samsung Exynos 1580", ram: [8, 12], sto: [128, 256], bat: 5000, chg: 45, wchg: 0,
    mainMP: 50, cams: "50 MP principal + 12 MP ultra gran angular + 5 MP macro",
    front: 12, weight: 198, ip: "IP67", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 74, cam: 74, scr: 85, bat: 88 },
    pros: ["6 años de actualizaciones", "Carga de 45 W", "Acabado en metal y cristal", "Muy buena pantalla"],
    cons: ["Sin carga inalámbrica", "Cámara macro de relleno"],
    color: "#8a8fb8", tags: ["Gama media", "Equilibrado"]
  },
  {
    id: "galaxy-a36", brand: "Samsung", name: "Galaxy A36 5G", year: 2025, os: "Android",
    price: 379, size: 6.7, panel: "Super AMOLED", hz: 120, res: "2340 × 1080",
    chip: "Snapdragon 6 Gen 3", ram: [6, 8], sto: [128, 256], bat: 5000, chg: 45, wchg: 0,
    mainMP: 50, cams: "50 MP principal + 8 MP ultra gran angular + 5 MP macro",
    front: 12, weight: 195, ip: "IP67", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 68, cam: 68, scr: 84, bat: 88 },
    pros: ["Gran pantalla AMOLED", "Resistencia IP67", "6 años de actualizaciones por menos de 400 €"],
    cons: ["Rendimiento justo en juegos exigentes", "Cámaras secundarias flojas"],
    color: "#b99cd6", tags: ["Gama media", "Calidad/precio"]
  },
  {
    id: "galaxy-a26", brand: "Samsung", name: "Galaxy A26 5G", year: 2025, os: "Android",
    price: 299, size: 6.7, panel: "Super AMOLED", hz: 120, res: "2340 × 1080",
    chip: "Samsung Exynos 1380", ram: [6, 8], sto: [128, 256], bat: 5000, chg: 25, wchg: 0,
    mainMP: 50, cams: "50 MP principal + 8 MP ultra gran angular + 2 MP macro",
    front: 13, weight: 200, ip: "IP67", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 58, cam: 62, scr: 80, bat: 86 },
    pros: ["AMOLED 120 Hz y IP67 por menos de 300 €", "6 años de actualizaciones", "Buena autonomía"],
    cons: ["Carga lenta", "Rendimiento modesto"],
    color: "#5a6b7d", tags: ["Gama de entrada", "Calidad/precio"]
  },
  {
    id: "galaxy-a16", brand: "Samsung", name: "Galaxy A16 5G", year: 2024, os: "Android",
    price: 249, size: 6.7, panel: "Super AMOLED", hz: 90, res: "2340 × 1080",
    chip: "Samsung Exynos 1330", ram: [4, 6], sto: [128, 256], bat: 5000, chg: 25, wchg: 0,
    mainMP: 50, cams: "50 MP principal + 5 MP ultra gran angular + 2 MP macro",
    front: 13, weight: 200, ip: "IP54", esim: "No", upd: 6, fold: false,
    s: { perf: 48, cam: 55, scr: 72, bat: 85 },
    pros: ["Muy barato", "6 años de actualizaciones", "Pantalla AMOLED"],
    cons: ["Rendimiento básico", "Cámaras sencillas", "Solo 90 Hz"],
    color: "#2f3b4c", tags: ["Gama de entrada", "Básico"]
  },
  {
    id: "pixel-10-pro", brand: "Google", name: "Pixel 10 Pro", year: 2025, os: "Android",
    price: 1099, size: 6.3, panel: "Super Actua LTPO OLED", hz: 120, res: "2856 × 1280",
    chip: "Google Tensor G5", ram: [16], sto: [128, 256, 512, 1024], bat: 4870, chg: 30, wchg: 15,
    mainMP: 50, cams: "50 MP principal + 48 MP ultra gran angular + 48 MP periscopio 5x",
    front: 42, weight: 207, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 7, fold: false,
    s: { perf: 88, cam: 96, scr: 95, bat: 86 },
    pros: ["Fotografía computacional de referencia", "Pro Res Zoom hasta 100x", "Carga magnética Qi2 (Pixelsnap)", "7 años de actualizaciones y funciones IA"],
    cons: ["Tensor menos potente en juegos que Snapdragon", "Carga por cable lenta"],
    color: "#6b705c", tags: ["Gama alta", "Fotografía", "IA"]
  },
  {
    id: "pixel-10", brand: "Google", name: "Pixel 10", year: 2025, os: "Android",
    price: 899, size: 6.3, panel: "Actua OLED", hz: 120, res: "2424 × 1080",
    chip: "Google Tensor G5", ram: [12], sto: [128, 256], bat: 4970, chg: 29, wchg: 15,
    mainMP: 48, cams: "48 MP principal + 13 MP ultra gran angular + 10,8 MP teleobjetivo 5x",
    front: 10.5, weight: 204, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 7, fold: false,
    s: { perf: 86, cam: 88, scr: 90, bat: 87 },
    pros: ["Primer Pixel base con teleobjetivo 5x", "Android puro con 7 años de soporte", "Qi2 magnético"],
    cons: ["Sensor principal inferior al del Pro", "Carga lenta"],
    color: "#4f6d7a", tags: ["Gama media-alta", "IA", "Equilibrado"]
  },
  {
    id: "pixel-9a", brand: "Google", name: "Pixel 9a", year: 2025, os: "Android",
    price: 549, size: 6.3, panel: "Actua pOLED", hz: 120, res: "2424 × 1080",
    chip: "Google Tensor G4", ram: [8], sto: [128, 256], bat: 5100, chg: 23, wchg: 7.5,
    mainMP: 48, cams: "48 MP principal + 13 MP ultra gran angular",
    front: 13, weight: 186, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 7, fold: false,
    s: { perf: 78, cam: 84, scr: 86, bat: 90 },
    pros: ["Cámara de gama alta a precio medio", "7 años de actualizaciones", "IP68 y carga inalámbrica", "Gran autonomía"],
    cons: ["Carga lenta", "Marcos de pantalla gruesos"],
    color: "#c2a8d8", tags: ["Gama media", "Calidad/precio", "Fotografía"]
  },
  {
    id: "xiaomi-15-ultra", brand: "Xiaomi", name: "Xiaomi 15 Ultra", year: 2025, os: "Android",
    price: 1499, size: 6.73, panel: "AMOLED LTPO", hz: 120, res: "3200 × 1440",
    chip: "Snapdragon 8 Elite", ram: [16], sto: [512, 1024], bat: 5410, chg: 90, wchg: 80,
    mainMP: 50, cams: "50 MP 1\" principal + 50 MP ultra gran angular + 50 MP tele 3x + 200 MP periscopio 4,3x (Leica)",
    front: 32, weight: 226, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 97, cam: 98, scr: 95, bat: 90 },
    pros: ["Una de las mejores cámaras del mercado (Leica)", "Sensor de 1 pulgada", "Carga de 90 W y 80 W inalámbrica"],
    cons: ["Muy caro", "Pesado y con módulo de cámara enorme", "HyperOS con algo de bloatware"],
    color: "#1b1b1b", tags: ["Gama alta", "Fotografía", "Zoom"]
  },
  {
    id: "xiaomi-15", brand: "Xiaomi", name: "Xiaomi 15", year: 2025, os: "Android",
    price: 999, size: 6.36, panel: "AMOLED LTPO", hz: 120, res: "2670 × 1200",
    chip: "Snapdragon 8 Elite", ram: [12], sto: [256, 512], bat: 5240, chg: 90, wchg: 50,
    mainMP: 50, cams: "50 MP principal + 50 MP ultra gran angular + 50 MP tele 2,6x (Leica)",
    front: 32, weight: 191, ip: "IP68", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 97, cam: 90, scr: 92, bat: 92 },
    pros: ["Compacto con batería enorme", "Tres cámaras de 50 MP", "Carga ultrarrápida"],
    cons: ["Precio alto en lanzamiento", "Software con publicidad en algunas apps"],
    color: "#5b8c85", tags: ["Gama alta", "Compacto", "Batería"]
  },
  {
    id: "redmi-note-14-pro-plus", brand: "Xiaomi", name: "Redmi Note 14 Pro+ 5G", year: 2025, os: "Android",
    price: 449, size: 6.67, panel: "AMOLED curva", hz: 120, res: "2712 × 1220",
    chip: "Snapdragon 7s Gen 3", ram: [8, 12], sto: [256, 512], bat: 5110, chg: 120, wchg: 0,
    mainMP: 200, cams: "200 MP principal + 8 MP ultra gran angular + 50 MP tele 2,5x",
    front: 20, weight: 205, ip: "IP68", esim: "No", upd: 4, fold: false,
    s: { perf: 70, cam: 76, scr: 86, bat: 90 },
    pros: ["Carga de 120 W (100% en ~20 min)", "Teleobjetivo en gama media", "IP68 y cristal Gorilla Victus 2"],
    cons: ["Menos años de actualizaciones", "Ultra gran angular flojo"],
    color: "#6f5aa8", tags: ["Gama media", "Calidad/precio", "Carga rápida"]
  },
  {
    id: "poco-f7-pro", brand: "Xiaomi", name: "POCO F7 Pro", year: 2025, os: "Android",
    price: 499, size: 6.67, panel: "AMOLED Flow 2K", hz: 120, res: "3200 × 1440",
    chip: "Snapdragon 8 Gen 3", ram: [12], sto: [256, 512], bat: 6000, chg: 90, wchg: 0,
    mainMP: 50, cams: "50 MP principal + 8 MP ultra gran angular",
    front: 20, weight: 206, ip: "IP68", esim: "No", upd: 6, fold: false,
    s: { perf: 92, cam: 72, scr: 90, bat: 94 },
    pros: ["Potencia de gama alta por 500 €", "Pantalla 2K", "Batería de 6000 mAh con 90 W", "Ideal para gaming"],
    cons: ["Sin teleobjetivo", "Sin carga inalámbrica", "Cámaras discretas para el precio"],
    color: "#c9a227", tags: ["Gaming", "Calidad/precio", "Batería"]
  },
  {
    id: "oneplus-13", brand: "OnePlus", name: "OnePlus 13", year: 2025, os: "Android",
    price: 999, size: 6.82, panel: "LTPO AMOLED 2K", hz: 120, res: "3168 × 1440",
    chip: "Snapdragon 8 Elite", ram: [12, 16], sto: [256, 512], bat: 6000, chg: 100, wchg: 50,
    mainMP: 50, cams: "50 MP principal + 50 MP ultra gran angular + 50 MP tele 3x (Hasselblad)",
    front: 32, weight: 210, ip: "IP68/IP69", esim: "Sí (SIM + eSIM)", upd: 6, fold: false,
    s: { perf: 97, cam: 90, scr: 95, bat: 97 },
    pros: ["Batería de 6000 mAh con carga de 100 W", "Pantalla 2K brillantísima", "IP68 + IP69", "Precio competitivo para su nivel"],
    cons: ["Procesado fotográfico algo irregular", "Menos presencia en tiendas físicas"],
    color: "#0f4c5c", tags: ["Gama alta", "Batería", "Carga rápida"]
  },
  {
    id: "oneplus-13r", brand: "OnePlus", name: "OnePlus 13R", year: 2025, os: "Android",
    price: 699, size: 6.78, panel: "LTPO AMOLED", hz: 120, res: "2780 × 1264",
    chip: "Snapdragon 8 Gen 3", ram: [12, 16], sto: [256, 512], bat: 6000, chg: 80, wchg: 0,
    mainMP: 50, cams: "50 MP principal + 8 MP ultra gran angular + 50 MP tele 2x",
    front: 16, weight: 206, ip: "IP65", esim: "No", upd: 6, fold: false,
    s: { perf: 91, cam: 78, scr: 91, bat: 95 },
    pros: ["Rendimiento flagship a precio medio", "Autonomía brutal", "Teleobjetivo 2x"],
    cons: ["Sin carga inalámbrica", "Solo IP65"],
    color: "#3a6ea5", tags: ["Gama media-alta", "Batería", "Gaming"]
  },
  {
    id: "nothing-phone-3a", brand: "Nothing", name: "Nothing Phone (3a)", year: 2025, os: "Android",
    price: 349, size: 6.77, panel: "AMOLED flexible", hz: 120, res: "2392 × 1084",
    chip: "Snapdragon 7s Gen 3", ram: [8, 12], sto: [128, 256], bat: 5000, chg: 50, wchg: 0,
    mainMP: 50, cams: "50 MP principal + 50 MP tele 2x + 8 MP ultra gran angular",
    front: 32, weight: 201, ip: "IP64", esim: "No", upd: 6, fold: false,
    s: { perf: 68, cam: 74, scr: 84, bat: 88 },
    pros: ["Diseño transparente único con luces Glyph", "Teleobjetivo 2x por 349 €", "Software limpio (Nothing OS)"],
    cons: ["Solo IP64", "Sin carga inalámbrica"],
    color: "#d9d9d9", tags: ["Gama media", "Diseño", "Calidad/precio"]
  },
  {
    id: "motorola-edge-60-pro", brand: "Motorola", name: "Motorola Edge 60 Pro", year: 2025, os: "Android",
    price: 599, size: 6.7, panel: "pOLED curva", hz: 120, res: "2712 × 1220",
    chip: "MediaTek Dimensity 8350 Extreme", ram: [12], sto: [512], bat: 6000, chg: 90, wchg: 15,
    mainMP: 50, cams: "50 MP principal + 50 MP ultra gran angular + 10 MP tele 3x",
    front: 50, weight: 186, ip: "IP68/IP69", esim: "Sí (SIM + eSIM)", upd: 4, fold: false,
    s: { perf: 80, cam: 78, scr: 88, bat: 93 },
    pros: ["Batería de 6000 mAh muy ligera (186 g)", "Carga inalámbrica en gama media", "Certificación militar MIL-STD-810H", "512 GB de base"],
    cons: ["Menos actualizaciones", "Pantalla curva que no gusta a todos"],
    color: "#2e6b5e", tags: ["Gama media", "Batería", "Resistente"]
  },
  {
    id: "moto-g85", brand: "Motorola", name: "moto g85 5G", year: 2024, os: "Android",
    price: 299, size: 6.67, panel: "pOLED curva", hz: 120, res: "2400 × 1080",
    chip: "Snapdragon 6s Gen 3", ram: [8, 12], sto: [256], bat: 5000, chg: 30, wchg: 0,
    mainMP: 50, cams: "50 MP principal + 8 MP ultra gran angular",
    front: 32, weight: 172, ip: "IP52", esim: "No", upd: 3, fold: false,
    s: { perf: 55, cam: 62, scr: 82, bat: 84 },
    pros: ["Muy ligero", "Pantalla pOLED 120 Hz", "256 GB por menos de 300 €"],
    cons: ["Pocas actualizaciones", "Protección IP52 limitada"],
    color: "#3b5bdb", tags: ["Gama de entrada", "Ligero"]
  },
  {
    id: "honor-magic7-pro", brand: "Honor", name: "Honor Magic7 Pro", year: 2025, os: "Android",
    price: 1299, size: 6.8, panel: "LTPO OLED", hz: 120, res: "2800 × 1280",
    chip: "Snapdragon 8 Elite", ram: [12], sto: [512], bat: 5270, chg: 100, wchg: 80,
    mainMP: 50, cams: "50 MP principal + 50 MP ultra gran angular + 200 MP periscopio 3x",
    front: 50, weight: 223, ip: "IP68/IP69", esim: "Sí (SIM + eSIM)", upd: 7, fold: false,
    s: { perf: 96, cam: 93, scr: 94, bat: 91 },
    pros: ["Teleobjetivo de 200 MP", "Carga de 100 W y 80 W inalámbrica", "7 años de actualizaciones"],
    cons: ["Pesado", "MagicOS recargado", "Precio de lanzamiento alto"],
    color: "#6d4c41", tags: ["Gama alta", "Fotografía", "Carga rápida"]
  }
];

/* Tiendas y canales de compra alternativos.
   Los enlaces llevan a la búsqueda del modelo en cada tienda. */
const STORES = [
  { id: "amazon", name: "Amazon", type: "Nuevo", note: "Envío rápido con Prime, devoluciones sencillas", url: q => `https://www.amazon.es/s?k=${q}` },
  { id: "pccomponentes", name: "PcComponentes", type: "Nuevo", note: "Especialista en tecnología, financiación disponible", url: q => `https://www.pccomponentes.com/buscar/?query=${q}` },
  { id: "mediamarkt", name: "MediaMarkt", type: "Nuevo", note: "Recogida en tienda física y financiación", url: q => `https://www.mediamarkt.es/es/search.html?query=${q}` },
  { id: "eci", name: "El Corte Inglés", type: "Nuevo", note: "Atención presencial y garantía ampliable", url: q => `https://www.elcorteingles.es/search/?s=${q}` },
  { id: "fnac", name: "Fnac", type: "Nuevo", note: "Descuentos para socios", url: q => `https://www.fnac.es/SearchResult/ResultList.aspx?Search=${q}` },
  { id: "idealo", name: "Idealo", type: "Comparador", note: "Compara el precio en decenas de tiendas", url: q => `https://www.idealo.es/resultados.html?q=${q}` },
  { id: "google", name: "Google Shopping", type: "Comparador", note: "Ofertas de múltiples vendedores", url: q => `https://www.google.com/search?tbm=shop&q=${q}` },
  { id: "backmarket", name: "Back Market", type: "Reacondicionado", note: "Reacondicionados con 1 año de garantía", url: q => `https://www.backmarket.es/es-es/search?q=${q}` },
  { id: "wallapop", name: "Wallapop", type: "Segunda mano", note: "Entre particulares: revisa bien el estado", url: q => `https://es.wallapop.com/app/search?keywords=${q}` }
];

const OFFICIAL = {
  Apple: "https://www.apple.com/es/shop/buy-iphone",
  Samsung: "https://www.samsung.com/es/smartphones/",
  Google: "https://store.google.com/es/category/phones",
  Xiaomi: "https://www.mi.com/es/",
  OnePlus: "https://www.oneplus.com/es",
  Nothing: "https://es.nothing.tech/",
  Motorola: "https://www.motorola.com/es/es/",
  Honor: "https://www.honor.com/es/"
};
