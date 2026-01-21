// __tests__/StripePaymentForm.unit.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, vi, expect } from "vitest"
import { StripePaymentForm } from "@/components/StripePaymentForm"

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe("StripePaymentForm Unit", () => {
  const amount = 50

  it("renders form fields", () => {
    render(<StripePaymentForm amount={amount} />)
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Card Number/i)).toBeInTheDocument()
  })

  it("formats card number input", async () => {
    render(<StripePaymentForm amount={amount} />)
    const cardInput = screen.getByLabelText(/Card Number/i)
    await userEvent.type(cardInput, "1234567812345678")
    expect(cardInput).toHaveValue("1234 5678 1234 5678")
  })

  // Placeholder: add more unit tests for expiryDate, CVV, success/error callbacks
})
