package com.signa.vision

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
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
@SuppressLint("ViewConstructor")
class ReconocedorView(contexto: Context, appContext: AppContext) : ExpoView(contexto, appContext) {

  private val alFrame by EventDispatcher()
  private val alListo by EventDispatcher()

  private val vista = PreviewView(contexto).apply {
    implementationMode = PreviewView.ImplementationMode.PERFORMANCE
    scaleType = PreviewView.ScaleType.FILL_CENTER
  }
  private val esqueleto = Esqueleto(contexto)
  private val hilo = Executors.newSingleThreadExecutor()

  private var detectores: Detectores? = null
  private var proveedorCamara: ProcessCameraProvider? = null
  private var ultimoAviso = 0L
  private var cuadros = 0
  private var desdeFps = System.currentTimeMillis()
  private var fps = 0.0

  var mostrarEsqueleto = true
  var activo = true

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
          if (activo) procesar(imagen)
        } catch (e: Throwable) {
          // Sin este catch, una excepción en el primer cuadro mata el hilo de
          // análisis sin decir nada: la pantalla queda en negro para siempre y
          // no hay forma de saber por qué.
          if (!avisadoDeFallo) {
            avisadoDeFallo = true
            Log.e(ETIQUETA, "falló al procesar el cuadro", e)
            post { alListo(mapOf("fase" to "error", "error" to ("cuadro: " + (e.message ?: e.toString())))) }
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
        alListo(mapOf("fase" to "error", "error" to ("cámara: " + (e.message ?: e.toString()))))
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
      post { alListo(mapOf("fase" to "cuadros", "detalle" to "${imagen.width}x${imagen.height}")) }
    }
    val det = detectores ?: crearDetectores() ?: return

    // Espejado: el dataset se grabó con la imagen espejada, así que el modelo
    // espera ver la mano del mismo lado que la persona ve en el espejo. Se
    // aplica acá, sobre el bitmap, igual que hacía la versión web.
    val matriz = Matrix().apply {
      postRotate(imagen.imageInfo.rotationDegrees.toFloat())
      postScale(-1f, 1f)
    }
    val origen = imagen.toBitmap()
    val bitmap = Bitmap.createBitmap(origen, 0, 0, origen.width, origen.height, matriz, true)

    val (manos, pose) = det.procesar(BitmapImageBuilder(bitmap).build())

    val izquierda = manoDe(manos, "Left")
    val derecha = manoDe(manos, "Right")
    if (mostrarEsqueleto) {
      post { esqueleto.actualizar(pose?.landmarks()?.firstOrNull(), izquierda, derecha) }
    }

    cuadros++
    val ahora = System.currentTimeMillis()
    if (ahora - desdeFps >= 500) {
      fps = cuadros * 1000.0 / (ahora - desdeFps)
      cuadros = 0
      desdeFps = ahora
    }

    // El puente no necesita doce mensajes por segundo: con dos alcanza para un
    // indicador, y cada uno mueve estado en React.
    if (ahora - ultimoAviso >= 500) {
      ultimoAviso = ahora
      alFrame(
        mapOf(
          "fps" to fps,
          "manosMs" to det.msManos,
          "poseMs" to det.msPose,
          "manos" to ((if (izquierda != null) 1 else 0) + (if (derecha != null) 1 else 0)),
          "cuerpo" to (pose?.landmarks()?.isNotEmpty() == true),
        ),
      )
    }
  }

  private fun manoDe(r: com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult, lado: String) =
    r.handedness().indexOfFirst { it.firstOrNull()?.categoryName() == lado }
      .takeIf { it >= 0 }
      ?.let { r.landmarks()[it] }

  private fun crearDetectores(): Detectores? {
    return try {
      val d = Detectores(context.applicationContext, enGpu = true)
      // Calentar antes de dar por listo: la primera detección cuesta bastante
      // más que las siguientes, y ese costo no debe caer sobre la primera seña.
      val vacio = Bitmap.createBitmap(480, 360, Bitmap.Config.ARGB_8888)
      d.calentar(BitmapImageBuilder(vacio).build())
      detectores = d
      post { alListo(mapOf("fase" to "detectando")) }
      d
    } catch (e: Throwable) {
      // Throwable y no Exception: que falte una librería nativa es un Error, y
      // atrapando sólo Exception se llevaba puesto el hilo de análisis en
      // silencio.
      Log.e(ETIQUETA, "no se pudieron crear los detectores", e)
      post { alListo(mapOf("fase" to "error", "error" to ("detector: " + (e.message ?: e.toString())))) }
      null
    }
  }

  private companion object {
    const val ETIQUETA = "SignaVision"
  }

  fun soltar() {
    activo = false
    // Soltar la cámara es obligatorio: bindToLifecycle la ata a la ACTIVIDAD,
    // no a esta vista, así que al desmontarse seguía tomada. El WebView del
    // ejercicio conseguía después un solo cuadro y se quedaba congelado.
    proveedorCamara?.unbindAll()
    proveedorCamara = null
    hilo.shutdown()
    detectores?.cerrar()
    detectores = null
    esqueleto.limpiar()
  }

  override fun onDetachedFromWindow() {
    soltar()
    super.onDetachedFromWindow()
  }
}
