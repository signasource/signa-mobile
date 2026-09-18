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

## Etapa 2: el avatar 3D, también nativo

El avatar era `<model-viewer>` adentro de un WebView: por cada seña se levantaba
un WebView, se bajaba el runtime del visor de un CDN y recién entonces empezaba
a cargar el `.glb` —2,5 MB— otra vez. Ahora el motor (Filament) ya está en la
app, el archivo queda en disco y no hay una segunda máquina de JavaScript
compitiendo con el reconocimiento por el mismo teléfono.

| momento | tiempo |
|---|---|
| primera vez (bajar + convertir texturas + armar) | 2375 ms + 203 ms |
| las siguientes (leer de disco + armar) | 11 ms + 186 ms |

Medido en el emulador, que para esto sirve: lo que se compara es contra sí
mismo. Lo que importa es la segunda fila: **195 ms** contra un WebView que
arrancaba de cero cada vez.

Tres cosas que costaron encontrar, todas invisibles salvo por una línea de log:

**Las texturas venían en webp** (`EXT_texture_webp`) y Filament no las
decodifica. El modelo cargaba entero, sin un error a la vista, y se veía todo
negro. Se decodifican con el decodificador de Android y se reescribe el `.glb`,
una sola vez por avatar (`Glb.kt`).

**JSONObject escapa las barras**: al reescribir el archivo, `image/jpeg` salía
como `image\/jpeg`, que es JSON válido pero ya no coincide con el tipo que
busca el cargador. Las texturas volvían a quedar sin cargar, con el mismo
síntoma de antes.

**Desprenderse de la ventana no es irse.** Al agrandar el picture-in-picture,
React saca la vista y la vuelve a poner en otro lugar del árbol; desarmando el
motor en `onDetachedFromWindow`, el avatar agrandado quedaba en blanco para
siempre. El desarmado va en `OnViewDestroys`. Al reconocedor le pasaba lo mismo
—habría perdido la cámara—, así que ahí también se separó: al desprenderse
suelta la cámara, que no puede quedar tomada, y el resto se desarma al destruir.

Además hay un solo motor de Filament para todos los avatares (`MotorFilament`):
cada motor levanta su hilo y su contexto de GPU, y hay pantallas con seis
avatares a la vez.

### Un accessor vacío que costaba la animación entera

El avatar cargaba perfecto —222 entidades, esqueleto, texturas— y se quedaba
clavado en la pose del primer cuadro: el animador informaba CERO clips. No era
la conversión de texturas (pasaba igual con el .glb original), ni haber liberado
los datos de origen, ni la instancia implícita.

Lo que lo destrabó fue cargar un modelo animado ajeno, de la colección de
ejemplos de Khronos: **ese sí animaba**. O sea que el motor estaba bien y el
problema era el archivo. Y efectivamente: de los 595 canales de la animación,
uno —el de `weights`, que mueve los ojos— apunta a un accessor **sin
bufferView**, es decir sin datos de dónde leer. three.js lo deja pasar tratándolo
como ceros; el cargador de Filament es estricto y descarta la animación entera,
sin un solo error.

Se le dan sus bytes en cero en el conversor, que es exactamente lo que el otro
cargador venía suponiendo. Los accessors de Draco también vienen sin bufferView
pero ésos los rellena la extensión al descomprimir, así que se saltean.

El avatar nativo queda como predeterminado; `EXPO_PUBLIC_AVATAR_WEBVIEW=1`
vuelve al WebView sin tocar nada más.

## Etapa 3: el abecedario

El otro ejercicio de cámara —deletrear— pasa al mismo camino nativo. Comparte
todo lo de antes (cámara, MediaPipe, reparto de manos, esqueleto, confirmación)
y cambia sólo lo que decide: en vez de una ventana de 2,5 s, el cuadro que tiene
delante, porque una letra ES una postura sostenida y no un movimiento.

Las 514 features que el modelo mira —coordenadas canónicas, distancias, ángulos
de articulación— ya venían calculadas adentro del grafo, así que del lado de la
app sólo hay que pasarle los landmarks. Lo único que se calcula afuera es el
bloque de cara: dónde está la mano respecto de los ojos, medido en unidades de
"ojos a boca", que es lo que separa letras con la misma forma de dedos hechas a
distinta altura.

Tres formas de arruinarlo, ninguna de las cuales da error:

- **El orden de las entradas.** El grafo recibe tres tensores y no los espera en
  el orden en que se declararon al exportar: se los ubica por nombre.
- **La mano izquierda.** El dataset trata todas las manos como derechas, así que
  una izquierda va espejada en x — y el bloque de cara se calcula con la mano
  SIN espejar, espejando después sólo su x.
- **El bloque de cara**, que es la única parte que se calcula por fuera del
  grafo y por lo tanto la única que puede desincronizarse del entrenamiento.

Las tres las cubre el golden, que ahora contrasta también el abecedario contra
Python: **diferencia 0,0000**, bloque de cara incluido.

## Lo que falta cerrar

Medir la etapa 2 en el teléfono: cuánto bajó el cuadro con los 480 px, cuánto
pesa la LSTM nativa (en WebView eran 4 ms) y cuánto tarda el avatar la segunda
vez contra lo que tardaba el WebView.

## Cómo medir

Compilar con `EXPO_PUBLIC_METRICS_URL` apuntando a `scripts/colector-metricas.py`
y `EXPO_PUBLIC_BUILD` con el nombre de la etapa; después usar la app. El colector
escribe `metricas.jsonl` e imprime una mediana por segundo. Sin esas variables la
app no manda nada y se comporta igual que siempre.

Para comparar etapas entre sí:

    python scripts/comparar-metricas.py

Agrupa por compilación y modo y saca medianas, descartando los primeros 6
segundos de cada sesión, que son calentamiento. Como la marca de compilación
viaja en cada lote, las corridas de distintas etapas se pueden acumular en el
mismo archivo y comparar después.

El banco tiene una pantalla con el MISMO avatar dibujado por los dos motores,
uno al lado del otro: es la única forma de comparar tiempos de carga sin cambiar
de teléfono, y sale en la misma corrida que todo lo demás.
