package com.signa.vision

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ViewDefinitionBuilder

/**
 * Espiga: ¿cuánto tarda MediaPipe nativo con los mismos modelos?
 *
 * Medido en el teléfono con la versión actual —WASM dentro de un WebView— la
 * detección de manos cuesta entre 70 y 136 ms por frame y la de pose entre 50 y
 * 112. Esto corre los MISMOS dos modelos con el runtime nativo y el delegado de
 * GPU del sistema, sobre un bitmap sintético, para poder comparar contra esos
 * números antes de comprometerse a migrar el pipeline entero.
 *
 * No usa la cámara a propósito: lo que se quiere aislar es el costo de los
 * modelos, no el de la captura. Si acá aparecen 20-30 ms donde hoy hay 70-130,
 * la migración se justifica sola; si aparecen 60, no.
 */
class SignaVisionModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("SignaVision")

    AsyncFunction("banco") { vueltas: Int, enGpu: Boolean ->
      medir(vueltas, enGpu)
    }

    View(ReconocedorView::class) {
      Events("onFrame", "onListo")

      Prop("mostrarEsqueleto") { vista: ReconocedorView, valor: Boolean ->
        vista.mostrarEsqueleto = valor
      }
      Prop("activo") { vista: ReconocedorView, valor: Boolean ->
        vista.activo = valor
      }
      Prop("usarTrasera") { vista: ReconocedorView, valor: Boolean ->
        vista.usarTrasera = valor
      }
    }
  }

  private fun medir(vueltas: Int, enGpu: Boolean): Map<String, Any> {
    val contexto = appContext.reactContext ?: return mapOf("error" to "sin contexto")
    val delegado = if (enGpu) Delegate.GPU else Delegate.CPU

    val manos = HandLandmarker.createFromOptions(
      contexto,
      HandLandmarker.HandLandmarkerOptions.builder()
        .setBaseOptions(
          BaseOptions.builder()
            .setModelAssetPath("hand_landmarker.task")
            .setDelegate(delegado)
            .build(),
        )
        .setRunningMode(RunningMode.IMAGE)
        .setNumHands(2)
        .setMinHandPresenceConfidence(0.3f)
        .setMinTrackingConfidence(0.3f)
        .build(),
    )

    val pose = PoseLandmarker.createFromOptions(
      contexto,
      PoseLandmarker.PoseLandmarkerOptions.builder()
        .setBaseOptions(
          BaseOptions.builder()
            .setModelAssetPath("pose_landmarker.task")
            .setDelegate(delegado)
            .build(),
        )
        .setRunningMode(RunningMode.IMAGE)
        .setNumPoses(1)
        .build(),
    )

    // Un frame del tamaño que pide la app a la cámara.
    val bitmap = Bitmap.createBitmap(480, 360, Bitmap.Config.ARGB_8888)
    Canvas(bitmap).drawColor(Color.rgb(128, 128, 128))
    val imagen = BitmapImageBuilder(bitmap).build()

    // La primera pasada es el calentamiento y se informa aparte: en la versión
    // web cuesta 3 segundos y es lo que más se siente al entrar al ejercicio.
    val calPose = tiempo { pose.detect(imagen) }
    val calManos = tiempo { manos.detect(imagen) }

    val msPose = ArrayList<Double>(vueltas)
    val msManos = ArrayList<Double>(vueltas)
    repeat(vueltas) {
      msPose.add(tiempo { pose.detect(imagen) })
      msManos.add(tiempo { manos.detect(imagen) })
    }

    manos.close()
    pose.close()

    return mapOf(
      "delegado" to if (enGpu) "GPU" else "CPU",
      "vueltas" to vueltas,
      "calentamientoPoseMs" to calPose,
      "calentamientoManosMs" to calManos,
      "poseMs" to mediana(msPose),
      "manosMs" to mediana(msManos),
      "poseMsMin" to (msPose.minOrNull() ?: 0.0),
      "manosMsMin" to (msManos.minOrNull() ?: 0.0),
    )
  }

  private inline fun tiempo(bloque: () -> Unit): Double {
    val t0 = System.nanoTime()
    bloque()
    return (System.nanoTime() - t0) / 1_000_000.0
  }

  private fun mediana(v: List<Double>): Double {
    if (v.isEmpty()) return 0.0
    val o = v.sorted()
    return if (o.size % 2 == 1) o[o.size / 2] else (o[o.size / 2 - 1] + o[o.size / 2]) / 2
  }
}
