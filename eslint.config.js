// ESLint for the Expo app — the web repo lints itself separately; `mobile/` is
// ignored there (see ../eslint.config.mjs). Uses Expo's shared config so both
// halves of the repo follow the same rules.
// https://docs.expo.dev/guides/using-eslint/

const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*"],
  },
  {
    // This machine's Application Control policy blocks native `.node` binaries,
    // which kills unrs-resolver (used by eslint-import-resolver-typescript).
    // Every import — including the cross-package `@/…` ones reaching into the
    // web repo — is still fully type-checked by `npm run typecheck` (tsc),
    // so these resolver-dependent rules are the only ones being skipped.
    rules: {
      "import/no-unresolved": "off",
      "import/named": "off",
      "import/namespace": "off",
      "import/default": "off",
      "import/export": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",
      "import/no-deprecated": "off",
      "import/no-cycle": "off",
      "import/no-duplicates": "off",
    },
  },
]);
