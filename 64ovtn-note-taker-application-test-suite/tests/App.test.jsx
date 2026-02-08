const fs = require("fs");
const path = require("path");
const { runCLI } = require("jest");

const requiredTestNames = [
  "Note Taker Application Initial Render and Async Loading uses fake timers and deterministic timestamps",
  "Note Taker Application Initial Render and Async Loading renders header and loading, then empty state",
  "Note Taker Application Initial Render and Async Loading honors mockAPI delays for loading transition",
  "Note Taker Application Create Note creating a note adds it to the list with correct content",
  "Note Taker Application Create Note created note displays correct title and content",
  "Note Taker Application Create Note All Notes count increments after creation",
  "Note Taker Application Create Note creating a note with tags updates TagFilter counts after async loadTags",
  "Note Taker Application Create Note async ordering keeps tag list stale until loadTags finishes",
  "Note Taker Application Form Validation submitting with empty title triggers alert and no note is created",
  "Note Taker Application Form Validation submitting with empty content triggers alert and no note is created",
  "Note Taker Application Tag Input and Management pressing Enter adds a tag chip and clears input",
  "Note Taker Application Tag Input and Management pressing comma adds a tag chip",
  "Note Taker Application Tag Input and Management blurring tag input adds a tag chip",
  "Note Taker Application Tag Input and Management duplicate tags are not added",
  "Note Taker Application Tag Input and Management clicking × removes a tag chip",
  "Note Taker Application Tag Filter creating notes with different tags shows tags with correct counts",
  "Note Taker Application Tag Filter clicking a tag filters notes and shows loading state until resolved",
  "Note Taker Application Tag Filter clicking All Notes clears tag filter and restores list",
  "Note Taker Application Edit Note clicking edit enters edit mode and pre-fills form fields",
  "Note Taker Application Edit Note submitting in edit mode updates the note and timestamp",
  "Note Taker Application Edit Note clicking Cancel exits edit mode without applying changes",
  "Note Taker Application Delete Note confirm false prevents deletion",
  "Note Taker Application Delete Note confirm true deletes the note and updates tag counts",
  "Note Taker Application Delete Note deleting last note shows empty state again",
];

const runTargetTests = async (targetRepo) => {
  const testFilePath = path.join(targetRepo, "tests", "App.test.jsx");
  if (!fs.existsSync(testFilePath)) {
    return { testFilePath, missing: true };
  }

  const { results } = await runCLI(
    {
      runTestsByPath: [testFilePath],
      runInBand: true,
      silent: true,
      testEnvironment: "jsdom",
      testTimeout: 10000,
    },
    [targetRepo],
  );

  return { testFilePath, missing: false, results };
};

describe("Meta tests for repository test suite", () => {
  const targetRepo = process.env.TARGET_REPO
    ? path.resolve(process.env.TARGET_REPO)
    : path.resolve(__dirname, "..", "repository_after");
  const appUnderTest = process.env.APP_UNDER_TEST
    ? path.resolve(process.env.APP_UNDER_TEST)
    : path.join(targetRepo, "src", "App.jsx");

  test("target test suite exists", async () => {
    const { testFilePath, missing } = await runTargetTests(targetRepo);
    expect(missing).toBe(false);
    expect(fs.existsSync(testFilePath)).toBe(true);
  });

  test("target test suite satisfies requirements", async () => {
    process.env.APP_UNDER_TEST = appUnderTest;
    const { results } = await runTargetTests(targetRepo);

    const allAssertions = results.testResults
      .flatMap((suite) => suite.assertionResults)
      .map((assertion) => assertion.fullName);

    for (const requiredName of requiredTestNames) {
      expect(allAssertions).toContain(requiredName);
    }

    expect(results.numFailedTests).toBe(0);
  });
});
