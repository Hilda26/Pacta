import { expect, test } from "@playwright/test";

test("landing page renders product identity", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Pacta")).toBeVisible();
});
