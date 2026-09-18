package com.signa.vision

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import org.json.JSONArray
import org.json.JSONObject

/**
 * Deja un .glb en condiciones de que lo lea Filament.
 *
 * Los avatares vienen con las texturas en webp (EXT_texture_webp), que es lo
 * que conviene para bajarlas: pesan la mitad que en PNG. Filament no las
 * decodifica —su cargador sólo sabe de PNG, JPEG y KTX2— y el modelo aparece
 * entero en negro, sin un solo error visible más que una línea en el log.
 *
 * Así que se decodifican acá, con el decodificador del sistema, y se vuelve a
 * armar el archivo con las imágenes en un formato que Filament sí entiende. Se
 * hace UNA vez por avatar y el resultado queda en disco: la alternativa era
 * volver a exportar todos los .glb del bucket y mantener dos versiones de cada
 * uno.
 */
object Glb {

  private const val JSON = 0x4E4F534A
  private const val BIN = 0x004E4942
  private const val WEBP = "EXT_texture_webp"

  /** Devuelve el archivo convertido, o el original si no hacía falta tocarlo. */
  fun sinWebp(bytes: ByteArray): ByteArray {
    val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    if (buffer.int != 0x46546C67) return bytes // "glTF"
    buffer.int // versión
    buffer.int // largo total

    var json: JSONObject? = null
    var bin = ByteArray(0)
    while (buffer.remaining() >= 8) {
      val largo = buffer.int
      val tipo = buffer.int
      val trozo = ByteArray(largo)
      buffer.get(trozo)
      when (tipo) {
        JSON -> json = JSONObject(String(trozo, Charsets.UTF_8))
        BIN -> bin = trozo
      }
      // Los trozos están alineados a 4 bytes.
      val relleno = (4 - largo % 4) % 4
      buffer.position(minOf(buffer.position() + relleno, buffer.limit()))
    }

    val doc = json ?: return bytes
    if (!usa(doc, WEBP)) return bytes

    val vistas = doc.getJSONArray("bufferViews")
    val imagenes = doc.optJSONArray("images") ?: return bytes
    val extra = ByteArrayOutputStream()

    for (i in 0 until imagenes.length()) {
      val imagen = imagenes.getJSONObject(i)
      if (imagen.optString("mimeType") != "image/webp") continue

      val vista = vistas.getJSONObject(imagen.getInt("bufferView"))
      val desde = vista.optInt("byteOffset", 0)
      val largo = vista.getInt("byteLength")
      val mapa = BitmapFactory.decodeByteArray(bin, desde, largo) ?: continue

      // JPEG salvo que la textura tenga transparencia —el pelo la usa—: PNG de
      // 1024x1024 tarda bastante más en comprimirse y ocupa varias veces más.
      val conAlfa = mapa.hasAlpha()
      val salida = ByteArrayOutputStream()
      mapa.compress(
        if (conAlfa) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG,
        90,
        salida,
      )
      mapa.recycle()

      // Las imágenes nuevas se agregan al final del binario y se apunta a ellas
      // con vistas nuevas. Reescribir las vistas viejas obligaría a recalcular
      // el resto de los offsets, que también usan las mallas.
      val nuevaVista = JSONObject()
        .put("buffer", 0)
        .put("byteOffset", bin.size + extra.size())
        .put("byteLength", salida.size())
      vistas.put(nuevaVista)
      extra.write(salida.toByteArray())

      imagen.put("bufferView", vistas.length() - 1)
      imagen.put("mimeType", if (conAlfa) "image/png" else "image/jpeg")
    }

    // Las texturas apuntaban a la imagen a través de la extensión; ahora lo
    // hacen por el camino de siempre.
    val texturas = doc.optJSONArray("textures")
    if (texturas != null) {
      for (i in 0 until texturas.length()) {
        val textura = texturas.getJSONObject(i)
        val ext = textura.optJSONObject("extensions") ?: continue
        val webp = ext.optJSONObject(WEBP) ?: continue
        textura.put("source", webp.getInt("source"))
        ext.remove(WEBP)
        if (ext.length() == 0) textura.remove("extensions")
      }
    }
    quitar(doc, "extensionsUsed", WEBP)
    quitar(doc, "extensionsRequired", WEBP)

    val nuevoBin = bin + extra.toByteArray()
    doc.getJSONArray("buffers").getJSONObject(0).put("byteLength", nuevoBin.size)
    // JSONObject escapa las barras: "image/jpeg" sale como "image\/jpeg", que
    // es JSON válido pero deja de coincidir con el tipo que busca el cargador,
    // y las texturas vuelven a quedar sin decodificar.
    val texto = doc.toString().replace("\\/", "/")
    return armar(texto.toByteArray(Charsets.UTF_8), nuevoBin)
  }

  private fun usa(doc: JSONObject, extension: String): Boolean {
    val lista = doc.optJSONArray("extensionsUsed") ?: return false
    for (i in 0 until lista.length()) if (lista.getString(i) == extension) return true
    return false
  }

  private fun quitar(doc: JSONObject, campo: String, extension: String) {
    val lista = doc.optJSONArray(campo) ?: return
    val quedan = JSONArray()
    for (i in 0 until lista.length()) {
      if (lista.getString(i) != extension) quedan.put(lista.getString(i))
    }
    if (quedan.length() == 0) doc.remove(campo) else doc.put(campo, quedan)
  }

  private fun armar(json: ByteArray, bin: ByteArray): ByteArray {
    // El trozo JSON se rellena con espacios y el binario con ceros: el formato
    // exige que cada uno empiece en un múltiplo de 4.
    val jsonRelleno = (4 - json.size % 4) % 4
    val binRelleno = (4 - bin.size % 4) % 4
    val total = 12 + 8 + json.size + jsonRelleno + 8 + bin.size + binRelleno

    val salida = ByteBuffer.allocate(total).order(ByteOrder.LITTLE_ENDIAN)
    salida.putInt(0x46546C67)
    salida.putInt(2)
    salida.putInt(total)

    salida.putInt(json.size + jsonRelleno)
    salida.putInt(JSON)
    salida.put(json)
    repeat(jsonRelleno) { salida.put(' '.code.toByte()) }

    salida.putInt(bin.size + binRelleno)
    salida.putInt(BIN)
    salida.put(bin)
    repeat(binRelleno) { salida.put(0) }

    return salida.array()
  }
}
