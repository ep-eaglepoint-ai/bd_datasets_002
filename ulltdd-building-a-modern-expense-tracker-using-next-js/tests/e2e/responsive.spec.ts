// Test moved to `repository_after/tests/e2e/responsive.spec.ts` to avoid
// duplicate test discovery and runner conflicts when running Playwright
// from the `repository_after` package. This file intentionally left blank.
  if (formBoxWide && listBoxWide) {
    expect(formBoxWide.x).toBeLessThan(listBoxWide.x)
  }

  // Mobile viewport (narrow) - expect stacked: form above list (y position less)
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
