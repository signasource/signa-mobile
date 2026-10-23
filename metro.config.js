// Metro por defecto de Expo + SVG como componentes + las extensiones que usa el
// reconocimiento on-device.
//
// Metro sólo empaqueta extensiones que conoce. El reconocedor necesita llevar
// dentro de la app el WASM de MediaPipe (.wasm), su modelo de landmarks (.task)
// y los .tflite de los dos modelos; sin esto, el `require()` de cada uno falla
// al armar el bundle. Ver src/features/ml/engine/assets.ts.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};
config.resolver = {
  ...resolver,
  // El svg sale de assetExts y entra en sourceExts: lo transforma el babel de
  // arriba en vez de copiarse como archivo.
  //
  // `jsasset` son JS que el WebView carga por URL y que Metro NO debe
  // transformar (el bundle de MediaPipe usa import() dinámico y su
  // transformador lo rechaza). assets.ts los copia renombrándolos a .js.
  assetExts: [
    ...resolver.assetExts.filter((ext) => ext !== "svg"),
    "task",
    "wasm",
    "bin",
    "tflite",
    "jsasset",
  ],
  sourceExts: [...resolver.sourceExts, "svg"],
};

module.exports = config;
