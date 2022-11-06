const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: colors.zinc[50],
          muted: colors.zinc[500],
        },
        secondary: {
          DEFAULT: colors.zinc[900],
          section: colors.zinc[800],
        },
        outline: colors.zinc[400],
        link: {
          DEFAULT: colors.zinc[400],
          hover: colors.zinc[500],
          warning: {
            DEFAULT: colors.yellow[300],
            hover: colors.yellow[400],
          },
        },
        button: {
          muted: {
            bg: {
              DEFAULT: colors.zinc[600],
              hover: colors.zinc[500],
            },
            text: {
              DEFAULT: colors.zinc[200],
              hover: colors.zinc[100],
            },
            border: colors.zinc[700],
          },
          primary: {
            bg: {
              DEFAULT: colors.blue[800],
              hover: colors.blue[700],
            },
            text: {
              DEFAULT: colors.zinc[100],
              hover: colors.zinc[100],
            },
            border: colors.blue[700],
          },
          destructive: {
            bg: {
              DEFAULT: colors.red[800],
              hover: colors.red[700],
            },
            text: {
              DEFAULT: colors.zinc[100],
              hover: colors.zinc[100],
            },
            border: colors.red[700],
          },
        },
        input: {
          bg: colors.zinc[700],
          text: colors.zinc[100],
          border: colors.zinc[600],
        },
        fieldset: {
          DEFAULT: colors.zinc[600],
        },
        warning: {
          bg: colors.orange[700],
        },
        error: colors.red[700],
      },
    },
  },
  plugins: [],
};
