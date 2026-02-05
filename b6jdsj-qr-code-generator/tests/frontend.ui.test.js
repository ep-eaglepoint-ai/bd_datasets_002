const React = require("react");
require("@testing-library/jest-dom");
const {
  render,
  screen,
  fireEvent,
  waitFor,
} = require("@testing-library/react");

const App = require("../repository_after/client/src/App.jsx").default;
const QRForm =
  require("../repository_after/client/src/components/QRForm.jsx").default;
const QRDisplay =
  require("../repository_after/client/src/components/QRDisplay.jsx").default;
const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "../repository_after/client/src/App.jsx");
const formPath = path.join(
  __dirname,
  "../repository_after/client/src/components/QRForm.jsx",
);
const displayPath = path.join(
  __dirname,
  "../repository_after/client/src/components/QRDisplay.jsx",
);
const indexCssPath = path.join(
  __dirname,
  "../repository_after/client/src/index.css",
);
const appCssPath = path.join(
  __dirname,
  "../repository_after/client/src/App.css",
);

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("Frontend UI (real components)", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("QRForm enforces validation and character count", () => {
    const onGenerate = jest.fn();
    render(<QRForm onGenerate={onGenerate} loading={false} />);

    const input = screen.getByPlaceholderText(/Enter text or URL/i);
    const button = screen.getByRole("button", { name: /Generate QR/i });

    expect(screen.getByText("0/500")).toBeInTheDocument();
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByText(/Input cannot be empty/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "hello" } });
    expect(screen.getByText("5/500")).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    const fiveHundred = "a".repeat(500);
    fireEvent.change(input, { target: { value: fiveHundred } });
    expect(screen.getByText("500/500")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: `${fiveHundred}x` } });
    expect(input.value.length).toBe(500);
  });

  test("QRForm shows loading state and disables controls", () => {
    render(<QRForm onGenerate={() => {}} loading />);
    const button = screen.getByRole("button", { name: /Generating/i });
    const input = screen.getByPlaceholderText(/Enter text or URL/i);
    expect(button).toBeDisabled();
    expect(input).toBeDisabled();
  });

  test("QRDisplay renders placeholder, loading, error, and image states", () => {
    const { rerender, container } = render(
      <QRDisplay data={null} error={null} loading={false} />,
    );
    expect(screen.getByText(/Enter text to see QR code/i)).toBeInTheDocument();

    rerender(<QRDisplay data={null} error={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();

    const data = {
      qrCode: "data:image/png;base64,AAA",
      timestamp: new Date().toISOString(),
    };
    rerender(<QRDisplay data={data} error={null} loading={false} />);
    expect(screen.getByAltText(/Generated QR Code/i)).toHaveAttribute(
      "src",
      data.qrCode,
    );

    rerender(<QRDisplay data={null} error="Network failure" loading={false} />);
    expect(screen.getByText(/Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Network failure/i)).toBeInTheDocument();
  });

  test("App shows loading state during API call and updates on response", async () => {
    const deferred = createDeferred();
    global.fetch.mockReturnValueOnce(deferred.promise);

    render(<App />);
    const input = screen.getByPlaceholderText(/Enter text or URL/i);
    fireEvent.change(input, { target: { value: "hello" } });

    fireEvent.click(screen.getByRole("button", { name: /Generate QR/i }));
    expect(screen.getByRole("button", { name: /Generating/i })).toBeDisabled();

    deferred.resolve({
      ok: true,
      json: async () => ({
        qrCode: "AAA",
        timestamp: new Date().toISOString(),
      }),
    });

    await waitFor(() => {
      expect(screen.getByAltText(/Generated QR Code/i)).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("App shows human-readable error on network failure without retries", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Enter text or URL/i), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate QR/i }));

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("UI uses functional components with hooks", () => {
    const appSource = fs.readFileSync(appPath, "utf8");
    const formSource = fs.readFileSync(formPath, "utf8");
    const displaySource = fs.readFileSync(displayPath, "utf8");

    expect(appSource).toMatch(/function App\(/);
    expect(appSource).toMatch(/useState\(/);
    expect(formSource).toMatch(/function QRForm\(/);
    expect(formSource).toMatch(/useState\(/);
    expect(displaySource).toMatch(/function QRDisplay\(/);
    expect(appSource).not.toMatch(/class\s+App/);
    expect(formSource).not.toMatch(/class\s+QRForm/);
    expect(displaySource).not.toMatch(/class\s+QRDisplay/);
  });

  test("Styling uses Tailwind utility classes only", () => {
    const indexCss = fs.readFileSync(indexCssPath, "utf8");
    const appCss = fs.readFileSync(appCssPath, "utf8");
    const appSource = fs.readFileSync(appPath, "utf8");

    expect(indexCss).toMatch(/@tailwind base;/);
    expect(indexCss).toMatch(/@tailwind components;/);
    expect(indexCss).toMatch(/@tailwind utilities;/);
    expect(appCss).toMatch(/Tailwind utility classes only/i);
    expect(appSource).not.toMatch(/import\s+['"]\.\/App\.css['"]/);

    expect(appSource).not.toMatch(/styled-components|@mui|chakra|antd/i);
  });

  test("No download or customization UI is present", () => {
    render(<App />);
    expect(screen.queryByText(/download/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/color/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/size/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/custom/i)).not.toBeInTheDocument();
  });
});
