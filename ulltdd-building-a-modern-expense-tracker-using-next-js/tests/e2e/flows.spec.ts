import { test, expect, Page } from "@playwright/test"

async function addExpense(
  page: Page,
  {
    title,
    amount,
    category,
    date,
  }: { title: string; amount: string; category: string; date: string }
) {
  await page.getByTestId("title-input").fill(title)
  await page.getByTestId("amount-input").fill(amount)
  await page.getByTestId("category-select").selectOption(category)
  await page.getByTestId("date-input").fill(date)
  await page.getByTestId("submit-button").click()
}

function formatDate(date: Date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

test("can add, edit, and delete an expense", async ({ page }) => {
  await page.goto("/")

  await addExpense(page, {
    title: "Coffee",
    amount: "4.50",
    category: "Food",
    date: "2026-02-08",
  })

  const coffeeRow = page.getByRole("row").filter({ hasText: "Coffee" })
  await expect(coffeeRow).toContainText("$4.50")
  await expect(coffeeRow).toContainText("Food")

  await page.getByTestId("edit-btn-Coffee").click()
  await page.getByTestId("amount-input").fill("6")
  await page.getByTestId("submit-button").click()

  await expect(coffeeRow).toContainText("$6.00")

  await page.getByTestId("delete-btn-Coffee").click()
  await expect(page.getByText("No expenses found.")).toBeVisible()
})

test("can filter expenses by category and date", async ({ page }) => {
  await page.goto("/")

  await addExpense(page, {
    title: "Lunch",
    amount: "12.00",
    category: "Food",
    date: "2026-02-01",
  })

  await addExpense(page, {
    title: "Bus",
    amount: "2.50",
    category: "Transport",
    date: "2026-02-02",
  })

  const lunchRow = page.getByRole("row").filter({ hasText: "Lunch" })
  const busRow = page.getByRole("row").filter({ hasText: "Bus" })

  await expect(lunchRow).toBeVisible()
  await expect(busRow).toBeVisible()

  await page.getByTestId("filter-category").selectOption("Food")
  await expect(lunchRow).toBeVisible()
  await expect(busRow).toHaveCount(0)

  await page.getByTestId("filter-category").selectOption("All")
  await page.getByTestId("filter-date").fill("2026-02-02")
  await expect(busRow).toBeVisible()
  await expect(lunchRow).toHaveCount(0)

  await page.getByTestId("clear-filters").click()
  await expect(lunchRow).toBeVisible()
  await expect(busRow).toBeVisible()
})

test("summary cards update with totals", async ({ page }) => {
  await page.goto("/")

  const today = formatDate(new Date())

  await addExpense(page, {
    title: "Groceries",
    amount: "10.00",
    category: "Food",
    date: today,
  })

  await addExpense(page, {
    title: "Taxi",
    amount: "20.00",
    category: "Transport",
    date: today,
  })

  await expect(page.getByTestId("total-amount")).toHaveText("$30.00")
  await expect(page.getByTestId("monthly-amount")).toHaveText("$30.00")
})

test("shows validation errors for missing fields", async ({ page }) => {
  await page.goto("/")

  await page.getByTestId("submit-button").click()
  await expect(page.getByText("All fields are required.")).toBeVisible()

  await page.getByTestId("title-input").fill("Invalid")
  await page.getByTestId("amount-input").fill("0")
  await page.getByTestId("submit-button").click()
  await expect(page.getByText("Amount must be a positive number.")).toBeVisible()
})
