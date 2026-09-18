package com.signa.vision

import com.google.mediapipe.tasks.components.containers.NormalizedLandmark

/**
 * El vector de 258 números por cuadro y la ventana de 2,5 segundos.
 *
 * Es el mismo armado que hace `signa-ml/src/data/normalization.py` y que hasta
 * ahora vivía en `engine/keypoints.ts`: 33 puntos de cuerpo por (x, y, z,
 * visibilidad) y 21 por (x, y, z) de cada mano, centrados en el punto medio de
 * los hombros y divididos por el ancho de hombros. Cualquier diferencia con esa
 * versión mueve la distribución de entrada y el modelo se degrada en silencio.
 */
class Ventana(private val pasos: Int = 30, private val duracionMs: Long = 2500) {

  private data class Cuadro(val t: Long, val kp: FloatArray)

  private val cuadros = ArrayDeque<Cuadro>()

  /** Mínimo de muestras y hueco máximo para dar la ventana por utilizable. */
  private val minMuestras = 10
  private val huecoMaxMs = 500

  fun agregar(
    t: Long,
    pose: List<NormalizedLandmark>?,
    izquierda: List<NormalizedLandmark>?,
    derecha: List<NormalizedLandmark>?,
  ) {
    // Sin manos no entra nada: 126 ceros donde el modelo espera una seña son
    // entrada fuera de distribución, y responde cualquier cosa con mucha
    // confianza.
    if (izquierda == null && derecha == null) {
      purgar(t)
      return
    }
    cuadros.addLast(Cuadro(t, normalizar(armar(pose, izquierda, derecha))))
    purgar(t)
  }

  private fun purgar(t: Long) {
    // Se descarta TODO lo viejo, sin conservar el último: guardarlo dejaba un
    // cuadro eterno y la ventana se daba por cubierta con una foto de hace diez
    // segundos.
    while (cuadros.isNotEmpty() && t - cuadros.first().t > duracionMs) cuadros.removeFirst()
  }

  /**
   * ¿Se puede decidir con lo que hay?
   *
   * No alcanza con que la ventana abarque los 2,5 segundos: tiene que estar
   * POBLADA. Con dos cuadros sueltos —uno viejo y uno reciente— el remuestreo
   * los une con una recta que el modelo lee como un movimiento deliberado, y
   * reconoce señas que nadie hizo.
   */
  fun utilizable(t: Long): Boolean {
    if (cuadros.size < minMuestras) return false
    if (t - cuadros.first().t < duracionMs * 0.9) return false
    var previo = cuadros.first().t
    for (c in cuadros) {
      if (c.t - previo > huecoMaxMs) return false
      previo = c.t
    }
    return true
  }

  fun progreso(t: Long): Float {
    if (cuadros.size < 2) return 0f
    val porTiempo = (t - cuadros.first().t).toFloat() / duracionMs
    val porMuestras = cuadros.size.toFloat() / minMuestras
    return minOf(1f, porTiempo, porMuestras)
  }

  fun limpiar() = cuadros.clear()

  /**
   * Los últimos `duracionMs` repartidos en `pasos` puntos parejos.
   *
   * Se remuestrea por TIEMPO y no por cantidad de cuadros: a 12 por segundo son
   * 2,5 s y a 10 son 3,0, así que la misma seña le llegaría al modelo estirada
   * o comprimida según lo que rinda el aparato en ese momento.
   */
  fun remuestrear(ahora: Long, destino: FloatArray) {
    val desde = ahora - duracionMs
    val lista = cuadros.toList()
    var j = 0
    for (i in 0 until pasos) {
      val t = desde + duracionMs * i / (pasos - 1)
      while (j < lista.size - 2 && lista[j + 1].t < t) j++
      val a = lista[j]
      val b = lista[minOf(j + 1, lista.size - 1)]
      val tramo = (b.t - a.t).toFloat()
      val u = if (tramo > 0) ((t - a.t) / tramo).coerceIn(0f, 1f) else 0f
      val off = i * DIM
      for (k in 0 until DIM) destino[off + k] = a.kp[k] + (b.kp[k] - a.kp[k]) * u
    }
  }

  /** Desplazamiento medio de las manos entre pasos. */
  fun movimiento(plano: FloatArray): Float {
    var suma = 0f
    var n = 0
    for (t in 1 until pasos) {
      val a = (t - 1) * DIM
      val b = t * DIM
      for (k in POSE_DIM until DIM) {
        suma += kotlin.math.abs(plano[b + k] - plano[a + k])
        n++
      }
    }
    return if (n > 0) suma / n else 0f
  }

  private fun armar(
    pose: List<NormalizedLandmark>?,
    izquierda: List<NormalizedLandmark>?,
    derecha: List<NormalizedLandmark>?,
  ): FloatArray {
    val kp = FloatArray(DIM)
    pose?.let {
      for (i in 0 until minOf(33, it.size)) {
        kp[i * 4] = it[i].x()
        kp[i * 4 + 1] = it[i].y()
        kp[i * 4 + 2] = it[i].z()
        kp[i * 4 + 3] = it[i].visibility().orElse(0f)
      }
    }
    mano(kp, POSE_DIM, izquierda)
    mano(kp, POSE_DIM + MANO_DIM, derecha)
    return kp
  }

  private fun mano(kp: FloatArray, desde: Int, l: List<NormalizedLandmark>?) {
    if (l == null) return
    for (i in 0 until minOf(21, l.size)) {
      kp[desde + i * 3] = l[i].x()
      kp[desde + i * 3 + 1] = l[i].y()
      kp[desde + i * 3 + 2] = l[i].z()
    }
  }

  /** Centro y ancho de hombros: así la seña no depende de dónde esté la persona. */
  private fun normalizar(kp: FloatArray): FloatArray {
    val ixq = 11 * 4
    val der = 12 * 4
    val lsx = kp[ixq]; val lsy = kp[ixq + 1]
    val rsx = kp[der]; val rsy = kp[der + 1]
    if (lsx == 0f && rsx == 0f) return kp

    val cx = (lsx + rsx) / 2
    val cy = (lsy + rsy) / 2
    val ancho = kotlin.math.hypot((rsx - lsx).toDouble(), (rsy - lsy).toDouble()).toFloat()
    if (ancho < 1e-6f) return kp

    for (i in 0 until 33) {
      val o = i * 4
      kp[o] = (kp[o] - cx) / ancho
      kp[o + 1] = (kp[o + 1] - cy) / ancho
      kp[o + 2] = kp[o + 2] / ancho
      // La visibilidad no se toca.
    }
    for (desde in intArrayOf(POSE_DIM, POSE_DIM + MANO_DIM)) {
      var vacia = true
      for (i in 0 until MANO_DIM) if (kp[desde + i] != 0f) { vacia = false; break }
      if (vacia) continue
      for (i in 0 until 21) {
        val o = desde + i * 3
        kp[o] = (kp[o] - cx) / ancho
        kp[o + 1] = (kp[o + 1] - cy) / ancho
        kp[o + 2] = kp[o + 2] / ancho
      }
    }
    return kp
  }

  companion object {
    const val POSE_DIM = 33 * 4
    const val MANO_DIM = 21 * 3
    const val DIM = POSE_DIM + MANO_DIM * 2
  }
}
