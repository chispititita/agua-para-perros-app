#!/bin/bash
# Lanzador para Mac (doble clic) y Linux (./iniciar.command)
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "No tienes Python instalado. Descárgalo de https://www.python.org/downloads/"
  read -r -p "Pulsa Enter para salir"
  exit 1
fi

if [ ! -d ".venv" ]; then
  echo "Preparando Jarvis por primera vez, espera un momento..."
  python3 -m venv .venv
  ./.venv/bin/python -m pip install --upgrade pip >/dev/null
  ./.venv/bin/python -m pip install -r requirements.txt
fi

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Se ha creado el archivo .env. Pon tus claves, guárdalo y vuelve a abrir Jarvis."
  (open -e .env 2>/dev/null || xdg-open .env 2>/dev/null) &
  read -r -p "Pulsa Enter cuando hayas guardado tus claves"
fi

./.venv/bin/python jarvis.py
