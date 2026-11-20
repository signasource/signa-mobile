package com.signa.vision

import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import kotlin.math.abs
import kotlin.math.hypot

/**
 * Qué mano va a cada lado del vector, cuadro a cuadro.
 *
 * Es `signa-ml/src/inference/alphabet_rules.HandTracks` —el seguimiento de la
 * página de la feria, que es el que mejor anduvo— más el filtro de manos
 * gigantes de `sign_runner._Hands`. Antes la app repartía por cercanía al cuadro
 * anterior y, sin historia, por la etiqueta de MediaPipe de ese cuadro: con las
 * dos manos a la vista saltaban de un lado al otro, y para el modelo los 63
 * números de cada mano cambiando de lugar a mitad de ventana son otra seña.
 *
 * - Cada mano conserva su pista aunque MediaPipe cambie el orden o la pierda un
 *   instante (la espera [ESPERA_MS]), siempre que reaparezca cerca: a menos de
 *   [PORTON] tamaños de mano, una distancia que crece con el tiempo perdida.
 * - El lado se VOTA en el tiempo con la etiqueta y su confianza, en vez de
 *   creerle a cada cuadro; y dos manos no pueden ser del mismo lado.
 * - La misma mano devuelta dos veces (superpuesta, apenas corrida) cuenta como
 *   una: se dibujaba un esqueleto fantasma que además le robaba la pista a la
 *   mano real.
 * - Una "mano" más grande que un ancho de hombro se descarta: es MediaPipe
 *   viendo una mano del tamaño del torso (el 99% de las del dataset miden menos
 *   de 0,6 anchos de hombro de la muñeca al nudillo del medio).
 *
 * El lado sigue la convención con la que se grabó el dataset: la etiqueta
 * "Left" de MediaPipe va al bloque izquierdo.
 */
class PistasDeManos {

  private class Pista(
    val id: Int,
    var puntos: List<NormalizedLandmark>,
    var vistaEn: Long,
    var voto: Float,
  ) {
    var tamano = 0f
    var izquierda = voto > 0
  }

  private data class Avistaje(val puntos: List<NormalizedLandmark>, val izquierda: Boolean, val confianza: Float)

  private val pistas = mutableListOf<Pista>()
  private var siguiente = 1

  fun reiniciar() {
    pistas.clear()
  }

  /**
   * @param aspecto alto/ancho de la imagen: las distancias se miden en anchos
   *   de imagen, como en Python.
   * @param pose para el ancho de hombros del filtro de manos gigantes.
   */
  fun repartir(
    r: HandLandmarkerResult,
    pose: List<NormalizedLandmark>?,
    aspecto: Float,
    ahora: Long,
  ): Pair<List<NormalizedLandmark>?, List<NormalizedLandmark>?> {
    val manos = mutableListOf<List<NormalizedLandmark>>()
    val izquierdas = mutableListOf<Boolean>()
    val confianzas = mutableListOf<Float>()
    for (i in r.landmarks().indices) {
      val cat = r.handedness().getOrNull(i)?.firstOrNull() ?: continue
      manos.add(r.landmarks()[i])
      izquierdas.add(cat.categoryName() == "Left")
      confianzas.add(cat.score())
    }
    return repartir(manos, izquierdas, confianzas, pose, aspecto, ahora)
  }

