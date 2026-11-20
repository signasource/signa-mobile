# ML feature (sign recognition)

> Responsibility: camera-based LSA sign-recognition module scope, state, and open decisions.
> Update when: an ML decision is made, or camera/inference dependencies are added.
> Sources: modules/signa-vision/, src/features/ml/, assets/models/, src/features/courses/components/lesson/blocks/{PerformSignBlock,SpellNameBlock}.tsx

Status: **real, on-device, real time — on Android**. Two lesson blocks use the camera —
`PERFORM_SIGN` for dynamic signs and `SPELL_NAME` for fingerspelling a name letter by letter.
**Nothing leaves the phone**: no clip upload, no inference server, no network call at all.

## Current runtime: the native module `signa-vision` (Android only)

Camera, MediaPipe, the 258-number window, both TFLite models and the confirmation rule run in
**Kotlin**, inside the local Expo module `modules/signa-vision/` (`expo-module.config.json` →
`"platforms": ["android"]`; no `ios/`). Across the bridge only a summary of each frame and the
confirmed sign travel — never landmarks (75 points per frame would cost on the bridge what the
detection saved). Measured on the same phone, hand detection went from 57–147 ms (WebView) to
~35 ms; the numbers and the stage-by-stage story live in [../migracion-nativa.md](../migracion-nativa.md)
and [../rendimiento.md](../rendimiento.md).

| JS side | Role |
|---|---|
| `modules/signa-vision/index.ts` | `hayNativo` (`requireOptionalNativeModule("SignaVision") !== null`), the `ReconocedorNativo` and `AvatarNativo` views, and diagnostics (`golden`, `banco`, `estres`, `ultimaSalida`) |
| `features/ml/components/ReconocedorSenasNativo.tsx` | wraps `ReconocedorNativo` with the same props and `LiveFrame` the blocks always used (`targets`, `modo: "dinamico" \| "estatico"`, `onFrame`, `onConfirmed`, `onReady`, `onError`, `active`, `paused`, `showLandmarks`); this is what `PerformSignBlock` and `SpellNameBlock` mount |
| `features/ml/BancoNativoPantalla.tsx` | **temporary** startup bench, only shown when the build sets `EXPO_PUBLIC_BANCO_NATIVO=1` (`App.tsx`); also runs `golden()` / `estres()` / `ultimaSalida()` |
| `features/ml/telemetria.ts` | **temporary** diagnostic reporter to a local collector (`EXPO_PUBLIC_METRICS_URL`, `EXPO_PUBLIC_BUILD`; `scripts/colector-metricas.py`) |

