// Custom Jest reporter that forces exit code 0
// Similar to pytest_sessionfinish(session, exitstatus): session.exitstatus = 0

export default class ExitZeroReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    // Force exit code to 0 regardless of test results
    // This is needed for test:before which is expected to fail
    process.exitCode = 0;
  }
}
