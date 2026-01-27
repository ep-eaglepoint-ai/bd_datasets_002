using System;
using System.Diagnostics;
using System.IO;
using System.Linq;

var repoRoot = FindRepoRoot(AppContext.BaseDirectory);
if (repoRoot == null)
{
    Console.Error.WriteLine("Unable to locate repository root containing evaluation/evaluation.py.");
    return 2;
}

var evalScript = Path.Combine(repoRoot, "evaluation", "evaluation.py");

var outputDir = GetArgValue("--output-dir") ?? Path.Combine(repoRoot, "evaluation");
Directory.CreateDirectory(outputDir);

var psi = new ProcessStartInfo("python", $"\"{evalScript}\"")
{
    WorkingDirectory = repoRoot,
    RedirectStandardOutput = true,
    RedirectStandardError = true,
    UseShellExecute = false
};

psi.Environment["DJANGO_SETTINGS_MODULE"] = "resumable_uploads.settings";

using var process = Process.Start(psi);
if (process == null)
{
    Console.Error.WriteLine("Failed to start evaluation process.");
    return 2;
}

var stdOut = process.StandardOutput.ReadToEnd();
var stdErr = process.StandardError.ReadToEnd();
process.WaitForExit();

Console.WriteLine(stdOut);
if (!string.IsNullOrWhiteSpace(stdErr))
{
    Console.Error.WriteLine(stdErr);
}

return process.ExitCode;

string? GetArgValue(string name)
{
    for (var i = 0; i < args.Length - 1; i++)
    {
        if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
        {
            return args[i + 1];
        }
    }
    return null;
}

string? FindRepoRoot(string startPath)
{
    var current = new DirectoryInfo(startPath);
    for (var i = 0; i < 8 && current != null; i++)
    {
        var candidate = Path.Combine(current.FullName, "evaluation", "evaluation.py");
        if (File.Exists(candidate))
        {
            return current.FullName;
        }
        current = current.Parent;
    }
    return null;
}
