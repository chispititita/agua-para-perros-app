"""Base de datos local (SQLite) de Jarvis: dinero, hábitos, tareas y memoria."""
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
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
CREATE TABLE IF NOT EXISTS habitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
    tipo TEXT NOT NULL DEFAULT 'malo' CHECK (tipo IN ('bueno', 'malo')),
    meta_diaria REAL,
    coste_unidad REAL NOT NULL DEFAULT 0,
    objetivo TEXT NOT NULL DEFAULT '',
    creado TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS registros_habito (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habito_id INTEGER NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
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
"""


DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")


def ahora() -> str:
    return datetime.now().isoformat(timespec="seconds")


def fecha_legible() -> str:
    n = datetime.now()
    return f"{DIAS[n.weekday()]} {n:%d/%m/%Y %H:%M}"


def init() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with conexion() as c:
        c.executescript(SCHEMA)
        _migrar_vicios(c)


def _migrar_vicios(c) -> None:
    """Las versiones anteriores guardaban 'vicios': se pasan a hábitos malos."""
    if not c.execute("SELECT 1 FROM sqlite_master WHERE name = 'vicios'").fetchone():
        return
    for v in c.execute("SELECT * FROM vicios").fetchall():
        cur = c.execute("INSERT OR IGNORE INTO habitos (nombre, tipo, meta_diaria, coste_unidad, objetivo, creado) "
                        "VALUES (?, 'malo', ?, ?, ?, ?)",
                        (v["nombre"], v["limite_diario"], v["coste_unidad"], v["objetivo"], v["creado"]))
        if cur.rowcount:
            c.execute("INSERT INTO registros_habito (habito_id, fecha, cantidad, nota) "
                      "SELECT ?, fecha, cantidad, nota FROM registros_vicio WHERE vicio_id = ?", (cur.lastrowid, v["id"]))
    c.executescript("DROP TABLE IF EXISTS registros_vicio; DROP TABLE IF EXISTS vicios; DROP TABLE IF EXISTS media;")


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


# ---------------------------------------------------------------- Hábitos
# bueno: algo que quieres hacer (gimnasio, leer, beber agua). meta_diaria = cuánto quieres hacer al día.
# malo: algo que quieres dejar o reducir (tabaco, alcohol, apuestas). meta_diaria = límite al día (0 = dejarlo).

def _habito_por_nombre(c, nombre: str):
    return c.execute("SELECT * FROM habitos WHERE nombre = ? COLLATE NOCASE", (nombre.strip(),)).fetchone()


def configurar_habito(nombre: str, tipo: str | None = None, meta_diaria: float | None = None,
                      coste_unidad: float | None = None, objetivo: str | None = None) -> dict:
    if tipo not in (None, "bueno", "malo"):
        raise ValueError("tipo debe ser 'bueno' o 'malo'")
    with conexion() as c:
        h = _habito_por_nombre(c, nombre)
        if h is None:
            c.execute("INSERT INTO habitos (nombre, tipo, meta_diaria, coste_unidad, objetivo, creado) "
                      "VALUES (?, ?, ?, ?, ?, ?)",
                      (nombre.strip(), tipo or "malo", meta_diaria, coste_unidad or 0, objetivo or "", ahora()))
        else:
            c.execute(
                "UPDATE habitos SET tipo = COALESCE(?, tipo), meta_diaria = COALESCE(?, meta_diaria), "
                "coste_unidad = COALESCE(?, coste_unidad), objetivo = COALESCE(?, objetivo) WHERE id = ?",
                (tipo, meta_diaria, coste_unidad, objetivo, h["id"]))
        return dict(_habito_por_nombre(c, nombre))


def registrar_habito(nombre: str, cantidad: float = 1, nota: str = "", tipo: str | None = None,
                     fecha: str | None = None) -> dict:
    with conexion() as c:
        h = _habito_por_nombre(c, nombre)
        if h is None:
            c.execute("INSERT INTO habitos (nombre, tipo, creado) VALUES (?, ?, ?)",
                      (nombre.strip(), tipo if tipo in ("bueno", "malo") else "malo", ahora()))
            h = _habito_por_nombre(c, nombre)
        c.execute("INSERT INTO registros_habito (habito_id, fecha, cantidad, nota) VALUES (?, ?, ?, ?)",
                  (h["id"], fecha or ahora(), float(cantidad), nota or ""))
    return {h["nombre"]: estado_habitos().get(h["nombre"])}


def borrar_habito(habito_id: int) -> bool:
    with conexion() as c:
        return c.execute("DELETE FROM habitos WHERE id = ?", (habito_id,)).rowcount > 0


def _racha_buena(dias_cumplidos: set, hoy: date) -> int:
    """Días seguidos cumpliendo. Si hoy aún no lo has hecho, la racha cuenta hasta ayer."""
    dia = hoy if hoy in dias_cumplidos else hoy - timedelta(days=1)
    racha = 0
    while dia in dias_cumplidos:
        racha += 1
        dia -= timedelta(days=1)
    return racha


def estado_habitos() -> dict:
    hoy = date.today()
    hace7 = (hoy - timedelta(days=6)).isoformat()
    hace30 = (hoy - timedelta(days=29)).isoformat()
    out = {}
    with conexion() as c:
        for h in c.execute("SELECT * FROM habitos ORDER BY tipo, nombre").fetchall():
            por_dia = {date.fromisoformat(r[0]): r[1] for r in c.execute(
                "SELECT substr(fecha,1,10), SUM(cantidad) FROM registros_habito WHERE habito_id = ? "
                "GROUP BY substr(fecha,1,10)", (h["id"],))}
            suma = lambda desde: sum(v for d, v in por_dia.items() if d.isoformat() >= desde)
            ultimo = c.execute("SELECT MAX(fecha) FROM registros_habito WHERE habito_id = ?", (h["id"],)).fetchone()[0]
            meta = h["meta_diaria"]
            datos = {
                "id": h["id"],
                "tipo": h["tipo"],
                "objetivo": h["objetivo"],
                "meta_diaria": meta,
                "hoy": por_dia.get(hoy, 0),
                "ultimos_7_dias": suma(hace7),
                "ultimos_30_dias": suma(hace30),
                "ultima_vez": ultimo,
            }
            if h["tipo"] == "bueno":
                minimo = meta if meta else 1
                cumplidos = {d for d, v in por_dia.items() if v >= minimo}
                datos.update({
                    "racha_dias": _racha_buena(cumplidos, hoy),
                    "cumplido_hoy": hoy in cumplidos,
                    "dias_cumplidos_7": sum(1 for d in cumplidos if d.isoformat() >= hace7),
                    "dias_cumplidos_30": sum(1 for d in cumplidos if d.isoformat() >= hace30),
                })
            else:
                desde = datetime.fromisoformat(ultimo) if ultimo else datetime.fromisoformat(h["creado"])
                datos.update({
                    "dias_sin_caer": (datetime.now() - desde).days,
                    "limite_superado_hoy": meta is not None and por_dia.get(hoy, 0) > meta,
                    "dinero_gastado_30_dias": round(suma(hace30) * (h["coste_unidad"] or 0), 2),
                })
            out[h["nombre"]] = datos
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


# ---------------------------------------------------------------- Resumen general

def panorama() -> dict:
    tareas = listar_tareas()
    hoy = date.today().isoformat()
    return {
        "fecha_hora": fecha_legible(),
        "dinero": {k: v for k, v in resumen_dinero(30).items() if k != "ultimos_movimientos"},
        "habitos": estado_habitos(),
        "tareas_pendientes": len(tareas),
        "tareas_vencidas": [t for t in tareas if t["fecha_limite"] and t["fecha_limite"][:10] < hoy],
        "tareas_proximas": tareas[:8],
    }
