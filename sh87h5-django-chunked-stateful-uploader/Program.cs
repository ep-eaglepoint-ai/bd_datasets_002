using System;
using System.Diagnostics;
using System.IO;

var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));
var djangoRoot = Path.Combine(repoRoot, "repository_after");
var managePy = Path.Combine(djangoRoot, "manage.py");

Console.WriteLine("Django Chunked Uploader Launcher");
Console.WriteLine("--------------------------------");
Console.WriteLine("Commands: runserver, test, help, exit");

while (true)
{
    Console.Write("\nCommand (runserver/test/help/exit): ");
    var command = Console.ReadLine()?.Trim().ToLowerInvariant();

    switch (command)
    {
        case "runserver":
            RunDjangoCommand("runserver 0.0.0.0:8000");
            break;
        case "test":
            RunDjangoCommand("test chunkuploader");
            break;
        case "help":
            PrintHelp();
            break;
        case "exit":
            Console.WriteLine("Bye!");
            return;
        default:
            Console.WriteLine("Unknown command. Type 'help' for instructions.");
            break;
    }
}

void RunDjangoCommand(string args)
{
    if (!File.Exists(managePy))
    {
        Console.WriteLine($"manage.py not found at {managePy}. Ensure repository_after exists.");
        return;
    }

    var psi = new ProcessStartInfo("python", $"manage.py {args}")
    {
        UseShellExecute = false,
        RedirectStandardInput = false,
        RedirectStandardOutput = false,
        RedirectStandardError = false,
        WorkingDirectory = djangoRoot
    };

    psi.Environment["DJANGO_SETTINGS_MODULE"] = "resumable_uploads.settings";

    Console.WriteLine($"\nRunning: python manage.py {args}");
    using var process = Process.Start(psi);
    process?.WaitForExit();
    Console.WriteLine($"\nCommand finished with exit code {process?.ExitCode ?? -1}.");
}

void PrintHelp()
{
    Console.WriteLine(@"
runserver - Starts Django dev server on 0.0.0.0:8000.
test      - Runs Django tests for chunkuploader.
exit      - Close the launcher.

You can also run commands manually:
    cd repository_after
    python manage.py runserver 0.0.0.0:8000
    python manage.py test chunkuploader
");
}