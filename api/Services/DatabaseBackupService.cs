using System.Diagnostics;
using Npgsql;

namespace QuestRoomApi.Services;

public record DatabaseBackupResult(bool Success, string Message, string? FileName, string? FilePath);

public interface IDatabaseBackupService
{
    Task<DatabaseBackupResult> CreateBackupAsync(CancellationToken cancellationToken);
}

public class DatabaseBackupService : IDatabaseBackupService
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<DatabaseBackupService> _logger;

    public DatabaseBackupService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<DatabaseBackupService> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<DatabaseBackupResult> CreateBackupAsync(CancellationToken cancellationToken)
    {
        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return new DatabaseBackupResult(false, "Строка подключения к базе данных не настроена.", null, null);
        }

        NpgsqlConnectionStringBuilder builder;
        try
        {
            builder = new NpgsqlConnectionStringBuilder(connectionString);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Invalid database connection string.");
            return new DatabaseBackupResult(false, "Некорректная строка подключения к базе данных.", null, null);
        }

        if (string.IsNullOrWhiteSpace(builder.Host) ||
            string.IsNullOrWhiteSpace(builder.Database) ||
            string.IsNullOrWhiteSpace(builder.Username))
        {
            return new DatabaseBackupResult(
                false,
                "Не удалось определить параметры базы данных для резервного копирования.",
                null,
                null);
        }

        var backupDirectory = Path.Combine(_environment.ContentRootPath, "backups");
        Directory.CreateDirectory(backupDirectory);

        var timestamp = DateTimeOffset.Now.ToString("ddMMyyyyHHmm");
        var fileName = $"questroom_{timestamp}.backup";
        var filePath = Path.Combine(backupDirectory, fileName);
        var pgDumpPath = _configuration["DatabaseBackup:PgDumpPath"];
        var pgDumpExecutable = ResolvePgDumpExecutable(pgDumpPath);

        if (!string.IsNullOrWhiteSpace(pgDumpPath) && !File.Exists(pgDumpPath))
        {
            return new DatabaseBackupResult(
                false,
                $"Не найден pg_dump по пути: {pgDumpPath}. Укажите корректный путь в настройке DatabaseBackup:PgDumpPath.",
                null,
                null);
        }

        var arguments = string.Join(
            " ",
            "--format=custom",
            "--no-owner",
            "--no-privileges",
            $"--file=\"{filePath}\"",
            $"--host=\"{builder.Host}\"",
            $"--port=\"{builder.Port}\"",
            $"--username=\"{builder.Username}\"",
            $"\"{builder.Database}\"");

        var startInfo = new ProcessStartInfo
        {
            FileName = pgDumpExecutable,
            Arguments = arguments,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        if (!string.IsNullOrWhiteSpace(builder.Password))
        {
            startInfo.Environment["PGPASSWORD"] = builder.Password;
        }

        try
        {
            using var process = new Process { StartInfo = startInfo };
            if (!process.Start())
            {
                return new DatabaseBackupResult(false, "Не удалось запустить pg_dump.", null, null);
            }

            var outputTask = process.StandardOutput.ReadToEndAsync();
            var errorTask = process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync(cancellationToken);

            var output = await outputTask;
            var error = await errorTask;

            if (process.ExitCode != 0)
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }

                var details = string.IsNullOrWhiteSpace(error) ? output : error;
                var message = string.IsNullOrWhiteSpace(details)
                    ? "pg_dump завершился с ошибкой."
                    : details.Trim();

                _logger.LogError("Database backup failed: {Message}", message);

                return new DatabaseBackupResult(
                    false,
                    $"Не удалось создать резервную копию: {message}",
                    null,
                    null);
            }
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            _logger.LogError(ex, "Failed to start pg_dump.");
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }

            return new DatabaseBackupResult(
                false,
                "pg_dump не найден. Установите PostgreSQL client tools и добавьте pg_dump в PATH или укажите полный путь в настройке DatabaseBackup:PgDumpPath.",
                null,
                null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create database backup.");
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }

            return new DatabaseBackupResult(
                false,
                "Не удалось создать резервную копию базы данных.",
                null,
                null);
        }

        return new DatabaseBackupResult(
            true,
            $"Резервная копия сохранена в backups/{fileName}.",
            fileName,
            filePath);
    }

    private static string ResolvePgDumpExecutable(string? configuredPath)
    {
        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            return configuredPath;
        }

        var detectedPath = FindPgDumpFromWellKnownLocations();
        return string.IsNullOrWhiteSpace(detectedPath) ? "pg_dump" : detectedPath;
    }

    private static string? FindPgDumpFromWellKnownLocations()
    {
        if (OperatingSystem.IsWindows())
        {
            var candidates = new List<string>();
            var programFiles = Environment.GetEnvironmentVariable("PROGRAMFILES");
            var programFilesX86 = Environment.GetEnvironmentVariable("PROGRAMFILES(X86)");

            foreach (var basePath in new[] { programFiles, programFilesX86 })
            {
                if (string.IsNullOrWhiteSpace(basePath))
                {
                    continue;
                }

                var postgresRoot = Path.Combine(basePath, "PostgreSQL");
                if (!Directory.Exists(postgresRoot))
                {
                    continue;
                }

                foreach (var dir in Directory.GetDirectories(postgresRoot))
                {
                    var candidate = Path.Combine(dir, "bin", "pg_dump.exe");
                    if (File.Exists(candidate))
                    {
                        candidates.Add(candidate);
                    }
                }
            }

            return PickHighestVersionPath(candidates);
        }

        var unixCandidates = new List<string>
        {
            "/usr/bin/pg_dump",
            "/usr/local/bin/pg_dump",
            "/opt/homebrew/bin/pg_dump"
        };

        var postgresLibRoot = "/usr/lib/postgresql";
        if (Directory.Exists(postgresLibRoot))
        {
            foreach (var dir in Directory.GetDirectories(postgresLibRoot))
            {
                var candidate = Path.Combine(dir, "bin", "pg_dump");
                if (File.Exists(candidate))
                {
                    unixCandidates.Add(candidate);
                }
            }
        }

        return unixCandidates.FirstOrDefault(File.Exists);
    }

    private static string? PickHighestVersionPath(IEnumerable<string> candidates)
    {
        return candidates
            .Select(path => new { path, version = ExtractVersionFromPath(path) })
            .OrderByDescending(item => item.version)
            .Select(item => item.path)
            .FirstOrDefault();
    }

    private static Version ExtractVersionFromPath(string path)
    {
        var directory = Path.GetFileName(Path.GetDirectoryName(path) ?? string.Empty) ?? string.Empty;
        var cleaned = new string(directory.Where(ch => char.IsDigit(ch) || ch == '.').ToArray());
        return Version.TryParse(cleaned, out var version) ? version : new Version(0, 0);
    }
}
