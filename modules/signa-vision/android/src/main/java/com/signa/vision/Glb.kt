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

  /**
   * Tope de huesos por malla que admite Filament (CONFIG_MAX_BONE_COUNT).
   *
   * Pasarse no da un error que se pueda atrapar: Filament valida el límite con
   * una precondición que lanza una excepción de C++, y eso aborta el proceso
   * entero. Los avatares de las letras M y N vienen con un esqueleto de 574
   * huesos —el resto tiene 198— y eran exactamente la caída que cerraba la app
   * en el ejercicio de deletrear.
   */
  const val MAX_HUESOS = 256

  private const val JSON = 0x4E4F534A
  private const val BIN = 0x004E4942
  private const val WEBP = "EXT_texture_webp"

  /**
   * Por qué este .glb no se puede dibujar con Filament, o null si se puede.
   *
   * Se pregunta ANTES de dárselo al cargador porque los límites que valida
   * Filament no se reportan: se abortan.
   */
  fun porQueNo(bytes: ByteArray): String? {
    val doc = try {
      leerJson(bytes)
    } catch (e: Throwable) {
      return "no se pudo leer: ${e.message}"
    } ?: return "sin parte JSON"

    val esqueletos = doc.optJSONArray("skins") ?: return null
    for (i in 0 until esqueletos.length()) {
      val huesos = esqueletos.getJSONObject(i).optJSONArray("joints")?.length() ?: 0
      if (huesos > MAX_HUESOS) return "esqueleto de $huesos huesos, el tope es $MAX_HUESOS"
    }
    return null
  }

  /** Devuelve el archivo arreglado, o el original si no hacía falta tocarlo. */
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

    rellenarAccessoresVacios(doc, vistas, bin.size, extra)

    val nuevoBin = bin + extra.toByteArray()
    doc.getJSONArray("buffers").getJSONObject(0).put("byteLength", nuevoBin.size)
    // JSONObject escapa las barras: "image/jpeg" sale como "image\/jpeg", que
    // es JSON válido pero deja de coincidir con el tipo que busca el cargador,
    // y las texturas vuelven a quedar sin decodificar.
    val texto = doc.toString().replace("\\/", "/")
    return armar(texto.toByteArray(Charsets.UTF_8), nuevoBin)
  }

  /**
   * Le da datos a los accessors que no tienen de dónde leerlos.
   *
   * Nuestros avatares traen un accessor sin `bufferView` —el canal de "weights"
   * que anima los ojos— que además no es de Draco, así que nadie lo rellena.
   * three.js lo deja pasar tratándolo como ceros, pero el cargador de Filament
   * es estricto y descarta la animación ENTERA: el avatar se quedaba clavado en
   * la pose del primer cuadro, con el modelo por lo demás perfecto y sin un
   * solo error. Se le da su tamaño en ceros, que es exactamente lo que el otro
   * cargador venía suponiendo.
   *
   * Los accessors de Draco también vienen sin bufferView, pero ésos sí los
   * rellena la extensión al descomprimir la malla, así que se los saltea.
   */
  private fun rellenarAccessoresVacios(
    doc: JSONObject,
    vistas: JSONArray,
    tamBin: Int,
    extra: ByteArrayOutputStream,
  ) {
    val accessores = doc.optJSONArray("accessors") ?: return
    val deDraco = HashSet<Int>()
    val mallas = doc.optJSONArray("meshes")
    if (mallas != null) {
      for (i in 0 until mallas.length()) {
        val primitivas = mallas.getJSONObject(i).getJSONArray("primitives")
        for (j in 0 until primitivas.length()) {
          val primitiva = primitivas.getJSONObject(j)
          val atributos = primitiva.getJSONObject("attributes")
          for (clave in atributos.keys()) deDraco.add(atributos.getInt(clave))
          if (primitiva.has("indices")) deDraco.add(primitiva.getInt("indices"))
          val objetivos = primitiva.optJSONArray("targets")
          if (objetivos != null) {
            for (k in 0 until objetivos.length()) {
              val objetivo = objetivos.getJSONObject(k)
              for (clave in objetivo.keys()) deDraco.add(objetivo.getInt(clave))
            }
          }
        }
      }
    }

    for (i in 0 until accessores.length()) {
      val accessor = accessores.getJSONObject(i)
      if (accessor.has("bufferView") || accessor.has("sparse") || deDraco.contains(i)) continue
      val largo = accessor.getInt("count") * componentes(accessor.getString("type")) *
        tamComponente(accessor.getInt("componentType"))
      vistas.put(
        JSONObject()
          .put("buffer", 0)
          .put("byteOffset", tamBin + extra.size())
          .put("byteLength", largo),
      )
      extra.write(ByteArray(largo))
      accessor.put("bufferView", vistas.length() - 1)
    }
  }

  private fun componentes(tipo: String) = when (tipo) {
    "SCALAR" -> 1
    "VEC2" -> 2
    "VEC3" -> 3
    "VEC4", "MAT2" -> 4
    "MAT3" -> 9
    else -> 16
  }

  private fun tamComponente(codigo: Int) = when (codigo) {
    5120, 5121 -> 1
    5122, 5123 -> 2
    else -> 4
  }

  private fun leerJson(bytes: ByteArray): JSONObject? {
    val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    if (buffer.remaining() < 12 || buffer.int != 0x46546C67) return null
    buffer.int
    buffer.int
    while (buffer.remaining() >= 8) {
      val largo = buffer.int
      val tipo = buffer.int
      if (largo < 0 || largo > buffer.remaining()) return null
      val trozo = ByteArray(largo)
      buffer.get(trozo)
      if (tipo == JSON) return JSONObject(String(trozo, Charsets.UTF_8))
      buffer.position(minOf(buffer.position() + (4 - largo % 4) % 4, buffer.limit()))
    }
    return null
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
