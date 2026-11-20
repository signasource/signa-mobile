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
 * Los dos detectores, sobre el hilo que los llama.
 *
 * Señas en modo VIDEO; abecedario en modo IMAGE. Cada uno igual que su dataset.
 *
 * - Las señas se extrajeron con `signa-ml/src/data/tasks_extractor.py` en modo
 *   VIDEO, y `sign_runner` reconoce igual. En VIDEO MediaPipe SIGUE la mano: el
 *   recuadro de este cuadro sale de los puntos del anterior, y el detector de
 *   palmas sólo vuelve a correr cuando la pierde. En IMAGE busca la palma desde
 *   cero en cada cuadro, y el detector de palmas es lo primero que falla con la
 *   mano movida o borrosa: la app la perdía apenas se movía un poco rápido,
 *   mientras el dataset la tenía. Encima, en IMAGE MediaPipe ignora el piso de
 *   seguimiento que se le pasa.
 * - El abecedario se extrajo en IMAGE con piso de detección 0,4 (la segunda
 *   función de tasks_extractor y `alphabet_runner`): una letra es un cuadro
 *   quieto, no hay nada que seguir.
 *
 * VIDEO también es sincrónico: un cuadro entra, un resultado sale, y el tiempo
 * medido es el del cuadro. Lo que entrega por callback es LIVE_STREAM, no VIDEO.
 * Lo único que pide de más es una marca de tiempo creciente por cuadro.
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
  /** Modo VIDEO (señas) o IMAGE (abecedario). */
  val video: Boolean,
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

    fun crear(contexto: Context, cadaCuantosPose: Int = 5, manos: Int = 2, video: Boolean = true): Detectores {
      delegadoConocido?.let { return armar(contexto, it, cadaCuantosPose, manos, video) }
      return try {
        armar(contexto, Delegate.GPU, cadaCuantosPose, manos, video).also { delegadoConocido = Delegate.GPU }
      } catch (e: Throwable) {
        armar(contexto, Delegate.CPU, cadaCuantosPose, manos, video).also { delegadoConocido = Delegate.CPU }
      }
    }

    /** Sólo para medir: fuerza CPU y saltea el intento con GPU. */
    fun crearEnCpu(contexto: Context, cadaCuantosPose: Int = 5): Detectores =
      armar(contexto, Delegate.CPU, cadaCuantosPose, 2, true)

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
      video: Boolean,
    ): Detectores {
      val modo = if (video) RunningMode.VIDEO else RunningMode.IMAGE
      val base = { modelo: String ->
        BaseOptions.builder().setModelAssetPath(modelo).setDelegate(delegado).build()
      }
      val opcionesManos = HandLandmarker.HandLandmarkerOptions.builder()
        .setBaseOptions(base("hand_landmarker.task"))
        .setRunningMode(modo)
        .setNumHands(manosMax)
      if (video) {
        // Bajar el piso de seguimiento evita que MediaPipe vuelva a correr el
        // detector de palmas —lo más caro, y lo que pierde la mano movida—
        // cada vez que una mano se gira o se tapa a medias. Mientras la siga
        // viendo, la sigue. Los mismos pisos que tasks_extractor.
        opcionesManos.setMinHandPresenceConfidence(0.3f).setMinTrackingConfidence(0.3f)
      } else {
        opcionesManos.setMinHandDetectionConfidence(0.4f)
      }
      val manos = HandLandmarker.createFromOptions(contexto, opcionesManos.build())
      return try {
        val pose = PoseLandmarker.createFromOptions(
          contexto,
          PoseLandmarker.PoseLandmarkerOptions.builder()
            .setBaseOptions(base("pose_landmarker.task"))
            .setRunningMode(modo)
            .setNumPoses(1)
            .build(),
        )
        Detectores(manos, pose, delegado, cadaCuantosPose, video)
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

  /**
   * Marca del último cuadro, en ms. El modo VIDEO tira si una marca no es
   * mayor que la anterior, y la del sensor puede repetirse o, al rearmar la
   * cámara, volver atrás.
   */
  private var ultimaMarca = -1L

  private fun marca(ms: Long): Long {
    ultimaMarca = maxOf(ms, ultimaMarca + 1)
    return ultimaMarca
  }

  /**
   * Una pasada completa sobre un frame. Devuelve manos y la pose vigente.
   *
   * @param ms cuándo se tomó el cuadro; en modo VIDEO es lo que le dice a
   *   MediaPipe cuánto tiempo pasó desde el anterior.
   */
  fun procesar(imagen: MPImage, ms: Long): Pair<HandLandmarkerResult, PoseLandmarkerResult?> {
    val t = marca(ms)
    if (cuenta % cadaCuantosPose == 0L || ultimaPose == null) {
      val t0 = System.nanoTime()
      ultimaPose = if (video) pose.detectForVideo(imagen, t) else pose.detect(imagen)
      msPose = (System.nanoTime() - t0) / 1_000_000.0
    }
    val t1 = System.nanoTime()
    val r = if (video) manos.detectForVideo(imagen, t) else manos.detect(imagen)
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
    if (video) {
      val t = marca(0)
      pose.detectForVideo(imagen, t)
      manos.detectForVideo(imagen, t)
    } else {
      pose.detect(imagen)
      manos.detect(imagen)
    }
    ultimaPose = null
    cuenta = 0
  }

  fun cerrar() {
    manos.close()
    pose.close()
  }
}
