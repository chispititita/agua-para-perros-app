"""Base de datos local (SQLite) de Jarvis: dinero, vicios, tareas, memoria y contenidos generados."""
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
MEDIA_DIR = DATA_DIR / "media"
DB_PATH = DATA_DIR / "jarvis.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    cantidad REAL NOT NULL CHECK (cantidad >= 0),
    categoria TEXT NOT NULL DEFAULT 'otros',
    descripcion TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS vicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
    limite_diario REAL,
    coste_unidad REAL NOT NULL DEFAULT 0,
    objetivo TEXT NOT NULL DEFAULT '',
    creado TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS registros_vicio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vicio_id INTEGER NOT NULL REFERENCES vicios(id) ON DELETE CASCADE,
    fecha TEXT NOT NULL,
    cantidad REAL NOT NULL DEFAULT 1,
    nota TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    detalle TEXT NOT NULL DEFAULT '',
    area TEXT NOT NULL DEFAULT 'personal',
    prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    fecha_limite TEXT,
    hecha INTEGER NOT NULL DEFAULT 0,
    creada TEXT NOT NULL,
    completada TEXT
);
CREATE TABLE IF NOT EXISTS memoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    creada TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK (tipo IN ('imagen', 'video')),
    prompt TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    archivo TEXT,
    error TEXT,
    creado TEXT NOT NULL
);
"""


DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")


def ahora() -> str:
    return datetime.now().isoformat(timespec="seconds")


def fecha_legible() -> str:
    n = datetime.now()
    return f"{DIAS[n.weekday()]} {n:%d/%m/%Y %H:%M}"


def init() -> None:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    with conexion() as c:
        c.executescript(SCHEMA)


@contextmanager
def conexion():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    try:
        yield c
        c.commit()
    finally:
        c.close()


def _filas(rows) -> list[dict]:
    return [dict(r) for r in rows]


# ---------------------------------------------------------------- Dinero

def registrar_movimiento(tipo: str, cantidad: float, categoria: str = "otros",
                         descripcion: str = "", fecha: str | None = None) -> dict:
    if tipo not in ("ingreso", "gasto"):
        raise ValueError("tipo debe ser 'ingreso' o 'gasto'")
    cantidad = abs(float(cantidad))
    with conexion() as c:
        cur = c.execute(
            "INSERT INTO movimientos (fecha, tipo, cantidad, categoria, descripcion) VALUES (?, ?, ?, ?, ?)",
            (fecha or ahora(), tipo, cantidad, (categoria or "otros").lower(), descripcion or ""),
        )
        mov_id = cur.lastrowid
    return {"id": mov_id, "saldo_actual": saldo()}


def borrar_movimiento(mov_id: int) -> bool:
    with conexion() as c:
        return c.execute("DELETE FROM movimientos WHERE id = ?", (mov_id,)).rowcount > 0


def saldo() -> float:
    with conexion() as c:
        r = c.execute(
            "SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN cantidad ELSE -cantidad END), 0) FROM movimientos"
        ).fetchone()
        return round(r[0], 2)


def listar_movimientos(limite: int = 50) -> list[dict]:
    with conexion() as c:
        return _filas(c.execute("SELECT * FROM movimientos ORDER BY fecha DESC, id DESC LIMIT ?", (limite,)))


def resumen_dinero(dias: int = 30) -> dict:
    desde = (datetime.now() - timedelta(days=dias)).isoformat(timespec="seconds")
    with conexion() as c:
        por_cat = _filas(c.execute(
            "SELECT categoria, ROUND(SUM(cantidad), 2) AS total FROM movimientos "
            "WHERE tipo='gasto' AND fecha >= ? GROUP BY categoria ORDER BY total DESC", (desde,)))
        tot = c.execute(
            "SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN cantidad END), 0), "
            "COALESCE(SUM(CASE WHEN tipo='gasto' THEN cantidad END), 0) FROM movimientos WHERE fecha >= ?",
            (desde,)).fetchone()
    return {
        "saldo_actual": saldo(),
        "periodo_dias": dias,
        "ingresos_periodo": round(tot[0], 2),
        "gastos_periodo": round(tot[1], 2),
        "gastos_por_categoria": por_cat,
        "ultimos_movimientos": listar_movimientos(10),
    }


# ---------------------------------------------------------------- Vicios

def _vicio_por_nombre(c, nombre: str):
    return c.execute("SELECT * FROM vicios WHERE nombre = ? COLLATE NOCASE", (nombre.strip(),)).fetchone()


def configurar_vicio(nombre: str, limite_diario: float | None = None, coste_unidad: float | None = None,
                     objetivo: str | None = None) -> dict:
    with conexion() as c:
        v = _vicio_por_nombre(c, nombre)
        if v is None:
            c.execute("INSERT INTO vicios (nombre, limite_diario, coste_unidad, objetivo, creado) VALUES (?, ?, ?, ?, ?)",
                      (nombre.strip(), limite_diario, coste_unidad or 0, objetivo or "", ahora()))
        else:
            c.execute(
                "UPDATE vicios SET limite_diario = COALESCE(?, limite_diario), coste_unidad = COALESCE(?, coste_unidad), "
                "objetivo = COALESCE(?, objetivo) WHERE id = ?",
                (limite_diario, coste_unidad, objetivo, v["id"]))
        return dict(_vicio_por_nombre(c, nombre))


def registrar_vicio(nombre: str, cantidad: float = 1, nota: str = "", fecha: str | None = None) -> dict:
    with conexion() as c:
        v = _vicio_por_nombre(c, nombre)
        if v is None:
            c.execute("INSERT INTO vicios (nombre, creado) VALUES (?, ?)", (nombre.strip(), ahora()))
            v = _vicio_por_nombre(c, nombre)
        c.execute("INSERT INTO registros_vicio (vicio_id, fecha, cantidad, nota) VALUES (?, ?, ?, ?)",
                  (v["id"], fecha or ahora(), float(cantidad), nota or ""))
    return {v["nombre"]: estado_vicios().get(v["nombre"])}


def borrar_vicio(vicio_id: int) -> bool:
    with conexion() as c:
        return c.execute("DELETE FROM vicios WHERE id = ?", (vicio_id,)).rowcount > 0


def estado_vicios() -> dict:
    hoy = date.today()
    hace7 = (hoy - timedelta(days=6)).isoformat()
    hace30 = (hoy - timedelta(days=29)).isoformat()
    out = {}
    with conexion() as c:
        for v in c.execute("SELECT * FROM vicios ORDER BY nombre"):
            q = lambda sql, *a: c.execute(sql, (v["id"], *a)).fetchone()[0]
            ultimo = q("SELECT MAX(fecha) FROM registros_vicio WHERE vicio_id = ?")
            hoy_n = q("SELECT COALESCE(SUM(cantidad),0) FROM registros_vicio WHERE vicio_id = ? AND substr(fecha,1,10) = ?",
                      hoy.isoformat())
            sem_n = q("SELECT COALESCE(SUM(cantidad),0) FROM registros_vicio WHERE vicio_id = ? AND substr(fecha,1,10) >= ?",
                      hace7)
            mes_n = q("SELECT COALESCE(SUM(cantidad),0) FROM registros_vicio WHERE vicio_id = ? AND substr(fecha,1,10) >= ?",
                      hace30)
            desde = datetime.fromisoformat(ultimo) if ultimo else datetime.fromisoformat(v["creado"])
            out[v["nombre"]] = {
                "id": v["id"],
                "objetivo": v["objetivo"],
                "limite_diario": v["limite_diario"],
                "hoy": hoy_n,
                "ultimos_7_dias": sem_n,
                "ultimos_30_dias": mes_n,
                "dinero_gastado_30_dias": round(mes_n * (v["coste_unidad"] or 0), 2),
                "dias_sin_caer": (datetime.now() - desde).days,
                "ultima_vez": ultimo,
                "limite_superado_hoy": v["limite_diario"] is not None and hoy_n > v["limite_diario"],
            }
    return out


# ---------------------------------------------------------------- Tareas

def crear_tarea(titulo: str, detalle: str = "", area: str = "personal", prioridad: str = "media",
                fecha_limite: str | None = None) -> dict:
    if prioridad not in ("alta", "media", "baja"):
        prioridad = "media"
    with conexion() as c:
        cur = c.execute(
            "INSERT INTO tareas (titulo, detalle, area, prioridad, fecha_limite, creada) VALUES (?, ?, ?, ?, ?, ?)",
            (titulo, detalle or "", (area or "personal").lower(), prioridad, fecha_limite or None, ahora()))
        return dict(c.execute("SELECT * FROM tareas WHERE id = ?", (cur.lastrowid,)).fetchone())


def completar_tarea(tarea_id: int, hecha: bool = True) -> dict | None:
    with conexion() as c:
        c.execute("UPDATE tareas SET hecha = ?, completada = ? WHERE id = ?",
                  (1 if hecha else 0, ahora() if hecha else None, tarea_id))
        r = c.execute("SELECT * FROM tareas WHERE id = ?", (tarea_id,)).fetchone()
        return dict(r) if r else None


def borrar_tarea(tarea_id: int) -> bool:
    with conexion() as c:
        return c.execute("DELETE FROM tareas WHERE id = ?", (tarea_id,)).rowcount > 0


def listar_tareas(incluir_hechas: bool = False) -> list[dict]:
    orden = ("ORDER BY hecha, CASE prioridad WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, "
             "fecha_limite IS NULL, fecha_limite, id")
    filtro = "" if incluir_hechas else "WHERE hecha = 0"
    with conexion() as c:
        return _filas(c.execute(f"SELECT * FROM tareas {filtro} {orden}"))


# ---------------------------------------------------------------- Memoria del coach

def recordar(texto: str) -> int:
    with conexion() as c:
        return c.execute("INSERT INTO memoria (texto, creada) VALUES (?, ?)", (texto, ahora())).lastrowid


def olvidar(mem_id: int) -> bool:
    with conexion() as c:
        return c.execute("DELETE FROM memoria WHERE id = ?", (mem_id,)).rowcount > 0


def listar_memoria() -> list[dict]:
    with conexion() as c:
        return _filas(c.execute("SELECT * FROM memoria ORDER BY id"))


# ---------------------------------------------------------------- Contenidos generados

def crear_media(tipo: str, prompt: str) -> int:
    with conexion() as c:
        return c.execute("INSERT INTO media (tipo, prompt, creado) VALUES (?, ?, ?)", (tipo, prompt, ahora())).lastrowid


def actualizar_media(media_id: int, estado: str, archivo: str | None = None, error: str | None = None) -> None:
    with conexion() as c:
        c.execute("UPDATE media SET estado = ?, archivo = COALESCE(?, archivo), error = ? WHERE id = ?",
                  (estado, archivo, error, media_id))


def obtener_media(media_id: int) -> dict | None:
    with conexion() as c:
        r = c.execute("SELECT * FROM media WHERE id = ?", (media_id,)).fetchone()
        return dict(r) if r else None


def listar_media(limite: int = 60) -> list[dict]:
    with conexion() as c:
        return _filas(c.execute("SELECT * FROM media ORDER BY id DESC LIMIT ?", (limite,)))


def media_colgada_a_error() -> None:
    """Al arrancar, los trabajos que quedaron a medias (programa cerrado) se marcan como error."""
    with conexion() as c:
        c.execute("UPDATE media SET estado = 'error', error = 'El programa se cerró mientras se generaba' "
                  "WHERE estado IN ('pendiente', 'generando')")


# ---------------------------------------------------------------- Resumen general

def panorama() -> dict:
    tareas = listar_tareas()
    hoy = date.today().isoformat()
    return {
        "fecha_hora": fecha_legible(),
        "dinero": {k: v for k, v in resumen_dinero(30).items() if k != "ultimos_movimientos"},
        "vicios": estado_vicios(),
        "tareas_pendientes": len(tareas),
        "tareas_vencidas": [t for t in tareas if t["fecha_limite"] and t["fecha_limite"][:10] < hoy],
        "tareas_proximas": tareas[:8],
    }
