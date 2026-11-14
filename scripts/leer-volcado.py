#!/usr/bin/env python3
"""
Interpreta los volcados de caída que manda la app.

Android guarda el volcado de una caída nativa como protobuf binario, no como
texto, así que la app lo manda en base64 y acá se lo desarma. No hace falta el
esquema completo: con las cadenas alcanza para lo que importa, que es en qué
librería se cayó y con qué señal.

Uso:
    python scripts/leer-volcado.py [metricas.jsonl]
"""
from __future__ import annotations

import base64
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

# Las librerías propias del reconocimiento, que son las que pueden tener la
# culpa; el resto del sistema aparece siempre y no dice nada por sí solo.
NUESTRAS = ("mediapipe", "filament", "tensorflow", "tflite", "camera", "gltfio", "signa")

CADENA = re.compile(rb"[\x20-\x7e]{6,}")


def cadenas(datos: bytes) -> list[str]:
    return [c.decode("ascii", "replace") for c in CADENA.findall(datos)]


def main(ruta: Path) -> None:
    vistos = set()
    for linea in ruta.read_text().splitlines():
        d = json.loads(linea)
        if d.get("evento") != "salida-anterior" or not d.get("volcado"):
            continue
        clave = (d.get("cuando"), d.get("motivo"))
        if clave in vistos:
            continue
        vistos.add(clave)

        crudo = d["volcado"]
        if crudo.startswith("no se pudo leer"):
            print(crudo)
            continue
        datos = base64.b64decode(crudo)
        texto = cadenas(datos)

        cuando = datetime.fromtimestamp(d["cuando"] / 1000).strftime("%d/%m %H:%M:%S")
        print(f"\n=== {cuando} · {d.get('motivo')} · {d.get('memoriaKB')} KB · {len(datos)} bytes")

        for c in texto:
            if "SIGSEGV" in c or "SIGABRT" in c or "Abort message" in c or "signal" in c.lower():
                print("   ", c[:160])

        libs = [c for c in texto if ".so" in c]
        propias = [c for c in libs if any(n in c.lower() for n in NUESTRAS)]
        print("    librerías propias en el volcado:")
        for lib, veces in Counter(propias).most_common(8):
            print(f"      {veces:3}x {lib[:110]}")
        if not propias:
            print("      (ninguna: la caída no pasó por código nuestro)")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "metricas.jsonl"))
