# El avatar 3D de `<model-viewer>` a Filament

> Por qué se cambió el motor 3D, qué se ganó y qué se perdió.

## Qué había antes

Cada avatar era un **`<model-viewer>`** el componente web de Google para mostrar
modelos 3D adentro de un **WebView**, la ventana de navegador embebida. Para
mostrar una seña, la app

1. levantaba un WebView,
2. bajaba el runtime del visor de un CDN (jsDelivr) por internet,
3. bajaba el archivo `.glb` del modelo (2,5 MB) del bucket,
4. lo decodificaba y recién ahí empezaba a animar.

Eso, por cada avatar y cada vez que se montaba. Medido en el teléfono del
usuario: **2752 ms hasta verse**. Y mientras tanto había una segunda máquina de
JavaScript compitiendo por el mismo teléfono que estaba reconociendo señas.

Lo bueno: andaba en Android y en iOS con el mismo código, y `model-viewer` es
tolerante le pasás cualquier `.glb` y hace lo posible.

## Qué hay ahora

El motor 3D vive dentro de la app **Filament**, el motor de renderizado de
Google, en Kotlin. La app carga el `.glb`, lo guarda en disco, arma la escena y
la dibuja ella misma.

**Medido en el mismo teléfono 466 ms hasta verse**, contra 2752 ms. Con el
archivo ya en disco, son ~250 ms.

## Los cuatro problemas que hubo que resolver

### El modelo se veía todo negro

Filament cargaba el modelo entero —222 entidades, el esqueleto, las mallas— y lo
dibujaba sin texturas. Un solo renglón en el log: `Missing texture provider for
image/webp`.

Los `.glb` traen las texturas en **webp** ( imagen comprimida).
`model-viewer` se las pide al navegador, que sabe decodificarlo el cargador de
Filament sólo entiende PNG, JPEG y KTX2. Solución provisoria que hice fue que la app decodifica las texturas con el decodificador de Android y reescribe el archivo, una vez por
avatar, guardando el resultado en disco.

###  El avatar se quedaba en la pose del primer cuadro

El modelo cargaba perfecto y no se movía el animador informaba **cero clips**.
Descartadas una por una la conversión de texturas, la liberación de datos de
origen y la forma de instanciar el modelo, lo que destrabó el problema fue cargar
un modelo animado ajeno de la colección de ejemplos de Khronos, los que
mantienen el formato que **sí animaba**. O sea el motor estaba bien y el
problema era el archivo.

### Se veía plano y oscuro

`model-viewer` trae un cuarto de estudio por omisión —paredes, techo, piso y
unos paneles de luz— y el modelo se ilumina con eso, no con focos sueltos. Eso
es lo que le da volumen a un modelo PBR (el modelo de materiales que simula cómo
se comporta la luz real sobre cada superficie).

Acá el mismo cuarto entra por dos lados, porque un material PBR tiene dos
mitades:

- **La difusa** —el color que devuelve una superficie mate— son nueve
  coeficientes por color: cuánta luz llega de cada dirección, resumido. Los
  calcula `signa-ml/scripts/avatares/entorno_estudio.py`.
- **La especular** es el cuarto REFLEJADO en la superficie, y para eso no
  alcanza un resumen: hace falta el cuarto como imagen. Es un cubemap de 128
  píxeles por cara que arma `reflejos_estudio.py`; el desenfoque por rugosidad
  lo hace el motor en la GPU al cargarlo.

**Sin la segunda mitad todo queda mate y liso**: la piel de un solo tono en vez
de tener variaciones, el pelo sin hilo, la tela sin trama. Es lo que más se
notaba contra el visor web, y no se arregla subiendo o bajando luces.

Encima van dos focos para los brillos marcados, el mismo mapeo de tonos que usa
`model-viewer` (PBR Neutral, de Khronos) y un punto menos de saturación.

Medido contra el visor web sobre la misma seña, comparando la región del avatar:

| | nativo | visor web |
|---|---|---|
| brillo medio | 191,6 | 192,8 |
| contraste | 61,0 | 62,1 |
| sombras (percentil 10) | 100,7 | 91,0 |
| saturación | 41,8 | 39,7 |
| micro-detalle | **4,21** | 3,69 |


