#!/bin/bash
# Lanzador para Mac (doble clic) y Linux (./iniciar.command)
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "No tienes Python instalado. Descárgalo de https://www.python.org/downloads/"
  open https://www.python.org/downloads/ 2>/dev/null
  read -r -p "Pulsa Enter para salir"
  exit 1
fi

if [ ! -d ".venv" ]; then
  echo "Preparando Jarvis por primera vez, espera un momento..."
  python3 -m venv .venv
  ./.venv/bin/python -m pip install --upgrade pip >/dev/null
  ./.venv/bin/python -m pip install -r requirements.txt
fi

[ -f ".env" ] || cp .env.example .env

# ---- Cerebro local gratuito (Ollama), salvo que se haya puesto una clave de Claude ----
if ! grep -qE '^ANTHROPIC_API_KEY=.+' .env; then
  MODELO=$(grep -E '^MODELO_LOCAL=' .env | cut -d= -f2-)
  MODELO=${MODELO:-qwen2.5:7b}
  [ -d "/Applications/Ollama.app/Contents/Resources" ] && export PATH="$PATH:/Applications/Ollama.app/Contents/Resources"
  if ! command -v ollama >/dev/null 2>&1; then
    if command -v brew >/dev/null 2>&1; then
      echo "Instalando el cerebro gratuito de Jarvis: Ollama..."
      brew install ollama
    elif [ "$(uname)" = "Linux" ]; then
      curl -fsSL https://ollama.com/install.sh | sh
    fi
  fi
  if ! command -v ollama >/dev/null 2>&1; then
    echo "Instala Ollama desde https://ollama.com/download (es gratis) y vuelve a abrir Jarvis."
    open https://ollama.com/download 2>/dev/null || xdg-open https://ollama.com/download 2>/dev/null
    read -r -p "Pulsa Enter para salir"
    exit 1
  fi
  if ! ollama list >/dev/null 2>&1; then
    (open -a Ollama 2>/dev/null || nohup ollama serve >/dev/null 2>&1 &)
    sleep 5
  fi
  if ! ollama show "$MODELO" >/dev/null 2>&1; then
    echo "Descargando el cerebro de Jarvis: $MODELO (unos 5 GB, solo la primera vez)..."
    ollama pull "$MODELO"
  fi
fi

./.venv/bin/python jarvis.py
