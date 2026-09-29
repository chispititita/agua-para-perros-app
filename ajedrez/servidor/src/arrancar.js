import { CONFIG } from "./config.js";
import { crearServidor } from "./index.js";

const { servidor } = crearServidor();
servidor.listen(CONFIG.puerto, () => console.log(`Jaque Arena escuchando en el puerto ${CONFIG.puerto}`));
