package com.signa.vision

import android.content.Context
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark

/**
 * Qué seña se está haciendo, cuadro por cuadro.
 *
 * Junta la ventana, el modelo y la confirmación, y no sabe nada de cámara ni de
 * vistas: así el mismo camino que corre con la cámara se puede probar contra
 * secuencias del dataset (ver Golden.kt), que es la única forma de saber que
 * los 258 números se arman igual que en Python.
 */
class Reconocedor(contexto: Context) {

  private val modelo = ModeloSenas(contexto)
  private val ventana = Ventana()
  private val confirmador = Confirmador()
  private val suavizado = ArrayDeque<FloatArray>()
  private val plano = FloatArray(ModeloSenas.PASOS * Ventana.DIM)

  private var ultima = 0L

  /** Última inferencia, en milisegundos. Para el HUD. */
  var msInferencia = 0.0
    private set

  /**
   * @param progreso 0 a 1: cuánto le falta a la ventana para poder inferir.
   * @param sena candidata entre las pedidas, o null.
   * @param confirmada la seña recién dada por hecha, o null.
   */
  data class Paso(
    val progreso: Float,
    val sena: String?,
    val p: Float,
    val reposo: Boolean,
    val confirmada: String?,
  )

  var objetivos: List<String> = emptyList()
    set(valor) {
      field = valor
      reiniciar()
    }

  fun reiniciar() {
    confirmador.reiniciar()
    ventana.limpiar()
    suavizado.clear()
  }

  /**
   * Devuelve null si en este cuadro no hubo nada que decidir: la inferencia se
   * limita a doce por segundo aunque la cámara dé más, porque la ventana se
   * remuestrea a 30 pasos fijos sobre los últimos 2,5 s y correrla más seguido
   * no cambia lo que ve el modelo.
   */
  fun cuadro(
    t: Long,
    pose: List<NormalizedLandmark>?,
    izquierda: List<NormalizedLandmark>?,
    derecha: List<NormalizedLandmark>?,
  ): Paso? {
    ventana.agregar(t, pose, izquierda, derecha)
    if (t - ultima < MS_ENTRE_INFERENCIAS) return null
    ultima = t

    if (!ventana.utilizable(t)) {
      return Paso(ventana.progreso(t), null, 0f, false, null)
    }

    ventana.remuestrear(t, plano)
    val t0 = System.nanoTime()
    val probs = modelo.predecir(plano)
    msInferencia = (System.nanoTime() - t0) / 1_000_000.0

    // Promedio de las últimas cinco: una sola ventana tiembla entre cuadros
    // vecinos, y lo que se compara contra el umbral es el promedio, igual que
    // cuando se calibraron los umbrales.
    suavizado.addLast(probs)
    while (suavizado.size > SUAVIZADO) suavizado.removeFirst()
    val media = FloatArray(probs.size)
    for (p in suavizado) for (i in p.indices) media[i] += p[i] / suavizado.size

    var mejor = 0
    for (i in media.indices) if (media[i] > media[mejor]) mejor = i

    // Reposo ganando = no está haciendo ninguna seña, y es la señal de que
    // terminó la anterior: libera la confirmación.
    if (modelo.etiquetas[mejor] == modelo.reposo) {
      confirmador.reiniciar()
      return Paso(1f, null, 0f, true, null)
    }

    // Verificación y no identificación: el ejercicio ya dijo qué seña pidió, así
    // que se mira la probabilidad de ESA contra su umbral en vez de exigirle que
    // le gane a todas. Es lo que hace pasar a las señas que se reparten con una
    // vecina parecida (mama/papa).
    var candidata: String? = null
    var p = 0f
    for (o in objetivos) {
      val i = modelo.indice(o)
      if (i >= 0 && media[i] > p) { candidata = o; p = media[i] }
    }

    // Las señas dinámicas son movimiento: una mano quieta que por casualidad
    // cae cerca de una seña no cuenta.
    val moviendo = ventana.movimiento(plano) >= MOVIMIENTO_MIN
    val ok = candidata != null && p >= modelo.umbral(candidata) && moviendo
    return Paso(1f, candidata, p, false, confirmador.votar(t, candidata, ok))
  }

  fun cerrar() = modelo.cerrar()

  companion object {
    const val MS_ENTRE_INFERENCIAS = 80L
    const val SUAVIZADO = 5

    /**
     * Piso de movimiento de las manos en la ventana. Es sólo un filtro de mano
     * quieta, no un detector de reposo: medido sobre el dataset, los clips de
     * reposo tienen movimiento mediano 0,067 y el 93% supera este piso.
     */
    const val MOVIMIENTO_MIN = 0.004f
  }
}
