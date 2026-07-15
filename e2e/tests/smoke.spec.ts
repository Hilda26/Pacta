import { expect, test } from "@playwright/test";

test("landing page renders product identity", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Pacta").first()).toBeVisible();
});

test("submission page renders reviewer contract details", async ({ page }) => {
  await page.goto("/submission");
  await expect(page.getByRole("heading", { name: "Bonded mentorship covenant verification." })).toBeVisible();
  await expect(page.getByText("0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2")).toBeVisible();
  await expect(page.getByText("GenLayer web evidence fetching")).toBeVisible();
});

test("login page renders wallet sign-in controls", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to Pacta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();
  await expect(page.getByText("Use your EVM wallet to create a secure session.")).toBeVisible();
});
