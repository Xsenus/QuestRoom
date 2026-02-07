using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestRoomApi.Data;
using QuestRoomApi.Services;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicyName = "AllowFrontend";

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;

        // Если будут циклические ссылки в моделях (например, EF навигации) — можно включить:
        // options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Configure PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Если API стоит за HTTPS (прод) — оставляйте true (по умолчанию).
        // Если вы тестируете строго по HTTP — можно временно отключить:
        // options.RequireHttpsMetadata = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

            // Минимальный допуск по времени (на случай рассинхрона часов)
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IQuestService, QuestService>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IMirKvestovIntegrationService, MirKvestovIntegrationService>();
builder.Services.AddScoped<IApiRequestLogService, ApiRequestLogService>();
builder.Services.AddScoped<ICertificateOrderService, CertificateOrderService>();
builder.Services.AddScoped<IContentService, ContentService>();
builder.Services.AddScoped<IStandardExtraServiceService, StandardExtraServiceService>();
builder.Services.AddScoped<IPricingRuleService, PricingRuleService>();
builder.Services.AddScoped<IDatabaseInitializer, DatabaseInitializer>();
builder.Services.AddScoped<IEmailNotificationService, EmailNotificationService>();
builder.Services.AddScoped<IDatabaseBackupService, DatabaseBackupService>();
builder.Services.AddScoped<IUserPreferencesService, UserPreferencesService>();
builder.Services.AddScoped<IBlacklistService, BlacklistService>();
builder.Services.AddHttpClient();
builder.Services.AddHostedService<BookingStatusMonitorService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    var allowAnyOrigin = builder.Configuration.GetValue<bool>("Cors:AllowAnyOrigin");
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();

    options.AddPolicy(CorsPolicyName, policy =>
    {
        if (allowAnyOrigin)
        {
            policy
                .AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();

            // НЕЛЬЗЯ включать credentials вместе с AllowAnyOrigin:
            // policy.AllowCredentials();
        }
        else if (allowedOrigins is { Length: > 0 })
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader();

            // Обычно при JWT в заголовке Authorization credentials НЕ нужны:
            // policy.AllowCredentials();

            // Если у вас будет cookie-auth (или нужно отправлять cookies) — тогда раскомментируйте:
            // policy.AllowCredentials();
        }
        else
        {
            // Fallback for local dev
            policy.WithOrigins(
                    "http://localhost:5173",
                    "https://localhost:5173",
                    "http://localhost:3000",
                    "https://localhost:3000")
                .AllowAnyMethod()
                .AllowAnyHeader();

            // Обычно не нужно:
            // policy.AllowCredentials();
        }
    });
});

// Configure Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Quest Room API",
        Version = "v1",
        Description = "API для управления квест-комнатами"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    c.OperationFilter<QuestRoomApi.Swagger.FileUploadOperationFilter>();
});

var app = builder.Build();

// DB init
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<IDatabaseInitializer>();
    await initializer.InitializeAsync();
}

// Configure the HTTP request pipeline
var swaggerEnabled = builder.Configuration.GetValue<bool>("Swagger:Enabled");
if (app.Environment.IsDevelopment() || swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Если API работает строго за reverse-proxy (Nginx) и HTTPS терминируется на прокси,
// то иногда UseHttpsRedirection может мешать при неверных forwarded headers.
// Тогда либо настраивайте forwarded headers, либо временно отключайте редирект:
// app.UseHttpsRedirection();

app.UseHttpsRedirection();

app.UseCors(CorsPolicyName);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
