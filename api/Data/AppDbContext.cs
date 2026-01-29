using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using QuestRoomApi.Models;

namespace QuestRoomApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Quest> Quests { get; set; }
    public DbSet<QuestExtraService> QuestExtraServices { get; set; }
    public DbSet<DurationBadge> DurationBadges { get; set; }
    public DbSet<QuestSchedule> QuestSchedules { get; set; }
    public DbSet<QuestPricingRule> QuestPricingRules { get; set; }
    public DbSet<QuestWeeklySlot> QuestWeeklySlots { get; set; }
    public DbSet<QuestScheduleOverride> QuestScheduleOverrides { get; set; }
    public DbSet<QuestScheduleOverrideSlot> QuestScheduleOverrideSlots { get; set; }
    public DbSet<QuestScheduleSettings> QuestScheduleSettings { get; set; }
    public DbSet<Booking> Bookings { get; set; }
    public DbSet<BookingExtraService> BookingExtraServices { get; set; }
    public DbSet<ImageAsset> ImageAssets { get; set; }
    public DbSet<Rule> Rules { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<Promotion> Promotions { get; set; }
    public DbSet<Certificate> Certificates { get; set; }
    public DbSet<CertificateOrder> CertificateOrders { get; set; }
    public DbSet<AboutInfo> AboutInfos { get; set; }
    public DbSet<Settings> Settings { get; set; }
    public DbSet<PromoCode> PromoCodes { get; set; }
    public DbSet<ProductionCalendarDay> ProductionCalendarDays { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Quest>()
            .HasIndex(q => q.Slug)
            .IsUnique();

        modelBuilder.Entity<QuestSchedule>()
            .HasOne(e => e.Quest)
            .WithMany()
            .HasForeignKey(e => e.QuestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestExtraService>()
            .HasOne(e => e.Quest)
            .WithMany(q => q.ExtraServices)
            .HasForeignKey(e => e.QuestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestSchedule>()
            .HasIndex(e => new { e.QuestId, e.Date, e.TimeSlot })
            .IsUnique();

        modelBuilder.Entity<QuestPricingRule>()
            .HasOne(e => e.Quest)
            .WithMany()
            .HasForeignKey(e => e.QuestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestWeeklySlot>()
            .HasOne(e => e.Quest)
            .WithMany()
            .HasForeignKey(e => e.QuestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestWeeklySlot>()
            .HasIndex(e => new { e.QuestId, e.DayOfWeek, e.TimeSlot })
            .IsUnique();

        modelBuilder.Entity<QuestScheduleOverride>()
            .HasOne(e => e.Quest)
            .WithMany()
            .HasForeignKey(e => e.QuestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestScheduleOverride>()
            .HasIndex(e => new { e.QuestId, e.Date })
            .IsUnique();

        modelBuilder.Entity<QuestScheduleOverrideSlot>()
            .HasOne(e => e.Override)
            .WithMany(o => o.Slots)
            .HasForeignKey(e => e.OverrideId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestScheduleOverrideSlot>()
            .HasIndex(e => new { e.OverrideId, e.TimeSlot })
            .IsUnique();

        modelBuilder.Entity<QuestScheduleSettings>()
            .HasOne(e => e.Quest)
            .WithMany()
            .HasForeignKey(e => e.QuestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuestScheduleSettings>()
            .HasIndex(e => e.QuestId)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(e => e.Email)
            .IsUnique();

        modelBuilder.Entity<Role>()
            .HasIndex(e => e.Code)
            .IsUnique();

        modelBuilder.Entity<Role>()
            .Property(e => e.Permissions)
            .HasConversion(
                permissions => System.Text.Json.JsonSerializer.Serialize(permissions, (System.Text.Json.JsonSerializerOptions?)null),
                json => System.Text.Json.JsonSerializer.Deserialize<List<string>>(json, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>())
            .Metadata.SetValueComparer(new ValueComparer<List<string>>(
                (left, right) => left != null && right != null && left.SequenceEqual(right),
                collection => collection.Aggregate(0, (hash, item) => HashCode.Combine(hash, item)),
                collection => collection.ToList()));

        modelBuilder.Entity<Role>()
            .Property(e => e.Permissions)
            .HasColumnType("jsonb");

        modelBuilder.Entity<User>()
            .HasOne(u => u.Role)
            .WithMany()
            .HasForeignKey(u => u.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Quest)
            .WithMany()
            .HasForeignKey(b => b.QuestId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.QuestSchedule)
            .WithOne(s => s.Booking)
            .HasForeignKey<Booking>(b => b.QuestScheduleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BookingExtraService>()
            .HasOne(e => e.Booking)
            .WithMany(b => b.ExtraServices)
            .HasForeignKey(e => e.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
