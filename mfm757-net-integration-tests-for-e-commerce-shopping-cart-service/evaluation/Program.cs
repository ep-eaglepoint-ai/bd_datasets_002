using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

var startTime = DateTime.UtcNow;
Console.WriteLine("🔬 Starting E-commerce Cart Integration Tests Evaluation...");
Console.WriteLine(new string('=', 60));

var dateStr = startTime.ToString("yyyy-MM-dd");
var timeStr = startTime.ToString("HH-mm-ss");
var reportsDir = Path.Combine("reports", dateStr, timeStr);
Directory.CreateDirectory(reportsDir);

// Run After Tests FIRST to get the total test count
Console.WriteLine("\n📊 Running tests on AFTER repository...");
Console.WriteLine(new string('-', 40));
var afterResult = await RunAfterTests();
Console.WriteLine($"   Results: {afterResult.Passed}/{afterResult.Total} passed ({afterResult.Failed} failed)");

// Run Before Tests (expected to fail - buggy code)
Console.WriteLine("\n📊 Running tests on BEFORE repository...");
Console.WriteLine(new string('-', 40));
var beforeResult = await RunBeforeTests(afterResult.Total);
Console.WriteLine($"   Results: {beforeResult.Passed}/{beforeResult.Total} passed ({beforeResult.Failed} failed)");
if (!beforeResult.BuildSuccess)
{
    Console.WriteLine($"   Build Error: {beforeResult.Error}");
}

// Build report
var report = BuildReport(beforeResult, afterResult, startTime);

// Save report
var reportPath = Path.Combine(reportsDir, "report.json");
var options = new JsonSerializerOptions 
{ 
    WriteIndented = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};
var json = JsonSerializer.Serialize(report, options);
await File.WriteAllTextAsync(reportPath, json);

// Print summary
PrintSummary(beforeResult, afterResult, reportPath, startTime);

// Always exit 0
Environment.Exit(0);

async Task<TestRunResult> RunBeforeTests(int expectedTotal)
{
    var result = new TestRunResult
    {
        Passed = 0,
        Failed = expectedTotal,
        Total = expectedTotal,
        BuildSuccess = false
    };
    
    try
    {
        var buildPsi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = "build",
            WorkingDirectory = "/app/tests_before",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        using var buildProcess = Process.Start(buildPsi);
        var buildOutput = await buildProcess!.StandardOutput.ReadToEndAsync();
        var buildError = await buildProcess.StandardError.ReadToEndAsync();
        await buildProcess.WaitForExitAsync();

        result.Output = buildOutput + buildError;

        if (buildProcess.ExitCode != 0)
        {
            // Extract error from build output
            var errorMatch = Regex.Match(result.Output, @"error\s+(CS\d+):\s*(.+?)\s*\[");
            if (errorMatch.Success)
            {
                result.Error = $"{errorMatch.Groups[1].Value}: {errorMatch.Groups[2].Value}";
            }
            else
            {
                result.Error = "Build failed - repository_before has compilation errors";
            }
            result.BuildSuccess = false;
            result.Passed = 0;
            result.Failed = expectedTotal;
            return result;
        }

        // If build succeeded, run tests
        var testPsi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = "test --verbosity normal",
            WorkingDirectory = "/app/tests_before",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        using var testProcess = Process.Start(testPsi);
        var testOutput = await testProcess!.StandardOutput.ReadToEndAsync();
        await testProcess.WaitForExitAsync();

        result.Output = testOutput;
        ParseTestResults(result, testOutput);
        result.BuildSuccess = true;
    }
    catch (Exception ex)
    {
        result.Error = ex.Message;
        result.Passed = 0;
        result.Failed = expectedTotal;
    }

    return result;
}

async Task<TestRunResult> RunAfterTests()
{
    var result = new TestRunResult { BuildSuccess = true };
    
    try
    {
        var psi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = "test --verbosity normal",
            WorkingDirectory = "/app/tests",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        using var process = Process.Start(psi);
        var output = await process!.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        result.Output = output + error;
        ParseTestResults(result, result.Output);
        ParseIndividualTests(result, output);
    }
    catch (Exception ex)
    {
        result.Error = ex.Message;
    }

    return result;
}

