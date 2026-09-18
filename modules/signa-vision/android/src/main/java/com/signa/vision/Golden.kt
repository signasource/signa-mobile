package com.signa.vision

import android.content.Context
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import org.json.JSONObject

/**
 * Comprueba que la ventana y el modelo nativos dan lo MISMO que el pipeline de
 * Python con el que se entrenó y se calibraron los umbrales.
 *
 * El vector de 258 números se arma y se normaliza dos veces —una en Python,
 * otra acá en Kotlin— y un error de un índice o una escala no se ve: el modelo
 * igual devuelve probabilidades plausibles, sólo que equivocadas, y se
 * confundiría con un problema de calibración. golden.json trae secuencias
 * reales del dataset con las probabilidades que da Python, y esto reproduce el
 * camino entero contra ellas.
 */
object Golden {

  fun correr(contexto: Context): Map<String, Any> {
    val json = JSONObject(contexto.assets.open("golden.json").bufferedReader().use { it.readText() })
    val casos = json.getJSONObject("casos")
    val modelo = ModeloSenas(contexto)
    val plano = FloatArray(ModeloSenas.PASOS * Ventana.DIM)

    var peor = 0.0
    val detalle = StringBuilder()

    for (nombre in casos.keys()) {
      val caso = casos.getJSONObject(nombre)
      val cuadros = caso.getJSONArray("frames")
      val esperado = caso.getJSONArray("probs")

      // Los mismos 30 pasos, repartidos en los 2,5 s que dura la ventana.
      val ventana = Ventana()
      val t0 = 1_000_000L
      for (i in 0 until cuadros.length()) {
        val fila = cuadros.getJSONArray(i)
        val kp = FloatArray(Ventana.DIM) { fila.getDouble(it).toFloat() }
        val t = t0 + 2500L * i / (cuadros.length() - 1)
        ventana.agregar(t, pose(kp), mano(kp, Ventana.POSE_DIM), mano(kp, Ventana.POSE_DIM + Ventana.MANO_DIM))
      }
      ventana.remuestrear(t0 + 2500L, plano)
      val dio = modelo.predecir(plano)

      var maximo = 0.0
      for (i in 0 until esperado.length()) {
        maximo = maxOf(maximo, kotlin.math.abs(esperado.getDouble(i) - dio[i]))
      }
      peor = maxOf(peor, maximo)
      detalle.append(nombre).append("=").append(String.format("%.4f", maximo)).append(" ")
    }

    modelo.cerrar()
    return mapOf(
      "peorDiferencia" to maxOf(peor, abecedario(contexto)),
      "detalle" to detalle.toString().trim(),
      "reproduccion" to reproducir(contexto, casos),
    )
  }

  /**
   * Lo mismo para el abecedario, que tiene sus propias formas de salir mal: el
   * modelo recibe TRES entradas y el orden en que las espera el grafo no es el
   * orden en que se declararon, una mano izquierda va espejada y el bloque de
   * cara se calcula con la mano sin espejar. Nada de eso da error si se
   * equivoca: devuelve otra letra, con la misma cara de confianza.
   */
  private fun abecedario(contexto: Context): Double {
    val json = JSONObject(
      contexto.assets.open("golden_abecedario.json").bufferedReader().use { it.readText() },
    )
    val casos = json.getJSONArray("casos")
    val modelo = ModeloAbecedario(contexto)
    var peor = 0.0

    for (i in 0 until casos.length()) {
      val caso = casos.getJSONObject(i)
      val mano = puntos(caso.getJSONArray("lm"))
      val mundo = metricos(caso.getJSONArray("world"))
      val cuerpo = puntosDePose(caso.getJSONArray("pose"))
      val izquierda = caso.getBoolean("izquierda")

      // El bloque de cara se compara aparte: es la única parte del camino del
      // abecedario que se calcula por fuera del grafo, o sea la única que se
      // puede desincronizar de lo que se usó al entrenar.
      val caraEsperada = caso.getJSONArray("cara")
      val caraDio = modelo.bloqueDeCara(mano, cuerpo, izquierda)
      for (k in 0 until caraEsperada.length()) {
        peor = maxOf(peor, kotlin.math.abs(caraEsperada.getDouble(k) - caraDio[k]))
      }

      val dio = modelo.predecir(mano, mundo, cuerpo, izquierda)

      val esperado = caso.getJSONArray("probs")
      for (k in 0 until esperado.length()) {
        peor = maxOf(peor, kotlin.math.abs(esperado.getDouble(k) - dio[k]))
      }
    }

    modelo.cerrar()
    return peor
  }

  private fun puntos(filas: org.json.JSONArray): List<NormalizedLandmark> =
    (0 until filas.length()).map {
      val f = filas.getJSONArray(it)
      NormalizedLandmark.create(f.getDouble(0).toFloat(), f.getDouble(1).toFloat(), f.getDouble(2).toFloat())
    }

