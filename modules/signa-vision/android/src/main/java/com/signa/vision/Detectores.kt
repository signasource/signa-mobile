package com.signa.vision

import android.content.Context
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult

/**
 * Los dos detectores, en modo imagen y sobre el hilo que los llama.
 *
 * Modo IMAGE y no LIVE_STREAM a propósito: el modo streaming entrega los
 * resultados por callback y decide solo cuándo descartar frames, lo que hace
 * imposible medir el costo real por frame y atribuirlo. Acá el análisis de
 * CameraX ya corre en su propio hilo y entrega un frame por vez, así que la
 * llamada sincrónica es lo que se quiere: un frame entra, un resultado sale, y
 * el tiempo que tardó es el tiempo que tardó.
 *
 * La pose se detecta 1 de cada N frames y se reutiliza la última: el torso se
 * mueve mucho más lento que las manos, y de la pose sólo dependen la referencia
 * de hombros que normaliza y el bloque de cara del abecedario.
 */
class Detectores private constructor(
  contexto: Context,
  private val delegado: Delegate,
  private val cadaCuantosPose: Int = 5,
) {

  private val manos: HandLandmarker = HandLandmarker.createFromOptions(
    contexto,
    HandLandmarker.HandLandmarkerOptions.builder()
      .setBaseOptions(base("hand_landmarker.task"))
      .setRunningMode(RunningMode.IMAGE)
      .setNumHands(2)
      // Bajar el piso de seguimiento evita que MediaPipe vuelva a correr el
      // detector de palmas —lo más caro— cada vez que una mano se gira o se
      // tapa a medias. Mientras la siga viendo, la sigue.
      .setMinHandPresenceConfidence(0.3f)
      .setMinTrackingConfidence(0.3f)
      .build(),
  )

  private val pose: PoseLandmarker = PoseLandmarker.createFromOptions(
    contexto,
    PoseLandmarker.PoseLandmarkerOptions.builder()
      .setBaseOptions(base("pose_landmarker.task"))
      .setRunningMode(RunningMode.IMAGE)
      .setNumPoses(1)
      .build(),
  )

  val enGpu: Boolean get() = delegado == Delegate.GPU

  companion object {
    /**
     * Con GPU si el aparato puede; si no, con CPU.
     *
     * Hay aparatos donde el grafo de MediaPipe no abre con delegado de GPU y
     * falla al crearse. Antes eso dejaba el reconocedor sin detectores y la
     * pantalla en negro. CPU midió 32 ms contra los 24 de GPU en un teléfono
     * real: sigue siendo tres veces mejor que el camino web, así que vale mucho
     * más caer a CPU que no funcionar.
     */
    fun crear(contexto: Context, cadaCuantosPose: Int = 5): Detectores =
      try {
        Detectores(contexto, Delegate.GPU, cadaCuantosPose)
      } catch (e: Throwable) {
        Detectores(contexto, Delegate.CPU, cadaCuantosPose)
      }
  }

  private fun base(modelo: String) = BaseOptions.builder()
    .setModelAssetPath(modelo)
    .setDelegate(delegado)
    .build()

  private var cuenta = 0L
  private var ultimaPose: PoseLandmarkerResult? = null

  var msManos = 0.0
    private set
  var msPose = 0.0
    private set

  /** Una pasada completa sobre un frame. Devuelve manos y la pose vigente. */
  fun procesar(imagen: MPImage): Pair<HandLandmarkerResult, PoseLandmarkerResult?> {
    if (cuenta % cadaCuantosPose == 0L || ultimaPose == null) {
      val t0 = System.nanoTime()
      ultimaPose = pose.detect(imagen)
      msPose = (System.nanoTime() - t0) / 1_000_000.0
    }
    val t1 = System.nanoTime()
    val r = manos.detect(imagen)
    msManos = (System.nanoTime() - t1) / 1_000_000.0
    cuenta++
    return r to ultimaPose
  }

  /**
   * Primera detección en vacío, antes de dar el detector por listo.
   *
   * En la versión web esto costaba 3 segundos y congelaba la pantalla justo
   * sobre el primer intento de seña. Nativo son ~60 ms, pero se hace igual: el
   * costo existe y este es el momento en que no molesta.
   */
  fun calentar(imagen: MPImage) {
    pose.detect(imagen)
    manos.detect(imagen)
    ultimaPose = null
    cuenta = 0
  }

  fun cerrar() {
    manos.close()
    pose.close()
  }
}
