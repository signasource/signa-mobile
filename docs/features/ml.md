# ML feature (sign recognition)

> Responsibility: camera-based LSA sign-recognition module scope, state, and open decisions.
> Update when: an ML decision is made, or camera/inference dependencies are added.
> Sources: src/features/ml/, assets/mediapipe/, assets/tflite/, assets/models/, metro.config.js, scripts/build-recognizer.mjs, src/features/courses/components/lesson/blocks/{PerformSignBlock,SpellNameBlock}.tsx

Status: **real, on-device, real time**. Two lesson blocks use the camera — `PERFORM_SIGN` for
dynamic signs and `SPELL_NAME` for fingerspelling a name letter by letter. **Nothing leaves the
phone**: no clip upload, no inference server, no network call at all.

## The two pipelines

```
dynamic:  camera → MediaPipe (worker) → 258 numbers/frame → 2,5 s window → LSTM (TFLite) → sign
static:   camera → MediaPipe (worker) → 21 landmarks + 21 world + face block → TFLite → letter
```

Neither model sees pixels. The dynamic one eats **258 numbers per frame** — 33 pose landmarks ×
(x, y, z, visibility) plus 21 × (x, y, z) per hand — normalised against the shoulder centre and
shoulder width, so the sign does not depend on where the person stands or how far away they are.
`engine/keypoints.ts` mirrors `signa-ml/src/data/normalization.py` exactly; any drift there shifts
the input distribution and the model degrades silently.

The static model is different on purpose: its features (canonical coordinates, joint angles,
distances between key points, position relative to the face) are computed **inside the TFLite
graph**, by a layer exported from `signa-ml/scripts/export_alphabet_for_app.py`. Porting that maths
to JavaScript would be ~200 lines that must agree with numpy to the last decimal. Embedding it makes
a train/serve mismatch impossible by construction.

## Where each piece runs

Everything happens inside a **WebView** (`components/LiveSignRecognizer.tsx`) because MediaPipe only
ships as WASM for web. The app already used WebView for the 3D models, so this adds no new
technology. `engine/recognizerHtml.ts` holds the page: camera, skeleton, sliding window, inference
and confirmation rules.

**MediaPipe runs in a Web Worker** (`engine/detectorWorker.ts`). `detectForVideo` is synchronous
WASM: on a real phone it blocks for ~75 ms of every ~91 ms cycle, which left the drawing loop at
21 fps instead of 60. Moving it out does not make detection faster — the same 61 ms of hand
detection still cost 61 ms — but the screen stops stuttering. The worker is created from a **blob
URL**: Chromium refuses module workers loaded from `file://`.

The sign model stays on the main thread on purpose: inference is ~4 ms, and TFLite's runtime
resolves its `.wasm` path by reading the `src` of its own `<script>` tag, a path that does not exist
inside a worker.

## The window, and why it has rules

The dynamic model decides over the **last 2,5 seconds**, always resampled to 30 evenly spaced steps.
Not "the last 30 processed frames": at 12 fps that is 2,5 s and at 10 fps it is 3,0 s, so the same
sign would reach the model stretched or squeezed depending on the phone.

Frames without hands never enter the window — 126 zeros where a sign should be is out-of-distribution
input, and the model answers nonsense with full confidence. That alone is not enough: the window must
also be **populated**. It needs at least 10 samples and no gap wider than 500 ms. Without that rule,
losing track of the hands left two frames in the window — one old, one recent — which the resampler
joined with a straight 30-step line. Measured with real clips, that fabricated line reads as a
deliberate movement and scores 0,95–1,00 on a sign nobody performed.

`reposo` is not a sign. It is the "not signing anything" class the model needs so it does not fire at
random. Never a valid answer, never shown, excluded from what a lesson may ask for.

## Verification, not identification

A lesson already knows which sign it asked for, so the engine checks `p(target) ≥ threshold(target)`
instead of requiring the target to beat every other class. It is an easier question, and it is what
lets signs that split their probability with a lookalike (`mama`/`papa`) get through at all.

Thresholds are per sign and come from `signa-ml/scripts/calibrate_signs.py`, calibrated over windows
with realistic framings; they travel in `assets/models/lsa-signs-v9/manifest.json`. A sign is
confirmed when it stays above its threshold for 60% of a 700 ms stretch — measured in time, not in
frames, so it does not depend on the device's frame rate.

## Bundled assets (~41 MB)

