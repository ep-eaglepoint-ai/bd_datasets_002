import "@testing-library/jest-dom"

// jsdom does not implement scrollTo; silence warning during tests.
Object.defineProperty(window, "scrollTo", {
  value: () => {},
  writable: true,
})
