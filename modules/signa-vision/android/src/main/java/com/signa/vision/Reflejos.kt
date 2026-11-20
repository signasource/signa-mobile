package com.signa.vision

import android.content.Context
import android.util.Log
import com.google.android.filament.Engine
import com.google.android.filament.Texture
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * El cuarto de estudio reflejado en el avatar, cargado una sola vez.
 *
 * Un material PBR tiene dos mitades. La difusa —el color que devuelve la
 * superficie— sale de los nueve armónicos esféricos de `AvatarView.ESTUDIO`. La
 * especular es el cuarto reflejado EN la superficie, y para eso no alcanza un
 * resumen: hace falta el cuarto entero, como imagen.
 *
 * Sin esa mitad todo material queda mate y liso, y es exactamente la diferencia
 * que se veía contra el visor web: la piel de un solo tono en vez de tener
 * variaciones, el pelo sin hilo y el overall sin trama. El visor web trae un
 * entorno completo por omisión; esto es su equivalente.
 *
 * El archivo lo genera `signa-ml/scripts/avatares/reflejos_estudio.py` y es
 * crudo a propósito: las seis caras seguidas, cada texel tres flotantes.
 * El desenfoque por rugosidad lo arma el motor en la GPU al cargarlo. Un KTX
 * habría necesitado `filament-utils`, que acá no compila.
 *
 * La textura la comparten todas las vistas y vive lo que vive el motor, que no
 * se apaga nunca. Ver [MotorFilament].
 */
object Reflejos {

  private const val ETIQUETA = "SignaAvatar"
  private const val ARCHIVO = "estudio.bin"
  private const val LADO = 128
  private const val CARAS = 6
  private const val BYTES_POR_TEXEL = 12  // RGB de flotantes
  private val FORMATO = Texture.InternalFormat.RGB32F

  private var textura: Texture? = null
  private var intentado = false

  fun tomar(motor: Engine, contexto: Context): Texture? {
    textura?.let { return it }
    if (intentado) return null
    intentado = true

    val bytes = try {
      contexto.assets.open(ARCHIVO).use { it.readBytes() }
    } catch (e: Throwable) {
      // Sin reflejos el avatar se ve mate, pero se ve: no vale tirar la vista.
      Log.w(ETIQUETA, "sin mapa de reflejos: ${e.message}")
      return null
    }

    // Preguntar ANTES de intentar. Un formato que la placa no soporta no
    // devuelve error: Filament lanza una excepción de C++ en su propio hilo de
    // dibujo y eso se lleva puesto el proceso entero, sin nada que atrapar
    // desde Kotlin. Los flotantes de 32 bits no están en todas las placas —el
    // emulador con GPU por software no los tiene— y el avatar se ve igual sin
    // reflejos, sólo más mate.
    val soportado = Texture.isTextureFormatSupported(motor, FORMATO) &&
      Texture.isTextureFormatMipmappable(motor, FORMATO)
    if (!soportado) {
      Log.w(ETIQUETA, "sin reflejos: la placa no soporta $FORMATO")
      return null
    }

    return try {
      subir(motor, bytes).also { textura = it }
    } catch (e: Throwable) {
      Log.w(ETIQUETA, "reflejos no subieron: ${e.message}")
      null
    }
  }

  private fun subir(motor: Engine, bytes: ByteArray): Texture {
    val niveles = Integer.numberOfTrailingZeros(LADO) + 1
    val tex = Texture.Builder()
      .width(LADO)
      .height(LADO)
      .levels(niveles)
      .sampler(Texture.Sampler.SAMPLER_CUBEMAP)
      .format(FORMATO)
      .build(motor)

    // Nativo y no de Java: Filament lo lee desde su propio hilo.
    val buffer = ByteBuffer.allocateDirect(bytes.size).order(ByteOrder.nativeOrder())
    buffer.put(bytes)
    buffer.flip()

    val porCara = LADO * LADO * BYTES_POR_TEXEL
    val arranques = IntArray(CARAS) { it * porCara }

    // Esta y no `setImage`: le da el cuarto tal cual y el motor arma la cadena
    // de niveles desenfocándolo con el lóbulo GGX de cada rugosidad, que es lo
    // que un material áspero necesita para reflejar bien. Hacerlo acá sería
    // otro medio mega de archivo y el mismo trabajo.
    tex.generatePrefilterMipmap(
      motor,
      Texture.PixelBufferDescriptor(buffer, Texture.Format.RGB, Texture.Type.FLOAT),
      arranques,
      Texture.PrefilterOptions().apply { sampleCount = 256 },
    )

    Log.i(ETIQUETA, "reflejos: $LADO por cara, ${bytes.size / 1024} KB, $niveles niveles")
    return tex
  }
}
