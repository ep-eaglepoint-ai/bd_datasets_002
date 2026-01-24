import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

export default function MinimalChatApp() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: "Hello! I'm here to help. What would you like to talk about?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate AI response with delay
    setTimeout(
      () => {
        const aiResponse = {
          id: Date.now() + 1,
          role: "assistant",
          content: generateResponse(userMessage.content),
        };
        setMessages((prev) => [...prev, aiResponse]);
        setIsTyping(false);
      },
      1000 + Math.random() * 1000,
    );
  };

  const generateResponse = (userInput) => {
    const input = userInput.toLowerCase();

    if (input.includes("hello") || input.includes("hi")) {
      return "Hello! How can I assist you today?";
    } else if (input.includes("how are you")) {
      return "I'm doing well, thank you for asking! How can I help you?";
    } else if (input.includes("help")) {
      return "I'm here to help! You can ask me questions, and I'll do my best to provide useful responses.";
    } else if (input.includes("bye") || input.includes("goodbye")) {
      return "Goodbye! Feel free to come back anytime you need assistance.";
    } else if (input.includes("name")) {
      return "I'm a minimal chat assistant, built to demonstrate conversational UI patterns.";
    } else if (input.includes("weather")) {
      return "I don't have access to real-time weather data, but I recommend checking a weather service for accurate forecasts!";
    } else if (input.includes("time")) {
      return `The current time is ${new Date().toLocaleTimeString()}.`;
    } else if (input.includes("date")) {
      return `Today's date is ${new Date().toLocaleDateString()}.`;
    } else {
      const responses = [
        "That's an interesting question. Could you tell me more?",
        "I understand. What else would you like to know?",
        "Thanks for sharing that. How can I help you further?",
        "I see. Is there anything specific you'd like assistance with?",
        "That's a good point. What are your thoughts on this?",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              Chat Assistant
            </h1>
            <p className="text-sm text-slate-500">Always here to help</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-green-400 to-emerald-600"
                    : "bg-gradient-to-br from-blue-400 to-purple-600"
                }`}
              >
                {message.role === "user" ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-lg px-4 py-3 rounded-2xl ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                    : "bg-white text-slate-800 shadow-sm border border-slate-200"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                rows="1"
                disabled={isTyping}
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-800 placeholder-slate-400"
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 font-medium"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
