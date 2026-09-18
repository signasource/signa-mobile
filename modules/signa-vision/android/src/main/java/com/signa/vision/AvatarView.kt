package com.signa.vision

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import android.view.Choreographer
import android.view.MotionEvent
import android.view.TextureView
import com.google.android.filament.Camera
import com.google.android.filament.Colors
import com.google.android.filament.Engine
import com.google.android.filament.EntityManager
import com.google.android.filament.IndirectLight
import com.google.android.filament.LightManager
import com.google.android.filament.Renderer
import com.google.android.filament.Scene
import com.google.android.filament.SwapChain
import com.google.android.filament.View as VistaFilament
import com.google.android.filament.Viewport
import com.google.android.filament.android.UiHelper
import com.google.android.filament.gltfio.AssetLoader
import com.google.android.filament.gltfio.FilamentAsset
import com.google.android.filament.gltfio.ResourceLoader
import com.google.android.filament.gltfio.UbershaderProvider
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.util.concurrent.Executors
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.tan

/**
 * El avatar de la seña, con Filament en vez de un WebView.
 *
 * La versión web era `<model-viewer>` adentro de un WebView: por cada avatar se
 * levantaba un WebView, se bajaba el runtime de un CDN y recién ahí empezaba a
 * cargar el modelo. Acá el motor ya está en la app, el .glb se guarda en disco
 * la primera vez, y no hay una segunda máquina de JavaScript compitiendo por el
 * mismo teléfono que está reconociendo señas.
 *
 * El encuadre es el mismo que el de la versión web a propósito: mismo campo de
 * visión, misma fracción del alto del avatar y mismo objetivo a la altura del
 * torso. Si no, las señas se verían de otro tamaño de un día para el otro.
 */
@SuppressLint("ViewConstructor")
class AvatarView(contexto: Context, appContext: AppContext) : ExpoView(contexto, appContext) {

  private val onCargado by EventDispatcher()
  private val onFalla by EventDispatcher()

  // TextureView y no SurfaceView: el avatar va ENCIMA de la cámara en el
  // picture-in-picture, y dos superficies nativas superpuestas se pelean por el
  // orden de dibujo. Una TextureView se compone como cualquier otra vista, se
  // puede redondear y respeta el apilado de React Native.
  private val superficie = TextureView(contexto)
  private val uiHelper = UiHelper(UiHelper.ContextErrorPolicy.DONT_CHECK)
  private val motor = MotorFilament.tomar()
  private val renderizador = motor.createRenderer()
  private val escena = motor.createScene()
  private val vista = motor.createView()
  private val camaraEntidad = EntityManager.get().create()
  private val camara = motor.createCamera(camaraEntidad)
  private val materiales = UbershaderProvider(motor)
  private val cargador = AssetLoader(motor, materiales, EntityManager.get())
  private val recursos = ResourceLoader(motor)
  private val descargas = Executors.newSingleThreadExecutor()

  private var cadenaIntercambio: SwapChain? = null
  private var modelo: FilamentAsset? = null
  private var animador: com.google.android.filament.gltfio.Animator? = null
  private var luz = 0
  private var iluminacion: IndirectLight? = null

  private var soltado = false
  private var inicioAnimacion = 0L
  private var pausadoEn = 0f
  private var radio = 2f
  private var alturaObjetivo = 0f
  private var giro = 0f
  private var dedoX = 0f

  var pausado = false
  var rotable = false

  var url: String? = null
    set(valor) {
      if (field == valor) return
      field = valor
      valor?.let { descargar(it) }
    }

