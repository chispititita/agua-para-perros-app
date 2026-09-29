# ♚ Jaque Arena: ajedrez online con apuestas de monedas virtuales

Es una app de Android donde la gente juega al ajedrez online contra otras personas y apuesta **monedas del juego**.
El ganador se lleva el bote y la casa (tú) se queda una **comisión del 10 %**. También hay un modo de entrenamiento
contra la máquina.

## Cómo ganas dinero

- **Vendes monedas** en la tienda de la app (Google Play cobra y se queda su parte: un 15 % en la mayoría de casos).
- La **comisión del 10 %** de cada partida se queda en monedas: es lo que hace que los jugadores gasten monedas y
  tengan que comprar más o esperar al bonus diario. Así se alimentan las ventas.
- Las monedas **no se pueden cambiar por dinero ni por premios**. Esto es lo que hace que la app sea legal sin
  licencia de juego y que Google la acepte. **No añadas nunca retiradas de dinero ni premios reales.**

Puedes ver cuánto llevas en comisiones, compras y jugadores en `https://TU-SERVIDOR/api/admin/resumen`
(con la clave `ADMIN_KEY`, ver paso 1).

## Qué incluye

| Parte | Carpeta | Qué hace |
|---|---|---|
| Servidor | `servidor/` | Cuentas, monedas, emparejamiento por mesas (50, 100, 500, 1.000 y 5.000 monedas), relojes de 5 min + 3 s, comprobación de todas las jugadas (no se puede hacer trampa), reparto del bote y la comisión, ELO y ranking, bonus diario, verificación de compras con Google, borrado de cuenta y política de privacidad |
| App | `app/` | Pantallas, tablero táctil, partidas online, rival de la máquina (3 niveles), tienda de monedas con Google Play Billing, ranking y perfil |
| Imágenes de la ficha | `play-store/` | Icono de 512×512 y gráfico destacado de 1024×500 |

Reglas de las partidas:
- Si alguien no hace su primera jugada en 30 s, la partida se anula y se devuelve la apuesta a los dos.
- Si alguien se desconecta y no vuelve en 30 s, pierde.
- En tablas, cada jugador recupera su apuesta menos la mitad de la comisión.

---

## Paso 1 · Poner el servidor en internet (Render)

1. Crea una cuenta en <https://render.com> y conéctala con tu GitHub.
2. **New → Blueprint** y elige este repositorio. Render lee el archivo `render.yaml` y lo configura todo.
   Usa el plan *Starter* con un disco de 1 GB (unos 7-8 $ al mes), porque el plan gratis borra los datos cada vez
   que se reinicia.
3. Cuando termine, copia la dirección que te da (por ejemplo `https://jaque-arena-servidor.onrender.com`).
4. En Render → tu servicio → *Environment*, apunta el valor de `ADMIN_KEY`: es tu clave para ver las ganancias.

## Paso 2 · Decirle a la app dónde está el servidor

En GitHub, en este repositorio: **Settings → Secrets and variables → Actions → pestaña Variables → New repository variable**
- Nombre: `SERVIDOR_AJEDREZ`
- Valor: la dirección del paso 1 (sin barra al final).

## Paso 3 · Crear la llave de firma (una sola vez)

1. En GitHub: **Actions → «Ajedrez · crear llave de firma (una vez)» → Run workflow**.
2. Cuando acabe, abre la ejecución y descarga el artefacto **llave-jaque-arena**.
3. Abre `LEEME-secretos.txt` y crea estos 4 secretos en **Settings → Secrets and variables → Actions → Secrets**:
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`.
4. **Guarda el zip en un sitio seguro** (por ejemplo en tu Google Drive) y borra esa ejecución de GitHub.
   Si pierdes la llave, tendrás que pedirle a Google que la cambie antes de poder publicar actualizaciones.

## Paso 4 · Compilar la app

**Actions → «Ajedrez · compilar Android» → Run workflow.** En unos 5-10 minutos tendrás dos archivos:
- **jaque-arena-apk**: para instalar directamente en tu móvil y probar.
- **jaque-arena-aab**: el archivo que se sube a Google Play.

Cada vez que lo ejecutes, el número de versión sube solo (Google Play lo exige).

## Paso 5 · Publicar en Google Play

1. Crea tu cuenta de desarrollador en <https://play.google.com/console> (pago único de 25 $ y verificación de identidad).
2. **Crear app** → nombre «Jaque Arena» → Juego → Gratis.
3. Rellena la ficha de la tienda con la descripción de abajo, el icono y el gráfico de la carpeta `play-store/`, y
   capturas de pantalla hechas desde el APK de prueba.
4. **Política de privacidad**: `https://TU-SERVIDOR/privacidad`.
5. **Clasificación de contenido**: responde con la verdad que hay **juego de azar simulado** (apuestas con
   monedas virtuales). La clasificación saldrá alta (normalmente para mayores de 12 a 18 años, según el país),
   y eso es normal en este tipo de apps.
