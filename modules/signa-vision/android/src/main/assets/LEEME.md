# Assets del reconocedor nativo

Viven acá y no en `android/app/src/main/assets/` porque esa carpeta la genera
`expo prebuild` y está ignorada por git: cualquier cosa que se copie ahí
desaparece en la próxima regeneración. Gradle mezcla los assets de este módulo
con los de la app, así que desde el código se abren igual, por su nombre.

| archivo | qué es |
|---|---|
| `hand_landmarker.task`, `pose_landmarker.task` | modelos de MediaPipe Tasks |
| `modelo.tflite` | la LSTM de señas dinámicas (33 clases: 32 señas + reposo, `signa_model_v14_s42`), exportada con `signa-ml/scripts/exportar_senas_nativo.py` |
| `senas.json` | etiquetas, umbral de cada seña y la línea del espacio de seña del modelo |
| `golden.json` | clips del dataset (también recortados a 3:4) con lo que da el pipeline de Python, para `Golden.kt` (`signa-ml/scripts/golden_senas_app.py`) |

`modelo.tflite`, `senas.json` y `golden.json` se regeneran desde signa-ml; los
umbrales salen de `scripts/calibrate_signs.py`.
