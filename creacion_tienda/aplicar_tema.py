"""
Aplica (sube) un tema de pago a la tienda de desarrollo usando la Shopify CLI.
Requiere tener instalada y autenticada la Shopify CLI (`shopify auth login`).

Uso:
    python creacion_tienda/aplicar_tema.py --tienda mi-tienda-dev.myshopify.com --carpeta-tema ./mi-tema
"""
import argparse
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tienda", required=True, help="dominio .myshopify.com de la tienda")
    parser.add_argument("--carpeta-tema", required=True, dest="carpeta_tema", help="carpeta local con los archivos del tema")
    args = parser.parse_args()

    cmd = ["shopify", "theme", "push", "--store", args.tienda, "--path", args.carpeta_tema]
    print(f"→ Ejecutando: {' '.join(cmd)}")
    resultado = subprocess.run(cmd)
    sys.exit(resultado.returncode)


if __name__ == "__main__":
    main()