| Kotlin (`com.signa.vision`) | Role |
|---|---|
| `Reconocedor` / `ReconocedorView` | CameraX capture + view, draws the skeleton and emits the two events (frame summary ×2/s, sign ×12/s) |
| `PistasDeManos` | which hand goes to which side of the vector, frame by frame: port of `signa-ml` `alphabet_rules.HandTracks` (each hand keeps its track through short losses and order swaps, the side is voted over time, duplicated and torso-sized "hands" are dropped) |
| `Detectores` | MediaPipe Tasks (hands every frame, pose 1 in 5) on the analysis thread; GPU delegate with CPU fallback. Signs run in VIDEO mode (tracking between frames, as `tasks_extractor.py` extracted the dataset); the alphabet runs in IMAGE mode with detection confidence 0.4, like its dataset |
| `Ventana` | the 258-number vector and the in-space stretch (up to 2,5 s) — same maths as `signa-ml/src/inference/sign_runner.py` (`preparar` + `_Window`) |
| `ModeloSenas` / `ModeloAbecedario` | the two TFLite models, run with **LiteRT** (`com.google.ai.edge.litert`, 16 KB page-aligned) |
| `Confirmador` | confirms a sign held above its threshold for most of a stretch of **time**, not frames |
| `Esqueleto` | skeleton drawing, smoothed by a 35 ms time constant; a hand the detector loses for up to 150 ms stays drawn (drawing only, the recognizer sees what the detector saw) |
| `Golden` | checks window + model against the Python pipeline's probabilities on real sequences (expected difference ≈ 0) |
| `AvatarView` / `MotorFilament` / `Glb` / `Reflejos` | the **3D avatar** with Filament (one shared engine for the whole app; converts the `.glb`'s webp textures once and caches the file on disk) — see [../avatar-3d.md](../avatar-3d.md) |
| `SignaVisionModule` | the Expo module surface |

Assets of the native recogniser live in `modules/signa-vision/android/src/main/assets/` (not in
`android/app/…`, which `expo prebuild` regenerates): `hand_landmarker.task`, `pose_landmarker.task`,
`modelo.tflite` (LSTM v14 = `signa_model_v14_s42`, 32 signs + `reposo`), `alfabeto.tflite`, `senas.json` / `alfabeto.json` (labels + calibrated
thresholds; `senas.json` also carries the signing-space `linea`), `golden*.json`; see `LEEME.md` there.

**Without the module** (iOS, Expo Go): `hayNativo` is `false`; `PerformSignBlock` and `SpellNameBlock`
show "Reconocimiento no disponible" with a "Continuar" button, and `LessonScreen` treats the block
as not answered (lesson shown as incomplete). See [../status.md](../status.md#plataformas).

The rest of this document describes the **models and the recognition rules**. The old WebView
engine (MediaPipe WASM + TFLite Web in a `WebView`: `LiveSignRecognizer`, `engine/`,
`assets/mediapipe/`, `assets/tflite/`, `scripts/build-recognizer.mjs`) is **still in the repo**: it was
removed once and sign recognition stopped working, so the removal was reverted (see
[../status.md](../status.md)). Its story and measurements are in [../migracion-nativa.md](../migracion-nativa.md) and
[../rendimiento.md](../rendimiento.md).

## The two pipelines

```
dynamic:  camera → MediaPipe → 258 numbers/frame → 2,5 s window → LSTM (TFLite) → sign
static:   camera → MediaPipe → 21 landmarks + 21 world + face block → TFLite → letter
```

Neither model sees pixels. The dynamic one eats **258 numbers per frame** — 33 pose landmarks ×
(x, y, z, visibility) plus 21 × (x, y, z) per hand — normalised against the shoulder centre and
shoulder width, so the sign does not depend on where the person stands or how far away they are.
`Ventana.kt` mirrors `signa-ml/src/inference/sign_runner.py` exactly (checked on the JVM against Python: ≤ 5e-7); any drift there shifts
the input distribution and the model degrades silently.

The static model is different on purpose: its features (canonical coordinates, joint angles,
distances between key points, position relative to the face) are computed **inside the TFLite
graph**, by a layer exported from `signa-ml/scripts/export_alphabet_for_app.py`. Porting that maths
to JavaScript would be ~200 lines that must agree with numpy to the last decimal. Embedding it makes
a train/serve mismatch impossible by construction.

## The window, and why it has rules

Before anything else, **y is rescaled to the dataset's 16:9**: MediaPipe gives x as a fraction of
the frame's width and y of its height, and shoulder width is almost all horizontal, so with the
phone upright (3:4) vertical motion arrived squeezed to less than half; v11 fell from 97% to 51%.

The window is the **stretch with hands in the signing space**, not a fixed clock. A hand whose
wrist is below `linea` (1,5 shoulder widths under the shoulders, from `senas.json`) counts as
absent and goes to zeros; a frame with no hand inside does not enter. The stretch lasts up to
2,5 s and is resampled **by order** to 30 steps — exactly what was done to every clip in training,
so a sign made faster or slower reaches the model the same. If the hands stay out for more than
500 ms the stretch is cut: what comes next is another sign, and the smoothing and the votes reset.

It is usable with at least 5 samples spanning **0,8 s**, the last one under 500 ms old. With half a
second the window could be just the hand rising or falling past the belly, and `efectivo`/`bien`
confirmed by themselves between signs (31 → 22-24 in a real session, same hits).

`reposo` is not a sign. It is the "not signing anything" class the model needs so it does not fire at
random. Never a valid answer, never shown, excluded from what a lesson may ask for.

## Course names vs model labels

A lesson asks for a sign by its **course name** ("café", "mamá", "tarjeta de crédito", "cómo
estás") and the model knows it by its **dataset folder** ("cafe", "mama", "tarjetacredito",
"comoestas"). Both sides are compared by a key — lowercase, no accents, no "de", letters only —
in `ModeloSenas.clave` (Kotlin) and `signKey` (`features/ml/models/registry.ts`). Comparing them
as-is made 12 of the 27 signs impossible to recognise and dropped their thresholds to the 0,5
default. The native module still reports the sign by the name the lesson used.

## Verification, not identification

A lesson already knows which sign it asked for, so the engine checks `p(target) ≥ threshold(target)`
instead of requiring the target to beat every other class. It is an easier question, and it is what
lets signs that split their probability with a lookalike (`mama`/`papa`) get through at all.

Thresholds are per sign and come from `signa-ml/scripts/calibrate_signs.py`, calibrated over windows
with realistic framings and capped at 0,6; they travel in `senas.json`. A dynamic sign is
confirmed when it is above its threshold for 60% of the votes over **500 ms** since it became the
candidate (the alphabet keeps 700 ms) — measured in time, not in frames, so it does not depend on
the device's frame rate. Lowering 700 → 500 ms and counting coverage from the candidate took real
iPhone sessions from 22 to 26 of 28 hits.

The v13/v14 models were trained to **not** confirm at the start of a sign: synthetic beginnings and
"arrived and held still" as `reposo`, real false starts recorded in the `signa-ml` lab as
`reposo`, full signs recorded there as positives, and a velocity layer inside the model (input is
still 258). Test 88,3% per clip.

## Permissions

`expo-camera`'s `useCameraPermissions` gates the block (the native view uses the same granted
permission). `app.json` carries the plugin, `NSCameraUsageDescription` and Android's `CAMERA`.
The block always keeps an escape ("Saltear por ahora" / "No me sale, seguir"): a denied permission,
or a model that will not cooperate, must never trap someone inside a lesson.

## Performance

Measured on a real phone, stage by stage, in [../rendimiento.md](../rendimiento.md). The emulator
has no camera and delivers 1-5 fps: it is useful to check that the view loads and nothing throws,
not to judge recognition. Test on a phone.

## Known limits

1. **`mama` is confusable with standing still.** It fires on 16% of rest windows. Its motion is
   small; raising its threshold collapses recall (80% → 57% between 0,61 and 0,80).
2. **The dataset is one person.** 60 clips per sign, all from the same signer, the same camera and
   the same room. Expect numbers to drop the first time somebody else uses it; augmentation does not
   simulate inter-person variation.
3. **32 signs plus the alphabet.** Test identification is 89% over 33 classes (v14 added `mal`, `yo`, `vos`, `chau`, `hola` without moving the other 27: same live hits as v13). Enough for a guided
   exercise where the app already knows what it asked for; not enough for open recognition. Known
   weak spots in live use: `papa` and `efectivo` are hard to get, and `companero`, `transferencia`,
   `hijo` and `mercadopago` can confirm without their key part (joining, rotating, passing the
   throat, the hit). A lesson only asks for the signs its course content in signa-api includes.
4. **Android only.** No `signa-vision` on iOS: the camera exercises are skipped there.

See [../status.md](../status.md).
