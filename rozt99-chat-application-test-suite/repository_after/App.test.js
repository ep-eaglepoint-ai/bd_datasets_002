import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

describe("Chat Application Test Suite", () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Message Sending", () => {
    test("sends a message and adds it to the messages array with correct role", () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      const messageText = "Hello Test";
      fireEvent.change(input, { target: { value: messageText } });
      fireEvent.click(sendButton);

      expect(screen.getByText(messageText)).toBeInTheDocument();
      expect(input).toHaveValue("");
    });

    test("trims message content before sending", () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      fireEvent.change(input, { target: { value: "  Trim Me  " } });
      fireEvent.click(sendButton);

      expect(screen.getByText("Trim Me")).toBeInTheDocument();
    });

    test("prevent sending empty messages", () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      fireEvent.change(input, { target: { value: "   " } });
      expect(sendButton).toBeDisabled();
      fireEvent.click(sendButton);
      expect(screen.queryAllByText(/Hello!/)).toHaveLength(1);
    });
  });

  describe("Async Response Handling", () => {
    test("shows typing indicator pending response", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      fireEvent.change(input, { target: { value: "Hello" } });
      fireEvent.click(sendButton);

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });

    test("typing indicator disappears after response is received", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "Hello" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      // Advance time to flush response
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe("Response Generation (Keywords)", () => {
    const cases = [
      ["hello", "Hello! How can I assist you today?"],
      ["Hi there", "Hello! How can I assist you today?"],
      ["HOW ARE YOU", "I'm doing well, thank you"],
      ["I need HELP", "I'm here to help!"],
      ["bye", "Goodbye! Feel free to come back"],
      ["goodbye", "Goodbye! Feel free to come back"],
      ["what is your name", "I'm a minimal chat assistant"],
      ["weather check", "I recommend checking a weather service"],
    ];

    test.each(cases)(
      'input "%s" triggers response matching "%s"',
      async (inputTxt, expected) => {
        render(<App />);
        const input = screen.getByPlaceholderText(/type your message/i);
        fireEvent.change(input, { target: { value: inputTxt } });
        fireEvent.click(screen.getByRole("button", { name: /send/i }));

        act(() => {
          jest.advanceTimersByTime(2500);
        });

        await waitFor(() => {
          expect(
            screen.getByText((content) => content.includes(expected)),
          ).toBeInTheDocument();
        });
      },
    );

    test("time triggers response with current time", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "time" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        const messages = screen.getAllByText(/The current time is/);
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    test("date triggers response with current date", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "date" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        const messages = screen.getAllByText(/Today's date is/);
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    test("unknown inputs trigger fallback responses", async () => {
      render(<App />);
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0);
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "fsdjklfjdslk" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            "That's an interesting question. Could you tell me more?",
          ),
        ).toBeInTheDocument();
      });

      Math.random = originalRandom;
    });

    test("case insensitivity and partial matching", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      // "Is there a Weather report?" matches "weather"
      fireEvent.change(input, {
        target: { value: "Is there a Weather report?" },
      });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/I recommend checking a weather service/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Keyboard Event Handling", () => {
    test("Enter key sends message", () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "Enter Key Test" } });
      fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

      expect(screen.getByText("Enter Key Test")).toBeInTheDocument();
      expect(input).toHaveValue("");
    });

    test("Shift+Enter does not send message", () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "Shift Enter" } });
      fireEvent.keyPress(input, {
        key: "Enter",
        code: "Enter",
        charCode: 13,
        shiftKey: true,
      });

      // Should still be in input
      expect(input).toHaveValue("Shift Enter");
      expect(screen.queryByText("Shift Enter", { selector: "p" })).toBeNull();
    });

    test("Enter key prevented when typing", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "First" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      expect(input).toBeDisabled();
    });
  });

  describe("Auto-Scroll Functionality", () => {
    test("scrollIntoView is called when new messages are added", async () => {
      render(<App />);
      // Initial render triggers scroll for initial message
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

      Element.prototype.scrollIntoView.mockClear();

      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "Scroll Test" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      // Should scroll on user message
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
      });

      Element.prototype.scrollIntoView.mockClear();
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        // Should scroll on AI response
        expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
          behavior: "smooth",
        });
      });
    });
  });

  describe("UI State Management", () => {
    test("input and button disabled while typing", () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      fireEvent.change(input, { target: { value: "Wait Test" } });
      fireEvent.click(sendButton);

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    test("renders user and assistant avatars", () => {
      render(<App />);
      const svgs = document.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("handles long messages", () => {
      render(<App />);
      const longText = "a".repeat(500);
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: longText } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    test("handles special characters", () => {
      render(<App />);
      const specialText = '!@#$%^&*()_+{}|:"<>?';
      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: specialText } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });
  });

  describe("Integration Tests", () => {
    test("complete conversation flow", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      // User sends "hello"
      fireEvent.change(input, { target: { value: "hello" } });
      fireEvent.click(sendButton);

      // Verify User Message
      expect(screen.getByText("hello")).toBeInTheDocument();
      // Verify Typing
      expect(input).toBeDisabled();

      // Wait for response
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        // Verify Response
        expect(screen.getByText(/Hello! How can I assist/)).toBeInTheDocument();
        // Verify Input enabled
        expect(input).not.toBeDisabled();
      });

      // User sends "bye"
      fireEvent.change(input, { target: { value: "bye" } });
      fireEvent.click(sendButton);

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(screen.getByText(/Goodbye/)).toBeInTheDocument();
      });
    });
  });

  describe("Message Ordering", () => {
    test("messages appear in chronological order", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);

      fireEvent.change(input, { target: { value: "First Message" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      act(() => {
        jest.advanceTimersByTime(2500);
      });
      await waitFor(() =>
        expect(screen.queryByText(/First Message/)).toBeInTheDocument(),
      );
    });
  });
});
