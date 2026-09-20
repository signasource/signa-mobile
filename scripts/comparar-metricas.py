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
        # El colector guarda una muestra por línea, ya desarmada; los lotes con
        # "muestras" vienen de versiones anteriores del archivo.
        for m in lote.get("muestras") or [lote]:
            t = m.get("t", 0)
            inicio.setdefault(sesion, t)
            if lote.get("evento") == "avatar":
                avatares[(build, m.get("motor", "?"))].append(m.get("ms", 0))
            elif "fps" in m and "handsMs" in m and t - inicio[sesion] >= DESCARTE_MS:
                # El emulador y el teléfono se mezclaban en la misma fila y las
                # medianas no querían decir nada. El delegado los separa: en el
                # emulador MediaPipe cae a CPU porque no hay GPU de verdad.
                donde = "teléfono" if m.get("delegado") == "GPU" else "emulador"
                cuadros[f'{build}/{m.get("modo", "?")}/{donde}'].append(m)

    if cuadros:
        print(f'{"compilación / modo / dónde":38} {"fps":>6} {"manos":>7} {"pose":>7} {"infer":>7} {"n":>6}')
        for clave, ms in sorted(cuadros.items()):
            print(
                f"{clave:38} {mediana([m['fps'] for m in ms]):6.1f} "
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

    fluidez: dict[str, list[dict]] = defaultdict(list)
    for linea in ruta.read_text().splitlines():
        lote = json.loads(linea)
        if lote.get("evento") == "avatar-fluidez":
            fluidez[lote.get("build", "sin-marca")].append(lote)

    if fluidez:
        # Fluidez del avatar: el promedio dice poco si hay tirones, así que va
        # también el peor cuadro de cada tanda.
        print(f'\n{"avatar, fluidez: compilación":30} {"fps":>7} {"ms dibujo":>11} {"peor ms":>9} {"n":>5}')
        for build, ms in sorted(fluidez.items()):
            # El peor cuadro se toma del percentil 90 y no del máximo: el primer
            # cuadro de cada avatar incluye compilar los sombreadores y subir
            # las texturas, así que el máximo siempre es ése y no dice nada de
            # cómo se ve la animación después.
            peores = sorted(m["peorMs"] for m in ms)
            p90 = peores[int(len(peores) * 0.9) - 1] if peores else 0.0
            print(f"{build:30} {mediana([m['fps'] for m in ms]):7.1f} "
                  f"{mediana([m['msDibujo'] for m in ms]):11.1f} "
                  f"{p90:9.1f} {len(ms):5}")

    if avatares:
        print(f'\n{"avatar: compilación / motor":38} {"ms hasta verse":>15} {"n":>5}')
        for (build, motor), ms in sorted(avatares.items()):
            print(f"{build + ' / ' + motor:38} {mediana(ms):15.0f} {len(ms):5}")

    if not cuadros and not avatares:
        print("No hay muestras todavía.")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "metricas.jsonl"))
