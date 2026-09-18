package com.signa.vision

/**
 * Decide cuándo una seña estuvo el tiempo suficiente como para darla por hecha.
 *
 * Se mide en TIEMPO sostenido y no en cuadros seguidos: en cuadros, la misma
 * exigencia vale el doble o la mitad según los fps que dé el aparato.
 *
 * Y alcanza con estar por encima del umbral la MAYOR PARTE de ese tiempo, no en
 * todos los cuadros: haciendo bien la seña, la probabilidad supera su umbral en
 * torno al 64% de los cuadros y se cae en el resto. Exigir una racha perfecta
 * sobre eso es mucho más difícil que el 64% suelto, y era la razón de que
 * costara tanto confirmar algo que el modelo estaba viendo.
 */
class Confirmador(
  private val ventanaMs: Long = 700,
  private val proporcionMinima: Float = 0.6f,
) {

  private data class Voto(val t: Long, val ok: Boolean)

  private val votos = ArrayDeque<Voto>()
  private var candidata: String? = null
  private var confirmada: String? = null

  /** Devuelve la seña si acaba de confirmarse, o null. */
  fun votar(t: Long, sena: String?, cumple: Boolean): String? {
    if (sena != candidata) {
      votos.clear()
      candidata = sena
    }
    if (sena == null) return null

    votos.addLast(Voto(t, cumple))
    while (votos.isNotEmpty() && t - votos.first().t > ventanaMs) votos.removeFirst()

    val cubre = votos.size > 1 && t - votos.first().t >= ventanaMs * 0.9
    val proporcion = if (votos.isEmpty()) 0f else votos.count { it.ok }.toFloat() / votos.size
    if (cubre && proporcion >= proporcionMinima && sena != confirmada) {
      confirmada = sena
      return sena
    }
    return null
  }

  /** Reposo libera la confirmación: es la señal de que terminó la seña anterior. */
  fun reiniciar() {
    votos.clear()
    candidata = null
    confirmada = null
  }
}
