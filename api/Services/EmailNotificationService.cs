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
    Task<TestEmailResult> SendTestEmailAsync();
    Task<TestEmailResult> SendTestEmailAsync(string recipientEmail);
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
            ["extraServicesText"] = extraServicesText,
            ["companyAddress"] = settings.Address ?? "не указан",
            ["companyPhone"] = settings.Phone ?? "не указан"
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

        var tokens = new Dictionary<string, string>
        {
            ["certificateTitle"] = order.CertificateTitle,
            ["customerName"] = order.CustomerName,
            ["customerPhone"] = order.CustomerPhone,
            ["customerEmail"] = order.CustomerEmail ?? "не указан",
            ["deliveryType"] = order.DeliveryType ?? "не указан",
            ["status"] = order.Status,
            ["notes"] = order.Notes ?? "нет",
            ["companyAddress"] = settings.Address ?? "не указан",
            ["companyPhone"] = settings.Phone ?? "не указан"
        };

        var adminDefaultBody = $"""
                                <p>Новая заявка на сертификат.</p>
                                <ul>
                                  <li><strong>Сертификат:</strong> {tokens["certificateTitle"]}</li>
                                  <li><strong>Имя:</strong> {tokens["customerName"]}</li>
                                  <li><strong>Телефон:</strong> {tokens["customerPhone"]}</li>
                                  <li><strong>Email:</strong> {tokens["customerEmail"]}</li>
                                  <li><strong>Тип доставки:</strong> {tokens["deliveryType"]}</li>
                                  <li><strong>Статус:</strong> {tokens["status"]}</li>
                                  <li><strong>Комментарий:</strong> {tokens["notes"]}</li>
                                </ul>
                                """;

        var customerDefaultBody = $"""
                                   <p>Спасибо за оформление сертификата!</p>
                                   <p>Мы получили вашу заявку на сертификат: <strong>{tokens["certificateTitle"]}</strong>.</p>
                                   <ul>
                                     <li><strong>Имя:</strong> {tokens["customerName"]}</li>
                                     <li><strong>Телефон:</strong> {tokens["customerPhone"]}</li>
                                     <li><strong>Email:</strong> {tokens["customerEmail"]}</li>
                                     <li><strong>Тип доставки:</strong> {tokens["deliveryType"]}</li>
                                   </ul>
                                   """;

        var adminBody = ApplyTemplate(settings.CertificateEmailTemplateAdmin, tokens, adminDefaultBody);
        var customerBody = ApplyTemplate(settings.CertificateEmailTemplateCustomer, tokens, customerDefaultBody);

        await SendConfiguredEmailsAsync(
            settings,
            settings.NotifyCertificateAdmin,
            settings.NotifyCertificateCustomer,
            order.CustomerEmail,
            subject,
            adminBody,
            customerBody);
    }

    public async Task<TestEmailResult> SendTestEmailAsync()
    {
        var settings = await GetSettingsAsync();
        if (settings == null)
        {
            return new TestEmailResult(false, "Настройки почты не найдены.");
        }

        if (!HasSmtpConfiguration(settings))
        {
            return new TestEmailResult(false, "SMTP не настроен. Укажите SMTP host.");
        }

        var senderEmail = GetSenderEmail(settings);
        if (string.IsNullOrWhiteSpace(senderEmail))
        {
            return new TestEmailResult(false, "Email отправителя не указан.");
        }

        var subject = "Тестовое письмо";
        var body = """
                   <p>Это тестовое письмо. Если вы его получили, то настройки SMTP работают корректно.</p>
                   """;
        var success = await SendEmailAsync(settings, senderEmail, subject, body);
        if (!success)
        {
            return new TestEmailResult(false, "Не удалось отправить тестовое письмо. Проверьте настройки SMTP.");
        }

        return new TestEmailResult(true, $"Тестовое письмо отправлено на {senderEmail}.");
    }

    public async Task<TestEmailResult> SendTestEmailAsync(string recipientEmail)
    {
        var settings = await GetSettingsAsync();
        if (settings == null)
        {
            return new TestEmailResult(false, "Настройки почты не найдены.");
        }

        if (!HasSmtpConfiguration(settings))
        {
            return new TestEmailResult(false, "SMTP не настроен. Укажите SMTP host.");
        }

        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            return new TestEmailResult(false, "Email получателя не указан.");
        }

        var subject = "Тестовое письмо";
        var body = """
                   <p>Это тестовое письмо. Если вы его получили, то настройки SMTP работают корректно.</p>
                   """;

        var success = await SendEmailAsync(settings, recipientEmail, subject, body);
        if (!success)
        {
            return new TestEmailResult(false, "Не удалось отправить тестовое письмо. Проверьте настройки SMTP.");
        }

        return new TestEmailResult(true, $"Тестовое письмо отправлено на {recipientEmail}.");
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

    private async Task<bool> SendEmailAsync(Settings settings, string recipient, string subject, string body)
    {
        var fromEmail = GetSenderEmail(settings);

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            _logger.LogWarning("Email notifications skipped: sender email is not configured.");
            return false;
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

        var smtpUser = string.IsNullOrWhiteSpace(settings.SmtpUser)
            ? fromEmail
            : settings.SmtpUser;

        if (!string.IsNullOrWhiteSpace(settings.SmtpPassword)
            || !string.IsNullOrWhiteSpace(settings.SmtpUser))
        {
            client.Credentials = new NetworkCredential(smtpUser, settings.SmtpPassword);
        }

        try
        {
            await client.SendMailAsync(message);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Recipient}.", recipient);
            return false;
        }
    }

    private static bool HasSmtpConfiguration(Settings settings)
    {
        return !string.IsNullOrWhiteSpace(settings.SmtpHost);
    }

    private static string? GetSenderEmail(Settings settings)
    {
        return settings.SmtpFromEmail
               ?? settings.NotificationEmail
               ?? settings.Email
               ?? settings.SmtpUser;
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

public readonly record struct TestEmailResult(bool Success, string Message);
