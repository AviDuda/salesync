/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/jest-testing-library",
    "plugin:tailwindcss/recommended",
    "plugin:prettier/recommended",
  ],
  env: {
    "cypress/globals": true,
  },
  plugins: ["cypress", "tailwindcss"],
  // We're using vitest which has a very similar API to jest
  // (so the linting plugins work nicely), but we have to
  // set the jest version explicitly.
  settings: {
    jest: {
      version: 28,
    },
  },
  rules: {
    "prettier/prettier": ["warn", {}, { usePrettierrc: true }],
  },
  overrides: [
    {
      files: ["**/package.json"],
      plugins: ["json-files"],
      rules: {
        "json-files/require-unique-dependency-names": "error",
        "json-files/sort-package-json": "warn",
      },
    },
  ],
};
