import "@testing-library/jest-dom";

// Mock URL.createObjectURL and URL.revokeObjectURL
if (typeof window.URL.createObjectURL === "undefined") {
  Object.defineProperty(window.URL, "createObjectURL", {
    value: () => "mock-url",
  });
}
if (typeof window.URL.revokeObjectURL === "undefined") {
  Object.defineProperty(window.URL, "revokeObjectURL", { value: () => {} });
}

// Mock Worker
class MockWorker {
  url: string;
  onmessage: (event: MessageEvent) => void;
  onerror: (event: ErrorEvent) => void;

  constructor(stringUrl: string) {
    this.url = stringUrl;
    this.onmessage = () => {};
    this.onerror = () => {};
  }

  postMessage(msg: any) {
    // We will verify this later in tests or let tests mock the implementation specific to them
    // For general purpose, we might want to echo or just do nothing.
    // However, to make the app "work", we need it to respond.
    // Ideally tests will mock `window.Worker = class ...` themselves for detailed control.
  }

  terminate() {}
}

// @ts-ignore
window.Worker = MockWorker;
