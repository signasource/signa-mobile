package com.signa.vision

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.util.Log
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.DynamicRange
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.Executors

/**
 * Cámara, detección y esqueleto, todo del lado nativo.
 *
 * La versión web hacía: cámara → canvas espejado → createImageBitmap →
 * postMessage al worker → WASM. Dos copias del frame y un cruce de hilos por
 * cuadro, y medía 57-147 ms de detección de manos. Acá el frame va del
 * analizador de CameraX al detector sin copias intermedias, y el mismo modelo
 * midió 24 ms en este teléfono.
 *
 * A JS sólo se le mandan eventos: nunca 75 puntos por cuadro. El esqueleto se
 * dibuja acá mismo.
 */
/** Los 21 puntos de una mano, o nada si no se detectó. */
private typealias Manos = List<NormalizedLandmark>?

@SuppressLint("ViewConstructor")
class ReconocedorView(contexto: Context, appContext: AppContext) : ExpoView(contexto, appContext) {

  // Los nombres empiezan con "on" por obligación de React Native: los mapea a
  // "topOnFrame"/"topOnListo" y rechaza en ejecución cualquier evento que no
  // siga esa convención, tirando la app abajo apenas se emite el primero.
  private val onFrame by EventDispatcher()
  private val onListo by EventDispatcher()
  private val onSena by EventDispatcher()
  private val onConfirmada by EventDispatcher()

  private val vista = PreviewView(contexto).apply {
    implementationMode = PreviewView.ImplementationMode.PERFORMANCE
    scaleType = PreviewView.ScaleType.FILL_CENTER
  }
  private val esqueleto = Esqueleto(contexto)
  private val hilo = Executors.newSingleThreadExecutor()

  /** Se reusa entre cuadros; sólo se rehace si cambia el tamaño. */
  private var lienzoDetección: Bitmap? = null
  private val filtro = android.graphics.Paint(android.graphics.Paint.FILTER_BITMAP_FLAG)

  @Volatile private var detectores: Detectores? = null
  @Volatile private var soltando = false
  private var proveedorCamara: ProcessCameraProvider? = null
  @Volatile private var reconocedor: Reconocedor? = null
  private var ultimoAviso = 0L
  private var cuadros = 0
  private var desdeFps = System.currentTimeMillis()
  private var fps = 0.0

  var mostrarEsqueleto = true
    set(valor) {
      field = valor
      // Apagarlo tiene que BORRAR lo dibujado: si sólo se deja de actualizar,
      // queda el último esqueleto congelado encima de la persona, que es peor
      // que tenerlo prendido.
      if (!valor) post { esqueleto.limpiar() }
    }
  var activo = true

  /**
   * Qué modelo decide: las señas dinámicas sobre una ventana de 2,5 s, o el
   * abecedario sobre el cuadro de ahora. Cambiarlo rearma el reconocedor.
   */
  var modo = "dinamico"
    set(valor) {
      if (field == valor) return
      field = valor
      val anterior = reconocedor
      reconocedor = null
      hilo.execute { anterior?.cerrar() }
    }

  /**
   * Señas que este ejercicio acepta. Con la lista vacía no se infiere nada: la
   * vista queda como cámara con esqueleto y no paga ni el modelo ni la ventana.
   */
  var objetivos: List<String> = emptyList()
    set(valor) {
      field = valor
      // Soltar la confirmación anterior, o la seña recién hecha quedaría
      // trabada al pasar al ejercicio siguiente.
      reconocedor?.objetivos = valor
    }

  // Frontal siempre, salvo para probar: en el emulador la frontal está mapeada
  // a la webcam del host y puede no entregar cuadros, mientras que la trasera
  // es una escena sintética que anda siempre.
  var usarTrasera = false
    set(valor) {
      field = valor
      if (armada) { armada = false; arrancar() }
    }

