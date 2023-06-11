// eslint-disable-next-line import/no-extraneous-dependencies -- tests should run in dev
import { faker } from "@faker-js/faker";

describe("smoke tests", () => {
  afterEach(() => {
    cy.cleanupUser();
  });

  it("should allow you to register and login", () => {
    const email = `${faker.internet.userName()}@example.com`;
    cy.signup({ email, role: "Admin" });
    const loginForm = {
      email: email,
      password: "myreallystrongpassword",
    };
    cy.then(() => ({ email: loginForm.email })).as("user");

    cy.visitAndCheck("/");
    cy.findByRole("link", { name: /log in/i }).click();

    cy.findByRole("textbox", { name: /email/i }).type(loginForm.email);
    cy.findByLabelText(/password/i).type(loginForm.password);
    cy.findByRole("button", { name: /log in/i }).click();

    cy.findByRole("heading", { name: /admin dashboard/i });
    cy.findByRole("button", { name: /logout/i }).click();
    cy.findByRole("link", { name: /log in/i });
  });
});
