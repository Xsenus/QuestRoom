using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using QuestRoomApi.Data;

namespace QuestRoomApi.Migrations;

[DbContext(typeof(AppDbContext))]
public partial class AppDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "9.0.12");

        modelBuilder.Entity("QuestRoomApi.Models.AboutInfo", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<string>("Content")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("content");

            b.Property<string>("Mission")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("mission");

            b.Property<string>("Title")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("title");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.Property<string>("Vision")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("vision");

            b.HasKey("Id");

            b.ToTable("about_info");
        });

        modelBuilder.Entity("QuestRoomApi.Models.Booking", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<DateOnly>("BookingDate")
                .HasColumnType("date")
                .HasColumnName("booking_date");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("CustomerEmail")
                .HasColumnType("text")
                .HasColumnName("customer_email");

            b.Property<string>("CustomerName")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("customer_name");

            b.Property<string>("CustomerPhone")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("customer_phone");

            b.Property<string>("Notes")
                .HasColumnType("text")
                .HasColumnName("notes");

            b.Property<int>("ParticipantsCount")
                .HasColumnType("integer")
                .HasColumnName("participants_count");

            b.Property<Guid?>("QuestId")
                .HasColumnType("uuid")
                .HasColumnName("quest_id");

            b.Property<Guid?>("QuestScheduleId")
                .HasColumnType("uuid")
                .HasColumnName("quest_schedule_id");

            b.Property<string>("Status")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("status");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.HasIndex("QuestId");

            b.HasIndex("QuestScheduleId");

            b.ToTable("bookings");
        });

        modelBuilder.Entity("QuestRoomApi.Models.Certificate", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("Description")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("description");

            b.Property<string>("ImageUrl")
                .HasColumnType("text")
                .HasColumnName("image_url");

            b.Property<bool>("IsVisible")
                .HasColumnType("boolean")
                .HasColumnName("is_visible");

            b.Property<DateOnly>("IssuedDate")
                .HasColumnType("date")
                .HasColumnName("issued_date");

            b.Property<int>("SortOrder")
                .HasColumnType("integer")
                .HasColumnName("sort_order");

            b.Property<string>("Title")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("title");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.ToTable("certificates");
        });

        modelBuilder.Entity("QuestRoomApi.Models.DurationBadge", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<string>("BadgeImageUrl")
                .HasColumnType("text")
                .HasColumnName("badge_image_url");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<int>("Duration")
                .HasColumnType("integer")
                .HasColumnName("duration");

            b.Property<string>("Label")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("label");

            b.HasKey("Id");

            b.ToTable("duration_badges");
        });

        modelBuilder.Entity("QuestRoomApi.Models.ImageAsset", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<string>("ContentType")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("content_type");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<byte[]>("Data")
                .IsRequired()
                .HasColumnType("bytea")
                .HasColumnName("data");

            b.Property<string>("FileName")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("file_name");

            b.HasKey("Id");

            b.ToTable("image_assets");
        });

        modelBuilder.Entity("QuestRoomApi.Models.Promotion", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("Description")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("description");

            b.Property<string>("DiscountText")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("discount_text");

            b.Property<string>("DisplayMode")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("display_mode");

            b.Property<string>("ImageUrl")
                .HasColumnType("text")
                .HasColumnName("image_url");

            b.Property<bool>("IsActive")
                .HasColumnType("boolean")
                .HasColumnName("is_active");

            b.Property<int>("SortOrder")
                .HasColumnType("integer")
                .HasColumnName("sort_order");

            b.Property<string>("Title")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("title");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.Property<DateOnly>("ValidFrom")
                .HasColumnType("date")
                .HasColumnName("valid_from");

            b.Property<DateOnly?>("ValidUntil")
                .HasColumnType("date")
                .HasColumnName("valid_until");

            b.HasKey("Id");

            b.ToTable("promotions");
        });

        modelBuilder.Entity("QuestRoomApi.Models.Quest", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<string[]>("Addresses")
                .IsRequired()
                .HasColumnType("text[]")
                .HasColumnName("addresses");

            b.Property<string>("AgeRating")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("age_rating");

            b.Property<string>("AgeRestriction")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("age_restriction");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("Description")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("description");

            b.Property<int>("Duration")
                .HasColumnType("integer")
                .HasColumnName("duration");

            b.Property<string[]>("Images")
                .IsRequired()
                .HasColumnType("text[]")
                .HasColumnName("images");

            b.Property<bool>("IsNew")
                .HasColumnType("boolean")
                .HasColumnName("is_new");

            b.Property<bool>("IsVisible")
                .HasColumnType("boolean")
                .HasColumnName("is_visible");

            b.Property<string>("MainImage")
                .HasColumnType("text")
                .HasColumnName("main_image");

            b.Property<int>("ParticipantsMax")
                .HasColumnType("integer")
                .HasColumnName("participants_max");

            b.Property<int>("ParticipantsMin")
                .HasColumnType("integer")
                .HasColumnName("participants_min");

            b.Property<string[]>("Phones")
                .IsRequired()
                .HasColumnType("text[]")
                .HasColumnName("phones");

            b.Property<int>("Price")
                .HasColumnType("integer")
                .HasColumnName("price");

            b.Property<int>("SortOrder")
                .HasColumnType("integer")
                .HasColumnName("sort_order");

            b.Property<string>("Slug")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("slug");

            b.Property<string>("Title")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("title");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.ToTable("quests");
        });

        modelBuilder.Entity("QuestRoomApi.Models.QuestPricingRule", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<int[]>("DaysOfWeek")
                .IsRequired()
                .HasColumnType("integer[]")
                .HasColumnName("days_of_week");

            b.Property<DateOnly?>("EndDate")
                .HasColumnType("date")
                .HasColumnName("end_date");

            b.Property<TimeOnly>("EndTime")
                .HasColumnType("time without time zone")
                .HasColumnName("end_time");

            b.Property<int>("IntervalMinutes")
                .HasColumnType("integer")
                .HasColumnName("interval_minutes");

            b.Property<bool>("IsActive")
                .HasColumnType("boolean")
                .HasColumnName("is_active");

            b.Property<bool>("IsBlocked")
                .HasColumnType("boolean")
                .HasColumnName("is_blocked");

            b.Property<int>("Price")
                .HasColumnType("integer")
                .HasColumnName("price");

            b.Property<int>("Priority")
                .HasColumnType("integer")
                .HasColumnName("priority");

            b.Property<Guid>("QuestId")
                .HasColumnType("uuid")
                .HasColumnName("quest_id");

            b.Property<Guid[]>("QuestIds")
                .IsRequired()
                .HasColumnType("uuid[]")
                .HasColumnName("quest_ids");

            b.Property<DateOnly?>("StartDate")
                .HasColumnType("date")
                .HasColumnName("start_date");

            b.Property<TimeOnly>("StartTime")
                .HasColumnType("time without time zone")
                .HasColumnName("start_time");

            b.Property<string>("Title")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("title");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.HasIndex("QuestId");

            b.ToTable("quest_pricing_rules");
        });

        modelBuilder.Entity("QuestRoomApi.Models.QuestSchedule", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<Guid?>("BookingId")
                .HasColumnType("uuid")
                .HasColumnName("booking_id");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<DateOnly>("Date")
                .HasColumnType("date")
                .HasColumnName("date");

            b.Property<bool>("IsBooked")
                .HasColumnType("boolean")
                .HasColumnName("is_booked");

            b.Property<int>("Price")
                .HasColumnType("integer")
                .HasColumnName("price");

            b.Property<Guid>("QuestId")
                .HasColumnType("uuid")
                .HasColumnName("quest_id");

            b.Property<TimeOnly>("TimeSlot")
                .HasColumnType("time without time zone")
                .HasColumnName("time_slot");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.HasIndex("BookingId");

            b.HasIndex("QuestId", "Date", "TimeSlot")
                .IsUnique();

            b.ToTable("quest_schedule");
        });

        modelBuilder.Entity("QuestRoomApi.Models.Review", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("CustomerName")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("customer_name");

            b.Property<int>("Rating")
                .HasColumnType("integer")
                .HasColumnName("rating");

            b.Property<string>("QuestTitle")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("quest_title");

            b.Property<string>("ReviewText")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("review_text");

            b.Property<DateOnly>("ReviewDate")
                .HasColumnType("date")
                .HasColumnName("review_date");

            b.Property<bool>("IsFeatured")
                .HasColumnType("boolean")
                .HasColumnName("is_featured");

            b.Property<bool>("IsVisible")
                .HasColumnType("boolean")
                .HasColumnName("is_visible");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.ToTable("reviews");
        });

        modelBuilder.Entity("QuestRoomApi.Models.Rule", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<string>("Content")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("content");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<bool>("IsVisible")
                .HasColumnType("boolean")
                .HasColumnName("is_visible");

            b.Property<int>("SortOrder")
                .HasColumnType("integer")
                .HasColumnName("sort_order");

            b.Property<string>("Title")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("title");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.ToTable("rules");
        });

        modelBuilder.Entity("QuestRoomApi.Models.Settings", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<string>("Address")
                .HasColumnType("text")
                .HasColumnName("address");

            b.Property<string>("Email")
                .HasColumnType("text")
                .HasColumnName("email");

            b.Property<string>("InstagramUrl")
                .HasColumnType("text")
                .HasColumnName("instagram_url");

            b.Property<string>("LogoUrl")
                .HasColumnType("text")
                .HasColumnName("logo_url");

            b.Property<string>("Phone")
                .HasColumnType("text")
                .HasColumnName("phone");

            b.Property<string>("TelegramUrl")
                .HasColumnType("text")
                .HasColumnName("telegram_url");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.Property<string>("VkUrl")
                .HasColumnType("text")
                .HasColumnName("vk_url");

            b.Property<string>("YoutubeUrl")
                .HasColumnType("text")
                .HasColumnName("youtube_url");

            b.HasKey("Id");

            b.ToTable("settings");
        });

        modelBuilder.Entity("QuestRoomApi.Models.User", b =>
        {
            b.Property<Guid>("Id")
                .HasColumnType("uuid")
                .HasColumnName("id");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("Email")
                .IsRequired()
                .HasMaxLength(255)
                .HasColumnType("character varying(255)")
                .HasColumnName("email");

            b.Property<string>("PasswordHash")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("password_hash");

            b.Property<string>("Role")
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnType("character varying(50)")
                .HasColumnName("role");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.HasIndex("Email")
                .IsUnique();

            b.ToTable("users");
        });

        modelBuilder.Entity("QuestRoomApi.Models.Booking", b =>
        {
            b.HasOne("QuestRoomApi.Models.Quest", "Quest")
                .WithMany()
                .HasForeignKey("QuestId");

            b.HasOne("QuestRoomApi.Models.QuestSchedule", "QuestSchedule")
                .WithMany()
                .HasForeignKey("QuestScheduleId");

            b.Navigation("Quest");

            b.Navigation("QuestSchedule");
        });

        modelBuilder.Entity("QuestRoomApi.Models.QuestPricingRule", b =>
        {
            b.HasOne("QuestRoomApi.Models.Quest", "Quest")
                .WithMany()
                .HasForeignKey("QuestId")
                .OnDelete(DeleteBehavior.Cascade);

            b.Navigation("Quest");
        });

        modelBuilder.Entity("QuestRoomApi.Models.QuestSchedule", b =>
        {
            b.HasOne("QuestRoomApi.Models.Booking", "Booking")
                .WithMany()
                .HasForeignKey("BookingId");

            b.HasOne("QuestRoomApi.Models.Quest", "Quest")
                .WithMany()
                .HasForeignKey("QuestId")
                .OnDelete(DeleteBehavior.Cascade);

            b.Navigation("Booking");

            b.Navigation("Quest");
        });
    }
}
