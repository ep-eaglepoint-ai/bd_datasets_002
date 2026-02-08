import { test, expect } from "@playwright/test"

test("layout responds to viewport changes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/")

  const formLocator = page.getByTestId("expense-form-panel")
  const listLocator = page.getByTestId("expense-list-panel")

  await expect(formLocator).toBeVisible()
  await expect(listLocator).toBeVisible()

  const formBoxWide = await formLocator.boundingBox()
  const listBoxWide = await listLocator.boundingBox()

  expect(formBoxWide).toBeTruthy()
  expect(listBoxWide).toBeTruthy()
  if (formBoxWide && listBoxWide) {
    expect(formBoxWide.x).toBeLessThan(listBoxWide.x)
  }

  await page.setViewportSize({ width: 375, height: 900 })
  await page.waitForTimeout(200)

  const formBoxNarrow = await formLocator.boundingBox()
  const listBoxNarrow = await listLocator.boundingBox()

  expect(formBoxNarrow).toBeTruthy()
  expect(listBoxNarrow).toBeTruthy()
  if (formBoxNarrow && listBoxNarrow) {
    expect(formBoxNarrow.y).toBeLessThan(listBoxNarrow.y)
  }
})
