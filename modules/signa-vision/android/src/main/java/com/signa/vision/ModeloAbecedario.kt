package com.signa.vision

import android.content.Context
import com.google.mediapipe.tasks.components.containers.Landmark
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import org.json.JSONObject

/**
 * El modelo del abecedario: una letra por cuadro, sin ventana.
 *
 * Las 514 features que el modelo mira de verdad —coordenadas canónicas,
 * distancias, ángulos de articulación y la posición de la mano respecto de la
 * cara— se calculan ADENTRO del grafo. Acá se le pasan los landmarks tal como
 * salen de MediaPipe, así que no hay forma de que el cálculo se desincronice
 * del que se usó al entrenar; el precio es un .tflite más grande.
 *
 * Entradas: `landmarks` (21x3 de imagen), `world` (21x3 métricos) y `cara`
 * (8 números de dónde está la mano respecto de los ojos).
 */
class ModeloAbecedario(contexto: Context) {

  private val interprete: org.tensorflow.lite.Interpreter
  val letras: List<String>
  private val umbrales: Map<String, Float>

  /** Orden de las entradas en el grafo, que no es el orden en que se declaran. */
  private val iLandmarks: Int
  private val iCara: Int
  private val iWorld: Int

  init {
    // El descriptor y el canal se cierran acá mismo: el mapeo sobrevive igual, y
    // dejándolos abiertos se acumulaba un archivo mapeado por cada vez que se
    // entra al ejercicio —el del abecedario pesa 8,6 MB— hasta que el sistema
    // se cansaba y cerraba la app sin decir nada.
    val modelo = contexto.assets.openFd("alfabeto.tflite").use { fd ->
      fd.createInputStream().use { entrada ->
        entrada.channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
      }
    }
    interprete = org.tensorflow.lite.Interpreter(
      modelo,
      org.tensorflow.lite.Interpreter.Options().apply { numThreads = 2 },
    )

    // Los tensores de entrada no vienen en el orden en que se escribieron al
    // exportar: se los ubica por nombre. Meterlos en el orden equivocado no da
    // ningún error, sólo letras al azar.
    var lm = 0; var cara = 1; var world = 2
    for (i in 0 until interprete.inputTensorCount) {
      when {
        interprete.getInputTensor(i).name().contains("landmarks") -> lm = i
        interprete.getInputTensor(i).name().contains("cara") -> cara = i
        interprete.getInputTensor(i).name().contains("world") -> world = i
      }
    }
    iLandmarks = lm; iCara = cara; iWorld = world

    val json = JSONObject(contexto.assets.open("alfabeto.json").bufferedReader().use { it.readText() })
    letras = json.getJSONArray("labels").let { a -> List(a.length()) { a.getString(it) } }
    val u = json.getJSONObject("thresholds")
    umbrales = u.keys().asSequence().associateWith { u.getDouble(it).toFloat() }
  }

  private val bufLandmarks = ByteBuffer.allocateDirect(4 * 21 * 3).order(ByteOrder.nativeOrder())
  private val bufWorld = ByteBuffer.allocateDirect(4 * 21 * 3).order(ByteOrder.nativeOrder())
  private val bufCara = ByteBuffer.allocateDirect(4 * 8).order(ByteOrder.nativeOrder())
  private val salida = HashMap<Int, Any>()
  private val probs = Array(1) { FloatArray(26) }