### Iba a tirones

Se le puso un **tope de 30 cuadros por segundo** una animación de seña no gana
nada con 60, y la GPU la está compartiendo con MediaPipe, que es lo que de verdad
no puede esperar. Además hay **un solo motor de Filament** para todos los
avatares: cada motor levanta su propio hilo y su propio contexto de GPU, y hay
pantallas con varios avatares a la vez.

### La app se cerraba sola en el ejercicio de deletrear

No era GPU ni hilos era una **validación de datos**. Filament admite hasta 256
huesos por malla (`CONFIG_MAX_BONE_COUNT`), y los avatares de las letras **M y
N** vienen con un esqueleto de **574** el resto del bucket tiene 198. Cuando
un modelo se pasa de ese límite, Filament no devuelve error: lanza una excepción
de C++ que, cruzando el JNI, **aborta el proceso entero**. El nombre con el que
se probaba empezaba con M.

La solución de fondo es del lado de los archivos reexportar M y N con el mismo
esqueleto que los demás. Mientras tanto, la app no se cae.

## Ventajas y desventajas del cambio

**A favor**

- Seis veces más rápido en aparecer (2752 → 466 ms; ~250 ms con caché).
- No hay una segunda máquina de JavaScript compitiendo con el reconocimiento.
- No depende de bajar un runtime de un CDN sin internet, el avatar igual está.
- Control real sobre el costo se le puede poner tope de cuadros, apagar
  post-proceso, compartir el motor.

**En contra**

- **Sólo Android.** `model-viewer` andaba en los dos.
- **El cargador es estricto.** Los dos primeros problemas de arriba no existían
  en la versión web porque three.js perdona archivos mal formados.
- **Pesa en el APK**: las librerías de Filament son ~25 MB por arquitectura.
- **La iluminación hay que armarla a mano.** `model-viewer` trae un entorno por
  omisión que se ve bien sin configurar nada.

## Sobre los formatos de textura webp, JPEG y KTX2

**Comprimir para guardar y transmitir** (webp, JPEG, PNG) achica el archivo para
que ocupe poco y viaje rápido. Para dibujar con esa imagen, primero hay que
**decodificarla**: convertirla a píxeles sueltos en memoria. Una textura de
1024×1024 ocupa 4 MB en crudo, comprima lo que comprima el archivo.

**Comprimir para la GPU** (KTX2/Basis) la imagen queda comprimida también
mientras se dibuja. La GPU lee bloques comprimidos directamente, sin
decodificar nada. Ocupa menos memoria de video y no hay que gastar CPU en
desarmarla.

Con eso, los tres formatos:

| | webp (hoy) | JPEG | KTX2 |
|---|---|---|---|
| ¿lo lee Filament? | **no** | sí | sí |
| ¿lo lee `model-viewer`? | sí | sí | sí, con su transcodificador |
| tamaño del `.glb` (madre) | 2,48 MB | 3,98 MB | 3,51 MB |
| tiempo hasta verse, primera vez | 1946 ms | 1532 ms | 1637 ms |
| **tiempo hasta verse, con caché** | 383 ms | 293 ms | **257 ms** |
| memoria de video | alta (descomprimida) | alta | **baja (comprimida)** |

Por qué webp no lo lee Filament no es un capricho, es que su cargador incluye
decodificadores para unos pocos formatos y webp no está entre ellos en la
compilación para Android. `model-viewer` no necesita incluir nada porque le pide
la decodificación al navegador, que ya sabe.

Por qué KTX2 termina siendo el más rápido los otros dos hay que decodificarlos
en el teléfono CPU y memoria antes de subirlos a la GPU. El KTX2 se sube tal
como viene. Por eso gana en el número que importa, que es el de todos los días
el avatar con el archivo ya bajado.

Y por qué webp igual es el más chico para bajar está pensado exactamente para
eso. El intercambio real es **1 MB más de descarga la primera vez** a cambio de
**sacar la conversión del teléfono** (que en el teléfono del usuario costaba
~2 segundos por avatar) y de menos memoria de video mientras se usa.

