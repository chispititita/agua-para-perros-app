@echo off
setlocal enabledelayedexpansion

rem Ejecuta esto UNA SOLA VEZ (doble clic). Instala todo lo necesario y
rem crea el icono "Agua Para Perros" en tu Escritorio. A partir de ahi,
rem abres la app siempre desde ese icono, como cualquier otro programa.

cd /d "%~dp0"

echo.
echo === Instalando "Agua Para Perros" ===
echo.

rem Comprueba que se puede escribir aqui: si estas ejecutando esto
rem desde DENTRO del .zip sin extraerlo, Windows monta una carpeta de
rem solo lectura y todo falla en silencio.
echo prueba > __test_escritura__.tmp 2>nul
if not exist "__test_escritura__.tmp" (
    echo ============================================================
    echo No se puede escribir en esta carpeta.
    echo Seguramente estas ejecutando instalar.bat DESDE DENTRO del
    echo archivo .zip, sin haberlo extraido antes.
    echo.
    echo Solucion: haz clic derecho sobre el .zip descargado, elige
    echo "Extraer todo...", abre la carpeta YA EXTRAIDA y ahi haz
    echo doble clic en instalar.bat.
    echo ============================================================
    pause
    exit /b 1
)
del "__test_escritura__.tmp" >nul 2>nul

where python >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON=python"
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        set "PYTHON=py"
    ) else (
        echo No se encontro Python instalado.
        echo Descargalo desde https://www.python.org/downloads/ y vuelve a intentarlo.
        echo IMPORTANTE: marca la casilla "Add python.exe to PATH" durante la instalacion.
        pause
        exit /b 1
    )
)

echo Python encontrado: !PYTHON!
echo Creando entorno virtual...
%PYTHON% -m venv .venv

if not exist ".venv\Scripts\python.exe" (
    echo ============================================================
    echo No se pudo crear el entorno virtual.
    echo Es probable que "python" en tu PC sea el acceso directo vacio
    echo de la Microsoft Store, no una instalacion real de Python.
    echo.
    echo Solucion: instala Python desde
    echo https://www.python.org/downloads/ marcando la casilla
    echo "Add python.exe to PATH", reinicia el PC, y vuelve a hacer
    echo doble clic en instalar.bat.
    echo ============================================================
    pause
    exit /b 1
)

call ".venv\Scripts\activate.bat"

echo Instalando dependencias (puede tardar uno o dos minutos)...
pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo Algo fallo instalando las dependencias. Revisa el error de arriba.
    echo Si no tienes conexion a internet en este momento, conectate y
    echo vuelve a hacer doble clic en instalar.bat.
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo Se creo el archivo .env. Editalo para pegar tu ANTHROPIC_API_KEY
        echo si vas a usar "Investigar productos (IA)".
    )
)

echo.
echo Creando el icono en tu Escritorio...
cscript //nologo crear_acceso_directo.vbs
if errorlevel 1 (
    echo No se pudo crear el icono automaticamente.
    echo Puedes intentarlo de nuevo haciendo doble clic en crear_acceso_directo.vbs.
)

echo.
echo Instalacion lista. Abriendo la app por primera vez...
start "" ".venv\Scripts\pythonw.exe" escritorio_app.py

echo.
echo Revisa tu Escritorio: deberias ver el icono "Agua Para Perros".
echo A partir de ahora, usalo para abrir la app.
pause
