# El avatar 3D: de `<model-viewer>` a Filament

> Responsabilidad: por qué se cambió el motor 3D, qué se ganó y qué se perdió.
> Para la migración del reconocimiento, ver `migracion-nativa.md`.

## Qué había antes

Cada avatar era un **`<model-viewer>`** —el componente web de Google para mostrar
modelos 3D— adentro de un **WebView**, la ventana de navegador embebida. Para
mostrar una seña, la app:

1. levantaba un WebView,
2. bajaba el runtime del visor de un CDN (jsDelivr) por internet,
3. bajaba el archivo `.glb` del modelo (2,5 MB) del bucket,
4. lo decodificaba y recién ahí empezaba a animar.

Eso, por cada avatar y cada vez que se montaba. Medido en el teléfono del
usuario: **2752 ms hasta verse**. Y mientras tanto había una segunda máquina de
JavaScript compitiendo por el mismo teléfono que estaba reconociendo señas.

Lo bueno: andaba en Android y en iOS con el mismo código, y `model-viewer` es
tolerante — le pasás cualquier `.glb` y hace lo posible.

## Qué hay ahora

El motor 3D vive dentro de la app: **Filament**, el motor de renderizado de
Google, en Kotlin. La app carga el `.glb`, lo guarda en disco, arma la escena y
la dibuja ella misma.

**Medido en el mismo teléfono: 466 ms hasta verse**, contra 2752 ms. Con el
archivo ya en disco, son ~250 ms.

## Los cuatro problemas que hubo que resolver

### 1. El modelo se veía todo negro

Filament cargaba el modelo entero —222 entidades, el esqueleto, las mallas— y lo
dibujaba sin texturas. Un solo renglón en el log: `Missing texture provider for
image/webp`.

Los `.glb` traen las texturas en **webp** (un formato de imagen comprimida).
`model-viewer` se las pide al navegador, que sabe decodificarlo; el cargador de
Filament sólo entiende PNG, JPEG y KTX2. Solución provisoria: la app decodifica
las texturas con el decodificador de Android y reescribe el archivo, una vez por
avatar, guardando el resultado en disco.

### 2. El avatar se quedaba en la pose del primer cuadro

El modelo cargaba perfecto y no se movía: el animador informaba **cero clips**.
Descartadas una por una la conversión de texturas, la liberación de datos de
origen y la forma de instanciar el modelo, lo que destrabó el problema fue cargar
un modelo animado ajeno —de la colección de ejemplos de Khronos, los que
mantienen el formato— que **sí animaba**. O sea: el motor estaba bien y el
problema era el archivo.

Y efectivamente: de los 595 canales de la animación, uno —el que mueve los
ojos— apunta a un **accessor sin `bufferView`**. Un *accessor* es la descripción
de cómo leer un pedazo de datos (cuántos, de qué tipo, desde dónde); sin
`bufferView` no dice desde dónde, o sea que no tiene datos. three.js lo deja
pasar tratándolo como ceros; el cargador de Filament es estricto y **descarta la
animación entera**, sin un solo error.

Se le dan sus bytes en cero, que es exactamente lo que el otro cargador venía
suponiendo.

### 3. Se veía plano y oscuro

Dos causas, las dos mías:

- **La iluminación era un ambiente parejo de una sola banda.** `model-viewer`
  trae un entorno de estudio y eso es lo que le da volumen a un modelo PBR (el
  modelo de materiales que simula cómo se comporta la luz real sobre cada
  superficie). Ahora hay **tres luces**: principal, relleno más frío del otro
  lado, y contraluz que despega la silueta del fondo.
- **El post-proceso estaba apagado "por rendimiento"**, y eso se llevaba puesto
  el **mapeo de tonos** (la conversión de los valores de luz calculados a los
  colores que la pantalla puede mostrar). Sin él, el color sale en lineal y todo
  se ve apagado. Vuelve encendido; lo que se apaga son los extras que no aportan
  nada en un recuadro chico: antialias, bloom y tramado.

### 4. Iba a tirones

Se le puso un **tope de 30 cuadros por segundo**: una animación de seña no gana
nada con 60, y la GPU la está compartiendo con MediaPipe, que es lo que de verdad
no puede esperar. Además hay **un solo motor de Filament** para todos los
avatares: cada motor levanta su propio hilo y su propio contexto de GPU, y hay
pantallas con varios avatares a la vez.

Para poder discutir la fluidez con números y no con impresiones, la vista informa
cada dos segundos **cuadros por segundo reales, milisegundos por cuadro y el peor
cuadro de la tanda**. El peor importa: un promedio de 30 con un tirón de 200 ms se
siente mal igual.

