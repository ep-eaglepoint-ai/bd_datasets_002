import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "path";

const defaultAppModulePath = path.resolve(
  __dirname,
  "../../../repository_before/src/App.tsx"
);

function loadFreshAppModule() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(process.env.APP_MODULE_PATH || defaultAppModulePath);
  return mod as typeof import("../../../repository_before/src/App");
}

function resetSingletonState(mod: any) {
  if (!mod?.__testExports) return;
  const { mockBackend, httpClient } = mod.__testExports;

  httpClient.setTokens(null);
  (httpClient as any).refreshPromise = null;
  (httpClient as any).requestQueue = [];

  const refreshTokens: Map<string, any> | undefined = (mockBackend as any)
    .refreshTokens;
  const accessTokens: Map<string, any> | undefined = (mockBackend as any)
    .accessTokens;
  const loginAttempts: Map<string, any> | undefined = (mockBackend as any)
    .loginAttempts;
  const tokenFamilies: Map<string, any> | undefined = (mockBackend as any)
    .tokenFamilies;

  refreshTokens?.clear();
  accessTokens?.clear();
  loginAttempts?.clear();
  tokenFamilies?.clear();
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe("JWT Authentication — security-critical flows", () => {
  beforeEach(() => {
    const mod = loadFreshAppModule();
    resetSingletonState(mod);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("token refresh is shared across concurrent requests", async () => {
    // Test Concurrent Token Refresh Prevention
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const { __testExports } = loadFreshAppModule();
    const { mockBackend, httpClient } = __testExports;

    // Arrange: login to mint a valid access token, capture a real refresh token.
    const loginPromise = mockBackend.login(
      "admin@fintech.com",
      "Admin123!",
      "ip-1"
    );
    await advance(300);
    const loginRes = await loginPromise;

    const refreshTokensMap: Map<string, any> = (mockBackend as any)
      .refreshTokens;
    const issuedRefreshToken = Array.from(refreshTokensMap.keys())[0];
    (httpClient as any).getStoredRefreshToken = () => issuedRefreshToken;

    httpClient.setTokens({
      accessToken: loginRes.accessToken,
      expiresAt: Date.now() + 30_000, // < 60s remaining -> proactive refresh should trigger
    });

    const refreshSpy = jest.spyOn(mockBackend, "refreshAccessToken");

    // Act: fire two protected requests concurrently.
    const p1 = httpClient.request({ endpoint: "/api/protected" });
    const p2 = httpClient.request({ endpoint: "/api/protected" });

    // Refresh takes 200ms.
    await advance(200);

    const [r1, r2] = await Promise.all([p1, p2]);

    // Assert: only one refresh call, both requests succeed.
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(r1.data).toBe("Protected data accessed successfully");
    expect(r2.data).toBe("Protected data accessed successfully");
  });

  test("401 triggers refresh and queues/retries the original request", async () => {
    // Test Request Queue with Retry After Refresh
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const { __testExports } = loadFreshAppModule();
    const { mockBackend, httpClient } = __testExports;

    // Arrange: obtain a valid refresh token, but start with no access token -> forces 401.
    const loginPromise = mockBackend.login(
      "admin@fintech.com",
      "Admin123!",
      "ip-2"
    );
    await advance(300);
    await loginPromise;

    const refreshTokensMap: Map<string, any> = (mockBackend as any)
      .refreshTokens;
    const issuedRefreshToken = Array.from(refreshTokensMap.keys())[0];
    (httpClient as any).getStoredRefreshToken = () => issuedRefreshToken;

    httpClient.setTokens(null);

    const refreshSpy = jest.spyOn(mockBackend, "refreshAccessToken");

    // Act: request protected endpoint with missing access token.
    const requestPromise = httpClient.request({ endpoint: "/api/protected" });

    // Refresh (200ms) should complete and the queued request should retry.
    await advance(200);

    // Assert: request resolves successfully and refresh ran once.
    const res = await requestPromise;
    expect(res.data).toBe("Protected data accessed successfully");
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  test("proactive refresh occurs when <60 seconds remain before requesting protected resource", async () => {
    // Test Proactive Token Refresh Before Expiry
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const { __testExports } = loadFreshAppModule();
    const { mockBackend, httpClient } = __testExports;

    // Arrange
    const loginPromise = mockBackend.login(
      "admin@fintech.com",
      "Admin123!",
      "ip-3"
    );
    await advance(300);
    const loginRes = await loginPromise;

    const refreshTokensMap: Map<string, any> = (mockBackend as any)
      .refreshTokens;
    const issuedRefreshToken = Array.from(refreshTokensMap.keys())[0];
    (httpClient as any).getStoredRefreshToken = () => issuedRefreshToken;

    httpClient.setTokens({
      accessToken: loginRes.accessToken,
      expiresAt: Date.now() + 59_000,
    });

    const refreshSpy = jest.spyOn(mockBackend, "refreshAccessToken");

    // Act
    const requestPromise = httpClient.request({ endpoint: "/api/protected" });
    await advance(200);
    const res = await requestPromise;

    // Assert
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(res.data).toBe("Protected data accessed successfully");
  });

  test("reusing a revoked refresh token invalidates the entire token family", async () => {
    //Test Token Reuse Detection with Family Revocation
    jest.useFakeTimers();

    const { __testExports } = loadFreshAppModule();
    const { mockBackend } = __testExports;

    const loginPromise = mockBackend.login(
      "admin@fintech.com",
      "Admin123!",
      "ip-4"
    );
    await advance(300);
    await loginPromise;

    const refreshTokensMap: Map<string, any> = (mockBackend as any)
      .refreshTokens;
    const originalRefreshToken = Array.from(refreshTokensMap.keys())[0];

    // Act: first refresh uses original token (revokes it) and mints a new refresh token.
    const firstRefreshPromise =
      mockBackend.refreshAccessToken(originalRefreshToken);
    await advance(200);
    await firstRefreshPromise;

    // Act + Assert: second refresh with the revoked token triggers theft detection.
    const secondRefreshPromise =
      mockBackend.refreshAccessToken(originalRefreshToken);
    const secondRefreshExpectation = expect(
      secondRefreshPromise
    ).rejects.toThrow("Token reuse detected. All sessions invalidated.");

    await advance(200);
    await secondRefreshExpectation;

    // Assert: entire family is revoked.
    const originalFamilyId =
      refreshTokensMap.get(originalRefreshToken).familyId;
    const familyEntries = Array.from(refreshTokensMap.entries()).filter(
      ([, v]) => v.familyId === originalFamilyId
    );
    expect(familyEntries.length).toBeGreaterThan(0);
    for (const [, tokenData] of familyEntries) {
      expect(tokenData.isRevoked).toBe(true);
    }
  });
});

describe("JWT Authentication — UI + state management", () => {
  beforeEach(() => {
    const mod = loadFreshAppModule();
    resetSingletonState(mod);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("successful login updates user state and shows dashboard", async () => {
    // Test Successful Login Updates User State
    jest.useFakeTimers();

    const { default: App } = loadFreshAppModule();

    // Arrange
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);

    // Act
    await user.type(
      screen.getByPlaceholderText(/you@company\.com/i),
      "admin@fintech.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "Admin123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await advance(300);

    // Assert
    expect(await screen.findByText(/secure dashboard/i)).toBeInTheDocument();
    expect(screen.getByText("admin@fintech.com")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("failed login shows error message", async () => {
    // Test Failed Login Shows Error
    jest.useFakeTimers();

    const { default: App } = loadFreshAppModule();

    // Arrange
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);

    // Act
    await user.type(
      screen.getByPlaceholderText(/you@company\.com/i),
      "admin@fintech.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "WrongPass123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await advance(300);

    // Assert
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  test("logout clears tokens and user state and returns to login form", async () => {
    // Test Logout Clears Tokens and User State
    jest.useFakeTimers();

    const { default: App } = loadFreshAppModule();

    // Arrange
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);

    await user.type(
      screen.getByPlaceholderText(/you@company\.com/i),
      "admin@fintech.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "Admin123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await advance(300);

    expect(await screen.findByText(/secure dashboard/i)).toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("button", { name: /logout/i }));

    await advance(0);

    // Assert
    expect(
      await screen.findByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
  });

  test("form validation prevents submit on invalid email and short password", async () => {
    // Test Form Validation
    jest.useFakeTimers();

    const { default: App } = loadFreshAppModule();

    // Arrange
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);

    // Act
    await user.type(
      screen.getByPlaceholderText(/you@company\.com/i),
      "not-an-email"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "short");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Assert
    expect(
      await screen.findByText(/invalid email format/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/password must be at least 8 characters/i)
    ).toBeInTheDocument();

    // No backend call should complete; still on login.
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  test("unauthenticated users are shown the login form (protected route)", async () => {
    // Test Unauthenticated Access Redirects to Login
    const { default: App } = loadFreshAppModule();

    // Arrange + Act
    render(<App />);

    // Assert
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/production-grade jwt authentication/i)
    ).toBeInTheDocument();
  });

  test("authenticated users can access dashboard (protected route)", async () => {
    // Test Authenticated Access to Dashboard
    jest.useFakeTimers();

    const { default: App } = loadFreshAppModule();

    // Arrange
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);

    // Act
    await user.type(
      screen.getByPlaceholderText(/you@company\.com/i),
      "user@fintech.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "User123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await advance(300);

    // Assert
    expect(await screen.findByText(/secure dashboard/i)).toBeInTheDocument();
    expect(screen.getByText("user@fintech.com")).toBeInTheDocument();
  });

  test("login form displays demo credentials", async () => {
    // Test LoginForm Displays Demo Credentials
    const { default: App } = loadFreshAppModule();

    // Arrange + Act
    render(<App />);

    // Assert
    expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/admin@fintech.com/i)).toBeInTheDocument();
    expect(screen.getByText(/user@fintech.com/i)).toBeInTheDocument();
  });

  test("dashboard shows user info and logout button", async () => {
    // Test Dashboard Shows User Info and Logout Button
    jest.useFakeTimers();

    const { default: App } = loadFreshAppModule();

    // Arrange
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);

    await user.type(
      screen.getByPlaceholderText(/you@company\.com/i),
      "admin@fintech.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "Admin123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await advance(300);

    // Assert
    expect(await screen.findByText(/user profile/i)).toBeInTheDocument();
    expect(screen.getByText("admin@fintech.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  test("error messages display correctly for auth failures", async () => {
    // Test Error Messages Display Correctly
    jest.useFakeTimers();

    const { default: App } = loadFreshAppModule();

    // Arrange
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);

    // Act
    await user.type(
      screen.getByPlaceholderText(/you@company\.com/i),
      "admin@fintech.com"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "WrongPass123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await advance(300);

    // Assert
    const error = await screen.findByText(/invalid credentials/i);
    expect(error).toBeInTheDocument();
  });
});
