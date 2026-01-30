const fs = require("fs");
const path = require("path");

describe("Meta Tests - Test Suite Quality", () => {
  const testFilePath = path.join(__dirname, "../repository_after/App.test.js");
  const setupFilePath = path.join(__dirname, "../repository_after/setupTests.js");
  
  let testContent;
  let setupContent;

  beforeAll(() => {
    testContent = fs.readFileSync(testFilePath, "utf8");
    setupContent = fs.readFileSync(setupFilePath, "utf8");
  });

  test("test file exists in repository_after", () => {
    expect(fs.existsSync(testFilePath)).toBe(true);
  });

  test("setup file exists in repository_after", () => {
    expect(fs.existsSync(setupFilePath)).toBe(true);
  });

  test("uses React Testing Library", () => {
    expect(testContent).toContain("@testing-library/react");
  });

  test("has proper test structure with describe blocks", () => {
    const describeCount = (testContent.match(/describe\(/g) || []).length;
    expect(describeCount).toBeGreaterThan(5);
  });

  test("uses fake timers for async testing", () => {
    expect(testContent).toContain("jest.useFakeTimers()");
    expect(testContent).toContain("jest.advanceTimersByTime");
  });

  test("mocks scrollIntoView", () => {
    expect(setupContent).toContain("scrollIntoView");
    expect(setupContent).toContain("jest.fn()");
  });

  test("has cleanup in afterEach", () => {
    expect(testContent).toContain("afterEach");
    expect(testContent).toContain("jest.useRealTimers()");
  });

  test("tests async behavior with act and waitFor", () => {
    expect(testContent).toContain("act(");
    expect(testContent).toContain("waitFor(");
  });

  test("uses parameterized tests", () => {
    expect(testContent).toContain("test.each");
  });

  test("covers edge cases", () => {
    expect(testContent).toContain("Edge Cases");
  });

  test("has integration tests", () => {
    expect(testContent).toContain("Integration");
  });

  test("minimum test count", () => {
    const testCount = (testContent.match(/test\(/g) || []).length;
    expect(testCount).toBeGreaterThanOrEqual(15);
  });
});
