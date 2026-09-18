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

## Etapa 2: la inferencia también nativa

La ventana de 258 números, la LSTM y la confirmación pasaron a Kotlin, y la vista
dejó de informar métricas para informar **señas confirmadas**. Por el puente ya no
cruza nada por cuadro: sólo un resumen dos veces por segundo y la seña cuando se
da por hecha.

También se bajó el cuadro a 480 px de lado mayor antes de detectar, dentro de la
misma copia que ya se hacía para espejarlo y rotarlo, así que no agrega una
pasada. Era la mitad de la diferencia entre los 55 ms de la etapa 1 y los 24 del
banco aislado.

**Que dé lo mismo que Python no se asume, se comprueba.** El vector de 258
números se arma y se normaliza dos veces, una en cada lenguaje, y un error de un
índice o de escala no se ve: el modelo devuelve probabilidades igual de
plausibles, sólo que equivocadas, y se confunde con un problema de calibración.
`Golden.kt` corre secuencias reales del dataset por el camino nativo entero y las
compara contra lo que da el pipeline de Python: **diferencia 0,0000** en las cinco
clases. Además reproduce un clip cuadro por cuadro, con tiempos de cámara, para
comprobar que la seña llega a confirmarse y no sólo a puntuar bien.

**Un bug que sólo se veía al salir.** Al desmontar la vista se cerraban los
detectores desde el hilo principal mientras el hilo de análisis estaba adentro de
`detect()`: SIGSEGV, sin excepción de Java ni nada que mirar. Ahora se cierran
como última tarea de la cola del propio hilo que detecta.

## Un hallazgo del lado del modelo

Reproduciendo un clip de **reposo** por el camino de la app, el modelo devuelve
**hermano 0,996**. Por el camino de Python sobre el mismo clip devuelve reposo
0,861. La diferencia no es un error de puerto —el golden da 0,0000— sino la
ventana: al entrenar, los cuadros sin manos se sacan y los útiles se estiran para
llenar la ventana; en la app, los cuadros sin manos también se sacan pero los
demás conservan su tiempo, así que el hueco se rellena sosteniendo la última
posición. Ese sostener es lo que el modelo lee como "hermano".

Encaja con lo que se venía viendo en el teléfono: **hermano dispara demasiado
fácil**. La solución es del lado de ML —entrenar con ventanas armadas como las
arma la app, sosteniendo en los huecos— y no del lado de la app.

## Lo que falta cerrar

Medir la etapa 2 en el teléfono: cuánto bajó el cuadro con los 480 px y cuánto
pesa la LSTM nativa (en WebView eran 4 ms).

## Cómo medir

Compilar con `EXPO_PUBLIC_METRICS_URL` apuntando a `scripts/colector-metricas.py`
y usar la app; el colector escribe `metricas.jsonl` e imprime una mediana por
segundo. Sin esa variable la app no manda nada y se comporta igual que siempre.
