@echo off
chcp 65001 >nul
title JARVIS
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo No tienes Python instalado. Descargalo de https://www.python.org/downloads/
  echo IMPORTANTE: marca la casilla "Add Python to PATH" al instalarlo.
  start https://www.python.org/downloads/
  pause
  exit /b
)

if not exist ".venv" (
  echo Preparando Jarvis por primera vez, espera un momento...
  python -m venv .venv
  ".venv\Scripts\python" -m pip install --upgrade pip >nul
  ".venv\Scripts\python" -m pip install -r requirements.txt
)

if not exist ".env" copy .env.example .env >nul

rem ---- Cerebro local gratuito (Ollama), salvo que se haya puesto una clave de Claude ----
findstr /r /c:"^ANTHROPIC_API_KEY=..*" .env >nul
if not errorlevel 1 goto arrancar

set "MODELO=qwen2.5:7b"
for /f "tokens=1,* delims==" %%a in ('findstr /b "MODELO_LOCAL=" .env') do set "MODELO=%%b"

where ollama >nul 2>nul
if errorlevel 1 set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"
where ollama >nul 2>nul
if errorlevel 1 (
  echo Instalando el cerebro gratuito de Jarvis: Ollama...
  winget install -e --id Ollama.Ollama --accept-source-agreements --accept-package-agreements
  set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"
)
where ollama >nul 2>nul
if errorlevel 1 (
  echo.
  echo No he podido instalar Ollama automaticamente.
  echo Descargalo de https://ollama.com/download , instalalo y vuelve a abrir Jarvis.
  start https://ollama.com/download
  pause
  exit /b
)

ollama list >nul 2>nul
if errorlevel 1 (
  start "" /min ollama serve
  timeout /t 5 >nul
)

ollama show %MODELO% >nul 2>nul
if errorlevel 1 (
  echo.
  echo Descargando el cerebro de Jarvis: %MODELO%. Son unos 5 GB, solo la primera vez...
  ollama pull %MODELO%
)

:arrancar
".venv\Scripts\python" jarvis.py
pause
