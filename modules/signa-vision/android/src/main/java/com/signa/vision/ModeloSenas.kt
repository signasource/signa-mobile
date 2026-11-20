package com.signa.vision

import android.content.Context
import org.json.JSONObject
import org.tensorflow.lite.Interpreter
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel

/**
 * La LSTM de señas dinámicas, sus etiquetas y sus umbrales.
 *
 * Decide por VERIFICACIÓN y no por identificación: el ejercicio ya sabe qué seña
 * pidió, así que se compara la probabilidad de ESA contra su umbral en vez de
 * exigirle que le gane a todas las demás. Es una pregunta más fácil, y es lo que
 * permite que pasen las señas que reparten probabilidad con una parecida
 * (mama/papa se hacen casi en el mismo lugar).
 *
 * Los umbrales salen de `signa-ml/scripts/calibrate_signs.py`, calibrados sobre
 * ventanas con encuadres realistas, y viajan en senas.json junto al modelo.
 */
class ModeloSenas(contexto: Context) {

  private val interprete: Interpreter
  val etiquetas: List<String>
  private val umbrales: Map<String, Float>
  private val sinPose: Boolean

  /**
   * La línea del espacio de seña con la que se armaron los clips de ESTE modelo
   * (linea_de_sena en su metadata): Ventana tiene que usar la misma.
   */
  val linea: Float

  /** Clase de "no está haciendo nada". Nunca es una respuesta válida. */
  val reposo = "reposo"

  init {
    // El descriptor y el canal se cierran acá mismo: el mapeo sobrevive igual, y
    // dejándolos abiertos se acumulaba un archivo mapeado por cada vez que se
    // entra al ejercicio —el del abecedario pesa 8,6 MB— hasta que el sistema
    // se cansaba y cerraba la app sin decir nada.
    val modelo = contexto.assets.openFd("modelo.tflite").use { fd ->
      fd.createInputStream().use { entrada ->
        entrada.channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
      }
    }
    interprete = Interpreter(modelo, Interpreter.Options().apply { numThreads = 2 })

    val json = JSONObject(contexto.assets.open("senas.json").bufferedReader().use { it.readText() })
    etiquetas = json.getJSONArray("labels").let { a -> List(a.length()) { a.getString(it) } }
    val u = json.getJSONObject("thresholds")
    umbrales = u.keys().asSequence().associateWith { u.getDouble(it).toFloat() }
    sinPose = json.optBoolean("poseIgnored", true)
    linea = json.optDouble("linea", Ventana.LINEA_POR_OMISION.toDouble()).toFloat()
  }

  private val entrada = ByteBuffer.allocateDirect(4 * PASOS * Ventana.DIM).order(ByteOrder.nativeOrder())
  private val salida = Array(1) { FloatArray(etiquetas.size) }

  /**
   * Probabilidades para una ventana ya remuestreada.
   *
   * Si el modelo se entrenó ignorando la pose, se anulan sus 132 números acá:
   * la pose se usa sólo para normalizar. Sin esto el modelo aprendía a
   * reconocer por la postura del cuerpo en vez de por las manos, y en otro
   * encuadre no quedaba nada.
   */
  fun predecir(plano: FloatArray): FloatArray {
    entrada.rewind()
    for (t in 0 until PASOS) {
      val off = t * Ventana.DIM
      for (k in 0 until Ventana.DIM) {
        val v = if (sinPose && k < Ventana.POSE_DIM) 0f else plano[off + k]
        entrada.putFloat(v)
      }
    }
    entrada.rewind()
    interprete.run(entrada, salida)
    return salida[0]
  }

  /**
   * La seña se busca por su CLAVE y no tal cual viene.
   *
   * El ejercicio pide la seña con el nombre del curso ("café", "mamá",
   * "tarjeta de crédito", "cómo estás") y el modelo la conoce por el nombre de
   * la carpeta del dataset ("cafe", "mama", "tarjetacredito", "comoestas").
   * Comparando tal cual, 12 de las 27 señas daban -1: nunca se podían
   * reconocer, y sus umbrales caían al 0,5 por omisión.
   */
  private val porClave: Map<String, Int> =
    etiquetas.withIndex().associate { (i, e) -> clave(e) to i }

  fun indice(sena: String): Int = porClave[clave(sena)] ?: -1

  fun umbral(sena: String): Float =
    indice(sena).takeIf { it >= 0 }?.let { umbrales[etiquetas[it]] } ?: 0.5f

  fun cerrar() = interprete.close()

  companion object {
    const val PASOS = 30

    /**
     * "Tarjeta de Crédito" → "tarjetacredito": sin tildes ni mayúsculas, sin
     * el "de" y sin nada que no sea letra. La ñ pasa a n, como en "companero".
     */
    fun clave(sena: String): String =
      java.text.Normalizer.normalize(sena.lowercase(), java.text.Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "")
        .replace(Regex("\\bde\\b"), "")
        .replace(Regex("[^a-z]"), "")
  }
}