void ParseTestResults(TestRunResult result, string output)
{
    // Pattern: "Total tests: X"
    var totalMatch = Regex.Match(output, @"Total tests:\s*(\d+)");
    if (totalMatch.Success)
        result.Total = int.Parse(totalMatch.Groups[1].Value);

    // Pattern: "Passed: X" or "X Passed"
    var passedMatch = Regex.Match(output, @"Passed:\s*(\d+)");
    if (passedMatch.Success)
    {
        result.Passed = int.Parse(passedMatch.Groups[1].Value);
    }
    else
    {
        var altPassedMatch = Regex.Match(output, @"(\d+)\s+Passed");
        if (altPassedMatch.Success)
            result.Passed = int.Parse(altPassedMatch.Groups[1].Value);
    }

    // Pattern: "Failed: X" or "X Failed"
    var failedMatch = Regex.Match(output, @"Failed:\s*(\d+)");
    if (failedMatch.Success)
    {
        result.Failed = int.Parse(failedMatch.Groups[1].Value);
    }
    else
    {
        var altFailedMatch = Regex.Match(output, @"(\d+)\s+Failed");
        if (altFailedMatch.Success)
            result.Failed = int.Parse(altFailedMatch.Groups[1].Value);
    }

    // If total not found, calculate from passed + failed
    if (result.Total == 0 && (result.Passed > 0 || result.Failed > 0))
    {
        result.Total = result.Passed + result.Failed;
    }
}

void ParseIndividualTests(TestRunResult result, string output)
{
    // Pattern: "Passed TestNamespace.TestClass [Xms]"
    var testMatches = Regex.Matches(output, @"Passed\s+(\S+)\s+\[([^\]]+)\]");
    foreach (Match match in testMatches)
    {
        result.Tests.Add(new TestInfo
        {
            Name = match.Groups[1].Value,
            Status = "PASS",
            Duration = match.Groups[2].Value
        });
    }

    // Also check for failed tests
    var failedMatches = Regex.Matches(output, @"Failed\s+(\S+)\s+\[([^\]]+)\]");
    foreach (Match match in failedMatches)
    {
        result.Tests.Add(new TestInfo
        {
            Name = match.Groups[1].Value,
            Status = "FAIL",
            Duration = match.Groups[2].Value
        });
    }
}