| file | size | what |
|---|---|---|
| `assets/mediapipe/vision_wasm_internal.wasm` | 12 MB | MediaPipe runtime |
| `assets/mediapipe/hand_landmarker.task` | 7,5 MB | MediaPipe hands |
| `assets/mediapipe/pose_landmarker.task` | 5,6 MB | MediaPipe pose (lite) |
| `assets/mediapipe/vision_bundle.jsasset` | 152 KB | MediaPipe Tasks Vision JS |
| `assets/mediapipe/engine.jsasset` | 4 KB | our keypoint code, **generated** — see below |
| `assets/tflite/alfabeto.tflite` | 8,7 MB | alphabet model, features included in the graph |
| `assets/tflite/modelo.tflite` | 634 KB | dynamic-sign LSTM |
| `assets/tflite/*.jsasset`, `*.wasm` | ~6 MB | TFLite Web runtime |
| `assets/models/lsa-signs-v9/manifest.json` | 1 KB | labels + thresholds + window size |
| `assets/models/lsa-alphabet/manifest.json` | 1 KB | letters + thresholds |

Mechanics worth knowing, each of which cost a debugging round:

- **`.jsasset`** — Metro transforms anything ending in `.js`, and MediaPipe's bundle uses dynamic
  `import()`, which its transformer rejects. The extension exists only so Metro copies the file;
  `engine/assets.ts` renames it back to `.js` when staging.
- **Staging to the sandbox** — bundled assets are not loose files (on Android they live compressed
  inside the APK) and MediaPipe needs real paths. `engine/assets.ts` copies everything once into
  `documentDirectory`, writes the HTML next to it so page and assets share one `file://` origin, and
  marks the folder done with `STAGE_VERSION`. **Bump that constant whenever a staged file changes**,
  or phones keep the old copy.
- **XHR, not `fetch`** — `fetch()` rejects `file://` by spec. The page reads its files with
  `XMLHttpRequest`, and hands MediaPipe the wasm as a blob URL and the `.task` as
  `modelAssetBuffer`, because MediaPipe's own loader would use `fetch` and fail.
- **TFLite's wasm path** — `tflite.setWasmPath('')` *and* a relative `<script src>`. Its loader
  rewrites any non-`http`, non-`/` path as "page directory + that path", which from `file://` points
  nowhere; the only symptom is `cannot read properties of undefined (reading '_malloc')`.
- **`ModuleFactory not set`** — inside a module worker MediaPipe falls back to `import()` for a
  classic script, so its `var ModuleFactory` never reaches `self`. Indirect `eval` puts it in the
  worker's global scope.

`scripts/build-recognizer.mjs` compiles `engine/keypoints.ts` into `assets/mediapipe/engine.jsasset`.
The TypeScript is the source of truth; the generated file is committed because the bundle needs it.
**Run it after touching the engine.** It also guards the page template: a stray backtick, a syntax
error or an undefined identifier inside `recognizerHtml.ts` would otherwise only show up as a blank
WebView on a phone.

## Permissions

`expo-camera`'s `useCameraPermissions` gates the block (the WebView then reuses the granted
permission). `app.json` carries the plugin, `NSCameraUsageDescription` and Android's `CAMERA`.
The block always keeps an escape ("Saltear por ahora" / "No me sale, seguir"): a denied permission,
or a model that will not cooperate, must never trap someone inside a lesson.

## Performance — measured on a real phone

| stage | cost |
|---|---|
| hand detection | 61 ms |
| pose detection | 34 ms, run 1 frame in 5 |
| LSTM inference | 3,6 ms |
| bitmap copy | 0,6 ms |
| drawing | 0,3 ms |

Hands are 80% of the frame, which is why pose is sampled and inference is not: inference is 6% of
the budget, so running it on every frame costs nothing and shortens the time to confirm a sign.

**The Android emulator has no camera and delivers 1-5 fps.** It is useful for checking that the page
loads, the assets stage and nothing throws — not for judging recognition. Test on a phone.

## Known limits

1. **`mama` is confusable with standing still.** It fires on 16% of rest windows. Its motion is
   small; raising its threshold collapses recall (80% → 57% between 0,61 and 0,80).
2. **The dataset is one person.** 60 clips per sign, all from the same signer, the same camera and
   the same room. Expect numbers to drop the first time somebody else uses it; augmentation does not
   simulate inter-person variation.
3. **Four signs plus the alphabet.** Out-of-fold identification is 83% over five classes. Enough for
   a guided exercise where the app already knows what it asked for; not enough for open recognition.
4. **APK size.** ~41 MB of assets, dominated by MediaPipe's runtime and the alphabet model.

See [../status.md](../status.md).
