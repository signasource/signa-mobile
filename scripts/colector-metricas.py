#!/usr/bin/env python3
"""
TEMPORAL — colector de métricas del reconocedor. Sólo en la rama de diagnóstico.

La app manda lotes de muestras por frame y esto las escribe en un .jsonl y va
imprimiendo un resumen por segundo. Existe porque el teléfono es el único lugar
donde los números significan algo: el emulador no tiene cámara y la máquina de
desarrollo no tiene el hardware del teléfono.

Uso:
    python scripts/colector-metricas.py            # escucha en 0.0.0.0:8099
    python scripts/colector-metricas.py --puerto 9000
"""
from __future__ import annotations

import argparse
import json
import statistics
import time
from collections import defaultdict, deque
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SALIDA = Path(__file__).parent.parent / "metricas.jsonl"

# Ventana corta: interesa lo que está pasando ahora, no el promedio del día.
ventana: dict[str, deque] = defaultdict(lambda: deque(maxlen=120))
ultimo_resumen = 0.0


def resumir() -> None:
    global ultimo_resumen
    ahora = time.time()
    if ahora - ultimo_resumen < 1.0:
        return
    ultimo_resumen = ahora

    for modo, muestras in ventana.items():
        if not muestras:
            continue
        def med(campo: str) -> float:
            vals = [m.get(campo) or 0 for m in muestras]
            return statistics.median(vals) if vals else 0.0

        manos, pose, inf = med("handsMs"), med("poseMs"), med("inferMs")
        fps = med("fps")
        ciclo = manos + pose + inf
        con_manos = sum(1 for m in muestras if (m.get("hands") or 0) > 0) / len(muestras)
        print(
            f"[{datetime.now():%H:%M:%S}] {modo:<9} "
            f"fps {fps:5.1f} | manos {manos:6.1f} | pose {pose:6.1f} | inf {inf:6.1f} "
            f"| suma {ciclo:6.1f} ms | con manos {con_manos:4.0%} | n={len(muestras)}",
            flush=True,
        )


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802
        largo = int(self.headers.get("Content-Length", 0))
        crudo = self.rfile.read(largo)
        self.send_response(204)
        self.end_headers()
        try:
            cuerpo = json.loads(crudo)
        except json.JSONDecodeError:
            return

        sesion = cuerpo.get("sesion", "?")
        build = cuerpo.get("build", "?")
        evento = cuerpo.get("evento")
        muestras = cuerpo.get("muestras") or []

        with SALIDA.open("a", encoding="utf-8") as f:
            for m in muestras:
                f.write(json.dumps({"sesion": sesion, "build": build, "evento": evento, **m}) + "\n")

        if evento:
            print(f"[{datetime.now():%H:%M:%S}] -- {evento} (build {build}) -- {muestras[:1]}", flush=True)
            return

        for m in muestras:
            ventana[m.get("modo", "?")].append(m)
        resumir()

    def log_message(self, *args) -> None:  # silencio: el resumen es la salida
        pass


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--puerto", type=int, default=8099)
    args = p.parse_args()
    print(f"Colector escuchando en 0.0.0.0:{args.puerto} → {SALIDA}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", args.puerto), Handler).serve_forever()


if __name__ == "__main__":
    main()