  init {
    addView(vista, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    addView(esqueleto, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  /**
   * ExpoView es un ViewGroup que NO acomoda a sus hijos: React Native le da
   * tamaño a esta vista, pero la previa y el lienzo quedaban en 0x0. Una previa
   * de tamaño cero nunca entrega superficie, y sin superficie la sesión de
   * captura no se completa: pantalla negra y cero cuadros, sin ningún error.
   */
  override val shouldUseAndroidLayout = true

  override fun onLayout(cambio: Boolean, izq: Int, arr: Int, der: Int, aba: Int) {
    val ancho = der - izq
    val alto = aba - arr
    for (i in 0 until childCount) {
      val hijo = getChildAt(i)
      hijo.measure(
        MeasureSpec.makeMeasureSpec(ancho, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(alto, MeasureSpec.EXACTLY),
      )
      hijo.layout(0, 0, ancho, alto)
    }
  }

  // En el constructor la vista todavía no está en una ventana y la actividad
  // puede no estar disponible: si se intenta armar la cámara ahí, se sale por
  // el `return` y nadie vuelve a intentarlo nunca. Al adjuntarse ya existe todo.
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    arrancar()
  }

  private var armada = false
  private var avisadoDeFallo = false

  private fun arrancar() {
    if (armada) return
    val duenio = appContext.currentActivity as? LifecycleOwner
    if (duenio == null) {
      Log.w(ETIQUETA, "sin actividad todavía; se reintenta al próximo layout")
      post { arrancar() }
      return
    }
    armada = true
    Log.i(ETIQUETA, "armando cámara")
    val futuro = ProcessCameraProvider.getInstance(context)
    futuro.addListener({
      try {
      val proveedor = futuro.get()
      proveedorCamara = proveedor

      // Rango dinámico estándar y explícito: dejándolo en automático, CameraX
      // pregunta al aparato qué perfiles soporta, y hay HAL que informan uno
      // que ninguna versión sabe convertir (visto: "profile ... 8192"), lo que
      // tira abajo el enlazado entero. Para reconocer señas no hace falta HDR.
      val previa = Preview.Builder()
        .setDynamicRange(DynamicRange.SDR)
        .build()
        .also { it.setSurfaceProvider(vista.surfaceProvider) }

      // Configuración mínima a propósito: pedir una resolución puntual y un
      // formato de salida distinto del natural hacía que la sesión de captura
      // no llegara a abrirse nunca —cinco timeouts seguidos y la pantalla en
      // negro—. Con los valores por omisión, CameraX elige una combinación que
      // el aparato soporta seguro. Lo único que se conserva es descartar el
      // cuadro que llega mientras se procesa el anterior: el esqueleto tiene
      // que mostrar el presente, no una cola de pasado.
      val analisis = ImageAnalysis.Builder()
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        // RGBA y no el YUV natural: la conversión a bitmap queda directa y no
        // depende de cómo entregue el plano cada aparato.
        .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
        .build()

      analisis.setAnalyzer(hilo) { imagen ->
        try {
          if (activo && !soltando) procesar(imagen)
        } catch (e: Throwable) {
          // Sin este catch, una excepción en el primer cuadro mata el hilo de
          // análisis sin decir nada: la pantalla queda en negro para siempre y
          // no hay forma de saber por qué.
          if (!avisadoDeFallo) {
            avisadoDeFallo = true
            Log.e(ETIQUETA, "falló al procesar el cuadro", e)
            post { onListo(mapOf("fase" to "error", "error" to ("cuadro: " + (e.message ?: e.toString())))) }
          }
        } finally {
          imagen.close()
        }
      }

      val selector =
        if (usarTrasera) CameraSelector.DEFAULT_BACK_CAMERA else CameraSelector.DEFAULT_FRONT_CAMERA
      proveedor.unbindAll()
      try {
        proveedor.bindToLifecycle(duenio, selector, previa, analisis)
        Log.i(ETIQUETA, "cámara enlazada con previa")
      } catch (e: Throwable) {
        // Segundo intento sin la previa. El reconocimiento sólo necesita los
        // cuadros del analizador; la imagen en pantalla es deseable pero no
        // indispensable, y vale más un reconocedor sin previa que ninguno.
        Log.w(ETIQUETA, "falló con previa, se reintenta sólo con análisis: " + e.message)
        proveedor.unbindAll()
        proveedor.bindToLifecycle(duenio, selector, analisis)
        Log.i(ETIQUETA, "cámara enlazada sin previa")
      }
      } catch (e: Throwable) {
        // Sin esto el fallo se pierde adentro del listener y la pantalla queda
        // en "esperando el primer cuadro" para siempre, sin decir por qué.
        armada = false
        Log.e(ETIQUETA, "no se pudo enlazar la cámara", e)
        onListo(mapOf("fase" to "error", "error" to ("cámara: " + (e.message ?: e.toString()))))
      }
    }, androidx.core.content.ContextCompat.getMainExecutor(context))
  }

  private var avisadoPrimerCuadro = false

  private fun procesar(imagen: androidx.camera.core.ImageProxy) {
    // Avisar que la cámara entrega cuadros ANTES de tocar los detectores: sin
    // esta señal, "pantalla negra" no distingue entre que no llegue un cuadro y
    // que llegue pero falle la detección, que son problemas muy distintos.
    if (!avisadoPrimerCuadro) {
      avisadoPrimerCuadro = true
      Log.i(ETIQUETA, "primer cuadro: ${imagen.width}x${imagen.height} fmt=${imagen.format}")
      post { onListo(mapOf("fase" to "cuadros", "detalle" to "${imagen.width}x${imagen.height}")) }
    }
    val det = detectores ?: crearDetectores() ?: return

    val origen = imagen.toBitmap()

    // Espejado, rotación y reducción en una sola pasada, SOBRE EL MISMO bitmap.
    //
    // El espejado es obligatorio: el dataset se grabó con la imagen espejada,
    // así que el modelo espera ver la mano del mismo lado que la persona ve en
    // el espejo.
    //
    // La reducción es lo que importa para el costo. La cámara entrega 640x480 y
    // MediaPipe trabaja internamente con bastante menos, pero el preproceso lo
    // paga igual: medido en un teléfono, la misma detección costaba 24 ms sobre
    // 480x360 y 55 ms dentro de esta vista.
    //
    // Y el bitmap se reusa en vez de crear uno nuevo por cuadro: a 12 cuadros
    // por segundo eran doce imágenes de medio megapíxel por segundo pedidas y
    // tiradas, con su recolección de basura encima justo mientras se detecta.
    val escala = minOf(1f, ANCHO_OBJETIVO.toFloat() / maxOf(origen.width, origen.height))
    val rotada = imagen.imageInfo.rotationDegrees % 180 != 0
    val anchoFinal = ((if (rotada) origen.height else origen.width) * escala).toInt()
    val altoFinal = ((if (rotada) origen.width else origen.height) * escala).toInt()

    var destino = lienzoDetección
    if (destino == null || destino.width != anchoFinal || destino.height != altoFinal) {
      destino?.recycle()
      destino = Bitmap.createBitmap(anchoFinal, altoFinal, Bitmap.Config.ARGB_8888)
      lienzoDetección = destino
    }

    val matriz = Matrix().apply {
      postTranslate(-origen.width / 2f, -origen.height / 2f)
      postRotate(imagen.imageInfo.rotationDegrees.toFloat())
      postScale(-escala, escala)
      postTranslate(anchoFinal / 2f, altoFinal / 2f)
    }
    Canvas(destino).drawBitmap(origen, matriz, filtro)
    val bitmap = destino

    val (manos, pose) = det.procesar(BitmapImageBuilder(bitmap).build())

    val (izquierda, derecha) = repartir(manos)
    if (mostrarEsqueleto) {
      val cuerpo = pose?.landmarks()?.firstOrNull()
      post {
        esqueleto.encuadre(bitmap.width, bitmap.height)
        esqueleto.actualizar(cuerpo, izquierda, derecha)
      }
    }

    val ahora = System.currentTimeMillis()
    if (objetivos.isNotEmpty()) {
      val cuerpo = pose?.landmarks()?.firstOrNull()
      if (modo == "estatico") {
        // El abecedario mira UNA mano: la que MediaPipe ve con más confianza.
        //
        // Antes se tomaba la primera de la lista, que servía mientras se pedía
        // una sola mano. Al volver a pedir dos —para que el esqueleto sea el
        // mismo que en señas— la primera puede ser la que está descansando, y
        // la letra se decidía mirando la mano equivocada.
        //
        // Y necesita saber cuál es: el dataset trata todas las manos como
        // derechas, así que una izquierda se espeja. Por eso acá se usa la
        // etiqueta de MediaPipe y no el reparto por cercanía.
        val cual = manos.handedness().indices.maxByOrNull { i ->
          manos.handedness()[i].firstOrNull()?.score() ?: 0f
        }
        reconocer(
          ahora,
          cuerpo,
          cual?.let { manos.landmarks()[it] },
          null,
          cual?.let { manos.worldLandmarks().getOrNull(it) },
          cual?.let { manos.handedness()[it].firstOrNull()?.categoryName() == "Left" } ?: false,
        )
      } else {
        reconocer(ahora, cuerpo, izquierda, derecha)
      }
    }

    cuadros++
    if (ahora - desdeFps >= 500) {
      fps = cuadros * 1000.0 / (ahora - desdeFps)
      cuadros = 0
      desdeFps = ahora
    }

    // El puente no necesita doce mensajes por segundo: con dos alcanza para un
    // indicador, y cada uno mueve estado en React.
    if (ahora - ultimoAviso >= 500) {
      ultimoAviso = ahora
      onFrame(
        mapOf(
          "fps" to fps,
          "manosMs" to det.msManos,
          "poseMs" to det.msPose,
          "manos" to ((if (izquierda != null) 1 else 0) + (if (derecha != null) 1 else 0)),
          "cuerpo" to (pose?.landmarks()?.isNotEmpty() == true),
          "delegado" to (if (det.enGpu) "GPU" else "CPU"),
          "ancho" to bitmap.width,
          "inferenciaMs" to (reconocedor?.msInferencia ?: 0.0),
          // Dos veces por segundo alcanza para ver si la memoria crece, que es
          // lo que precede a que el sistema cierre la app sin ningún error.
          "memoriaKB" to (android.os.Debug.getNativeHeapAllocatedSize() / 1024),
        ),
      )
    }
  }

  private fun reconocer(
    ahora: Long,
    pose: List<NormalizedLandmark>?,
    izquierda: Manos,
    derecha: Manos,
    mundo: List<com.google.mediapipe.tasks.components.containers.Landmark>? = null,
    manoIzquierda: Boolean = false,
  ) {
    val r = reconocedor ?: try {
      val cual = if (modo == "estatico") Reconocedor.Modo.ESTATICO else Reconocedor.Modo.DINAMICO
      Reconocedor(context.applicationContext, cual).also { it.objetivos = objetivos; reconocedor = it }
    } catch (e: Throwable) {
      Log.e(ETIQUETA, "no se pudo cargar el modelo de señas", e)
      objetivos = emptyList()
      post { onListo(mapOf("fase" to "error", "error" to ("modelo: " + (e.message ?: e.toString())))) }
      return
    }

    val paso = r.cuadro(ahora, pose, izquierda, derecha, mundo, manoIzquierda) ?: return
    post {
      onSena(
        mapOf(
          "progreso" to paso.progreso,
          "sena" to (paso.sena ?: ""),
          "p" to paso.p,
          "reposo" to paso.reposo,
        ),
      )
      paso.confirmada?.let { onConfirmada(mapOf("sena" to it, "p" to paso.p)) }
    }
  }

  private var previaIzq: FloatArray? = null
  private var previaDer: FloatArray? = null

  /**
   * Reparte las manos detectadas entre izquierda y derecha.
   *
   * La "handedness" de MediaPipe es la de la persona —la misma convención con
   * la que se entrenó— pero se decide en cada cuadro por separado, y con
   * movimiento rápido o la mano girada se equivoca. Ahí el esqueleto salta de
   * una mano a la otra y, peor, los 63 números de cada mano cambian de lugar
   * en el medio de la ventana, que para el modelo es otra seña. Mientras haya
   * historia se asigna por cercanía a dónde estaba cada mano un cuadro antes;
   * la etiqueta se usa sólo para arrancar.
   */
  private fun repartir(r: HandLandmarkerResult): Pair<Manos, Manos> {
    val lms = r.landmarks()
    if (lms.isEmpty()) {
      previaIzq = null; previaDer = null
      return null to null
    }

    var izq: Manos = null
    var der: Manos = null

    val sinHistoria = previaIzq == null || previaDer == null
    if (lms.size >= 2 && !sinHistoria) {
      val directo = dist(lms[0], previaIzq) + dist(lms[1], previaDer)
      val cruzado = dist(lms[1], previaIzq) + dist(lms[0], previaDer)
      if (directo <= cruzado) { izq = lms[0]; der = lms[1] } else { izq = lms[1]; der = lms[0] }
    } else if (lms.size == 1 && (previaIzq != null || previaDer != null)) {
      if (dist(lms[0], previaIzq) <= dist(lms[0], previaDer)) izq = lms[0] else der = lms[0]
    } else {
      for (i in lms.indices) {
        when (r.handedness()[i].firstOrNull()?.categoryName()) {
          "Left" -> izq = lms[i]
          "Right" -> der = lms[i]
        }
      }
    }

    previaIzq = izq?.let { floatArrayOf(it[0].x(), it[0].y()) }
    previaDer = der?.let { floatArrayOf(it[0].x(), it[0].y()) }
    return izq to der
  }

  private fun dist(mano: List<NormalizedLandmark>, previa: FloatArray?): Float =
    if (previa == null) Float.MAX_VALUE
    else kotlin.math.hypot((mano[0].x() - previa[0]).toDouble(), (mano[0].y() - previa[1]).toDouble()).toFloat()

  private fun crearDetectores(): Detectores? {
    return try {
      // Las dos manos SIEMPRE, también en el abecedario.
      //
      // Para decidir la letra alcanza con una, y pedirle sólo una a MediaPipe
      // era más barato. Pero el esqueleto es lo que la persona usa para saber
      // si la cámara la está viendo bien, y con una sola mano dibujada el
      // ejercicio de letras se sentía distinto del de señas sin ninguna razón
      // visible. Medido, la segunda mano cuesta poco: MediaPipe sólo corre el
      // detector de palmas de nuevo cuando pierde una.
      val d = Detectores.crear(context.applicationContext, manos = 2)
      // Calentar antes de dar por listo: la primera detección cuesta bastante
      // más que las siguientes, y ese costo no debe caer sobre la primera seña.
      val vacio = Bitmap.createBitmap(480, 360, Bitmap.Config.ARGB_8888)
      d.calentar(BitmapImageBuilder(vacio).build())
      detectores = d
      post { onListo(mapOf("fase" to "detectando", "detalle" to if (d.enGpu) "GPU" else "CPU")) }
      d
    } catch (e: Throwable) {
      // Throwable y no Exception: que falte una librería nativa es un Error, y
      // atrapando sólo Exception se llevaba puesto el hilo de análisis en
      // silencio.
      Log.e(ETIQUETA, "no se pudieron crear los detectores", e)
      post { onListo(mapOf("fase" to "error", "error" to ("detector: " + (e.message ?: e.toString())))) }
      null
    }
  }

  private companion object {
    const val ETIQUETA = "SignaVision"

    /**
     * Lado mayor con el que se alimenta al detector.
     *
     * Bajarlo no sirve: medido a 320 px la detección cuesta lo mismo que a 480
     * (14 ms contra 13), porque MediaPipe reescala a su propia entrada de todas
     * formas. Lo que sí se pierde al achicar es alcance: una mano lejos de la
     * cámara llega con menos píxeles reales.
     */
    const val ANCHO_OBJETIVO = 480
  }

  /**
   * Suelta la cámara, sin desarmar nada más.
   *
   * Es obligatorio hacerlo apenas la vista sale de pantalla: bindToLifecycle la
   * ata a la ACTIVIDAD, no a esta vista, así que seguía tomada y el ejercicio
   * siguiente conseguía un solo cuadro y se quedaba congelado.
   */
  private fun soltarCamara() {
    proveedorCamara?.unbindAll()
    proveedorCamara = null
    armada = false
  }

  fun soltar() {
    activo = false
    soltando = true
    soltarCamara()

    // Cerrar en el MISMO hilo que detecta, y como última tarea de su cola.
    // Cerrándolos desde acá se liberaba memoria nativa que el hilo de análisis
    // estaba usando en ese instante, adentro de detect(): la app se caía con
    // SIGSEGV al salir del ejercicio, sin excepción de Java ni nada que mirar.
    hilo.execute {
      detectores?.cerrar()
      detectores = null
      lienzoDetección?.recycle()
      lienzoDetección = null
      reconocedor?.cerrar()
      reconocedor = null
    }
    hilo.shutdown()

    esqueleto.limpiar()
    previaIzq = null
    previaDer = null
  }

  // Desprenderse de la ventana no quiere decir que la vista se vaya: React la
  // re-parenta en algunos casos. Se suelta la cámara —que no puede quedar
  // tomada— pero el resto se desarma recién en OnViewDestroys, o volver a
  // aparecer dejaría la vista muerta.
  override fun onDetachedFromWindow() {
    soltarCamara()
    super.onDetachedFromWindow()
  }
}