  init {
    addView(superficie, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

    vista.scene = escena
    vista.camera = camara
    camara.setExposure(16f, 1f / 125f, 100f)

    // El fondo lo pinta el motor: dejar la superficie transparente obligaría a
    // componerla contra la vista de atrás en cada cuadro.
    renderizador.clearOptions = Renderer.ClearOptions().apply {
      clear = true
      clearColor = doubleArrayOf(FONDO[0], FONDO[1], FONDO[2], 1.0)
    }

    // Sin imagen de entorno, un modelo PBR se ve plano y oscuro. En vez de
    // cargar un .ktx —un archivo más para versionar y mantener— se arma una
    // iluminación ambiente a partir de armónicos esféricos constantes: da luz
    // pareja de todos lados, que es justo lo que quiere un avatar sobre fondo
    // liso, y el sol de abajo hace el resto.
    iluminacion = IndirectLight.Builder()
      .irradiance(1, floatArrayOf(0.85f, 0.85f, 0.9f))
      .intensity(30_000f)
      .build(motor)
      .also { escena.indirectLight = it }

    luz = EntityManager.get().create()
    val (r, g, b) = Colors.cct(6_500f)
    LightManager.Builder(LightManager.Type.DIRECTIONAL)
      .color(r, g, b)
      .intensity(70_000f)
      .direction(-0.2f, -0.8f, -0.6f)
      .castShadows(false)
      .build(motor, luz)
    escena.addEntity(luz)

    uiHelper.renderCallback = Renderizado()
    uiHelper.attachTo(superficie)
  }

  override val shouldUseAndroidLayout = true

  override fun onLayout(cambio: Boolean, izq: Int, arr: Int, der: Int, aba: Int) {
    val ancho = der - izq
    val alto = aba - arr
    for (i in 0 until childCount) {
      val hijo = getChildAt(i)
      hijo.measure(
        MeasureSpec.makeMeasureSpec(ancho, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(alto, MeasureSpec.EXACTLY),
      )
      hijo.layout(0, 0, ancho, alto)
    }
  }

  /** Arrastrar para girar el avatar. Sólo cuando el ejercicio lo pide. */
  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(evento: MotionEvent): Boolean {
    if (!rotable) return false
    when (evento.actionMasked) {
      MotionEvent.ACTION_DOWN -> dedoX = evento.x
      MotionEvent.ACTION_MOVE -> {
        giro += (evento.x - dedoX) * 0.01f
        dedoX = evento.x
      }
    }
    return true
  }

  private inner class Renderizado : UiHelper.RendererCallback {
    override fun onNativeWindowChanged(ventana: android.view.Surface) {
      cadenaIntercambio?.let { motor.destroySwapChain(it) }
      cadenaIntercambio = motor.createSwapChain(ventana)
    }

    override fun onDetachedFromSurface() {
      cadenaIntercambio?.let {
        motor.destroySwapChain(it)
        motor.flushAndWait()
        cadenaIntercambio = null
      }
    }

    override fun onResized(ancho: Int, alto: Int) {
      vista.viewport = Viewport(0, 0, ancho, alto)
      encuadrar(ancho, alto)
    }
  }

  private val cuadros = object : Choreographer.FrameCallback {
    override fun doFrame(tiempo: Long) {
      Choreographer.getInstance().postFrameCallback(this)
      dibujar(tiempo)
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    Choreographer.getInstance().postFrameCallback(cuadros)
  }

  /**
   * Ojo: desprenderse de la ventana NO quiere decir que la vista se vaya.
   * Al agrandar el picture-in-picture, React la saca y la vuelve a poner en
   * otro lugar del árbol, y desarmando el motor acá el avatar agrandado quedaba
   * en blanco para siempre. Lo único que se para es el dibujo; el desarmado de
   * verdad va en OnViewDestroys.
   */
  override fun onDetachedFromWindow() {
    Choreographer.getInstance().removeFrameCallback(cuadros)
    super.onDetachedFromWindow()
  }

  private fun dibujar(tiempo: Long) {
    val cadena = cadenaIntercambio ?: return
    val asset = modelo

    if (asset != null) {
      val animador = animador
      if (animador != null && animador.animationCount > 0) {
        val duracion = animador.getAnimationDuration(0)
        // Pausado NO es congelar donde iba: la seña vuelve a su primer cuadro,
        // que es la pose neutra. Es lo que hacía la versión web y lo que
        // espera el ejercicio cuando agranda el avatar.
        val t = if (pausado) {
          0f
        } else {
          if (inicioAnimacion == 0L) inicioAnimacion = tiempo
          ((tiempo - inicioAnimacion) / 1_000_000_000.0f) % duracion
        }
        if (pausado) inicioAnimacion = 0L
        pausadoEn = t
        animador.applyAnimation(0, t)
        animador.updateBoneMatrices()
      }

      // La cámara gira alrededor del avatar, no el avatar: así el arrastre no
      // pelea con la animación, que mueve los huesos del modelo.
      val ojoX = sin(giro) * radio
      val ojoZ = cos(giro) * radio
      camara.lookAt(
        ojoX.toDouble(), alturaObjetivo.toDouble(), ojoZ.toDouble(),
        0.0, alturaObjetivo.toDouble(), 0.0,
        0.0, 1.0, 0.0,
      )
    }

    if (renderizador.beginFrame(cadena, tiempo)) {
      renderizador.render(vista)
      renderizador.endFrame()
    }
  }

  /**
   * Mismo encuadre que la versión web: campo de visión de 15°, el objetivo a un
   * 30% del alto por encima del centro, y la distancia calculada para que entre
   * poco más de la mitad del avatar. Sacar la distancia del alto del modelo y no
   * del auto-encuadre es lo que hace que todas las señas se vean del mismo
   * tamaño; dejándoselo al automático, una salía de torso y otra de cuerpo
   * entero según el campo de visión que hubiera quedado puesto.
   */
  private fun encuadrar(ancho: Int, alto: Int) {
    if (ancho == 0 || alto == 0) return
    camara.setProjection(FOV.toDouble(), ancho.toDouble() / alto, 0.05, 100.0, Camera.Fov.VERTICAL)
    val asset = modelo ?: return
    val caja = asset.boundingBox
    val altoModelo = caja.halfExtent[1] * 2
    alturaObjetivo = caja.center[1] + altoModelo * 0.30f
    radio = (altoModelo * ENCUADRE / 2) / tan(FOV / 2 * PI.toFloat() / 180f)
    if (radio < 0.01f || !radio.isFinite()) radio = 2f
  }

  private fun descargar(desde: String) {
    // Filament aborta el PROCESO —no tira una excepción— si la GPU no puede
    // compilar sus shaders, y eso pasa en aparatos viejos con OpenGL ES 2. Se
    // pregunta antes: sin 3.0 no se enciende el motor y el ejercicio se queda
    // con la lámina fija, que es lo que ya hacía cuando un avatar no cargaba.
    val gl = (context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager)
      .deviceConfigurationInfo.reqGlEsVersion
    if (gl < 0x30000) {
      onFalla(mapOf("error" to "este teléfono no tiene OpenGL ES 3"))
      return
    }

    val t0 = System.currentTimeMillis()
    descargas.execute {
      try {
        // Caché en disco: el mismo avatar aparece en varios ejercicios seguidos
        // y el .glb pesa megas. La versión web lo volvía a pedir cada vez que se
        // montaba el WebView.
        val archivo = File(context.cacheDir, "avatares/" + desde.hashCode().toString() + ".glb")
        if (!archivo.exists()) {
          archivo.parentFile?.mkdirs()
          val conexion = URL(desde).openConnection() as HttpURLConnection
          conexion.connectTimeout = 15_000
          conexion.readTimeout = 30_000
          conexion.inputStream.use { entrada ->
            val temporal = File(archivo.path + ".parcial")
            temporal.outputStream().use { entrada.copyTo(it) }
            temporal.renameTo(archivo)
          }
        }
        // La conversión de texturas es cara y se hace una sola vez: lo que
        // queda en disco ya está listo para Filament.
        // El número va en el nombre: si cambia cómo se convierte, los archivos
        // viejos dejan de usarse solos en vez de quedar pegados en el teléfono.
        val listo = File(archivo.path + ".filament" + VERSION_CONVERSION)
        if (!listo.exists()) {
          val convertido = Glb.sinWebp(archivo.readBytes())
          val temporal = File(listo.path + ".parcial")
          temporal.writeBytes(convertido)
          temporal.renameTo(listo)
        }
        val bytes = listo.readBytes()
        val msPreparar = System.currentTimeMillis() - t0
        post { montar(bytes, msPreparar) }
      } catch (e: Throwable) {
        Log.e(ETIQUETA, "no se pudo bajar el avatar", e)
        post { onFalla(mapOf("error" to (e.message ?: e.toString()))) }
      }
    }
  }

  private fun montar(bytes: ByteArray, msPreparar: Long) {
    val t0 = System.currentTimeMillis()
    try {
      modelo?.let { anterior ->
        escena.removeEntities(anterior.entities)
        cargador.destroyAsset(anterior)
      }
      val buffer = ByteBuffer.allocateDirect(bytes.size).apply { put(bytes); flip() }
      // Instanciado: en gltfio las animaciones cuelgan de la INSTANCIA, y con
      // createAsset la instancia implícita venía sin ninguna.
      val instancias = arrayOfNulls<com.google.android.filament.gltfio.FilamentInstance>(1)
      val asset = cargador.createInstancedAsset(buffer, instancias)
        ?: throw IllegalStateException("glb ilegible")
      recursos.loadResources(asset)
      // El animador se toma UNA vez, acá, y se guarda: es lo que hace el visor
      // de referencia de Filament.
      animador = (instancias[0] ?: asset.instance).animator
      // OJO: nada de releaseSourceData(). Suena a lo correcto —las mallas y las
      // texturas ya están en la GPU— pero entre lo que libera están los datos
      // crudos de la animación, y el avatar se queda para siempre en la pose
      // del primer cuadro. Se ve como si la animación no existiera, sin ningún
      // error.
      escena.addEntities(asset.entities)
      modelo = asset
      inicioAnimacion = 0L
      encuadrar(width, height)
      val msMontar = System.currentTimeMillis() - t0
      Log.i(ETIQUETA, "avatar listo: ${msPreparar} ms de archivo + ${msMontar} ms de montaje")
      onCargado(
        mapOf(
          "clips" to asset.instance.animator.animationCount,
          "msArchivo" to msPreparar,
          "msMontaje" to msMontar,
        ),
      )
    } catch (e: Throwable) {
      Log.e(ETIQUETA, "no se pudo montar el avatar", e)
      onFalla(mapOf("error" to (e.message ?: e.toString())))
    }
  }

  fun soltar() {
    // onDetachedFromWindow puede llegar más de una vez —y llega— así que sin
    // esto la segunda vuelta le habla a un motor ya destruido y tira la app.
    if (soltado) return
    soltado = true
    descargas.shutdown()
    uiHelper.detach()
    modelo?.let {
      escena.removeEntities(it.entities)
      cargador.destroyAsset(it)
    }
    modelo = null
    iluminacion?.let { motor.destroyIndirectLight(it) }
    escena.removeEntity(luz)
    motor.destroyEntity(luz)
    EntityManager.get().destroy(luz)
    motor.destroyCameraComponent(camaraEntidad)
    EntityManager.get().destroy(camaraEntidad)
    recursos.destroy()
    cargador.destroy()
    materiales.destroy()
    motor.destroyRenderer(renderizador)
    motor.destroyView(vista)
    motor.destroyScene(escena)
    MotorFilament.devolver()
  }

  private companion object {
    const val ETIQUETA = "SignaAvatar"


    /** Sube cuando cambia Glb.sinWebp(). Ver descargar(). */
    const val VERSION_CONVERSION = 3

    /** Grados. Los mismos que usa la versión web. */
    const val FOV = 15f

    /** Qué fracción del alto del avatar entra en el cuadro. */
    const val ENCUADRE = 0.52f

    /** colors.fill, el mismo fondo que tiene la tarjeta alrededor. */
    val FONDO = doubleArrayOf(0.94, 0.93, 0.91)

  }
}
