using System.Net;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IEmailNotificationService
{
    Task SendBookingNotificationsAsync(Booking booking);
    Task SendCertificateOrderNotificationsAsync(CertificateOrder order);
}

public class EmailNotificationService : IEmailNotificationService
{
    private readonly AppDbContext _context;
    private readonly ILogger<EmailNotificationService> _logger;

    public EmailNotificationService(AppDbContext context, ILogger<EmailNotificationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SendBookingNotificationsAsync(Booking booking)
    {
        var settings = await GetSettingsAsync();
        if (settings == null)
        {
            return;
        }

        var subject = $"Новая бронь: {booking.CustomerName}";
        var bookingDate = booking.BookingDate.ToString("dd.MM.yyyy");
        var bookingTime = booking.QuestSchedule?.TimeSlot.ToString("HH:mm");
        var bookingDateTime = string.IsNullOrWhiteSpace(bookingTime)
            ? bookingDate
            : $"{bookingDate} {bookingTime}";

        var body = $"""
                    <p>Поступила новая бронь.</p>
                    <ul>
                      <li><strong>Имя:</strong> {booking.CustomerName}</li>
                      <li><strong>Телефон:</strong> {booking.CustomerPhone}</li>
                      <li><strong>Email:</strong> {booking.CustomerEmail ?? "не указан"}</li>
                      <li><strong>Дата:</strong> {bookingDateTime}</li>
                      <li><strong>Участников:</strong> {booking.ParticipantsCount}</li>
                      <li><strong>Статус:</strong> {booking.Status}</li>
                      <li><strong>Комментарий:</strong> {booking.Notes ?? "нет"}</li>
                    </ul>
                    """;

        await SendConfiguredEmailsAsync(
            settings,
            settings.NotifyBookingAdmin,
            settings.NotifyBookingCustomer,
            booking.CustomerEmail,
            subject,
            body);
    }

    public async Task SendCertificateOrderNotificationsAsync(CertificateOrder order)
    {
        var settings = await GetSettingsAsync();
        if (settings == null)
        {
            return;
        }

        var subject = $"Заявка на сертификат: {order.CertificateTitle}";
        var body = $"""
                    <p>Новая заявка на сертификат.</p>
                    <ul>
                      <li><strong>Сертификат:</strong> {order.CertificateTitle}</li>
                      <li><strong>Имя:</strong> {order.CustomerName}</li>
                      <li><strong>Телефон:</strong> {order.CustomerPhone}</li>
                      <li><strong>Email:</strong> {order.CustomerEmail ?? "не указан"}</li>
                      <li><strong>Статус:</strong> {order.Status}</li>
                      <li><strong>Комментарий:</strong> {order.Notes ?? "нет"}</li>
                    </ul>
                    """;

        await SendConfiguredEmailsAsync(
            settings,
            settings.NotifyCertificateAdmin,
            settings.NotifyCertificateCustomer,
            order.CustomerEmail,
            subject,
            body);
    }

    private async Task<Settings?> GetSettingsAsync()
    {
        return await _context.Settings.AsNoTracking().FirstOrDefaultAsync();
    }

    private async Task SendConfiguredEmailsAsync(
        Settings settings,
        bool notifyAdmin,
        bool notifyCustomer,
        string? customerEmail,
        string subject,
        string body)
    {
        if (!HasSmtpConfiguration(settings))
        {
            _logger.LogWarning("Email notifications skipped: SMTP settings are not configured.");
            return;
        }

        if (notifyAdmin)
        {
            var adminRecipients = ParseRecipients(settings.NotificationEmail ?? settings.Email);
            foreach (var recipient in adminRecipients)
            {
                await SendEmailAsync(settings, recipient, subject, body);
            }
        }

        if (notifyCustomer && !string.IsNullOrWhiteSpace(customerEmail))
        {
            await SendEmailAsync(settings, customerEmail, subject, body);
        }
    }

    private async Task SendEmailAsync(Settings settings, string recipient, string subject, string body)
    {
        var fromEmail = settings.SmtpFromEmail
            ?? settings.NotificationEmail
            ?? settings.Email
            ?? settings.SmtpUser;

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            _logger.LogWarning("Email notifications skipped: sender email is not configured.");
            return;
        }

        var fromName = string.IsNullOrWhiteSpace(settings.SmtpFromName)
            ? "Quest Room"
            : settings.SmtpFromName;

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };

        message.To.Add(recipient);

        using var client = new SmtpClient(settings.SmtpHost!, settings.SmtpPort ?? 25)
        {
            EnableSsl = settings.SmtpUseSsl
        };

        if (!string.IsNullOrWhiteSpace(settings.SmtpUser))
        {
            client.Credentials = new NetworkCredential(settings.SmtpUser, settings.SmtpPassword);
        }

        try
        {
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Recipient}.", recipient);
        }
    }

    private static bool HasSmtpConfiguration(Settings settings)
    {
        return !string.IsNullOrWhiteSpace(settings.SmtpHost);
    }

    private static IEnumerable<string> ParseRecipients(string? recipients)
    {
        if (string.IsNullOrWhiteSpace(recipients))
        {
            return Array.Empty<string>();
        }

        return recipients
            .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(email => email.Trim())
            .Where(email => !string.IsNullOrWhiteSpace(email));
    }
}
