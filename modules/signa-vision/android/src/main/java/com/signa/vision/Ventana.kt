package com.signa.vision

import com.google.mediapipe.tasks.components.containers.NormalizedLandmark

/**
 * El vector de 258 números por cuadro y la ventana que ve el modelo.
 *
 * Es el mismo armado que `signa-ml/src/inference/sign_runner.py` (preparar y
 * _Window), con el que se entrenó y se midió cada cambio contra sesiones reales
 * del laboratorio: 33 puntos de cuerpo por (x, y, z, visibilidad) y 21 por
 * (x, y, z) de cada mano, centrados en el punto medio de los hombros y divididos
 * por el ancho de hombros. Cualquier diferencia con esa versión mueve la
 * distribución de entrada y el modelo se degrada en silencio: Golden.kt la
 * compara contra golden.json, que sale de ese mismo código.
 *
 * Tres cosas que antes no estaban, todas medidas (ver signa-ml):
 *
 * - **Aspecto de la cámara.** MediaPipe da x en fracción del ANCHO del cuadro e
 *   y en fracción del ALTO, y el ancho de hombros es casi todo horizontal: con
 *   el teléfono en vertical (3:4) lo vertical llegaba comprimido a menos de la
 *   mitad que en el dataset (16:9), y el v11 caía de 97% a 51%. Se reescala y a
 *   la proporción del dataset.
 * - **El espacio de seña.** Una mano con la muñeca debajo de [linea] (en anchos
 *   de hombro desde los hombros) no cuenta: se pone en cero, y un cuadro sin
 *   ninguna mano adentro no entra. La ventana es el TRAMO con manos en el
 *   espacio, hasta 2,5 s, estirado a 30 pasos: igual que cada clip al entrenar.
 *   Si las manos salen más de medio segundo, el tramo se corta: lo que venga es
 *   otra seña.
 * - **Ventana mínima de 0,8 s.** Con medio segundo la ventana podía ser sólo la
 *   mano subiendo o bajando por la panza, y efectivo y bien se confirmaban
 *   solas entre seña y seña (31 → 22-24 en una sesión, mismos aciertos).
 */
class Ventana(
  private val pasos: Int = 30,
  private val linea: Float = LINEA_POR_OMISION,
) {

  private data class Cuadro(val t: Long, val kp: FloatArray)

  private val cuadros = ArrayDeque<Cuadro>()

  /**
   * Un cuadro. `aspecto` es ancho/alto de la imagen que vio MediaPipe.
   *
   * Devuelve true si con este cuadro se cortó el tramo anterior (las manos
   * estuvieron fuera del espacio más de [HUECO_MAX_MS]): lo suavizado y lo
   * votado eran de otra seña.
   */
  fun agregar(
    t: Long,
    pose: List<NormalizedLandmark>?,
    izquierda: List<NormalizedLandmark>?,
    derecha: List<NormalizedLandmark>?,
    aspecto: Float = ASPECTO_DATASET,
  ): Boolean {
    val cortado = cuadros.isNotEmpty() && t - cuadros.last().t > HUECO_MAX_MS
    if (cortado) cuadros.clear()
    if (izquierda != null || derecha != null) {
      val kp = normalizar(armar(pose, izquierda, derecha))
      corregirAspecto(kp, aspecto)
      if (enEspacio(kp)) cuadros.addLast(Cuadro(t, kp))
    }
    while (cuadros.isNotEmpty() && t - cuadros.first().t > DURACION_MS) cuadros.removeFirst()
    return cortado
  }

  /** Lo que abarca el tramo de ahora, en ms. */
  private fun abarca(): Long = if (cuadros.size > 1) cuadros.last().t - cuadros.first().t else 0L

  /** ¿Se puede decidir con lo que hay? Como _Window.usable. */
  fun utilizable(t: Long): Boolean =
    cuadros.size >= MIN_MUESTRAS && abarca() >= MIN_ABARCA_MS && t - cuadros.last().t <= HUECO_MAX_MS

  fun progreso(t: Long): Float = minOf(1f, abarca().toFloat() / MIN_ABARCA_MS)

  fun limpiar() = cuadros.clear()

  /**
   * El tramo repartido en `pasos` puntos parejos POR ORDEN, no por tiempo: es
   * normalization.estirar, lo mismo que se hizo con cada clip al entrenar. El
   * tramo entero se lleva a 30 pasos dure lo que dure, así que una seña hecha
   * más rápido o más despacio le llega al modelo igual.
   */
  fun remuestrear(destino: FloatArray) {
    val n = cuadros.size
    val lista = cuadros.toList()
    for (i in 0 until pasos) {
      val off = i * DIM
      if (n == 1) {
        System.arraycopy(lista[0].kp, 0, destino, off, DIM)
        continue
      }
      // np.interp sobre linspace(0, 1, n) en los puntos linspace(0, 1, pasos).
      val x = i.toDouble() / (pasos - 1) * (n - 1)
      val j = minOf(x.toInt(), n - 2)
      val u = (x - j).toFloat()
      val a = lista[j].kp
      val b = lista[j + 1].kp
      for (k in 0 until DIM) destino[off + k] = a[k] + (b[k] - a[k]) * u
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
      if (vacia(kp, desde)) continue
      for (i in 0 until 21) {
        val o = desde + i * 3
        kp[o] = (kp[o] - cx) / ancho
        kp[o + 1] = (kp[o + 1] - cy) / ancho
        kp[o + 2] = kp[o + 2] / ancho
      }
    }
    return kp
  }

  /** normalization.corregir_aspecto: y de la pose y de las manos a la escala del dataset. */
  private fun corregirAspecto(kp: FloatArray, aspecto: Float) {
    val factor = ASPECTO_DATASET / aspecto
    for (i in 0 until 33) kp[i * 4 + 1] *= factor
    for (i in 0 until MANO_DIM * 2 / 3) kp[POSE_DIM + i * 3 + 1] *= factor
  }

  /**
   * normalization.en_espacio: la mano con la muñeca debajo de la línea va en
   * cero. Devuelve si quedó alguna mano adentro.
   */
  private fun enEspacio(kp: FloatArray): Boolean {
    var alguna = false
    for (desde in intArrayOf(POSE_DIM, POSE_DIM + MANO_DIM)) {
      if (vacia(kp, desde)) continue
      if (kp[desde + 1] >= linea) {
        for (i in 0 until MANO_DIM) kp[desde + i] = 0f
      } else {
        alguna = true
      }
    }
    return alguna
  }

  private fun vacia(kp: FloatArray, desde: Int): Boolean {
    for (i in 0 until MANO_DIM) if (kp[desde + i] != 0f) return false
    return true
  }

  companion object {
    const val POSE_DIM = 33 * 4
    const val MANO_DIM = 21 * 3
    const val DIM = POSE_DIM + MANO_DIM * 2

    /** Los mismos números que sign_runner.py. */
    const val DURACION_MS = 2500L
    const val MIN_MUESTRAS = 5
    const val MIN_ABARCA_MS = 800L
    const val HUECO_MAX_MS = 500L

    /** 1280x720: con lo que se grabó el dataset. */
    const val ASPECTO_DATASET = 16f / 9f

    /** Para un senas.json sin "linea": la del v12 en adelante. */
    const val LINEA_POR_OMISION = 1.5f
  }
}
