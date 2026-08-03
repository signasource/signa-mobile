# ML feature (sign recognition)

> Responsibility: camera-based LSA sign-recognition module scope, state, and open decisions.
> Update when: an ML decision is made, or camera/inference dependencies are added.
> Sources: src/features/ml/

Status: **placeholder**. Module under `src/features/ml/`. Recognizes LSA signs via camera (TensorFlow Lite model exported from `signa-ml`, per the architecture PDF).

## What exists

- `screens/SignRecognitionScreen.tsx`: placeholder, **no camera or ML runtime installed**.
- `types.ts`: `SignRecognitionResult`, `SignRecognitionSessionState` (tentative).

## Blocking constraint

`react-native-vision-camera` and any ML runtime require **leaving Expo Go** for a **dev build** (`expo-dev-client` / EAS Build), which affects the whole team's workflow. Decide this before implementing. Do not install these libs until confirmed with the ML/backend team.

## Open decisions (before implementing)

1. **Camera library.** Standard choice: `react-native-vision-camera` (requires a dev build).
2. **Inference runtime.** To run the `.tflite` from `signa-ml`: `react-native-fast-tflite` (integrates with vision-camera frame processors), or `onnxruntime-react-native` if the model is exported to ONNX.
3. **Model output format.** Unclear from the PDF whether it classifies a static sign or recognizes a movement sequence — this changes the frame processor (single frame vs frame window).
4. **Model location.** Bundled in the binary (heavier, offline) vs downloaded on-demand.

See [../status.md](../status.md).
