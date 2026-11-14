package com.signa.vision

import android.content.Context
import com.google.mediapipe.tasks.components.containers.Landmark
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark

/**
 * Qué seña se está haciendo, cuadro por cuadro.
 *
 * Junta la ventana, el modelo y la confirmación, y no sabe nada de cámara ni de
 * vistas: así el mismo camino que corre con la cámara se puede probar contra
 * secuencias del dataset (ver Golden.kt), que es la única forma de saber que
 * los 258 números se arman igual que en Python.
 *
 * Atiende los dos ejercicios de cámara, que se parecen menos de lo que
 * parecen: las señas dinámicas son movimiento y necesitan 2,5 s de historia,
 * mientras que una letra del abecedario ES una postura y se decide con el
 * cuadro que tiene delante. Lo que comparten —el suavizado y los 700 ms
 * sostenidos para confirmar— vive acá una sola vez.
 */
class Reconocedor(contexto: Context, val modo: Modo = Modo.DINAMICO) {

  enum class Modo { DINAMICO, ESTATICO }

  private val modelo = if (modo == Modo.DINAMICO) ModeloSenas(contexto) else null
  private val abecedario = if (modo == Modo.ESTATICO) ModeloAbecedario(contexto) else null
  private val ventana = Ventana()
  private val confirmador = Confirmador()
  private val suavizado = ArrayDeque<FloatArray>()
  private val plano = if (modo == Modo.DINAMICO) FloatArray(ModeloSenas.PASOS * Ventana.DIM) else FloatArray(0)

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
    mundo: List<Landmark>? = null,
    manoIzquierda: Boolean = false,
  ): Paso? {
    if (modo == Modo.ESTATICO) return letra(t, pose, izquierda ?: derecha, mundo, manoIzquierda)

    ventana.agregar(t, pose, izquierda, derecha)
    if (t - ultima < MS_ENTRE_INFERENCIAS) return null
    ultima = t

    if (!ventana.utilizable(t)) {
      return Paso(ventana.progreso(t), null, 0f, false, null)
    }

    val m = modelo ?: return null
    ventana.remuestrear(t, plano)
    val t0 = System.nanoTime()
    val probs = m.predecir(plano)
    msInferencia = (System.nanoTime() - t0) / 1_000_000.0

    // Promedio de las últimas cinco: una sola tanda tiembla entre cuadros
    // vecinos, y lo que se compara contra el umbral es el promedio, igual que
    // cuando se calibraron los umbrales.
    val media = promediar(probs)

    var mejor = 0
    for (i in media.indices) if (media[i] > media[mejor]) mejor = i

    // Reposo ganando = no está haciendo ninguna seña, y es la señal de que
    // terminó la anterior: libera la confirmación.
    if (m.etiquetas[mejor] == m.reposo) {
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
      val i = m.indice(o)
      if (i >= 0 && media[i] > p) { candidata = o; p = media[i] }
    }

    // Las señas dinámicas son movimiento: una mano quieta que por casualidad
    // cae cerca de una seña no cuenta.
    val moviendo = ventana.movimiento(plano) >= MOVIMIENTO_MIN
    val ok = candidata != null && p >= m.umbral(candidata) && moviendo
    return Paso(1f, candidata, p, false, confirmador.votar(t, candidata, ok))
  }

  /**
   * Una letra con el cuadro de ahora.
   *
   * Sin ventana y sin piso de movimiento: la mano está quieta a propósito. La
   * compuerta es simplemente que haya una mano; si no hay, no hay letra
   * posible, y eso libera la confirmación anterior como hace el reposo en las
   * señas dinámicas.
   */
  private fun letra(
    t: Long,
    pose: List<NormalizedLandmark>?,
    mano: List<NormalizedLandmark>?,
    mundo: List<Landmark>?,
    izquierda: Boolean,
  ): Paso? {
    val m = abecedario ?: return null

    // El freno va ANTES de mirar si hay mano: si no, los cuadros sin mano
    // —que son la mayoría mientras la persona se acomoda— mandaban un evento
    // cada uno, treinta por segundo, y cada uno mueve estado en React. Es
    // exactamente lo que la versión nativa venía a sacarse de encima.
    if (t - ultima < MS_ENTRE_INFERENCIAS) return null
    ultima = t

    if (mano == null) {
      confirmador.reiniciar()
      suavizado.clear()
      return Paso(0f, null, 0f, true, null)
    }

    val t0 = System.nanoTime()
    val probs = m.predecir(mano, mundo, pose, izquierda)
    msInferencia = (System.nanoTime() - t0) / 1_000_000.0

    val media = promediar(probs)
    var candidata: String? = null
    var p = 0f
    for (o in objetivos) {
      val i = m.indice(o)
      if (i >= 0 && media[i] > p) { candidata = o; p = media[i] }
    }

    val ok = candidata != null && p >= m.umbral(candidata)
    return Paso(1f, candidata, p, false, confirmador.votar(t, candidata, ok))
  }

  /** Promedio de las últimas cinco tandas de probabilidades. */
  private fun promediar(probs: FloatArray): FloatArray {
    suavizado.addLast(probs)
    while (suavizado.size > SUAVIZADO) suavizado.removeFirst()
    val media = FloatArray(probs.size)
    for (p in suavizado) for (i in p.indices) media[i] += p[i] / suavizado.size
    return media
  }

  fun cerrar() {
    modelo?.cerrar()
    abecedario?.cerrar()
  }

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
