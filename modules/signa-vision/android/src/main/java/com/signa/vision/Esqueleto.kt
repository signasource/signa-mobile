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

  // Dos trazos por línea, como en la demo web: un halo blanco abajo y el
  // violeta encima. El halo es lo que hace que el esqueleto se lea sobre
  // cualquier fondo —una remera clara, una pared blanca— sin subirle el brillo
  // al violeta hasta que moleste.
  // El cuerpo va más tenue que las manos —la seña se lee en las manos, el
  // cuerpo sólo dice dónde están—, y esa transparencia va en el color y no en
  // una capa aparte: una capa con alfa obliga a dibujar fuera de pantalla y
  // componer, en cada cuadro, para algo que se resuelve con dos colores.
  // La demo dibuja en píxeles de CSS sobre un lienzo escalado por la densidad
  // de pantalla; acá el lienzo está en píxeles reales, así que los mismos
  // números se ven tres veces más finos en un teléfono. Todo va en dp.
  private val dp = contexto.resources.displayMetrics.density

  private val haloPose = trazo(Color.argb(83, 255, 255, 255), 6f * dp)
  private val lineaPose = trazo(conAlfa(ACENTO, 166), 2.6f * dp)
  private val haloMano = trazo(Color.argb(230, 255, 255, 255), 5f * dp)
  private val lineaMano = trazo(ACENTO, 2.4f * dp)
  private val puntoHalo = Paint().apply { color = Color.argb(230, 255, 255, 255); isAntiAlias = true }
  private val puntoAcento = Paint().apply { color = ACENTO; isAntiAlias = true }
  private val puntoHaloPose = Paint().apply { color = Color.argb(150, 255, 255, 255); isAntiAlias = true }
  private val puntoAcentoPose = Paint().apply { color = conAlfa(ACENTO, 166); isAntiAlias = true }

  private fun conAlfa(tinta: Int, alfa: Int) = Color.argb(alfa, Color.red(tinta), Color.green(tinta), Color.blue(tinta))

  private fun trazo(tinta: Int, ancho: Float) = Paint().apply {
    color = tinta
    strokeWidth = ancho
    strokeCap = Paint.Cap.ROUND
    isAntiAlias = true
  }

  /** Las puntas de los dedos se dibujan un poco más grandes: son la seña. */
  private val puntas = intArrayOf(4, 8, 12, 16, 20)

  /**
   * Tamaño del cuadro que vio el detector, ya rotado.
   *
   * Hace falta para que los puntos caigan sobre la mano: la previa de la cámara
   * muestra la imagen RECORTADA para llenar la vista (FILL_CENTER), no
   * estirada. Dibujando los puntos estirados sobre una imagen recortada, el
   * esqueleto queda corrido y más chico que la mano, que es exactamente lo que
   * se veía.
   */
  private var anchoCuadro = 0
  private var altoCuadro = 0

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

  fun encuadre(ancho: Int, alto: Int) {
    anchoCuadro = ancho
    altoCuadro = alto
  }

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

    // Mismo recorte que hace la previa: se escala por el lado que sobra y el
    // resto queda fuera de la vista, centrado.
    val cw = if (anchoCuadro > 0) anchoCuadro.toFloat() else w
    val ch = if (altoCuadro > 0) altoCuadro.toFloat() else h
    val escala = maxOf(w / cw, h / ch)
    val dw = cw * escala
    val dh = ch * escala
    val ox = (w - dw) / 2f
    val oy = (h - dh) / 2f
    fun px(x: Float) = ox + x * dw
    fun py(y: Float) = oy + y * dh

    for (paint in arrayOf(haloPose, lineaPose)) {
      for ((a, b) in enlacesPose) {
        lienzo.drawLine(
          px(actual[a * 2]), py(actual[a * 2 + 1]),
          px(actual[b * 2]), py(actual[b * 2 + 1]), paint,
        )
      }
    }
    for (i in puntosPose) {
      val x = px(actual[i * 2])
      val y = py(actual[i * 2 + 1])
      lienzo.drawCircle(x, y, 5f * dp, puntoHaloPose)
      lienzo.drawCircle(x, y, 3.4f * dp, puntoAcentoPose)
    }

    for (v in manos.values) {
      for (paint in arrayOf(haloMano, lineaMano)) {
        for ((a, b) in enlacesMano) {
          lienzo.drawLine(px(v[a * 2]), py(v[a * 2 + 1]), px(v[b * 2]), py(v[b * 2 + 1]), paint)
        }
      }
      for (i in 0 until v.size / 2) {
        val x = px(v[i * 2])
        val y = py(v[i * 2 + 1])
        val r = (if (i == 0) 5f else if (i in puntas) 4.2f else 3f) * dp
        lienzo.drawCircle(x, y, r + 1.5f * dp, puntoHalo)
        lienzo.drawCircle(x, y, r, puntoAcento)
      }
    }

    if (manosDestino.isNotEmpty() || poseDestino != null) postInvalidateOnAnimation()
  }

  companion object {
    private const val ACENTO = 0xFF7857FF.toInt()
    private const val TAU = 70.0
  }
}
