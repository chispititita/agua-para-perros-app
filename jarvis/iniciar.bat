@echo off
chcp 65001 >nul
title JARVIS
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo No tienes Python instalado. Descargalo de https://www.python.org/downloads/
  echo IMPORTANTE: marca la casilla "Add Python to PATH" al instalarlo.
  pause
  exit /b
)

if not exist ".venv" (
  echo Preparando Jarvis por primera vez, espera un momento...
  python -m venv .venv
  ".venv\Scripts\python" -m pip install --upgrade pip >nul
  ".venv\Scripts\python" -m pip install -r requirements.txt
)

if not exist ".env" (
  copy .env.example .env >nul
  echo.
  echo Se ha creado el archivo .env. Pon tus claves, guarda y cierra el Bloc de notas.
  notepad .env
)

".venv\Scripts\python" jarvis.py
pause
