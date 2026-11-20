package com.signa.vision

import com.google.android.filament.Engine
import com.google.android.filament.Filament
import com.google.android.filament.gltfio.Gltfio

/**
 * Un solo motor de Filament para toda la app, creado una vez y nunca destruido.
 *
 * Cada motor levanta su propio hilo de dibujo y su propio contexto de GPU, así
 * que uno por vista era inviable: hay pantallas con seis avatares a la vez.
 *
 * Pero contar usos y apagarlo cuando el último se iba era peor, y ahí estaba la
 * caída que tiró la app abajo durante días: **el ejercicio de deletrear cambia
 * de avatar en cada letra**. Cada cambio dejaba la cuenta en cero por un
 * instante —se destruía el motor— y enseguida en uno —se creaba otro—, y en el
 * teléfono del usuario esa seguidilla de crear y destruir contextos de GPU
 * terminaba en una excepción de C++ adentro de gltfio al crear el modelo:
 * SIGABRT, el proceso entero abajo. El ejercicio de señas dinámicas casi no
 * cambia de avatar, y por eso no se caía nunca: ésa fue la pista.
 *
 * Un motor de Filament está pensado para vivir lo que vive la app. Lo que se
 * destruye al salir de una pantalla son las escenas, las vistas y los modelos
 * —eso sí, cada avatar limpia lo suyo—, no el motor.
 *
 * Todas las llamadas pasan por el hilo principal, que es donde viven las vistas.
 */
object MotorFilament {

  private var motor: Engine? = null

  fun tomar(): Engine {
    motor?.let { return it }
    Filament.init()
    Gltfio.init()
    return Engine.create().also { motor = it }
  }

  /**
   * No hace nada, y está a propósito.
   *
   * Existe para que la vista pueda decir "ya no lo uso" sin tener que saber que
   * la respuesta es "no importa". Ver arriba por qué el motor no se apaga.
   */
  fun devolver() = Unit
}