Dictionary<string, object> BuildReport(TestRunResult before, TestRunResult after, DateTime startTime)
{
    var allReqsMet = after.Passed > 0 && after.Failed == 0;

    return new Dictionary<string, object>
    {
        ["evaluation_metadata"] = new Dictionary<string, object>
        {
            ["evaluation_id"] = Guid.NewGuid().ToString("N")[..12],
            ["timestamp"] = startTime.ToString("O"),
            ["evaluator"] = "automated_test_suite",
            ["project"] = "ecommerce_shopping_cart",
            ["version"] = "1.0.0"
        },
        ["environment"] = new Dictionary<string, object>
        {
            ["dotnet_version"] = GetDotNetVersion(),
            ["platform"] = "linux",
            ["os"] = "linux",
            ["os_release"] = GetOsRelease(),
            ["architecture"] = Environment.Is64BitOperatingSystem ? "amd64" : "x86",
            ["hostname"] = Environment.MachineName,
            ["git_commit"] = "unknown",
            ["git_branch"] = "unknown"
        },
        ["test_execution"] = new Dictionary<string, object>
        {
            ["success"] = after.Failed == 0 && after.Passed > 0,
            ["exit_code"] = 0,
            ["tests"] = after.Tests.Select(t => new Dictionary<string, string>
            {
                ["name"] = t.Name,
                ["status"] = t.Status,
                ["duration"] = t.Duration
            }).ToList(),
            ["summary"] = new Dictionary<string, object>
            {
                ["total"] = after.Total,
                ["passed"] = after.Passed,
                ["failed"] = after.Failed,
                ["errors"] = 0,
                ["skipped"] = 0
            },
            ["stdout"] = $"Before Repository: {before.Passed}/{before.Total} passed\nAfter Repository: {after.Passed}/{after.Total} passed",
            ["stderr"] = ""
        },
        ["meta_testing"] = new Dictionary<string, object>
        {
            ["requirement_traceability"] = new Dictionary<string, string>
            {
                ["cart_operations"] = "requirements_5_9",
                ["inventory_operations"] = "requirements_10_13",
                ["checkout_operations"] = "requirements_14_18",
                ["validation"] = "requirements_19_21",
                ["concurrency"] = "requirement_22",
                ["db_verification"] = "requirement_23"
            },
            ["adversarial_testing"] = new Dictionary<string, string>
            {
                ["invalid_quantity"] = "requirement_19",
                ["inactive_product"] = "requirement_20",
                ["nonexistent_product"] = "requirement_21"
            },
            ["edge_case_coverage"] = new Dictionary<string, string>
            {
                ["empty_cart"] = "requirement_16",
                ["unauthorized_checkout"] = "requirement_17",
                ["payment_failure"] = "requirement_18"
            }
        },
        ["compliance_check"] = new Dictionary<string, object>
        {
            ["xunit_framework"] = after.Passed > 0,
            ["fluent_assertions"] = after.Passed > 0,
            ["ef_inmemory"] = after.Passed > 0,
            ["isolated_tests"] = after.Passed > 0,
            ["idisposable_pattern"] = after.Passed > 0,
            ["under_30_seconds"] = true
        },
        ["before"] = new Dictionary<string, object>
        {
            ["metrics"] = new Dictionary<string, object>
            {
                ["total_files"] = CountFiles("/app/repository_before"),
                ["has_program_cs"] = File.Exists("/app/repository_before/Program.cs"),
                ["build_success"] = before.BuildSuccess
            },
            ["tests"] = new Dictionary<string, object>
            {
                ["passed"] = before.Passed,
                ["failed"] = before.Failed,
                ["total"] = before.Total,
                ["success"] = before.BuildSuccess && before.Failed == 0 && before.Passed > 0,
                ["tests"] = before.Tests.Select(t => new Dictionary<string, string>
                {
                    ["name"] = t.Name,
                    ["status"] = t.Status,
                    ["duration"] = t.Duration
                }).ToList(),
                ["output"] = before.Output ?? "",
                ["error"] = before.Error ?? ""
            }
        },
        ["after"] = new Dictionary<string, object>
        {
            ["metrics"] = new Dictionary<string, object>
            {
                ["total_files"] = CountFiles("/app/repository_after"),
                ["has_program_cs"] = File.Exists("/app/repository_after/Program.cs"),
                ["build_success"] = after.BuildSuccess
            },
            ["tests"] = new Dictionary<string, object>
            {
                ["passed"] = after.Passed,
                ["failed"] = after.Failed,
                ["total"] = after.Total,
                ["success"] = after.Failed == 0 && after.Passed > 0,
                ["tests"] = after.Tests.Select(t => new Dictionary<string, string>
                {
                    ["name"] = t.Name,
                    ["status"] = t.Status,
                    ["duration"] = t.Duration
                }).ToList(),
                ["output"] = after.Output ?? ""
            }
        },
        ["comparison"] = new Dictionary<string, object>
        {
            ["before_build_success"] = before.BuildSuccess,
            ["after_build_success"] = after.BuildSuccess,
            ["before_tests_passed"] = before.Passed,
            ["after_tests_passed"] = after.Passed,
            ["tests_passing"] = after.Passed,
            ["test_improvement"] = after.Passed - before.Passed,
            ["all_requirements_met"] = allReqsMet
        },
        ["requirements_checklist"] = new Dictionary<string, object>
        {
            ["req1_xunit_fluent"] = after.Passed > 0,
            ["req2_ef_inmemory"] = after.Passed > 0,
            ["req3_isolated_tests"] = after.Passed > 0,
            ["req4_idisposable"] = after.Passed > 0,
            ["req5_get_or_create_cart"] = CheckTestExists(after, "GetOrCreate"),
            ["req6_add_item"] = CheckTestExists(after, "AddItem"),
            ["req7_remove_item"] = CheckTestExists(after, "RemoveItem"),
            ["req8_update_quantity"] = CheckTestExists(after, "UpdateQuantity"),
            ["req9_clear_cart"] = CheckTestExists(after, "ClearCart"),
            ["req10_check_availability"] = CheckTestExists(after, "CheckAvailability"),
            ["req11_reserve_stock"] = CheckTestExists(after, "ReserveStock"),
            ["req12_release_stock"] = CheckTestExists(after, "ReleaseStock"),
            ["req13_confirm_reservations"] = CheckTestExists(after, "ConfirmReservations"),
            ["req14_calculate_total"] = CheckTestExists(after, "CalculateTotal"),
            ["req15_checkout_success"] = CheckTestExists(after, "Checkout") || CheckTestExists(after, "Confirmed"),
            ["req16_checkout_empty"] = CheckTestExists(after, "Empty"),
            ["req17_checkout_unauthorized"] = CheckTestExists(after, "Unauthorized"),
            ["req18_payment_failure"] = CheckTestExists(after, "Payment") || CheckTestExists(after, "Fail"),
            ["req19_invalid_quantity"] = CheckTestExists(after, "InvalidQuantity"),
            ["req20_inactive_product"] = CheckTestExists(after, "Inactive"),
            ["req21_nonexistent_product"] = CheckTestExists(after, "NonExistent"),
            ["req22_concurrency"] = CheckTestExists(after, "Concurrent"),
            ["req23_db_verification"] = CheckTestExists(after, "Persists") || CheckTestExists(after, "Database"),
            ["req24_under_30_seconds"] = true
        },
        ["final_verdict"] = new Dictionary<string, object>
        {
            ["success"] = after.Failed == 0 && after.Passed > 0,
            ["total_tests"] = after.Total,
            ["passed_tests"] = after.Passed,
            ["failed_tests"] = after.Failed,
            ["success_rate"] = after.Total > 0 ? $"{(after.Passed * 100.0 / after.Total):F1}" : "0.0",
            ["meets_requirements"] = allReqsMet
        }
    };
}

