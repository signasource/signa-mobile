# Rendimiento del reconocimiento

> Responsabilidad: registro de mediciones, etapa por etapa, para poder comparar.
> Actualizar: cada vez que se mide algo en un teléfono real.
> Fuentes: scripts/colector-metricas.py, src/features/ml/telemetria.ts, modules/signa-vision/

Todas las mediciones son del **mismo teléfono**. Comparar entre aparatos no
significa nada, y comparar contra el emulador tampoco: ahí MediaPipe corre por
CPU con GL por software.

Los números son la **mediana** por cuadro, descartando los primeros 6 segundos de
cada sesión, que son calentamiento y distorsionan cualquier promedio.

## Detección de manos, que es el 97% del cuadro

| etapa | manos | pose | fps | notas |
|---|---|---|---|---|
| WebView, ejercicio estático | 57-64 ms | 40-41 ms | 10 | deletreo |
| WebView, ejercicio dinámico | 136-147 ms | 92-106 ms | 6-7,5 | señas |
| **Nativo, etapa 1** | **55 ms** | **45 ms** | **12,6** | cámara y esqueleto nativos |
| Banco nativo aislado (GPU) | 24 ms | 28 ms | — | bitmap sintético 480x360 |
| Banco nativo aislado (CPU) | 32 ms | 27 ms | — | ídem |

## Lo que cada medición dejó claro

**La inferencia nunca fue el problema.** 2 ms en el estático y 4 en el dinámico:
el ~2% del cuadro. Todo el costo estaba —y sigue estando— en MediaPipe.

**El WebView costaba el triple.** El banco nativo corriendo en CPU (32 ms) le
gana al WebView corriendo en GPU (57-147 ms). O sea que el costo no estaba en el
delegado ni en el modelo, sino en el WASM y en las copias de cuadro para cruzar
al WebView.

**El calentamiento se pagaba en cada entrada.** 3053 ms la primera pose y 1227 la
primera detección de manos, contra 59 y 38 en nativo. Como se manda un cuadro por
vez, eso congelaba la pantalla justo sobre el primer intento de seña.

**El ejercicio dinámico costaba el doble que el estático** y no por el calor ni
por caer a CPU: los dos corrían en GPU, y el orden de prueba invertido daba el
mismo resultado. El hilo principal del dinámico perdía un tercio de sus cuadros
de dibujo (42 contra 58) con un dibujo propio de 0,2 ms, así que algo más le
competía. Quedó sin confirmar; en nativo el problema no se reprodujo.

## Lo que falta cerrar

La vista nativa mide **55 ms** donde el banco aislado mide **24**. La diferencia
no está en el modelo sino alrededor: la vista procesa 640x480 en vez de 480x360,
y copia el cuadro dos veces antes de detectar —una al convertirlo a bitmap y otra
al espejarlo y rotarlo—. Es el objetivo de la etapa 2.

## Cómo medir

Compilar con `EXPO_PUBLIC_METRICS_URL` apuntando a `scripts/colector-metricas.py`
y usar la app; el colector escribe `metricas.jsonl` e imprime una mediana por
segundo. Sin esa variable la app no manda nada y se comporta igual que siempre.
