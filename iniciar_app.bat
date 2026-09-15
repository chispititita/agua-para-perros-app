@echo off
setlocal

rem Este script te deja arrancar la app con doble clic, sin usar cmd a mano.
rem La primera vez crea un entorno virtual e instala las dependencias;
rem las siguientes veces arranca directo.

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
        pause
        exit /b 1
    )
)

if not exist ".venv" (
    echo Primera vez: creando entorno virtual e instalando dependencias...
    %PYTHON% -m venv .venv
    call ".venv\Scripts\activate.bat"
    pip install -r requirements.txt
) else (
    call ".venv\Scripts\activate.bat"
)

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo Se creo el archivo .env a partir de .env.example.
        echo Editalo para pegar tu ANTHROPIC_API_KEY si vas a usar "Investigar productos (IA)".
    )
)

echo.
echo Arrancando la aplicacion... se abrira tu navegador en unos segundos.
echo Deja esta ventana abierta mientras uses la app. Cierrala para apagarla.
echo.

python app_web.py

pause
