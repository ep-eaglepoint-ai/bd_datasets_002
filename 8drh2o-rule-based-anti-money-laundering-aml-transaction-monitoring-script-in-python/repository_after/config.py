"""Configuration module for AML package.

Contains configuration constants and types. Kept minimal and
import-safe for smoke testing.
"""

"""Configuration for AML rules and thresholds.

Only standard-library types are used. Values are intentionally
simple and configurable for the rule implementations.
"""

# Application metadata
APP_NAME = "aml_rule_engine"
VERSION = "0.0.0"

# Thresholds and lists for rules
# Transactions with amount >= this are considered large cash transactions
LARGE_CASH_TX_THRESHOLD = 10000.0

# Channels considered "cash" for LARGE_CASH_TX
CASH_CHANNELS = ["atm", "branch"]

# ROUND_AMOUNT: consider amounts that are exact multiples of this value
ROUND_AMOUNT_MODULO = 1000.0

# High-risk countries triggering HIGH_RISK_GEO
HIGH_RISK_COUNTRIES = ["NG", "PK", "IR", "KP"]

# High-risk channels triggering HIGH_RISK_CHANNEL
HIGH_RISK_CHANNELS = ["hawala", "informal"]

# Severity levels (simple labels)
SEVERITY_HIGH = "HIGH"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_LOW = "LOW"

# Severity ranking used for sorting: higher number => higher severity
SEVERITY_RANK = {
	SEVERITY_HIGH: 3,
	SEVERITY_MEDIUM: 2,
	SEVERITY_LOW: 1,
}

# Severity weights (configurable): used for risk scoring
SEVERITY_WEIGHTS = {
	SEVERITY_HIGH: 10.0,
	SEVERITY_MEDIUM: 5.0,
	SEVERITY_LOW: 1.0,
}

# Behavioral sliding-window settings (seconds)
BEHAVIOR_WINDOW_SECONDS = 3600  # 1 hour default

# STRUCTURING
STRUCTURING_SUM_THRESHOLD = 10000.0
STRUCTURING_MAX_SINGLE_TX = 10000.0
STRUCTURING_MIN_TX_COUNT = 2

# RAPID_FUNDS_MOVEMENT: number of distinct counterparties within window
RAPID_FUNDS_MOVEMENT_COUNT = 3

# FREQUENT_CASH_ACTIVITY: number of cash transactions within window
FREQUENT_CASH_ACTIVITY_COUNT = 5