  /** Lo mismo con las manos ya separadas de su etiqueta ("Left") y confianza. */
  fun repartir(
    manos: List<List<NormalizedLandmark>>,
    izquierdas: List<Boolean>,
    confianzas: List<Float>,
    pose: List<NormalizedLandmark>?,
    aspecto: Float,
    ahora: Long,
  ): Pair<List<NormalizedLandmark>?, List<NormalizedLandmark>?> {
    val hombros = pose?.takeIf { it.size > 12 }?.let {
      hypot((it[11].x() - it[12].x()).toDouble(), ((it[11].y() - it[12].y()) * aspecto).toDouble()).toFloat()
    }
    var avistajes = mutableListOf<Avistaje>()
    for (i in manos.indices) {
      if (hombros != null && tamanoDeMano(manos[i], aspecto) > MANO_GIGANTE * hombros) continue
      avistajes.add(Avistaje(manos[i], izquierdas[i], confianzas[i]))
    }
    avistajes = sinDuplicados(avistajes, aspecto)
    pistas.removeAll { ahora - it.vistaEn > ESPERA_MS }

    fun costo(p: Pista, a: Avistaje): Float {
      val d = distancia(p.puntos[0], a.puntos[0], aspecto)
      val tam = minOf(p.tamano, tamanoDeMano(a.puntos, aspecto))
      return if (d <= PORTON * tam * (1 + (ahora - p.vistaEn).toFloat() / PORTON_CRECE_MS)) d else Float.POSITIVE_INFINITY
    }

    val duenos = arrayOfNulls<Pista>(avistajes.size)
    if (avistajes.size == 2 && pistas.size >= 2) {
      val a = pistas[0]
      val b = pistas[1]
      val directo = costo(a, avistajes[0]) + costo(b, avistajes[1])
      val cruzado = costo(b, avistajes[0]) + costo(a, avistajes[1])
      val (p, q) = if (cruzado < directo) b to a else a to b
      if (costo(p, avistajes[0]).isFinite()) duenos[0] = p
      if (costo(q, avistajes[1]).isFinite()) duenos[1] = q
    } else {
      val libres = pistas.toMutableList()
      for (i in avistajes.indices) {
        val mejor = libres.minByOrNull { costo(it, avistajes[i]) }
        if (mejor != null && costo(mejor, avistajes[i]).isFinite()) {
          duenos[i] = mejor
          libres.remove(mejor)
        }
      }
    }

    val vistas = mutableListOf<Pista>()
    for (i in avistajes.indices) {
      val a = avistajes[i]
      val lado = (if (a.izquierda) 1f else -1f) * a.confianza
      var p = duenos[i]
      if (p == null) {
        if (pistas.size >= 2) {
          val vieja = pistas.minByOrNull { it.vistaEn }!!
          if (vieja.vistaEn == ahora) continue
          pistas.remove(vieja)
        }
        p = Pista(siguiente++, a.puntos, ahora, lado)
        pistas.add(p)
      }
      p.puntos = a.puntos
      p.vistaEn = ahora
      p.tamano = tamanoDeMano(a.puntos, aspecto)
      p.voto += (lado - p.voto) * VOTO
      p.izquierda = p.voto > 0
      vistas.add(p)
    }

    // Dos manos del mismo lado no pueden ser: cede la menos segura.
    if (vistas.size == 2 && vistas[0].izquierda == vistas[1].izquierda) {
      val (segura, dudosa) = if (abs(vistas[0].voto) >= abs(vistas[1].voto)) vistas[0] to vistas[1] else vistas[1] to vistas[0]
      dudosa.izquierda = !segura.izquierda
    }

    var izq: List<NormalizedLandmark>? = null
    var der: List<NormalizedLandmark>? = null
    for (p in vistas) if (p.izquierda) izq = p.puntos else der = p.puntos
    return izq to der
  }

  /** La misma mano dos veces: si los 21 puntos coinciden a menos de medio tamaño de mano. */
  private fun sinDuplicados(a: MutableList<Avistaje>, aspecto: Float): MutableList<Avistaje> {
    if (a.size != 2) return a
    val tam = maxOf(tamanoDeMano(a[0].puntos, aspecto), tamanoDeMano(a[1].puntos, aspecto))
    var suma = 0f
    for (i in 0 until 21) suma += distancia(a[0].puntos[i], a[1].puntos[i], aspecto)
    if (suma / 21 >= DUPLICADA * tam) return a
    return mutableListOf(if (a[0].confianza >= a[1].confianza) a[0] else a[1])
  }

  private fun tamanoDeMano(m: List<NormalizedLandmark>, aspecto: Float) = distancia(m[0], m[9], aspecto)

  private fun distancia(a: NormalizedLandmark, b: NormalizedLandmark, aspecto: Float): Float =
    hypot((a.x() - b.x()).toDouble(), ((a.y() - b.y()) * aspecto).toDouble()).toFloat()

  companion object {
    // Los mismos que HandTracks.
    const val DUPLICADA = 0.5f
    const val ESPERA_MS = 700L
    const val PORTON = 3f
    const val PORTON_CRECE_MS = 100f
    const val VOTO = 0.25f

    /** sign_runner.GIANT_HAND, en anchos de hombro. */
    const val MANO_GIGANTE = 1.0f
  }
}
