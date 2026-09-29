// Ajustes del negocio. Se pueden cambiar con variables de entorno sin tocar código.
const num = (nombre, defecto) => (process.env[nombre] ? Number(process.env[nombre]) : defecto);

export const CONFIG = {
  puerto: num("PORT", 3000),
  carpetaDatos: process.env.DATA_DIR || "./datos",
  // Parte del bote que se queda la casa (0.10 = 10 %).
  comision: num("COMISION", 0.1),
  monedasIniciales: num("MONEDAS_INICIALES", 1000),
  bonusDiario: num("BONUS_DIARIO", 200),
  // Mesas disponibles: cuántas monedas pone cada jugador.
  mesas: (process.env.MESAS || "50,100,500,1000,5000").split(",").map(Number),
  // Reloj de cada jugador: minutos + segundos de incremento por jugada.
  minutosPorJugador: num("MINUTOS", 5),
  incrementoSegundos: num("INCREMENTO", 3),
  // Tiempo para volver si se corta la conexión antes de perder la partida.
  graciaDesconexionSeg: num("GRACIA_DESCONEXION", 30),
  // Clave para ver el resumen de ganancias (/api/admin/resumen). Pon una larga y secreta.
  claveAdmin: process.env.ADMIN_KEY || "",
  // Compras de monedas con Google Play.
  paqueteAndroid: process.env.ANDROID_PACKAGE || "com.jaquearena.app",
  cuentaServicioGoogle: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
  paquetesMonedas: {
    monedas_1000: 1000,
    monedas_5500: 5500,
    monedas_12000: 12000,
    monedas_30000: 30000,
  },
};
