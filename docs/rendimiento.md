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

## Etapa 3 en un teléfono real

Primera corrida del usuario con la etapa 3, medida con el colector:

| | WebView (antes) | nativo (etapa 3) |
|---|---|---|
| manos | 136-147 ms | **83 ms** |
| pose | 92-106 ms | **55 ms** |
| inferencia | 4 ms | 4,6-10,5 ms |
| fps | 6-7,5 | **10,5** |

Casi la mitad de costo por cuadro y un 40% más de fps, con el delegado de GPU
funcionando. Es una mejora real pero no la que promete el banco aislado (24 ms),
y eso tiene explicación: en el ejercicio, además de detectar, hay un avatar 3D
dibujándose sobre la misma GPU y la LSTM corriendo en el mismo hilo.

### La app se cerraba sola

Reportado desde el teléfono: después de un rato de uso la app se cierra, sin
error. Es el cuadro típico de que el sistema la mata por memoria, y se reprodujo
en el emulador: entrando y saliendo de los ejercicios, la memoria del proceso
subía de 343 a 456 MB en seis vueltas, siempre para arriba.

Medirlo desde la interfaz no servía —los toques no siempre entran y lo que se
mide termina siendo otra cosa—, así que la prueba se hace desde Kotlin:
`estres(n, qué)` abre y cierra n veces cada pieza y devuelve cuánta memoria
nativa quedó. Ahí quedó claro en una sola corrida:

| pieza | por vuelta |
|---|---|
| modelo de señas | ~0 |
| modelo del abecedario | 154 KB |
| **detectores de MediaPipe** | **7396 KB** |

Eran dos cosas, las dos del mismo origen: se intenta crear los detectores con
delegado de GPU y, donde eso no anda, el de manos se crea bien y el de pose
tira. El de manos —7,8 MB de modelo— quedaba abierto para siempre, y encima el
intento fallido se repetía en cada entrada al ejercicio. Ahora el de manos se
cierra si el de pose falla, y el delegado que funcionó se recuerda para no
volver a intentar. Con eso la fuga de los detectores baja a 1,4 MB por vuelta y
la memoria del proceso deja de crecer: se estabiliza en 206 MB.

Además, los `.tflite` se abrían mapeando el archivo sin cerrar el descriptor,
y cada cuadro informa ahora la memoria nativa en uso, así una fuga se ve como
una recta que sube en las métricas del teléfono en vez de como una app que se
cierra sola.

### El avatar nativo, de vuelta atrás

También reportado desde el teléfono: los avatares de Filament se ven peor que
el del WebView —sin luz— y se mueven a tirones. Tiene sentido: la iluminación
es un ambiente plano de armónicos esféricos, no el entorno que arma
`model-viewer`, y encima compite por la GPU con MediaPipe.

Así que el avatar vuelve al WebView por omisión. `EXPO_PUBLIC_AVATAR_NATIVO=1`
enciende Filament para seguir trabajándolo: lo que falta es una imagen de
entorno de verdad y limitarle los cuadros por segundo mientras la cámara esté
encendida.

## Etapa 3, segunda vuelta: lo que se midió y lo que se cambió

Con las métricas del teléfono en la mano:

**La fuga se cerró.** La memoria nativa del proceso ya no crece: 166 MB al
entrar y 139-184 MB después de usar los ejercicios, sin la recta hacia arriba
que precedía a que la app se cerrara sola.

**El avatar del WebView era lo lento.** 2752 ms hasta verse contra 466 ms del
nativo, medidos en el mismo teléfono en la misma corrida. Por eso vuelve a
mandar el nativo, con las dos cosas que lo hacían ver mal ya arregladas:

- La iluminación era un ambiente parejo de una banda. Ahora son tres luces
  —principal, relleno más frío y contraluz— que es lo que da volumen cuando no
  hay un entorno real de por medio.
- El post-proceso estaba apagado "por rendimiento", y eso se llevaba puesto el
  mapeo de tonos: el color salía en lineal y todo se veía oscuro. Vuelve
  encendido; lo que se apaga son los extras que no aportan en un recuadro
  chico: antialias, bloom y tramado.
- Y se le puso un tope de 30 cuadros por segundo: la animación de una seña no
  gana nada con 60, y la GPU la está compartiendo con MediaPipe.

**Bajar la resolución de entrada no sirve.** Medido: a 320 px la detección
cuesta 14 ms contra 13 ms a 480, porque MediaPipe reescala a su propia entrada
igual. Lo único que se pierde al achicar es alcance. Queda en 480.

Lo que sí baja el costo sin cambiar de modelo:

- **Una sola mano en el abecedario.** Ese ejercicio mira una; pedirle dos a
  MediaPipe era pagar el seguimiento de una que después se descartaba.
- **Pose 1 de cada 8 cuadros** en vez de 1 de cada 5. Cada pose cuesta 55 ms en
  el teléfono y de ella sólo dependen la referencia de hombros y el bloque de
  cara, que se mueven lento.
- **El bitmap de detección se reusa.** Antes se creaba uno de medio megapíxel
  por cuadro, con su recolección de basura justo mientras se detecta.

## Lo que falta cerrar

Medir la etapa 2 en el teléfono: cuánto bajó el cuadro con los 480 px, cuánto
pesa la LSTM nativa (en WebView eran 4 ms) y cuánto tarda el avatar la segunda
vez contra lo que tardaba el WebView.

## Cómo compilar liviana

Por omisión el APK se empaqueta para cuatro arquitecturas y cada una lleva su
copia de MediaPipe, TensorFlow Lite y Filament: **158 de 222 MB son eso**, y un
teléfono usa una sola. Para una APK de prueba alcanza con pedir la que hace
falta:

    # teléfono
    sh android/gradlew -p android assembleRelease -PreactNativeArchitectures=arm64-v8a
    # emulador
    sh android/gradlew -p android assembleRelease -PreactNativeArchitectures=x86_64

De 222 MB a **103 MB**, que es lo que se nota al descargarla e instalarla. Para
publicar conviene un App Bundle, que le manda a cada teléfono sólo lo suyo sin
tener que elegir a mano.

Lo que queda adentro después de eso: 39 MB de librerías nativas, ~22 MB de
modelos (abecedario, manos, pose) y **otros ~33 MB del motor web del
reconocimiento**, que lleva su propia copia de los tres modelos más el runtime
de MediaPipe en WASM. Ese motor ya no lo usa ningún ejercicio en Android: sacarlo
es la decisión pendiente de iOS.

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
