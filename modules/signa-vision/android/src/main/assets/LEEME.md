# Assets del reconocedor nativo

Viven acá y no en `android/app/src/main/assets/` porque esa carpeta la genera
`expo prebuild` y está ignorada por git: cualquier cosa que se copie ahí
desaparece en la próxima regeneración. Gradle mezcla los assets de este módulo
con los de la app, así que desde el código se abren igual, por su nombre.

| archivo | qué es |
|---|---|
| `hand_landmarker.task`, `pose_landmarker.task` | modelos de MediaPipe Tasks |
| `modelo.tflite` | la LSTM de señas dinámicas (v9), exportada desde signa-ml |
| `senas.json` | etiquetas y umbral calibrado de cada seña |
| `golden.json` | secuencias del dataset con lo que da el pipeline de Python, para `Golden.kt` |

`modelo.tflite`, `senas.json` y `golden.json` se regeneran desde signa-ml; los
umbrales salen de `scripts/calibrate_signs.py`.
