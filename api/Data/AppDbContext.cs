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
    public DbSet<DurationBadge> DurationBadges { get; set; }
    public DbSet<QuestSchedule> QuestSchedules { get; set; }
    public DbSet<QuestPricingRule> QuestPricingRules { get; set; }
    public DbSet<Booking> Bookings { get; set; }
    public DbSet<ImageAsset> ImageAssets { get; set; }
    public DbSet<Rule> Rules { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<Promotion> Promotions { get; set; }
    public DbSet<Certificate> Certificates { get; set; }
    public DbSet<AboutInfo> AboutInfos { get; set; }
    public DbSet<Settings> Settings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<QuestSchedule>()
            .HasIndex(e => new { e.QuestId, e.Date, e.TimeSlot })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(e => e.Email)
            .IsUnique();
    }
}
