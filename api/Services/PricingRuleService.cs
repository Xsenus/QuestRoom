using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.PricingRules;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IPricingRuleService
{
    Task<IReadOnlyList<QuestPricingRuleDto>> GetRulesAsync(Guid? questId);
    Task<QuestPricingRuleDto> CreateRuleAsync(QuestPricingRuleUpsertDto dto);
    Task<bool> UpdateRuleAsync(Guid id, QuestPricingRuleUpsertDto dto);
    Task<bool> DeleteRuleAsync(Guid id);
}

public class PricingRuleService : IPricingRuleService
{
    private readonly AppDbContext _context;

    public PricingRuleService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<QuestPricingRuleDto>> GetRulesAsync(Guid? questId)
    {
        var query = _context.QuestPricingRules.AsQueryable();

        if (questId.HasValue)
        {
            query = query.Where(r => r.QuestId == questId.Value);
        }

        var rules = await query
            .OrderBy(r => r.Priority)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync();

        return rules.Select(ToDto).ToList();
    }

    public async Task<QuestPricingRuleDto> CreateRuleAsync(QuestPricingRuleUpsertDto dto)
    {
        var rule = new QuestPricingRule
        {
            Id = Guid.NewGuid(),
            QuestId = dto.QuestId,
            Title = dto.Title,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            DaysOfWeek = dto.DaysOfWeek,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            IntervalMinutes = dto.IntervalMinutes,
            Price = dto.Price,
            Priority = dto.Priority,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.QuestPricingRules.Add(rule);
        await _context.SaveChangesAsync();

        return ToDto(rule);
    }

    public async Task<bool> UpdateRuleAsync(Guid id, QuestPricingRuleUpsertDto dto)
    {
        var rule = await _context.QuestPricingRules.FindAsync(id);
        if (rule == null)
            return false;

        rule.QuestId = dto.QuestId;
        rule.Title = dto.Title;
        rule.StartDate = dto.StartDate;
        rule.EndDate = dto.EndDate;
        rule.DaysOfWeek = dto.DaysOfWeek;
        rule.StartTime = dto.StartTime;
        rule.EndTime = dto.EndTime;
        rule.IntervalMinutes = dto.IntervalMinutes;
        rule.Price = dto.Price;
        rule.Priority = dto.Priority;
        rule.IsActive = dto.IsActive;
        rule.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteRuleAsync(Guid id)
    {
        var rule = await _context.QuestPricingRules.FindAsync(id);
        if (rule == null)
            return false;

        _context.QuestPricingRules.Remove(rule);
        await _context.SaveChangesAsync();
        return true;
    }

    private static QuestPricingRuleDto ToDto(QuestPricingRule rule)
    {
        return new QuestPricingRuleDto
        {
            Id = rule.Id,
            QuestId = rule.QuestId,
            Title = rule.Title,
            StartDate = rule.StartDate,
            EndDate = rule.EndDate,
            DaysOfWeek = rule.DaysOfWeek,
            StartTime = rule.StartTime,
            EndTime = rule.EndTime,
            IntervalMinutes = rule.IntervalMinutes,
            Price = rule.Price,
            Priority = rule.Priority,
            IsActive = rule.IsActive,
            CreatedAt = rule.CreatedAt,
            UpdatedAt = rule.UpdatedAt
        };
    }
}
