import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import RegexPlayground from "../repository_after/src/components/RegexPlayground";
import useRegexWorker from "../repository_after/src/hooks/useRegexWorker";

jest.mock("../repository_after/src/hooks/useRegexWorker");

const mockUseRegexWorker = useRegexWorker as jest.MockedFunction<
  typeof useRegexWorker
>;

const defaultHookValue: ReturnType<typeof useRegexWorker> = {
  ok: true,
  matches: [
    {
      index: 0,
      end: 3,
      match: "abc",
      groups: [
        {
          index: 1,
          name: "word",
          text: "abc",
          start: 0,
          end: 3,
          parentIndex: null,
        },
      ],
    },
  ],
  executionTimeMs: 1.25,
  truncated: false,
  error: undefined,
  groupDefs: [
    {
      index: 1,
      name: "word",
      parentIndex: null,
    },
  ],
  status: "idle",
};

describe("RegexPlayground UI", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUseRegexWorker.mockReturnValue(defaultHookValue);
  });

  it("renders pattern input, flags, and test text area with monospaced styling", () => {
    render(<RegexPlayground />);

    const patternInput = screen.getByLabelText("Pattern");
    const testText = screen.getByLabelText("Test Text");

    expect(patternInput).toBeInTheDocument();
    expect(patternInput.className).toContain("font-mono");
    expect(testText).toBeInTheDocument();
    expect(testText.className).toContain("font-mono");
  });

  it("toggles flags and updates preview", () => {
    render(<RegexPlayground />);

    const preview = screen.getByText(/\/.+\/[a-z]*/i);
    expect(preview.textContent).toContain("/(?<word>\\w+)/g");

    const insensitiveToggle = screen.getByRole("button", {
      name: /i insensitive/i,
    });
    fireEvent.click(insensitiveToggle);

    expect(preview.textContent).toContain("/(?<word>\\w+)/gi");
  });

  it("stores updates in localStorage", () => {
    render(<RegexPlayground />);

    const patternInput = screen.getByLabelText("Pattern") as HTMLInputElement;
    fireEvent.change(patternInput, { target: { value: "abc" } });

    expect(window.localStorage.getItem("regex-playground:pattern")).toBe(
      '"abc"',
    );
  });

  it("restores state from localStorage on reload (deterministic)", () => {
    window.localStorage.setItem(
      "regex-playground:pattern",
      JSON.stringify("xyz"),
    );
    window.localStorage.setItem("regex-playground:flags", JSON.stringify("gi"));
    window.localStorage.setItem(
      "regex-playground:text",
      JSON.stringify("xyz xyz"),
    );

    render(<RegexPlayground />);

    const patternInput = screen.getByLabelText("Pattern") as HTMLInputElement;
    const preview = screen.getByText(/\/xyz\/gi/);
    const testText = screen.getByLabelText("Test Text") as HTMLTextAreaElement;

    expect(patternInput.value).toBe("xyz");
    expect(preview).toBeInTheDocument();
    expect(testText.value).toBe("xyz xyz");
  });

  it("disables highlighting for large text input", () => {
    const largeText = "a".repeat(250000);
    window.localStorage.setItem(
      "regex-playground:text",
      JSON.stringify(largeText),
    );

    render(<RegexPlayground />);

    expect(screen.getByText(/Highlighting disabled/i)).toBeInTheDocument();
  });

  it("shows match metadata and capture groups", () => {
    render(<RegexPlayground />);

    expect(screen.getByText(/1 match/i)).toBeInTheDocument();
    expect(screen.getAllByText("[0, 3)")).toHaveLength(2);
    expect(screen.getByText("Match 1")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("(word)")).toBeInTheDocument();
    expect(screen.getAllByText("abc")).toHaveLength(2);
  });

  it("handles invalid regex errors gracefully", () => {
    mockUseRegexWorker.mockReturnValue({
      ok: false,
      matches: [],
      executionTimeMs: 0,
      truncated: false,
      error: "Invalid regular expression",
      groupDefs: [],
      status: "idle",
    });

    render(<RegexPlayground />);

    expect(screen.getByText("Regex Error")).toBeInTheDocument();
    expect(screen.getByText(/Invalid regular expression/)).toBeInTheDocument();
  });
});
