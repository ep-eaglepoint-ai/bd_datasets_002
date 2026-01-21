// __tests__/StripePaymentForm.integration.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, vi, expect } from "vitest"
import { StripePaymentForm } from "@/components/StripePaymentForm"

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe("StripePaymentForm Integration", () => {
  const amount = 75

  it("disables submit button while processing", async () => {
    render(<StripePaymentForm amount={amount} />)

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/Card Number/i), { target: { value: "4242424242424242" } })

    fireEvent.submit(screen.getByRole("button"))

    expect(screen.getByRole("button")).toBeDisabled()
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled())
  })

  // Placeholder: test form reset and toast notification
})