## Ventajas y desventajas del cambio

**A favor**

- Seis veces más rápido en aparecer (2752 → 466 ms; ~250 ms con caché).
- No hay una segunda máquina de JavaScript compitiendo con el reconocimiento.
- No depende de bajar un runtime de un CDN: sin internet, el avatar igual está.
- Control real sobre el costo: se le puede poner tope de cuadros, apagar
  post-proceso, compartir el motor.

**En contra**

- **Sólo Android.** `model-viewer` andaba en los dos.
- **El cargador es estricto.** Los dos primeros problemas de arriba no existían
  en la versión web porque three.js perdona archivos mal formados.
- **Pesa en el APK**: las librerías de Filament son ~25 MB por arquitectura.
- **La iluminación hay que armarla a mano.** `model-viewer` trae un entorno por
  omisión que se ve bien sin configurar nada.

## Sobre los formatos de textura: webp, JPEG y KTX2

Esta es la parte que más confusión genera, así que conviene separar dos cosas que
suenan parecidas pero pasan en momentos distintos.

**Comprimir para guardar y transmitir** (webp, JPEG, PNG): achica el archivo para
que ocupe poco y viaje rápido. Para *dibujar* con esa imagen, primero hay que
**decodificarla**: convertirla a píxeles sueltos en memoria. Una textura de
1024×1024 ocupa 4 MB en crudo, comprima lo que comprima el archivo.

**Comprimir para la GPU** (KTX2/Basis): la imagen queda comprimida **también
mientras se dibuja**. La GPU lee bloques comprimidos directamente, sin
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

Por qué webp no lo lee Filament: no es un capricho, es que su cargador incluye
decodificadores para unos pocos formatos y webp no está entre ellos en la
compilación para Android. `model-viewer` no necesita incluir nada porque le pide
la decodificación al navegador, que ya sabe.

Por qué KTX2 termina siendo el más rápido: los otros dos hay que decodificarlos
en el teléfono —CPU y memoria— antes de subirlos a la GPU. El KTX2 se sube tal
como viene. Por eso gana en el número que importa, que es el de todos los días:
el avatar con el archivo ya bajado.

Y por qué webp igual es el más chico para bajar: está pensado exactamente para
eso. El intercambio real es **1 MB más de descarga la primera vez** a cambio de
**sacar la conversión del teléfono** (que en el teléfono del usuario costaba
~2 segundos por avatar) y de **menos memoria de video** mientras se usa.

## Qué implicaría reemplazar los archivos del servidor

Hoy la app arregla los `.glb` en el teléfono: decodifica las texturas y rellena
el accessor vacío, la primera vez que ve cada avatar, y guarda el resultado en
disco. Funciona, pero paga ~2 segundos la primera vez **en cada teléfono y para
cada avatar**, justo cuando la cámara y MediaPipe están trabajando.

Hacerlo una vez en origen es el mismo trabajo, pero hecho una sola vez para
todos. La cadena ya está armada y probada:

1. `signa-ml/scripts/arreglar_glb.py` — decodifica las texturas webp, las
   reescribe, reapunta las referencias y le da sus bytes al accessor vacío.
2. `gltf-transform etc1s` — comprime esas texturas a KTX2. Necesita la
   herramienta `ktx` de Khronos, que se baja como un binario suelto.
3. `gltf-transform draco` — vuelve a comprimir las mallas con Draco, el
   compresor de geometría que los archivos ya usaban.

Corrida sobre las 25 señas y letras que hoy existen en el bucket, el resultado
fue: las letras quedaron un poco **más chicas** que el original (2,46 vs 2,52 MB)
y las señas más grandes (madre 2,48 → 3,51 MB; `abuelo` y `amigo`, que traen
texturas más pesadas, 4,8 → 8,2 MB). Esos dos últimos valen un ajuste de calidad
de compresión antes de subir.

Lo que hay que hacer, entonces:

- **Subir los archivos convertidos al bucket**, reemplazando los actuales. Eso
  requiere credenciales de R2, que no tengo.
- **Confirmar que `model-viewer` lea KTX2** si se decide mantener el camino web
  para iOS. Lo soporta, pero conviene verificarlo con un archivo real antes de
  reemplazar nada.
- **Sacar el conversor del teléfono** una vez que los archivos estén arriba: son
  ~150 líneas de Kotlin y un paso menos en cada primera carga.

Mientras tanto, la app funciona con los dos: si el origen nuevo no responde, cae
sola al bucket de siempre.