  private fun metricos(filas: org.json.JSONArray): List<com.google.mediapipe.tasks.components.containers.Landmark> =
    (0 until filas.length()).map {
      val f = filas.getJSONArray(it)
      com.google.mediapipe.tasks.components.containers.Landmark.create(
        f.getDouble(0).toFloat(), f.getDouble(1).toFloat(), f.getDouble(2).toFloat(),
      )
    }

  /** La pose viene con visibilidad, que acá no se usa: sólo importan x e y. */
  private fun puntosDePose(filas: org.json.JSONArray): List<NormalizedLandmark> =
    (0 until filas.length()).map {
      val f = filas.getJSONArray(it)
      NormalizedLandmark.create(f.getDouble(0).toFloat(), f.getDouble(1).toFloat(), f.getDouble(2).toFloat())
    }

  /**
   * Además de los números, ¿el reconocedor CONFIRMA la seña?
   *
   * Entre las probabilidades y una seña dada por hecha hay bastante más:
   * cuántos cuadros tiene que juntar la ventana, el piso de movimiento, el
   * umbral de cada seña y los 700 ms sostenidos. Nada de eso se ve mirando el
   * golden, y no se puede probar con la cámara del emulador, que no tiene
   * manos. Acá se le pasan los cuadros de un clip real de a uno, con tiempos
   * como los que daría la cámara, por el mismo camino que corre en vivo.
   */
  private fun reproducir(contexto: Context, casos: org.json.JSONObject): String {
    val salida = StringBuilder()
    for (nombre in casos.keys()) {
      if (nombre == "reposo") continue
      val cuadros = casos.getJSONObject(nombre).getJSONArray("frames")
      val reconocedor = Reconocedor(contexto)
      reconocedor.objetivos = listOf(nombre)

      // La ventana pide 2,5 s de historia y el clip dura eso justo, así que se
      // repite: es lo mismo que hace alguien que insiste con la seña.
      //
      // Los cuadros donde MediaPipe no vio manos se saltean sin gastar tiempo.
      // En los clips grabados hay hasta 900 ms seguidos sin manos —la persona
      // todavía no arrancó— y repitiendo el clip ese hueco vuelve cada 2,5 s,
      // así que la ventana no llegaba a estar sana nunca. Eso es del clip, no
      // de lo que ve la cámara cuando alguien está haciendo la seña.
      var confirmada: String? = null
      var t = 1_000_000L
      var cuando = 0L
      var mejorP = 0f
      var huboVentana = false
      vueltas@ for (vuelta in 0 until 4) {
        for (i in 0 until cuadros.length()) {
          val fila = cuadros.getJSONArray(i)
          val kp = FloatArray(Ventana.DIM) { fila.getDouble(it).toFloat() }
          val izq = mano(kp, Ventana.POSE_DIM)
          val der = mano(kp, Ventana.POSE_DIM + Ventana.MANO_DIM)
          if (izq == null && der == null) continue
          val paso = reconocedor.cuadro(
            t,
            pose(kp),
            izq,
            der,
          )
          if (paso != null && paso.progreso >= 1f) huboVentana = true
          if (paso != null) mejorP = maxOf(mejorP, paso.p)
          if (paso?.confirmada != null) { confirmada = paso.confirmada; cuando = t - 1_000_000L; break@vueltas }
          t += 83 // ~12 cuadros por segundo, como en el teléfono
        }
      }
      reconocedor.cerrar()
      // Cuando no confirma, decir por qué: sin ventana es que MediaPipe perdió
      // las manos tantos cuadros seguidos que nunca se juntaron 2,5 s sanos,
      // que es muy distinto de que el modelo no le crea a la seña.
      salida.append(nombre).append(
        when {
          confirmada == nombre -> "=sí(${cuando}ms) "
          !huboVentana -> "=sin-ventana "
          else -> "=NO(p=${String.format("%.2f", mejorP)}) "
        },
      )
    }
    return salida.toString().trim()
  }

  private fun pose(kp: FloatArray): List<NormalizedLandmark> =
    (0 until 33).map { NormalizedLandmark.create(kp[it * 4], kp[it * 4 + 1], kp[it * 4 + 2]) }

  /** Bloque de mano todo en cero = mano no detectada, igual que en la cámara. */
  private fun mano(kp: FloatArray, desde: Int): List<NormalizedLandmark>? {
    if ((desde until desde + Ventana.MANO_DIM).all { kp[it] == 0f }) return null
    return (0 until 21).map {
      NormalizedLandmark.create(kp[desde + it * 3], kp[desde + it * 3 + 1], kp[desde + it * 3 + 2])
    }
  }
}
