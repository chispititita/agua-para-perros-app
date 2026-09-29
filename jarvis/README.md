# J.A.R.V.I.S. — tu asistente personal

Un programa para tu ordenador que funciona como el JARVIS de Iron Man:

- **Hábitos** (lo principal): sigue tus buenos hábitos (gimnasio, leer, beber agua…) con **rachas** de días
  seguidos, y los que quieres dejar (tabaco, alcohol, apuestas…) con **días sin caer** y lo que te cuestan.
- **Coach de vida**: te motiva, te hace el repaso del día, te ayuda cuando tienes ganas de recaer y recuerda tus metas.
- **Dinero**: lleva tu saldo, ingresos y gastos por categorías.
- **Tareas**: con prioridades, fechas límite y avisos de lo que está vencido.
- **Voz**: le hablas y te contesta en voz alta. En **modo manos libres** está siempre escuchando y se activa
  cuando dices «**Jarvis**», sin tocar nada.

Todos tus datos se guardan **solo en tu ordenador** (carpeta `data/`).

---

## 1. Instalar (una sola vez)

**No necesitas ninguna clave ni pagar nada.**

1. Instala **Python** desde <https://www.python.org/downloads/>.
   En Windows, marca la casilla **«Add Python to PATH»** en el instalador.
2. Usa **Google Chrome** o **Microsoft Edge** (son los navegadores que permiten hablar por voz).
3. Pon la carpeta `jarvis` en tu Escritorio.

## 2. Arrancar

- **Windows**: doble clic en `iniciar.bat`.
- **Mac**: doble clic en `iniciar.command` (si macOS lo bloquea: clic derecho → Abrir).

La primera vez tarda un rato porque se descarga solo:
- **Ollama**, un programa gratuito que hace funcionar la IA **dentro de tu ordenador**.
  Si no se instala solo, descárgalo de <https://ollama.com/download> y vuelve a abrir Jarvis.
- El **cerebro de Jarvis** (modelo `qwen2.5:7b`, unos 5 GB).

Después, Jarvis se abre en su propia ventana. Cuando te pida permiso para el **micrófono**, dale a «Permitir».

**¿Qué ordenador hace falta?** Para el cerebro local, al menos **8 GB de RAM** (con 16 GB va más fluido;
con tarjeta gráfica, mucho más rápido). Si va lento, abre el archivo `.env` y cambia
`MODELO_LOCAL=qwen2.5:7b` por `MODELO_LOCAL=qwen2.5:3b` (más rápido, algo menos listo).

## 3. ¿Hace falta pagar algo?

No. Todo funciona gratis y sin claves: la IA corre en tu ordenador y la voz la pone el navegador.
Solo si quieres que Jarvis sea más listo y rápido, puedes poner una clave de Claude (de pago por uso)
en `ANTHROPIC_API_KEY` dentro del archivo `.env`.

## 4. Cómo usarlo

**Hablar**: pulsa el círculo brillante y habla. O activa **«Modo manos libres»** y di, por ejemplo:

- «Jarvis, buenos días» → repaso de hábitos, dinero y tareas y por dónde empezar.
- «Jarvis, quiero empezar a ir al gimnasio 4 días por semana» → crea el hábito.
- «Jarvis, hoy he ido al gimnasio» / «me he bebido 3 vasos de agua» → lo apunta y te dice tu racha.
- «Jarvis, quiero dejar el tabaco, cada cigarro me cuesta 30 céntimos» → lo empieza a controlar.
- «Jarvis, me he fumado dos cigarros» → lo registra y te pregunta qué lo provocó.
- «Jarvis, tengo ganas de fumar» → te ayuda a aguantar en ese momento.
- «Jarvis, ¿cómo voy con mis hábitos esta semana?»
- «Jarvis, me he gastado 12 euros en comida» / «apúntame ir al médico el viernes».
- «Jarvis, recuerda que mi meta es correr una media maratón en marzo».

Después de contestarte, se queda unos segundos escuchando por si quieres seguir hablando sin repetir «Jarvis».
Pulsa el círculo mientras habla para interrumpirle.

**Sin voz**: también puedes escribirle, o usar las pestañas Hábitos, Dinero y Tareas a mano.

## 5. Preguntas frecuentes

- **No me oye**: usa Chrome o Edge, revisa que el micrófono tenga permiso (icono del candado en la barra)
  y que tengas internet (el reconocimiento de voz del navegador funciona en línea).
- **La voz suena rara**: elige otra voz en el desplegable bajo el círculo (en Windows suelen ir bien
  «Microsoft Pablo» o «Google español»).
- **«Todavía no puedo pensar»**: abre la aplicación Ollama (o vuelve a abrir `iniciar.bat` / `iniciar.command`).
- **Responde lento**: es normal en ordenadores sin tarjeta gráfica. Usa `qwen2.5:3b` (ver arriba) o pon una clave de Claude.
- **Quiero que piense más a fondo** (solo con Claude): pon `ESFUERZO_CLAUDE=medium` en `.env`.
- **Copia de seguridad**: copia la carpeta `data/`.

## Para quien quiera tocar el código

```
jarvis.py      servidor local (Flask) y arranque de la ventana
brain.py       herramientas del asistente (hábitos, dinero, tareas, memoria) + cerebro con Claude (si hay clave)
cerebro_local.py  cerebro gratuito con Ollama (sin clave)
db.py          base de datos SQLite local
static/        interfaz y control por voz (Web Speech API)
```

Arrancar sin abrir ventana: `python jarvis.py --sin-ventana` y entra en <http://127.0.0.1:5757>.
