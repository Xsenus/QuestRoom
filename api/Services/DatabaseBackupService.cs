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
        var pgDumpExecutable = string.IsNullOrWhiteSpace(pgDumpPath) ? "pg_dump" : pgDumpPath;

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
}
