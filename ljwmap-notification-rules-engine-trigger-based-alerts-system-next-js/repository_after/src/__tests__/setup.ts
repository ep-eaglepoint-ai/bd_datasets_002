import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Mock dotenv/config for tests
vi.mock("dotenv/config", () => ({}));

// Set test environment variables
process.env.DATABASE_URL = "file::memory:?cache=shared";
process.env.NODE_ENV = "test";

// Global test setup
beforeAll(async () => {
  // Any global setup needed before all tests
});

afterAll(async () => {
  // Clean up after all tests
});

afterEach(() => {
  // Reset mocks after each test
  vi.clearAllMocks();
});
