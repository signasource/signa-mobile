# ML / Reconocimiento de sena

Esta carpeta es un placeholder para la funcionalidad de reconocimiento de LSA por camara que menciona el PDF de arquitectura (`TensorFlow Lite model` -> exportado desde `signa-ml`).

## Que falta decidir antes de implementar

1. **Libreria de camara.** La opcion estandar en el ecosistema Expo/React Native es [`react-native-vision-camera`](https://github.com/mrousavy/react-native-vision-camera). Requiere un dev build de Expo (no funciona en Expo Go a partir de ciertas features nativas), asi que hay que decidir si el proyecto pasa a usar `expo-dev-client` / EAS Build.
2. **Runtime de inferencia.** Para correr el `.tflite` que exporta `signa-ml` en el celular, las opciones tipicas son:
   - [`react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite) (se integra bien con vision-camera via frame processors)
   - `onnxruntime-react-native` si en algun momento se exporta a ONNX en vez de TFLite
3. **Formato de salida del modelo.** No quedo claro en el PDF si el modelo hace clasificacion de una sena estatica o reconocimiento de secuencia (gesto en movimiento). Eso cambia bastante la arquitectura del frame processor (un frame vs. una ventana de frames).
4. **Donde vive el modelo.** Si se bundlea en el binario de la app (mas pesado, funciona offline) o se descarga on-demand (como las animaciones, segun el PDF).

## Que hay armado por ahora

Solo los tipos (`types.ts`) y una pantalla placeholder (`screens/SignRecognitionScreen.tsx`) sin ninguna dependencia nativa instalada todavia, para que quede claro en el codigo donde va a enganchar esto sin romper nada mientras se decide el resto.

No instalar `react-native-vision-camera` ni ningun runtime de TFLite hasta confirmar los puntos de arriba con el equipo de ML/back, porque estas libs requieren salir de Expo Go (dev client) y eso afecta el flujo de desarrollo de todo el equipo, no solo esta feature.
