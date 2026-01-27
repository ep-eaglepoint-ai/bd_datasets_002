using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using Xunit;

namespace tests;

[CollectionDefinition("ChunkUploaderIntegration", DisableParallelization = true)]
public sealed class ChunkUploaderIntegrationCollectionDefinition
{
}

[Collection("ChunkUploaderIntegration")]
public sealed class RepositoryAfterChunkedUploaderTests : IAsyncLifetime
{
    private string _repoRoot = string.Empty;
    private string _chunkDir = string.Empty;
    private string _finalDir = string.Empty;

    public Task InitializeAsync()
    {
        _repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));
        _chunkDir = Path.Combine(Path.GetTempPath(), $"chunk_uploads_{Guid.NewGuid():N}");
        _finalDir = Path.Combine(Path.GetTempPath(), $"final_uploads_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_chunkDir);
        Directory.CreateDirectory(_finalDir);
        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        TryDeleteDirectory(_chunkDir);
        TryDeleteDirectory(_finalDir);
        return Task.CompletedTask;
    }

    [Fact]
    public async Task RepositoryAfter_DjangoTestSuite_Passes()
    {
        var environment = new Dictionary<string, string>
        {
            ["DJANGO_SETTINGS_MODULE"] = "resumable_uploads.settings",
            ["CHUNK_UPLOAD_DIR"] = _chunkDir,
            ["FINAL_UPLOAD_DIR"] = _finalDir
        };

        var result = await RunProcessAsync(
            fileName: "python",
            arguments: "manage.py test chunkuploader",
            workingDirectory: Path.Combine(_repoRoot, "repository_after"),
            environment);

        Assert.True(
            result.ExitCode == 0,
            $"Django tests failed. ExitCode={result.ExitCode}\nSTDOUT:\n{result.StandardOutput}\nSTDERR:\n{result.StandardError}");
    }

    private static async Task<ProcessResult> RunProcessAsync(
        string fileName,
        string arguments,
        string workingDirectory,
        IReadOnlyDictionary<string, string> environment)
    {
        var psi = new ProcessStartInfo(fileName, arguments)
        {
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        foreach (var kvp in environment)
        {
            psi.Environment[kvp.Key] = kvp.Value;
        }

        using var process = Process.Start(psi);
        if (process == null)
        {
            throw new InvalidOperationException("Failed to start process.");
        }

        var stdOut = await process.StandardOutput.ReadToEndAsync();
        var stdErr = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        return new ProcessResult(process.ExitCode, stdOut, stdErr);
    }

    private static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch
        {
            // Ignore cleanup failures.
        }
    }

    private readonly record struct ProcessResult(int ExitCode, string StandardOutput, string StandardError);
}
