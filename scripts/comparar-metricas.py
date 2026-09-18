#!/usr/bin/env python3
"""
Compara las métricas de varias compilaciones entre sí.

El colector escribe todo junto en metricas.jsonl, con la marca de compilación
en cada lote. Esto agrupa por esa marca y saca la mediana de cada cosa, que es
lo que hace comparables dos corridas: los promedios se los come el
calentamiento y los máximos, un tirón cualquiera del sistema.

Uso:
    python scripts/comparar-metricas.py [metricas.jsonl]
"""
from __future__ import annotations

import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

# Los primeros segundos de cada sesión son calentamiento: los modelos todavía
# no corrieron una vez y los números no representan el uso normal.
DESCARTE_MS = 6000


def mediana(valores: list[float]) -> float:
    return statistics.median(valores) if valores else 0.0


def main(ruta: Path) -> None:
    cuadros: dict[str, list[dict]] = defaultdict(list)
    avatares: dict[tuple[str, str], list[float]] = defaultdict(list)
    inicio: dict[str, int] = {}

    for linea in ruta.read_text().splitlines():
        lote = json.loads(linea)
        build = lote.get("build", "sin-marca")
        sesion = lote.get("sesion", "")
        for m in lote.get("muestras") or [lote]:
            t = m.get("t", 0)
            inicio.setdefault(sesion, t)
            if lote.get("evento") == "avatar":
                avatares[(build, m.get("motor", "?"))].append(m.get("ms", 0))
            elif "fps" in m and t - inicio[sesion] >= DESCARTE_MS:
                cuadros[f'{build}/{m.get("modo", "?")}'].append(m)

    if cuadros:
        print(f'{"compilación / modo":28} {"fps":>6} {"manos":>7} {"pose":>7} {"infer":>7} {"n":>6}')
        for clave, ms in sorted(cuadros.items()):
            print(
                f"{clave:28} {mediana([m['fps'] for m in ms]):6.1f} "
                f"{mediana([m['handsMs'] for m in ms]):6.0f}m {mediana([m['poseMs'] for m in ms]):6.0f}m "
                f"{mediana([m['inferMs'] for m in ms]):6.1f}m {len(ms):6}"
            )

    memoria = defaultdict(list)
    for clave, ms in cuadros.items():
        crecimiento = [m["memoriaKB"] for m in ms if m.get("memoriaKB")]
        if len(crecimiento) > 1:
            memoria[clave] = [crecimiento[0], crecimiento[-1]]

    if memoria:
        # Una fuga no se ve en el promedio: se ve en que el último valor sea muy
        # mayor que el primero dentro de la misma sesión.
        print(f'\n{"memoria nativa: compilación / modo":38} {"inicio":>10} {"final":>10}')
        for clave, (ini, fin) in sorted(memoria.items()):
            print(f"{clave:38} {ini:9} KB {fin:9} KB")

    if avatares:
        print(f'\n{"avatar: compilación / motor":38} {"ms hasta verse":>15} {"n":>5}')
        for (build, motor), ms in sorted(avatares.items()):
            print(f"{build + ' / ' + motor:38} {mediana(ms):15.0f} {len(ms):5}")

    if not cuadros and not avatares:
        print("No hay muestras todavía.")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "metricas.jsonl"))
