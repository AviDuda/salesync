const sourceExtends = [
  // https://github.com/sindresorhus/eslint-plugin-unicorn
  "plugin:unicorn/all",

  // https://mysticatea.github.io/eslint-plugin-eslint-comments/
  "plugin:eslint-comments/recommended",
];

/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  extends: [
    // https://github.com/remix-run/remix/tree/main/packages/remix-eslint-config
    // Using the following plugins:
    // https://typescript-eslint.io/rules/
    // https://github.com/jsx-eslint/eslint-plugin-react
    // https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks
    // https://github.com/import-js/eslint-plugin-import
    // https://github.com/jsx-eslint/eslint-plugin-jsx-a11y
    // https://github.com/mysticatea/eslint-plugin-node
    // https://github.com/jest-community/eslint-plugin-jest
    // https://github.com/testing-library/eslint-plugin-jest-dom
    // https://github.com/testing-library/eslint-plugin-testing-library
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/jest-testing-library",

    ...sourceExtends,

    // https://github.com/francoismassart/eslint-plugin-tailwindcss/
    "plugin:tailwindcss/recommended",
    // https://github.com/prettier/eslint-config-prettier
    "prettier",
  ],
  // We're using vitest which has a very similar API to jest
  // (so the linting plugins work nicely), but we have to
  // set the jest version explicitly.
  settings: {
    jest: {
      version: 28,
    },
  },
  rules: {
    "unicorn/prefer-ternary": ["error", "only-single-line"],
    "unicorn/prefer-switch": [
      "error",
      { emptyDefaultCase: "do-nothing-comment" },
    ],
    "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
    "unicorn/no-keyword-prefix": ["error", { checkProperties: false }],

    // The no-magic-numbers rule from TS works also for JS files
    "no-magic-numbers": ["off"],
    "@typescript-eslint/no-magic-numbers": [
      "warn",
      {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreEnums: true,
        ignoreNumericLiteralTypes: true,
        ignoreReadonlyClassProperties: true,
        ignoreTypeIndexes: true,
      },
    ],

    "@typescript-eslint/consistent-type-imports": ["warn"],

    // Allow unused vars starting with _
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        vars: "all",
        args: "after-used",
        ignoreRestSiblings: false,
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      },
    ],

    // Disable the prop-types rule as we're using TypeScript
    "react/prop-types": ["off"],

    "sort-imports": [
      "warn",
      {
        ignoreCase: true,
        ignoreDeclarationSort: true, // Use import/order instead for sorting
        allowSeparatedGroups: true,
      },
    ],

    "import/consistent-type-specifier-style": ["warn", "prefer-top-level"],
    "import/first": ["warn"],
    "import/no-amd": ["error"],
    "import/no-commonjs": ["error"],
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["**/*.{test,spec}.{js,jsx,ts,tsx}", "playwright/**"],
        peerDependencies: false,
        packageDir: __dirname,
      },
    ],
    "import/no-deprecated": ["warn"],
    "import/order": [
      "warn",
      {
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import/newline-after-import": ["warn"],
    // Getting false positives for React
    "import/default": ["off"],

    "eslint-comments/no-unused-disable": ["error"],
    "eslint-comments/require-description": [
      "error",
      { ignore: ["eslint-enable"] },
    ],

    "unicorn/filename-case": ["off"],
    "unicorn/no-null": ["off"],
    "unicorn/prevent-abbreviations": [
      "warn",
      {
        replacements: {
          props: false,
          ref: false,
          params: false,
        },
        allowList: {
          e2e: true,
        },
      },
    ],
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
    // E2E
    {
      files: ["playwright/**/*.{ts,js}"],
      extends: [
        ...sourceExtends,
        "plugin:playwright/playwright-test",
        "prettier",
      ],
      env: {
        jest: false,
      },
      rules: {
        "unicorn/prevent-abbreviations": ["off"],
      },
    },
    // Global configs
    {
      files: "*.js",
      rules: {
        "import/no-commonjs": ["off"],
        "unicorn/prefer-module": ["off"],
      },
    },
  ],
};