## Qué implicaría reemplazar los archivos del servidor

Hoy la app arregla los `.glb` en el teléfono decodifica las texturas y rellena
el accessor vacío, la primera vez que ve cada avatar, y guarda el resultado en
disco. Funciona, pero paga ~2 segundos la primera vez **en cada teléfono y para
cada avatar**, justo cuando la cámara y MediaPipe están trabajando.

Me puse a pasar todas las señas de gbl a ktx2.

Sobre las 25 señas y letras que hoy existen en el bucket, el resultado
fue las letras quedaron un poco **más chicas** que el original (2,46 vs 2,52 MB)
y las señas más grandes (madre 2,48 → 3,51 MB; `abuelo` y `amigo`, que traen
texturas más pesadas, 4,8 → 8,2 MB). Esos dos últimos valen un ajuste de calidad
de compresión antes de subir.


## Cómo preparar los archivos

`signa-ml/scripts/avatares/preparar.sh` toma una carpeta de `.glb` y deja otra
lista para el motor nativo. Hace, en orden:

1. **Poda los huesos que la malla no usa.** Es lo único que puede tumbar la app:
   arriba de 256, Filament aborta el proceso. M y N pasan de 574 a 196.
2. **Saca lo que no se ve**: canales de animación que mueven huesos que ya no
   deforman nada (en M, 1723 → 859), llaves repetidas, vértices duplicados y
   nodos sueltos (288 en M).
3. **Arregla el accessor sin datos** que le hace descartar la animación entera,
   y pasa las texturas webp a un formato que el cargador entienda.
4. **Achica las texturas a 1024** y las comprime a **KTX2**, que es el formato
   que la GPU lee sin decodificar.
5. **Recomprime las mallas con Draco.**

    cd signa-ml/scripts/avatares
    npm install                       # una sola vez
    ./preparar.sh -e originales -s listos --ktx ~/KTX-Software/usr/bin

Necesita `python3` con Pillow, `node`, y la herramienta `ktx` de Khronos, que se
baja como un binario suelto.

Resultado sobre los archivos de hoy:

| | original | preparado |
|---|---|---|
| M (el que tumbaba la app) | 2,76 MB | **2,47 MB** |
| madre | 2,42 MB | 3,17 MB |
| abuelo / amigo | 4,68 MB | **3,32 MB** |

Las señas comunes crecen algo —KTX2 ocupa lo mismo por píxel comprima lo que
comprima el contenido— y a cambio se ahorran los ~2 segundos de conversión que
hoy paga cada teléfono la primera vez que ve cada avatar.

### Lo que NO conviene tocar

- **Simplificar la malla** (menos triángulos): es lo único que cambia cómo se ve
  la seña. Las manos son justamente donde se concentra el detalle.
- **Bajar de 1024 las texturas**: se nota al agrandar el avatar, que es cuando
  la persona lo está mirando de cerca para copiar la seña.

## Caché en disco y texturas que no corresponden

`AvatarView.descargar()` guarda el `.glb` en `cacheDir/avatares2/<hash de la URL>.glb` y la versión
convertida (`Glb.sinWebp`) al lado, como `.filament<VERSION_CONVERSION>`.

**Carrera conocida (arreglada, sin verificar en el teléfono).** `LessonScreen` monta el bloque actual y
el siguiente. Si los dos muestran la misma seña —presentarla y preguntarla—, cada vista bajaba y
convertía el mismo archivo en su propio hilo, escribiendo al mismo `.parcial`: quedaba en disco una
mezcla de ambos y el avatar se veía con texturas que no eran, hasta borrar la caché. Ahora la descarga y
la conversión van dentro de un `synchronized` por ruta. El directorio pasó de `avatares/` a `avatares2/`
para descartar los archivos que ya hubieran quedado dañados.

Si vuelve a pasar, el botón de recarga del avatar no lo arregla (remonta la vista, no toca el disco):
anotar la seña y mirar `adb logcat -s SignaAvatar`.
