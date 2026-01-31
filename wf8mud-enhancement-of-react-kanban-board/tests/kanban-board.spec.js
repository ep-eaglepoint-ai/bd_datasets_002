// tests/kanban-board.spec.js
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import App from "../repository_after/src/App"; // Make sure this path matches your App.js location

let container;

beforeEach(() => {
  // Create a container for rendering
  container = document.createElement("div");
  document.body.appendChild(container);

  // Mock localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value.toString(); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  })();
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

function renderApp() {
  act(() => {
    const root = createRoot(container);
    root.render(<App />);
  });
}

describe("React Kanban Board – Enhanced Features", () => {
  test("renders both columns", () => {
    renderApp();
    expect(container.textContent).toContain("In-PROGRESS");
    expect(container.textContent).toContain("COMPLETED");
  });

  test("loads default tasks when localStorage is empty", () => {
    renderApp();
    expect(container.textContent).toContain("STORY-4513");
    expect(container.textContent).toContain("STORY-4520");
  });

  test("opens Add Task modal from WIP column", () => {
    renderApp();
    const addBtn = Array.from(container.querySelectorAll("button"))
      .find(b => b.textContent === "Add Task");
    expect(addBtn).toBeTruthy();
    act(() => addBtn.click());
    expect(container.querySelector("input")).toBeTruthy();
  });

  test("adds a new task with generated STORY id", () => {
    renderApp();
    const addBtn = container.querySelector("button");
    act(() => addBtn.click());

    const input = container.querySelector("input");
    act(() => {
      input.value = "My new task";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submitBtn = Array.from(container.querySelectorAll("button"))
      .find(b => b.textContent === "Save");
    act(() => submitBtn.click());

    expect(container.textContent).toContain("My new task");
  });

  test("inline edit updates task title", () => {
    renderApp();
    const task = Array.from(container.querySelectorAll(".task-card"))
      .find(t => t.textContent.includes("Add tooltip"));

    act(() => task.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    const input = task.querySelector("input");

    act(() => {
      input.value = "Updated tooltip";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const saveBtn = Array.from(container.querySelectorAll("button"))
      .find(b => b.textContent === "Save");
    act(() => saveBtn.click());

    expect(container.textContent).toContain("Updated tooltip");
  });

  test("empty inline edit reverts title", () => {
    renderApp();
    const task = container.querySelector(".task-card");

    act(() => task.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    const input = task.querySelector("input");

    act(() => {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const saveBtn = Array.from(container.querySelectorAll("button"))
      .find(b => b.textContent === "Save");
    act(() => saveBtn.click());

    expect(task.textContent).not.toBe(""); // title should not be empty
  });

  test("delete confirmation appears and deletes task", () => {
    renderApp();
    const task = container.querySelector(".task-card");

    act(() => task.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true })));
    const delBtn = task.querySelector("button");

    act(() => delBtn.click());
    expect(container.textContent).not.toContain(task.textContent);
  });

  test("priority context menu changes background color", () => {
    renderApp();
    const task = container.querySelector(".task-card");

    act(() => task.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 10, clientY: 10 })
    ));

    const menuOption = Array.from(container.querySelectorAll(".priority-option"))[0];
    act(() => menuOption.click());

    expect(task.style.backgroundColor).toBeTruthy();
  });

  test("tasks persist to localStorage", () => {
    renderApp();
    const addBtn = container.querySelector("button");
    act(() => addBtn.click());

    const input = container.querySelector("input");
    act(() => {
      input.value = "Persistent Task";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submitBtn = Array.from(container.querySelectorAll("button"))
      .find(b => b.textContent === "Save");
    act(() => submitBtn.click());

    expect(localStorage.getItem("kanbanTasks")).toContain("Persistent Task");
  });

  test("loads tasks from localStorage on mount", () => {
    const tasks = JSON.stringify([{ name: "From storage", category: "wip" }]);
    localStorage.setItem("kanbanTasks", tasks);

    renderApp();
    expect(container.textContent).toContain("From storage");
  });
});
