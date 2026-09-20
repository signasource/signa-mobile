# De WebView a nativo: el reconocimiento de señas, etapa por etapa

> Responsabilidad: contar qué se cambió, por qué, y qué dio cada medición.
> Para los números crudos y cómo reproducirlos, ver `rendimiento.md`.

Este documento cuenta la migración completa del reconocimiento de señas de la
app: de dónde partíamos, qué se probó, qué falló, y cuánto mejoró cada cosa.
Está escrito para alguien que no vivió el proceso, así que los términos se
explican la primera vez que aparecen.

## El punto de partida

La app reconocía señas con **MediaPipe** —la biblioteca de Google que, dada una
imagen, devuelve la posición de los puntos clave del cuerpo y de las manos— y
con dos modelos propios entrenados en `signa-ml`. Todo eso corría **dentro de un
WebView**: una ventana de navegador embebida en la app, con una página HTML que
abría la cámara, corría MediaPipe compilado a **WASM** (código nativo traducido
para correr dentro del navegador) y devolvía los resultados a React Native por
mensajes.

Esa decisión tenía una razón buena: el mismo código servía para la demo web, para
Android y para iOS. Y una consecuencia mala: **cada cuadro de video hacía un
viaje largo**.

    cámara → canvas del navegador → copia de la imagen → mensaje a otro hilo →
    WASM → resultado → mensaje de vuelta a React Native → dibujo del esqueleto

Medido en el teléfono del usuario, ese camino costaba **136-147 ms por cuadro**
en el ejercicio de señas dinámicas: 6 a 7 cuadros por segundo. La seña se hace
en un segundo y medio, así que el modelo la veía en unas diez fotos mal
repartidas.

## Cómo se decidió qué migrar

Antes de tocar nada se midió el reparto del tiempo dentro del cuadro, mandando
cada medición a un colector que corre en la máquina de desarrollo
(`scripts/colector-metricas.py`). El resultado fue contundente:

| parte del cuadro | costo |
|---|---|
| detección de manos y pose (MediaPipe) | ~97% |
| inferencia del modelo propio | 2-4 ms, ~2% |

O sea: **el modelo nunca fue el problema**. Todo el costo estaba en MediaPipe y,
sobre todo, en cómo se lo estaba alimentando. Eso definió el orden de las etapas.

También se hizo un banco de pruebas aislado: correr los MISMOS modelos de
MediaPipe con el runtime nativo de Android, sobre una imagen sintética, sin
cámara ni interfaz. Dio **24 ms** con GPU y **32 ms** con CPU, contra los 57-147
del WebView. Es decir que **la versión nativa por CPU le ganaba a la web por
GPU**: la diferencia no estaba en el hardware ni en el modelo, sino en el WASM y
en las copias de imagen.

Con eso, la migración dejó de ser una apuesta.

## Etapa 1 — la cámara y el esqueleto

Se escribió un módulo nativo de Android (`modules/signa-vision`, en Kotlin) con
una vista propia que hace tres cosas: abre la cámara con **CameraX** (la API de
Android para cámara), pasa cada cuadro a MediaPipe nativo, y dibuja el esqueleto
encima. A JavaScript no le cruza ningún punto: sólo un resumen dos veces por
segundo.

**Resultado: 55 ms y 12,6 cuadros por segundo**, contra 136-147 ms y 6-7,5.

Cinco problemas aparecieron y ninguno se veía en el emulador:

- **La cámara se armaba en el constructor de la vista**, cuando todavía no está
  adjunta a una ventana. Se salía por un `return` y nadie lo reintentaba: pantalla
  negra para siempre. Se movió a `onAttachedToWindow`.
- **La vista no acomodaba a sus hijos.** `ExpoView` es un contenedor que no
  posiciona a sus hijos: la previa quedaba de 0x0 píxeles, y una previa de tamaño
  cero nunca entrega superficie, así que la sesión de captura no se completaba.
  Sin error, sólo negro.
- **Los eventos deben empezar con `on`.** React Native rechaza en ejecución
  cualquier evento que no siga esa convención y tira la app abajo con el primero
  que se emite.
- **La cámara quedaba tomada al desmontar.** `bindToLifecycle` la ata a la
  ACTIVIDAD, no a la vista, así que el ejercicio siguiente conseguía un solo
  cuadro y se congelaba. Hay que soltarla explícitamente.
- **Sin respaldo a CPU.** En aparatos donde el delegado de GPU no abre, el
  reconocedor se quedaba sin detectores. Ahora cae a CPU, que sigue siendo tres
  veces mejor que el camino web.

Un detalle que costó encontrar: **MediaPipe 0.10.14 no publica binarios para
x86_64**, que es la arquitectura del emulador. Recién con la 0.10.35 se pudo
validar en emulador antes de compilar cada APK, y eso cambió el ritmo de trabajo.

