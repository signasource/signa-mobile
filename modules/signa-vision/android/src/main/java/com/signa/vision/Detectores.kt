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
 * La pose se detecta 1 de cada 5 frames y se reutiliza la última: el torso se
 * mueve mucho más lento que las manos, y de la pose sólo dependen la referencia
 * de hombros que normaliza y el bloque de cara del abecedario.
 *
 * Ese 5 es el mismo del motor web, y se vuelve a él a propósito: probé subirlo a
 * 8 para ahorrar unos milisegundos, pero de la pose depende el bloque de cara
 * que separa letras hechas a distinta altura, y no medí que eso no empeorara el
 * reconocimiento. Ahorro sin medir no vale contra acierto.
 */
class Detectores private constructor(
  private val manos: HandLandmarker,
  private val pose: PoseLandmarker,
  private val delegado: Delegate,
  private val cadaCuantosPose: Int,
) {

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
    /**
     * Qué delegado funcionó la última vez. Se recuerda para no volver a
     * intentar con GPU en un aparato donde ya se sabe que no abre: además de
     * tardar, el intento fallido deja memoria nativa colgada —MediaPipe alcanza
     * a cargar el modelo de manos, 7,8 MB, antes de fallar con el de pose— y
     * eso se acumula con cada entrada al ejercicio.
     */
    @Volatile private var delegadoConocido: Delegate? = null

    fun crear(contexto: Context, cadaCuantosPose: Int = 5, manos: Int = 2): Detectores {
      delegadoConocido?.let { return armar(contexto, it, cadaCuantosPose, manos) }
      return try {
        armar(contexto, Delegate.GPU, cadaCuantosPose, manos).also { delegadoConocido = Delegate.GPU }
      } catch (e: Throwable) {
        armar(contexto, Delegate.CPU, cadaCuantosPose, manos).also { delegadoConocido = Delegate.CPU }
      }
    }

    /** Sólo para medir: fuerza CPU y saltea el intento con GPU. */
    fun crearEnCpu(contexto: Context, cadaCuantosPose: Int = 5): Detectores =
      armar(contexto, Delegate.CPU, cadaCuantosPose, 2)

    /**
     * Los dos detectores, o ninguno.
     *
     * Se arman por separado y con red: donde el delegado de GPU no anda, el de
     * manos se crea bien y el de pose tira, y el de manos quedaba abierto para
     * siempre. Son 7 MB de memoria nativa por cada vez que se entra a un
     * ejercicio; al rato el sistema cierra la app sin decir nada. Medido con
     * `estres(8, "detectores")`.
     */
    private fun armar(
      contexto: Context,
      delegado: Delegate,
      cadaCuantosPose: Int,
      manosMax: Int,
    ): Detectores {
      val base = { modelo: String ->
        BaseOptions.builder().setModelAssetPath(modelo).setDelegate(delegado).build()
      }
      val manos = HandLandmarker.createFromOptions(
        contexto,
        HandLandmarker.HandLandmarkerOptions.builder()
          .setBaseOptions(base("hand_landmarker.task"))
          .setRunningMode(RunningMode.IMAGE)
          .setNumHands(manosMax)
          // Bajar el piso de seguimiento evita que MediaPipe vuelva a correr el
          // detector de palmas —lo más caro— cada vez que una mano se gira o se
          // tapa a medias. Mientras la siga viendo, la sigue.
          .setMinHandPresenceConfidence(0.3f)
          .setMinTrackingConfidence(0.3f)
          .build(),
      )
      return try {
        val pose = PoseLandmarker.createFromOptions(
          contexto,
          PoseLandmarker.PoseLandmarkerOptions.builder()
            .setBaseOptions(base("pose_landmarker.task"))
            .setRunningMode(RunningMode.IMAGE)
            .setNumPoses(1)
            .build(),
        )
        Detectores(manos, pose, delegado, cadaCuantosPose)
      } catch (e: Throwable) {
        manos.close()
        throw e
      }
    }
  }

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
