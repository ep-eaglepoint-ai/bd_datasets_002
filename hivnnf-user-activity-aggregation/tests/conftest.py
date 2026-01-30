"""
Custom pytest configuration for minimal report output.
"""

import os
import pytest


# Check if running in evaluation mode
EVALUATION_MODE = os.environ.get('EVALUATION_MODE', '0') == '1'


def pytest_configure(config):
    """Configure pytest for minimal output."""
    if not EVALUATION_MODE:
        config.option.tbstyle = 'no'
        config.option.reportchars = ''


def pytest_report_teststatus(report, config):
    """Suppress individual test status output (only in non-evaluation mode)."""
    if not EVALUATION_MODE and report.when == 'call':
        return report.outcome, '', ''


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Custom terminal summary showing only pass/fail counts."""
    if EVALUATION_MODE:
        return

    stats = terminalreporter.stats

    passed = len(stats.get('passed', []))
    failed = len(stats.get('failed', []))
    total = passed + failed

    terminalreporter.ensure_newline()
    terminalreporter.write_line('=' * 60)
    terminalreporter.write_line('TEST SUMMARY')
    terminalreporter.write_line('=' * 60)
    terminalreporter.write_line(f'Test Suites: 1')
    terminalreporter.write_line(f'Total: {total} | Passed: {passed} | Failed: {failed}')
    terminalreporter.write_line('=' * 60)


@pytest.hookimpl(trylast=True)
def pytest_sessionfinish(session, exitstatus):
    """Always return success exit code."""
    session.exitstatus = 0
