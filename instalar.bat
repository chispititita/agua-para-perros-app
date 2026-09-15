@echo off
setlocal

rem Ejecuta esto UNA SOLA VEZ (doble clic). Instala todo lo necesario y
rem crea el icono "Agua Para Perros" en tu Escritorio. A partir de ahi,
rem abres la app siempre desde ese icono, como cualquier otro programa.

cd /d "%~dp0"

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
        echo (Marca la casilla "Add python.exe to PATH" durante la instalacion).
        pause
        exit /b 1
    )
)

echo Creando entorno virtual e instalando dependencias, un momento...
%PYTHON% -m venv .venv
call ".venv\Scripts\activate.bat"
pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo Algo fallo instalando las dependencias. Revisa el error de arriba.
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

echo.
echo Instalacion lista. Abriendo la app por primera vez...
start "" ".venv\Scripts\pythonw.exe" escritorio_app.py

echo.
echo A partir de ahora, usa el icono "Agua Para Perros" de tu Escritorio.
pause
