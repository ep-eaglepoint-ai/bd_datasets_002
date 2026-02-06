import { afterEach, vi } from 'vitest'

// Provide deterministic cleanup after every test run
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Minimal window APIs used by export helpers
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock'
}

if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = () => {}
}
