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

        var bookingDetails = await _context.Bookings
            .Include(b => b.Quest)
            .Include(b => b.QuestSchedule)
            .Include(b => b.ExtraServices)
            .FirstOrDefaultAsync(b => b.Id == booking.Id) ?? booking;

        var subject = $"Новая бронь: {bookingDetails.CustomerName}";
        var bookingDate = bookingDetails.BookingDate.ToString("dd.MM.yyyy");
        var bookingTime = bookingDetails.QuestSchedule?.TimeSlot.ToString("HH:mm");
        var bookingDateTime = string.IsNullOrWhiteSpace(bookingTime)
            ? bookingDate
            : $"{bookingDate} {bookingTime}";

        var extraServicesHtml = bookingDetails.ExtraServices.Count == 0
            ? "нет"
            : $"<ul>{string.Join("", bookingDetails.ExtraServices.Select(service => $"<li>{service.Title} — {service.Price} ₽</li>"))}</ul>";
        var extraServicesText = bookingDetails.ExtraServices.Count == 0
            ? "нет"
            : string.Join(", ", bookingDetails.ExtraServices.Select(service => $"{service.Title} — {service.Price} ₽"));

        var tokens = new Dictionary<string, string>
        {
            ["customerName"] = bookingDetails.CustomerName,
            ["customerPhone"] = bookingDetails.CustomerPhone,
            ["customerEmail"] = bookingDetails.CustomerEmail ?? "не указан",
            ["bookingDate"] = bookingDate,
            ["bookingTime"] = bookingTime ?? string.Empty,
            ["bookingDateTime"] = bookingDateTime,
            ["participantsCount"] = bookingDetails.ParticipantsCount.ToString(),
            ["extraParticipantsCount"] = bookingDetails.ExtraParticipantsCount.ToString(),
            ["questTitle"] = bookingDetails.Quest?.Title ?? "не указан",
            ["totalPrice"] = bookingDetails.TotalPrice.ToString(),
            ["status"] = bookingDetails.Status,
            ["notes"] = bookingDetails.Notes ?? "нет",
            ["extraServices"] = extraServicesHtml,
            ["extraServicesText"] = extraServicesText
        };

        var defaultBody = $"""
                          <p>Поступила новая бронь.</p>
                          <ul>
                            <li><strong>Квест:</strong> {tokens["questTitle"]}</li>
                            <li><strong>Имя:</strong> {tokens["customerName"]}</li>
                            <li><strong>Телефон:</strong> {tokens["customerPhone"]}</li>
                            <li><strong>Email:</strong> {tokens["customerEmail"]}</li>
                            <li><strong>Дата:</strong> {tokens["bookingDateTime"]}</li>
                            <li><strong>Участников:</strong> {tokens["participantsCount"]}</li>
                            <li><strong>Доп. участники:</strong> {tokens["extraParticipantsCount"]}</li>
                            <li><strong>Доп. услуги:</strong> {tokens["extraServicesText"]}</li>
                            <li><strong>Итого:</strong> {tokens["totalPrice"]} ₽</li>
                            <li><strong>Статус:</strong> {tokens["status"]}</li>
                            <li><strong>Комментарий:</strong> {tokens["notes"]}</li>
                          </ul>
                          """;

        var adminBody = ApplyTemplate(settings.BookingEmailTemplateAdmin, tokens, defaultBody);
        var customerBody = ApplyTemplate(settings.BookingEmailTemplateCustomer, tokens, defaultBody);

        await SendConfiguredEmailsAsync(
            settings,
            settings.NotifyBookingAdmin,
            settings.NotifyBookingCustomer,
            bookingDetails.CustomerEmail,
            subject,
            adminBody,
            customerBody);
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
            body,
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
        string adminBody,
        string customerBody)
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
                await SendEmailAsync(settings, recipient, subject, adminBody);
            }
        }

        if (notifyCustomer && !string.IsNullOrWhiteSpace(customerEmail))
        {
            await SendEmailAsync(settings, customerEmail, subject, customerBody);
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

    private static string ApplyTemplate(string? template, Dictionary<string, string> tokens, string fallback)
    {
        if (string.IsNullOrWhiteSpace(template))
        {
            return fallback;
        }

        var result = template;
        foreach (var (key, value) in tokens)
        {
            result = result.Replace($"{{{{{key}}}}}", value, StringComparison.OrdinalIgnoreCase);
        }

        return result;
    }
}
