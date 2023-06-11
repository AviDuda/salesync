// eslint-disable-next-line import/no-extraneous-dependencies -- tests should run in dev
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents: (on, config) => {
      const isDevelopment = config.watchForFileChanges;
      const port = process.env.PORT ?? (isDevelopment ? "3000" : "8811");
      const configOverrides: Partial<Cypress.PluginConfigOptions> = {
        baseUrl: `http://localhost:${port}`,
        video: !process.env.CI,
        screenshotOnRunFailure: !process.env.CI,
      };

      // To use this:
      // cy.task('log', whateverYouWantInTheTerminal)
      on("task", {
        log: (message) => {
          console.log(message);

          return null;
        },
      });

      return { ...config, ...configOverrides };
    },
  },
});
