module auditlogger-tests

go 1.21

replace example.com/auditlogger => ../repository_before
replace example.com/auditlogger_after => ../repository_after

require (
	example.com/auditlogger v0.0.0-00010101000000-000000000000
	example.com/auditlogger_after v0.0.0-00010101000000-000000000000
)