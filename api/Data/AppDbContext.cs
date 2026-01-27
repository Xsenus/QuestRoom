using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Models;

namespace QuestRoomApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Quest> Quests { get; set; }
    public DbSet<QuestExtraService> QuestExtraServices { get; set; }
    public DbSet<DurationBadge> DurationBadges { get; set; }
    public DbSet<QuestSchedule> QuestSchedules { get; set; }
    public DbSet<QuestPricingRule> QuestPricingRules { get; set; }
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

        modelBuilder.Entity<User>()
            .HasIndex(e => e.Email)
            .IsUnique();

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