  /**
   * Probabilidades de cada letra para esta mano.
   *
   * @param izquierda la mano de la persona. El dataset trata todas las manos
   *   como derechas, así que una izquierda se espeja en x, igual que hace
   *   `build_alphabet_dataset.py` al armar el dataset.
   */
  fun predecir(
    mano: List<NormalizedLandmark>,
    mundo: List<Landmark>?,
    pose: List<NormalizedLandmark>?,
    izquierda: Boolean,
  ): FloatArray {
    val signo = if (izquierda) -1f else 1f

    bufLandmarks.rewind()
    bufWorld.rewind()
    for (i in 0 until 21) {
      bufLandmarks.putFloat(signo * mano[i].x())
      bufLandmarks.putFloat(mano[i].y())
      bufLandmarks.putFloat(mano[i].z())
      val w = mundo?.getOrNull(i)
      bufWorld.putFloat(signo * (w?.x() ?: 0f))
      bufWorld.putFloat(w?.y() ?: 0f)
      bufWorld.putFloat(w?.z() ?: 0f)
    }

    bufCara.rewind()
    cara(mano, pose, izquierda).forEach { bufCara.putFloat(it) }

    bufLandmarks.rewind(); bufWorld.rewind(); bufCara.rewind()
    val entradas = arrayOfNulls<Any>(3)
    entradas[iLandmarks] = bufLandmarks
    entradas[iWorld] = bufWorld
    entradas[iCara] = bufCara
    salida[0] = probs
    interprete.runForMultipleInputsOutputs(entradas, salida)
    return probs[0]
  }

  /**
   * El bloque de cara aislado, para poder contrastarlo contra Python.
   *
   * Es la única parte del camino del abecedario que se calcula por fuera del
   * grafo, o sea la única que puede quedar desincronizada de lo que se usó al
   * entrenar. Ver Golden.kt.
   */
  fun bloqueDeCara(
    mano: List<NormalizedLandmark>,
    pose: List<NormalizedLandmark>?,
    izquierda: Boolean,
  ): FloatArray = cara(mano, pose, izquierda)

  /**
   * Dónde está la mano respecto de la cara, en unidades de "ojos a boca".
   *
   * Varias letras de la LSA se distinguen sólo por eso —la misma configuración
   * de dedos a la altura de la boca o del mentón es otra letra— y los
   * landmarks de la mano por sí solos no lo dicen. Sin cara detectada van
   * ceros, que es lo que el modelo vio al entrenar cuando no había pose.
   */
  private fun cara(
    mano: List<NormalizedLandmark>,
    pose: List<NormalizedLandmark>?,
    izquierda: Boolean,
  ): FloatArray {
    val salida = FloatArray(8)
    if (pose == null || pose.size <= BOCA_DER) return salida

    val ojoX = (pose[OJO_IZQ].x() + pose[OJO_DER].x()) / 2
    val ojoY = (pose[OJO_IZQ].y() + pose[OJO_DER].y()) / 2
    val bocaX = (pose[BOCA_IZQ].x() + pose[BOCA_DER].x()) / 2
    val bocaY = (pose[BOCA_IZQ].y() + pose[BOCA_DER].y()) / 2
    val escala = kotlin.math.hypot((bocaX - ojoX).toDouble(), (bocaY - ojoY).toDouble()).toFloat()
    if (escala < 1e-6f) return salida

    val puntos = intArrayOf(MUNECA, INDICE_PUNTA, MAYOR_PUNTA)
    for (k in 0 until 3) {
      val dx = (mano[puntos[k]].x() - ojoX) / escala
      val dy = (mano[puntos[k]].y() - ojoY) / escala
      salida[k * 2] = if (izquierda) -dx else dx
      salida[k * 2 + 1] = dy
    }
    salida[6] = kotlin.math.hypot(
      (mano[MAYOR_NUDILLO].x() - mano[MUNECA].x()).toDouble(),
      (mano[MAYOR_NUDILLO].y() - mano[MUNECA].y()).toDouble(),
    ).toFloat() / escala
    salida[7] = 1f
    return salida
  }

  fun umbral(letra: String): Float = umbrales[letra] ?: 0.5f

  fun indice(letra: String): Int = letras.indexOf(letra)

  fun cerrar() = interprete.close()

  private companion object {
    // Índices de MediaPipe Pose.
    const val OJO_IZQ = 2
    const val OJO_DER = 5
    const val BOCA_IZQ = 9
    const val BOCA_DER = 10

    // Índices de MediaPipe Hands.
    const val MUNECA = 0
    const val MAYOR_NUDILLO = 9
    const val INDICE_PUNTA = 8
    const val MAYOR_PUNTA = 12
  }
}
