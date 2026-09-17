package com.signa.vision

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark

/**
 * Dibuja el esqueleto sobre la cámara.
 *
 * Suaviza por TIEMPO y no por cuadro dibujado: con un factor fijo por cuadro,
 * en un teléfono lento el esqueleto tardaba casi un segundo en alcanzar la mano
 * y se veía arrastrado. Con una constante de tiempo converge siempre en los
 * mismos ~70 ms reales, dibuje a 60 cuadros por segundo o a 8.
 */
class Esqueleto(contexto: Context) : View(contexto) {

  private val lineaPose = Paint().apply {
    color = Color.argb(150, 255, 255, 255); strokeWidth = 5f; isAntiAlias = true
  }
  private val puntoPose = Paint().apply { color = Color.WHITE; isAntiAlias = true }
  private val lineaMano = Paint().apply {
    color = ACENTO; strokeWidth = 5f; isAntiAlias = true
  }
  private val puntoMano = Paint().apply { color = ACENTO; isAntiAlias = true }

  private var pose: FloatArray? = null
  private var poseDestino: FloatArray? = null
  private val manos = HashMap<String, FloatArray>()
  private val manosDestino = HashMap<String, FloatArray>()
  private var ultimoDibujo = 0L

  /** Sólo torso y brazos: las piernas no aportan a la seña y ensucian el cuadro. */
  private val enlacesPose = arrayOf(
    11 to 12, 11 to 13, 13 to 15, 12 to 14, 14 to 16, 11 to 23, 12 to 24, 23 to 24,
  )
  private val puntosPose = intArrayOf(11, 12, 13, 14, 15, 16, 23, 24)

  private val enlacesMano = arrayOf(
    0 to 1, 1 to 2, 2 to 3, 3 to 4, 0 to 5, 5 to 6, 6 to 7, 7 to 8, 5 to 9,
    9 to 10, 10 to 11, 11 to 12, 9 to 13, 13 to 14, 14 to 15, 15 to 16, 13 to 17,
    0 to 17, 17 to 18, 18 to 19, 19 to 20,
  )

  fun actualizar(
    poseNueva: List<NormalizedLandmark>?,
    izquierda: List<NormalizedLandmark>?,
    derecha: List<NormalizedLandmark>?,
  ) {
    poseDestino = poseNueva?.let { aplanar(it) }
    if (poseDestino != null && pose == null) pose = poseDestino!!.copyOf()

    manosDestino.clear()
    izquierda?.let { manosDestino["izq"] = aplanar(it) }
    derecha?.let { manosDestino["der"] = aplanar(it) }
    for ((k, v) in manosDestino) if (!manos.containsKey(k)) manos[k] = v.copyOf()
    // Una mano que desaparece deja de dibujarse en vez de quedar congelada.
    manos.keys.retainAll(manosDestino.keys)

    postInvalidateOnAnimation()
  }

  fun limpiar() {
    poseDestino = null
    pose = null
    manos.clear()
    manosDestino.clear()
    postInvalidateOnAnimation()
  }

  private fun aplanar(l: List<NormalizedLandmark>): FloatArray {
    val a = FloatArray(l.size * 2)
    for (i in l.indices) { a[i * 2] = l[i].x(); a[i * 2 + 1] = l[i].y() }
    return a
  }

  override fun onDraw(lienzo: Canvas) {
    super.onDraw(lienzo)
    val destino = poseDestino ?: return
    val actual = pose ?: return

    val ahora = System.nanoTime() / 1_000_000
    val dt = if (ultimoDibujo == 0L) 16 else (ahora - ultimoDibujo).coerceAtMost(200)
    ultimoDibujo = ahora
    val suave = 1f - Math.exp(-dt / TAU).toFloat()

    for (i in actual.indices) actual[i] += (destino[i] - actual[i]) * suave
    for ((k, v) in manos) {
      val d = manosDestino[k] ?: continue
      for (i in v.indices) v[i] += (d[i] - v[i]) * suave
    }

    val w = width.toFloat()
    val h = height.toFloat()
    for ((a, b) in enlacesPose) {
      lienzo.drawLine(actual[a * 2] * w, actual[a * 2 + 1] * h, actual[b * 2] * w, actual[b * 2 + 1] * h, lineaPose)
    }
    for (i in puntosPose) lienzo.drawCircle(actual[i * 2] * w, actual[i * 2 + 1] * h, 6f, puntoPose)

    for (v in manos.values) {
      for ((a, b) in enlacesMano) {
        lienzo.drawLine(v[a * 2] * w, v[a * 2 + 1] * h, v[b * 2] * w, v[b * 2 + 1] * h, lineaMano)
      }
      for (i in 0 until v.size / 2) lienzo.drawCircle(v[i * 2] * w, v[i * 2 + 1] * h, 5f, puntoMano)
    }

    if (manosDestino.isNotEmpty() || poseDestino != null) postInvalidateOnAnimation()
  }

  companion object {
    private const val ACENTO = 0xFF7857FF.toInt()
    private const val TAU = 70.0
  }
}
