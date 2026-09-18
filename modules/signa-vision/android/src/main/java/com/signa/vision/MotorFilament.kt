package com.signa.vision

import com.google.android.filament.Engine
import com.google.android.filament.Filament
import com.google.android.filament.gltfio.Gltfio

/**
 * Un solo motor de Filament para todos los avatares.
 *
 * Cada motor levanta su propio hilo de dibujo y su propio contexto de GPU, y
 * hay pantallas con varios avatares a la vez —el carrusel de señas, el
 * ejercicio de unir con flechas—. Con uno por vista, entrar ahí significaba
 * seis contextos de GPU.
 *
 * Se cuenta cuántas vistas lo están usando: el último en irse lo apaga. Todas
 * las llamadas pasan por el hilo principal, que es donde viven las vistas.
 */
object MotorFilament {

  private var motor: Engine? = null
  private var usos = 0

  fun tomar(): Engine {
    android.util.Log.i("SignaAvatar", "motor tomar, usos=${usos + 1}")
    if (motor == null) {
      Filament.init()
      Gltfio.init()
      motor = Engine.create()
    }
    usos++
    return motor!!
  }

  fun devolver() {
    usos--
    android.util.Log.i("SignaAvatar", "motor devolver, usos=$usos")
    if (usos <= 0) {
      usos = 0
      motor?.destroy()
      motor = null
    }
  }
}
