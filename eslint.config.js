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
    // Every color comes from `@/theme` (`colors.*`, `alpha(colors.x, a)`); see docs/design-system/colors.md.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/theme/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message: "Hardcoded hex color: use a token from @/theme (colors.*).",
        },
        {
          selector: "Literal[value=/^\\s*(rgba?|hsla?)\\(/]",
          message: "Hardcoded color: use alpha(colors.x, opacity) from @/theme.",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{6}\\b|(rgba?|hsla?)\\(/]",
          message: "Hardcoded color in a template: interpolate a token from @/theme.",
        },
      ],
    },
  },
  {
    ignores: ["dist/*", "android/*", "ios/*", ".expo/*", "scripts/node_modules/*"],
  },
]);
