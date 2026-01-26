import React from "react";
import { render, screen } from "@testing-library/react";
import { act } from "react-dom/test-utils";

import useRegexWorker from "../repository_after/src/hooks/useRegexWorker";
import { createRegexWorker } from "../repository_after/src/utils/regexWorkerFactory";

jest.mock("../repository_after/src/utils/regexWorkerFactory");

const mockedCreateRegexWorker = createRegexWorker as jest.MockedFunction<
  typeof createRegexWorker
>;

const HookConsumer = ({
  pattern,
  flags,
  text,
  timeoutMs = 50,
}: {
  pattern: string;
  flags: string;
  text: string;
  timeoutMs?: number;
}) => {
  const { error, matches } = useRegexWorker({
    pattern,
    flags,
    text,
    debounceMs: 0,
    timeoutMs,
  });

  return (
    <div>
      <div data-testid="error">{error || ""}</div>
      <div data-testid="count">{matches.length}</div>
    </div>
  );
};

describe("useRegexWorker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedCreateRegexWorker.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("returns matches when worker responds", () => {
    const worker = {
      onmessage: null as ((event: { data: any }) => void) | null,
      onerror: null as (() => void) | null,
      postMessage: function postMessage() {
        this.onmessage?.({
          data: {
            ok: true,
            error: null,
            matches: [
              {
                index: 0,
                end: 2,
                match: "😊",
                groups: [],
              },
            ],
            executionTimeMs: 0.5,
            truncated: false,
            groupDefs: [],
          },
        });
      },
      terminate: jest.fn(),
    };

    mockedCreateRegexWorker.mockReturnValue(worker as unknown as Worker);

    render(<HookConsumer pattern="😊" flags="g" text="😊" />);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("surfaces timeout error when worker does not respond", () => {
    const worker = {
      onmessage: null as ((event: { data: any }) => void) | null,
      onerror: null as (() => void) | null,
      postMessage: jest.fn(),
      terminate: jest.fn(),
    };

    mockedCreateRegexWorker.mockReturnValue(worker as unknown as Worker);

    render(
      <HookConsumer
        pattern={"(a+)+$" + " ".repeat(200)}
        flags=""
        text="aaaaaaaaaa"
        timeoutMs={10}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(20);
    });

    expect(screen.getByTestId("error").textContent).toMatch(
      /Execution exceeded 10ms/,
    );
  });
});
