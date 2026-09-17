package com.signa.vision

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.util.Size
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
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
  private var ultimoAviso = 0L
  private var cuadros = 0
  private var desdeFps = System.currentTimeMillis()
  private var fps = 0.0

  var mostrarEsqueleto = true
  var activo = true

  init {
    addView(vista, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    addView(esqueleto, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    arrancar()
  }

  private fun arrancar() {
    val duenio = appContext.currentActivity as? LifecycleOwner ?: return
    val futuro = ProcessCameraProvider.getInstance(context)
    futuro.addListener({
      val proveedor = futuro.get()

      val previa = Preview.Builder().build().also { it.setSurfaceProvider(vista.surfaceProvider) }

      // La resolución que pedía la versión web. Lo que MediaPipe usa adentro es
      // bastante menor, así que subirla sólo agrega costo de copia.
      val analisis = ImageAnalysis.Builder()
        .setResolutionSelector(
          ResolutionSelector.Builder()
            .setResolutionStrategy(ResolutionStrategy(Size(480, 360), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER))
            .build(),
        )
        // Si un cuadro llega mientras se procesa el anterior, se descarta: el
        // esqueleto tiene que mostrar el presente, no una cola de pasado.
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
        .build()

      analisis.setAnalyzer(hilo) { imagen ->
        try {
          if (activo) procesar(imagen)
        } finally {
          imagen.close()
        }
      }

      proveedor.unbindAll()
      proveedor.bindToLifecycle(duenio, CameraSelector.DEFAULT_FRONT_CAMERA, previa, analisis)
    }, androidx.core.content.ContextCompat.getMainExecutor(context))
  }

  private fun procesar(imagen: androidx.camera.core.ImageProxy) {
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
      post { alListo(mapOf("listo" to true)) }
      d
    } catch (e: Exception) {
      post { alListo(mapOf("listo" to false, "error" to (e.message ?: "sin detalle"))) }
      null
    }
  }

  fun soltar() {
    activo = false
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
