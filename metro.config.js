// Metro por defecto de Expo + SVG como componentes.
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
  assetExts: [
    ...resolver.assetExts.filter((ext) => ext !== "svg"),
  ],
  sourceExts: [...resolver.sourceExts, "svg"],
};

module.exports = config;