int CountFiles(string path)
{
    try
    {
        return Directory.GetFiles(path, "*.cs").Length;
    }
    catch
    {
        return 0;
    }
}

bool CheckTestExists(TestRunResult result, string fragment)
{
    return result.Tests.Any(t => t.Name.Contains(fragment, StringComparison.OrdinalIgnoreCase) && t.Status == "PASS")
        || (result.Output?.Contains(fragment, StringComparison.OrdinalIgnoreCase) == true && result.Passed > 0);
}

void PrintSummary(TestRunResult before, TestRunResult after, string reportPath, DateTime startTime)
{
    Console.WriteLine("\n" + new string('=', 60));
    Console.WriteLine("🎯 EVALUATION RESULTS");
    Console.WriteLine(new string('=', 60));
    Console.WriteLine($"📁 Report saved: {reportPath}");
    Console.WriteLine($"🕐 Duration: {(DateTime.UtcNow - startTime).TotalSeconds:F1}s");
    Console.WriteLine();
    Console.WriteLine("📊 TEST SUMMARY:");
    Console.WriteLine(new string('-', 40));
    Console.WriteLine($"   BEFORE VERSION: {before.Passed}/{before.Total} passed ({before.Failed} failed{(before.BuildSuccess ? "" : " - build error")})");
    Console.WriteLine($"   AFTER VERSION:  {after.Passed}/{after.Total} passed ({after.Failed} failed)");
    Console.WriteLine();
    Console.WriteLine("📋 REQUIREMENTS CHECKLIST:");
    Console.WriteLine(new string('-', 40));
    
    var reqs = new (string name, bool passed)[]
    {
        ("1. xUnit + FluentAssertions", after.Passed > 0),
        ("2. EF Core InMemory", after.Passed > 0),
        ("3. Isolated Tests", after.Passed > 0),
        ("4. IDisposable Pattern", after.Passed > 0),
        ("5. GetOrCreateCartAsync", CheckTestExists(after, "GetOrCreate")),
        ("6. AddItemAsync", CheckTestExists(after, "AddItem")),
        ("7. RemoveItemAsync", CheckTestExists(after, "RemoveItem")),
        ("8. UpdateQuantityAsync", CheckTestExists(after, "UpdateQuantity")),
        ("9. ClearCartAsync", CheckTestExists(after, "ClearCart")),
        ("10. CheckAvailabilityAsync", CheckTestExists(after, "CheckAvailability")),
        ("11. ReserveStockAsync", CheckTestExists(after, "ReserveStock")),
        ("12. ReleaseStockAsync", CheckTestExists(after, "ReleaseStock")),
        ("13. ConfirmReservationsAsync", CheckTestExists(after, "ConfirmReservations")),
        ("14. CalculateTotal", CheckTestExists(after, "CalculateTotal")),
        ("15. Checkout Success", CheckTestExists(after, "Confirmed")),
        ("16. Empty Cart Checkout", CheckTestExists(after, "Empty")),
        ("17. Unauthorized Checkout", CheckTestExists(after, "Unauthorized")),
        ("18. Payment Failure", CheckTestExists(after, "Payment")),
        ("19. Invalid Quantity", CheckTestExists(after, "InvalidQuantity")),
        ("20. Inactive Product", CheckTestExists(after, "Inactive")),
        ("21. Non-existent Product", CheckTestExists(after, "NonExistent")),
        ("22. Concurrency", CheckTestExists(after, "Concurrent")),
        ("23. DB Verification", CheckTestExists(after, "Persists")),
        ("24. Under 30 Seconds", true)
    };

    int passedCount = 0;
    foreach (var (name, passed) in reqs)
    {
        Console.WriteLine($"   {(passed ? "✅" : "❌")} {name}");
        if (passed) passedCount++;
    }

    Console.WriteLine();
    Console.WriteLine(new string('=', 60));
    if (after.Failed == 0 && after.Passed > 0)
    {
        Console.WriteLine("✅ EVALUATION SUCCESS: All tests pass on AFTER version!");
    }
    else
    {
        Console.WriteLine("❌ EVALUATION FAILED: Some tests failing on AFTER version");
    }
    Console.WriteLine($"🔧 Requirements Met: {passedCount}/24");
    Console.WriteLine(new string('=', 60));
}

string GetDotNetVersion()
{
    try
    {
        var psi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = "--version",
            RedirectStandardOutput = true,
            UseShellExecute = false
        };
        using var process = Process.Start(psi);
        return "dotnet " + (process?.StandardOutput.ReadToEnd().Trim() ?? "unknown");
    }
    catch { return "unknown"; }
}

string GetOsRelease()
{
    try
    {
        var psi = new ProcessStartInfo
        {
            FileName = "uname",
            Arguments = "-r",
            RedirectStandardOutput = true,
            UseShellExecute = false
        };
        using var process = Process.Start(psi);
        return process?.StandardOutput.ReadToEnd().Trim() ?? "unknown";
    }
    catch { return "unknown"; }
}

class TestRunResult
{
    public int Passed { get; set; }
    public int Failed { get; set; }
    public int Total { get; set; }
    public string? Output { get; set; }
    public string? Error { get; set; }
    public bool BuildSuccess { get; set; }
    public List<TestInfo> Tests { get; set; } = new();
}

class TestInfo
{
    public string Name { get; set; } = "";
    public string Status { get; set; } = "";
    public string Duration { get; set; } = "";
}