6. **Seguridad de los datos**: la app guarda el nombre de usuario, el historial de compras y la actividad en la
   app; no comparte datos con terceros; los datos van cifrados en tránsito (HTTPS) y el usuario puede borrar su
   cuenta desde la app.
7. **Anuncios**: no contiene anuncios.
8. Sube el `.aab` a **Pruebas → Prueba cerrada**. Si tu cuenta de desarrollador es **personal y nueva**, Google
   exige que al menos **12 personas** prueben la app durante **14 días seguidos** antes de dejarte publicarla
   para todo el mundo. Pide a amigos y familiares que se apunten con su cuenta de Google.
9. Después, **Producción → Crear versión** con el mismo `.aab` (o uno más nuevo) y envíala a revisión.

## Paso 6 · Activar la venta de monedas

1. En Play Console: **Monetizar → Productos → Productos integrados en la aplicación**. Crea estos productos
   (los ids tienen que ser exactamente estos):

   | Id del producto | Monedas | Precio orientativo |
   |---|---|---|
   | `monedas_1000` | 1.000 | 0,99 € |
   | `monedas_5500` | 5.500 | 4,99 € |
   | `monedas_12000` | 12.000 | 9,99 € |
   | `monedas_30000` | 30.000 | 19,99 € |

2. Para que el servidor pueda comprobar que los pagos son reales:
   1. En <https://console.cloud.google.com> crea un proyecto, activa **Google Play Android Developer API**,
      crea una **cuenta de servicio** y descarga su **clave JSON**.
   2. En Play Console → **Usuarios y permisos → Invitar usuarios**, añade el correo de esa cuenta de servicio
      con permiso para **ver datos financieros** y **gestionar pedidos**.
   3. En Render → *Environment*, pega el contenido entero del JSON en `GOOGLE_SERVICE_ACCOUNT_JSON`.
3. Hasta que hagas esto, la tienda de la app muestra «Próximamente» y los jugadores siguen consiguiendo monedas
   gratis con el bonus diario.

---

## Texto para la ficha de Google Play

**Descripción corta:** Ajedrez online: reta a jugadores reales, apuesta tus monedas y sube en el ranking.

**Descripción completa:**
> ♚ Jaque Arena: el ajedrez online con emoción.
>
> Elige mesa, apuesta tus monedas y enfréntate a jugadores reales en partidas rápidas de 5 minutos.
> Quien gana se lleva el bote. ¿Te atreves con la mesa de 5.000?
>
> • Partidas online contra personas reales
> • Mesas de 50 a 5.000 monedas
> • Ranking ELO: demuestra quién manda
> • Modo entrenamiento contra la máquina en 3 niveles
> • 1.000 monedas de bienvenida y bonus diario gratis
>
> Las monedas son virtuales, no tienen valor real y no se pueden cambiar por dinero ni por premios.
> Este juego no ofrece apuestas con dinero real.

---

## Para desarrolladores

```bash
# Servidor
cd servidor && npm install && npm test && npm start        # http://localhost:3000

# App en el navegador (apunta al servidor local)
cd app && npm install && VITE_SERVIDOR=http://localhost:3000 npm run dev
```

Los ajustes del negocio (comisión, mesas, monedas iniciales, bonus y reloj) se cambian con variables de entorno
en el servidor: consulta `servidor/src/config.js`.

El identificador de la app es `com.jaquearena.app`. Si lo cambias, cámbialo también en `app/capacitor.config.json`,
`app/android/app/build.gradle` y en la variable `ANDROID_PACKAGE` del servidor, **antes** de subir la primera versión,
porque después Google no deja cambiarlo.