## Etapa 2 — la inferencia

La ventana de datos, el modelo de señas y la confirmación pasaron también a
Kotlin. Vale la pena explicar qué es cada cosa:

- **La ventana**: el modelo de señas dinámicas no mira un cuadro, mira los
  últimos 2,5 segundos, remuestreados a 30 pasos parejos. Cada paso son 258
  números: 33 puntos del cuerpo con su visibilidad (132) más 21 puntos por mano
  (63 cada una).
- **La normalización**: esos números se expresan respecto del centro y del ancho
  de los hombros, para que la seña no dependa de dónde esté parada la persona ni
  de cuán lejos esté de la cámara.
- **La confirmación**: no alcanza con que el modelo diga "amigo" en un cuadro.
  Se exige que la probabilidad supere el umbral de esa seña durante **700 ms
  sostenidos**, y alcanza con que lo haga en el 60% de ese tiempo, no siempre.
  Ese 60% no es arbitrario: midiendo con señas bien hechas, la probabilidad
  supera el umbral en torno al 64% de los cuadros y se cae en el resto.
- **Verificación, no identificación**: el ejercicio ya sabe qué seña pidió, así
  que se compara la probabilidad de ESA contra su umbral, en vez de exigirle que
  le gane a todas las demás. Es una pregunta más fácil y es la que hace pasar a
  las señas que se reparten con una vecina parecida.

Portar todo eso a otro lenguaje tiene un riesgo que no se ve: **un error de un
índice o de escala no rompe nada**. El modelo devuelve probabilidades igual de
plausibles, sólo que equivocadas, y se confunde con un problema de calibración.

Por eso se armó una **prueba contra referencia** (`Golden.kt`): secuencias reales
del dataset, con las probabilidades que da el pipeline de Python, viajan dentro
de la app; al arrancar se corren por el camino nativo entero y se comparan.
**Diferencia: 0,0000** en las cinco clases. Además reproduce un clip cuadro por
cuadro, con tiempos de cámara, para comprobar que la seña llega a confirmarse y
no sólo a puntuar bien.

También se bajó el cuadro a 480 píxeles de lado mayor antes de detectar, dentro
de la misma copia que ya se hacía para espejarlo y rotarlo.

**Un bug que sólo aparecía al salir**: los detectores se cerraban desde el hilo
principal mientras el hilo de análisis estaba adentro de `detect()`. La app se
caía con SIGSEGV —una caída de código nativo, sin excepción de Java ni nada que
mirar— al salir del ejercicio. Ahora se cierran como última tarea de la cola del
propio hilo que detecta.

## Etapa 3 — el abecedario

El otro ejercicio de cámara, deletrear, pasó al mismo camino. Se parece menos de
lo que parece: una letra **es una postura**, no un movimiento, así que se decide
con el cuadro que tiene delante y no con 2,5 segundos de historia.

Las 514 características que ese modelo mira —coordenadas canónicas, distancias
entre puntos, ángulos de articulación— ya venían calculadas **adentro del propio
grafo del modelo**, una decisión que se tomó en `signa-ml` justamente para que no
haya forma de que el cálculo se desincronice entre entrenamiento y app. Lo único
que se calcula afuera es el **bloque de cara**: dónde está la mano respecto de los
ojos, medido en unidades de "ojos a boca". Varias letras de la LSA se distinguen
sólo por eso.

Tres formas silenciosas de arruinarlo, las tres cubiertas por la prueba contra
referencia (también **0,0000**):

- **El orden de las entradas.** El grafo recibe tres tensores y no los espera en
  el orden en que se declararon al exportar; se los ubica por nombre.
- **La mano izquierda.** El dataset trata todas las manos como derechas, así que
  una izquierda va espejada — y el bloque de cara se calcula con la mano SIN
  espejar, espejando después sólo su eje x.
- **El bloque de cara**, que es lo único fuera del grafo y por lo tanto lo único
  que puede quedar desincronizado.

## Los problemas que aparecieron después, y cómo se encontraron

### La app se cerraba sola

Desde afuera, una app que el sistema mata por memoria y una que se cae por un
error nativo se ven igual: la pantalla vuelve al escritorio. Reproducido en el
emulador, la memoria del proceso subía de 343 a 456 MB en seis vueltas de entrar
y salir de los ejercicios, siempre para arriba.

Medirlo desde la interfaz no servía —los toques automatizados no siempre entran y
lo que se mide termina siendo otra cosa—, así que la prueba se hizo desde Kotlin:
`estres(n, qué)` abre y cierra n veces cada pieza y devuelve cuánta memoria
nativa quedó. En una sola corrida quedó claro:

