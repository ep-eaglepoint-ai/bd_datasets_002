import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import App from "./App";

describe("Chat Application Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("Message Sending", () => {
    test("sends a message and adds it to the messages array with correct role", () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      const messageText = "Hello Test Role";
      fireEvent.change(input, { target: { value: messageText } });
      fireEvent.click(sendButton);

      // Check for presence
      const userMessage = screen.getByText(messageText);
      expect(userMessage).toBeInTheDocument();

      // Check role using data-testid
      const messageContainer = userMessage.closest(
        '[data-testid="message-user"]',
      );
      expect(messageContainer).toBeInTheDocument();
      expect(messageContainer).toHaveAttribute("data-testid", "message-user");

      // Additional check on styling
      expect(
        userMessage.closest('div[class*="from-blue-500"]'),
      ).toBeInTheDocument();
    });

    test("message IDs are unique", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      fireEvent.change(input, { target: { value: "Msg 1" } });
      fireEvent.click(sendButton);
      act(() => jest.advanceTimersByTime(2500));
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "Msg 2" } });
      fireEvent.click(sendButton);

      const messages = screen.getAllByTestId(/^message-/);
      expect(messages.length).toBeGreaterThanOrEqual(3);

      const ids = messages.map((m) =>
        parseInt(m.getAttribute("data-message-id")),
      );
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      for (let i = 0; i < ids.length - 1; i++) {
        expect(ids[i + 1]).toBeGreaterThan(ids[i]);
      }
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

      const messages = screen.getAllByTestId(/^message-/);
      expect(messages).toHaveLength(1);
    });
  });

  describe("Async Response Handling", () => {
    test("shows typing indicator pending response", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      expect(document.querySelector(".animate-bounce")).not.toBeInTheDocument();

      fireEvent.change(input, { target: { value: "Hello" } });
      fireEvent.click(sendButton);

      expect(document.querySelector(".animate-bounce")).toBeInTheDocument();
      expect(input).toBeDisabled();

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(input).not.toBeDisabled();
        expect(
          document.querySelector(".animate-bounce"),
        ).not.toBeInTheDocument();
      });
    });

    test("rapid consecutive message sends are prevented", () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      fireEvent.change(input, { target: { value: "First" } });
      fireEvent.click(sendButton);

      expect(input).toBeDisabled();

      fireEvent.change(input, { target: { value: "Second" } });
      fireEvent.click(sendButton);

      const userMessages = screen.getAllByTestId("message-user");
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0]).toHaveTextContent("First");
    });

    test("response delay is between 1000-2000ms", async () => {
      const randomSpy = jest.spyOn(global.Math, "random");
      randomSpy.mockReturnValue(0);

      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);

      fireEvent.change(input, { target: { value: "test min" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      act(() => jest.advanceTimersByTime(999));
      expect(input).toBeDisabled();

      act(() => jest.advanceTimersByTime(1));
      await waitFor(() => expect(input).not.toBeDisabled());

      randomSpy.mockRestore();
    });
  });

  describe("Response Generation (Keywords)", () => {
    const cases = [
      ["hello", "Hello! How can I assist you today?"],
      ["weather check", "I recommend checking a weather service"],
      ["time", "The current time is"],
      ["date", "Today's date is"],
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

    test("first matching pattern is used (priority check)", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);

      fireEvent.change(input, {
        target: { value: "Hello, tell me about the weather" },
      });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      act(() => jest.advanceTimersByTime(2500));

      await waitFor(() => {
        expect(
          screen.getByText(/Hello! How can I assist you today?/),
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/checking a weather service/),
        ).not.toBeInTheDocument();
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

      expect(input).toHaveValue("Shift Enter");
    });
  });

  describe("Auto-Scroll Functionality", () => {
    test("scrollIntoView is called when new messages are added", async () => {
      render(<App />);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      Element.prototype.scrollIntoView.mockClear();

      const input = screen.getByPlaceholderText(/type your message/i);
      fireEvent.change(input, { target: { value: "Scroll Test" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
      });

      Element.prototype.scrollIntoView.mockClear();
      act(() => jest.advanceTimersByTime(2500));

      await waitFor(() => {
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
  });

  describe("Edge Cases", () => {
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

      fireEvent.change(input, { target: { value: "hello" } });
      fireEvent.click(sendButton);

      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(input).toBeDisabled();

      act(() => jest.advanceTimersByTime(2500));

      await waitFor(() => {
        expect(screen.getByText(/Hello! How can I assist/)).toBeInTheDocument();
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe("Message Ordering", () => {
    test("messages are added in correct order", async () => {
      render(<App />);
      const input = screen.getByPlaceholderText(/type your message/i);

      fireEvent.change(input, { target: { value: "First User Msg" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      act(() => jest.advanceTimersByTime(2500));
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "Second User Msg" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      const messages = screen.getAllByTestId(/^message-/);
      const ids = messages.map((m) =>
        parseInt(m.getAttribute("data-message-id")),
      );

      expect(ids[3]).toBeGreaterThan(ids[1]);
    });
  });
});
