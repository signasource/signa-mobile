// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // False positive with axios: `axios.create` / `axios.isCancel` is its documented API.
      "import/no-named-as-default-member": "off",
    },
  },
  {
    ignores: ["dist/*", "android/*", "ios/*", ".expo/*", "scripts/node_modules/*"],
  },
]);
