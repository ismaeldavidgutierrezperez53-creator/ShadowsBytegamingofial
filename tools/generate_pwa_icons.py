"""Genera los iconos PNG de la PWA desde favicon.svg (imagen anime incrustada)."""
from base64 import b64decode
from io import BytesIO
from pathlib import Path
import re

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
svg = (ROOT / "favicon.svg").read_text(encoding="utf-8")
match = re.search(r"data:image/png;base64,([A-Za-z0-9+/=]+)", svg)
if not match:
    raise SystemExit("No se encontró el icono anime PNG incrustado en favicon.svg")

source = Image.open(BytesIO(b64decode(match.group(1), validate=True))).convert("RGBA")
if source.width != source.height:
    raise SystemExit("El icono fuente debe ser cuadrado")

for size, filename in ((64, "anime-favicon.png"), (192, "app-icon-192.png"), (512, "app-icon-512.png")):
    output = ROOT / filename
    source.resize((size, size), Image.Resampling.LANCZOS).save(output, format="PNG", optimize=True)
    print(f"Icono generado: {filename} ({size}x{size})")