| pieza | por vuelta |
|---|---|
| modelo de señas | ~0 |
| modelo del abecedario | 154 KB |
| **detectores de MediaPipe** | **7396 KB** |

La causa: se intenta crear los detectores con delegado de GPU y, donde eso no
anda, **el de manos se crea bien y el de pose falla**. El de manos —7,8 MB de
modelo— quedaba abierto para siempre, y el intento fallido se repetía en cada
entrada al ejercicio. Se arregló cerrando el primero si el segundo falla, y
recordando qué delegado funcionó para no repetir el intento. La fuga bajó a
1,4 MB por vuelta y la memoria dejó de crecer: se estabiliza en 206 MB.

Como red de seguridad quedó `ultimaSalida()`, que le pregunta a Android por qué
murió el proceso la última vez y lo manda con las métricas. Filtra los procesos
aislados —el WebView corre su renderizador en uno aparte que el sistema mata y
revive todo el tiempo— porque esos registros tapaban el de la app.

### El esqueleto caía corrido

Reportado desde el teléfono: los puntos no caían sobre la mano sino a un costado,
y más chicos. Eran dos errores distintos:

- Yo dibujaba los puntos **estirados sobre toda la vista**, pero la previa de la
  cámara muestra la imagen **recortada** para llenarla (`FILL_CENTER`). Con
  proporciones distintas, los puntos no caen donde está la mano. Ahora se recorta
  igual que la previa, que es lo mismo que hace la demo web con `object-fit:
  cover`.
- Los **grosores estaban en píxeles crudos**. La demo dibuja en píxeles de CSS
  sobre un lienzo escalado por la densidad de pantalla, así que los mismos 2,4 se
  veían tres veces más finos en un teléfono. Ahora todo va en dp.

### Otros dos, más chicos

- **El toggle de trackeo sólo congelaba el esqueleto** en vez de borrarlo, y
  quedaba el último dibujo encima de la persona.
- **En el abecedario se enviaba un evento por cada cuadro sin mano** —treinta por
  segundo, cada uno moviendo estado en React— porque el freno de inferencias
  estaba después de la comprobación de mano en vez de antes. Medido: 1,7 fps
  contra 29,9 con el freno arriba.

## Dónde estamos

Medido en el teléfono del usuario, ejercicio de señas dinámicas:

| | WebView (antes) | nativo |
|---|---|---|
| detección de manos | 136-147 ms | 30-87 ms |
| detección de pose | 92-106 ms | 50-68 ms |
| inferencia | 4 ms | 1,5-13 ms |
| cuadros por segundo | 6-7,5 | 9,3-21,6 |

El rango es ancho a propósito: depende de cuánta gente y cuántas manos haya en
cuadro, del calor del teléfono y de qué más esté dibujando la app en ese momento.
La mejor corrida dio 21,6 fps con 30 ms por cuadro; la peor, 9,3 con 87.

## Lo que se aprendió por el camino

**El emulador sirve para que no se caiga, no para medir.** Ahí MediaPipe corre
por CPU con GL por software: los tiempos no se parecen a los de ningún teléfono.
Todos los números de este documento son de un teléfono real.

**Cada cosa que se porta necesita su prueba contra referencia.** Los errores de
portación no dan error: dan resultados plausibles y equivocados.

**Las medianas mienten si se mezclan aparatos.** Durante un rato el emulador y el
teléfono cayeron en la misma fila de la tabla y los números no querían decir
nada. Ahora se separan por delegado (GPU = teléfono, CPU = emulador).

**Medir barato y siempre.** Casi todos los problemas de esta migración se
encontraron por un número que no cerraba, no por mirar la pantalla.

## Lo que queda abierto

- **iOS**: el módulo nativo es sólo de Android. El camino WebView es el único que
  funcionaba ahí, así que sacarlo —son 39 MB de assets muertos en Android— es una
  decisión de producto antes que técnica.
- **El APK pesa 222 MB** y 158 son librerías nativas de cuatro arquitecturas.
  Partirlo por arquitectura lo baja a menos de la mitad.
- **Dos manos en el abecedario.** Para decidir la letra alcanza con una, pero el
  esqueleto se veía distinto entre ejercicios. Volvió a dos por pedido explícito;
  medido en el teléfono, con una mano el ejercicio daba 48 ms y 15 fps, y con dos
  ronda los 76 ms y 10 fps. Es reversible en una línea.
- **Un hallazgo para `signa-ml`**: reproduciendo un clip de *reposo* por la
  ventana que arma la app, el modelo devuelve **hermano con 0,996**. No es un
  error de portación —la prueba contra referencia da 0,0000— sino una diferencia
  entre cómo se arman las ventanas al entrenar y cómo las arma la app. Explica que
  *hermano* dispare demasiado fácil, y se corrige entrenando con ventanas armadas
  como las de la app.
