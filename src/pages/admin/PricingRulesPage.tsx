import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import {
  Quest,
  QuestPricingRule,
  QuestPricingRuleUpsert,
  ScheduleConsistencyCheckResult,
} from '../../lib/types';
import { Plus, Save, X, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';
import NotificationModal from '../../components/NotificationModal';
import { showAdminNotification } from '../../lib/adminNotifications';

const dayOptions = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 0, label: 'Вс' },
];

const dayLabels = new Map(dayOptions.map((day) => [day.value, day.label]));

const getTodayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const getCurrentYearRange = () => {
  const year = new Date().getFullYear();
  return {
    start: getTodayISO(),
    end: `${year}-12-31`,
  };
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const buildTimeSlots = (startTime: string, endTime: string, interval: number) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (
    startMinutes === null ||
    endMinutes === null ||
    interval <= 0 ||
    endMinutes <= startMinutes
  ) {
    return [];
  }
  const slots: string[] = [];
  let current = startMinutes;
  const maxSlots = 24;
  while (current + interval <= endMinutes && slots.length < maxSlots) {
    slots.push(minutesToTime(current));
    current += interval;
  }
  return slots;
};

const buildEmptyRule = (questIds: string[]): QuestPricingRuleUpsert => {
  const { start, end } = getCurrentYearRange();
  return {
    questIds,
    title: '',
    startDate: start,
    endDate: end,
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '10:00',
    endTime: '22:00',
    intervalMinutes: 90,
    price: 3500,
    isBlocked: false,
    priority: 1,
    isActive: true,
  };
};

export default function PricingRulesPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('calendar.pricing.view');
  const canEdit = hasPermission('calendar.pricing.edit');
  const canDelete = hasPermission('calendar.pricing.delete');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [rules, setRules] = useState<QuestPricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestIds, setSelectedQuestIds] = useState<string[]>([]);
  const [editingRule, setEditingRule] = useState<
    (QuestPricingRuleUpsert & { id?: string }) | null
  >(null);
  const [generationQuestId, setGenerationQuestId] = useState<string>('');
  const [generateFrom, setGenerateFrom] = useState<string>(getCurrentYearRange().start);
  const [generateTo, setGenerateTo] = useState<string>(getCurrentYearRange().end);
  const [generateResult, setGenerateResult] = useState<string>('');
  const [consistencyResult, setConsistencyResult] = useState<string>('');
  const [consistencyReport, setConsistencyReport] = useState<ScheduleConsistencyCheckResult | null>(null);
  const [isConsistencyModalOpen, setIsConsistencyModalOpen] = useState(false);
  const [rulesView, setRulesView] = useState<'cards' | 'table'>('cards');
  const [ruleToDeleteId, setRuleToDeleteId] = useState<string | null>(null);
  const [isGenerateConfirmOpen, setIsGenerateConfirmOpen] = useState(false);

  useEffect(() => {
    loadQuests();
    loadRules();
  }, []);

  const loadQuests = async () => {
    try {
      const data = await api.getQuests();
      setQuests(data || []);
      if (data?.length && !generationQuestId) {
        setGenerationQuestId(data[0].id);
      }
    } catch (error) {
      console.error('Ошибка загрузки квестов:', error);
    }
    setLoading(false);
  };

  const loadRules = async () => {
    try {
      const data = await api.getPricingRules();
      setRules(data || []);
    } catch (error) {
      console.error('Ошибка загрузки правил:', error);
    }
  };

  const handleCreate = () => {
    if (!canEdit) {
      return;
    }
    setEditingRule(buildEmptyRule(selectedQuestIds));
  };

  const handleEdit = (rule: QuestPricingRule) => {
    if (!canEdit) {
      return;
    }
    setEditingRule({
      id: rule.id,
      questIds: rule.questIds,
      title: rule.title,
      startDate: rule.startDate,
      endDate: rule.endDate,
      daysOfWeek: rule.daysOfWeek,
      startTime: rule.startTime.slice(0, 5),
      endTime: rule.endTime.slice(0, 5),
      intervalMinutes: rule.intervalMinutes,
      price: rule.price,
      isBlocked: rule.isBlocked,
      priority: rule.priority,
      isActive: rule.isActive,
    });
  };

  const handleSave = async () => {
    if (!canEdit) {
      return;
    }
    if (!editingRule) return;
    if (editingRule.questIds.length === 0) {
      showAdminNotification({ title: 'Уведомление', message: String('Выберите хотя бы один квест для правила.'), tone: 'info' });
      return;
    }

    try {
      if (editingRule.id) {
        const { id, ...payload } = editingRule;
        await api.updatePricingRule(id, payload);
      } else {
        await api.createPricingRule(editingRule);
      }
      setEditingRule(null);
      loadRules();
    } catch (error) {
      showAdminNotification({ title: 'Уведомление', message: String('Ошибка сохранения: ' + (error as Error).message), tone: 'info' });
    }
  };

  const handleDelete = (ruleId: string) => {
    if (!canDelete) {
      return;
    }
    setRuleToDeleteId(ruleId);
  };

  const confirmDelete = async () => {
    if (!ruleToDeleteId) return;
    try {
      await api.deletePricingRule(ruleToDeleteId);
      loadRules();
    } catch (error) {
      showAdminNotification({ title: 'Уведомление', message: String('Ошибка удаления: ' + (error as Error).message), tone: 'info' });
    } finally {
      setRuleToDeleteId(null);
    }
  };

  const toggleDay = (day: number) => {
    if (!editingRule) return;
    const days = editingRule.daysOfWeek.includes(day)
      ? editingRule.daysOfWeek.filter((d) => d !== day)
      : [...editingRule.daysOfWeek, day];
    setEditingRule({ ...editingRule, daysOfWeek: days });
  };

  const toggleQuest = (questId: string) => {
    if (!editingRule) return;
    const nextQuestIds = editingRule.questIds.includes(questId)
      ? editingRule.questIds.filter((id) => id !== questId)
      : [...editingRule.questIds, questId];
    setEditingRule({ ...editingRule, questIds: nextQuestIds });
  };

  const toggleQuestFilter = (questId: string) => {
    setSelectedQuestIds((prev) =>
      prev.includes(questId) ? prev.filter((id) => id !== questId) : [...prev, questId]
    );
  };

  const executeGenerate = async () => {
    if (!generateFrom || !generateTo) {
      setGenerateResult('Заполните диапазон дат.');
      return;
    }

    try {
      const isAllQuests = !generationQuestId;
      const result = await api.generateSchedule(
        isAllQuests
          ? { fromDate: generateFrom, toDate: generateTo }
          : { questId: generationQuestId, fromDate: generateFrom, toDate: generateTo }
      );
      setGenerateResult(
        isAllQuests
          ? `Создано слотов по всем квестам: ${result.createdCount}`
          : `Создано слотов: ${result.createdCount}`
      );
    } catch (error) {
      setGenerateResult('Ошибка генерации: ' + (error as Error).message);
    }
  };

  const handleGenerate = async () => {
    if (!generationQuestId) {
      setIsGenerateConfirmOpen(true);
      return;
    }
    await executeGenerate();
  };

  const downloadConsistencyReport = () => {
    if (!consistencyReport) {
      return;
    }

    const header = [
      `Период: ${consistencyReport.fromDate} — ${consistencyReport.toDate}`,
      `Проверено слотов: ${consistencyReport.checkedSlots}`,
      `Исправлено слотов: ${consistencyReport.updatedSlots}`,
      `Освобождено слотов: ${consistencyReport.releasedSlots}`,
      `Помечено занятыми: ${consistencyReport.occupiedSlots}`,
      `Бронирований без слота: ${consistencyReport.orphanBookings}`,
      `Время проверки (UTC): ${consistencyReport.checkedAtUtc}`,
      '',
      'Подробный лог:',
      'Квест;Дата;Время;Было занято;Стало занято;Проблема;Исправление;Источник',
    ];

    const rows = consistencyReport.logs.map((entry) =>
      [
        entry.questTitle || '—',
        entry.date || '—',
        entry.timeSlot ? entry.timeSlot.slice(0, 5) : '—',
        entry.previousIsBooked == null ? '—' : entry.previousIsBooked ? 'Да' : 'Нет',
        entry.currentIsBooked == null ? '—' : entry.currentIsBooked ? 'Да' : 'Нет',
        entry.issue.replace(/\n/g, ' '),
        entry.resolution.replace(/\n/g, ' '),
        entry.source,
      ]
        .map((part) => `"${part.replace(/"/g, '""')}"`)
        .join(';')
    );

    const content = [...header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileDate = consistencyReport.checkedAtUtc.replace(/[:.]/g, '-');
    link.download = `schedule-consistency-${fileDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCheckConsistency = async () => {
    if (!generateFrom || !generateTo) {
      setConsistencyResult('Заполните диапазон дат.');
      return;
    }

    try {
      const isAllQuests = !generationQuestId;
      const result = await api.checkScheduleConsistency(
        isAllQuests
          ? { fromDate: generateFrom, toDate: generateTo }
          : { questId: generationQuestId, fromDate: generateFrom, toDate: generateTo }
      );

      const details = [
        `Проверено слотов: ${result.checkedSlots}`,
        `Исправлено слотов: ${result.updatedSlots}`,
        `Освобождено: ${result.releasedSlots}`,
        `Занято после исправления: ${result.occupiedSlots}`,
      ];
      if (result.orphanBookings > 0) {
        details.push(`Бронирований без слота: ${result.orphanBookings}`);
      }
      setConsistencyResult(details.join(' · '));
      setConsistencyReport(result);
      setIsConsistencyModalOpen(true);
    } catch (error) {
      setConsistencyResult('Ошибка проверки: ' + (error as Error).message);
    }
  };

  const questOptions = useMemo(
    () => quests.map((quest) => ({ value: quest.id, label: quest.title })),
    [quests]
  );
  const questFilterOptions = useMemo(() => {
    const visibleQuests = quests.filter((quest) => quest.isVisible);
    const target = visibleQuests.length > 0 ? visibleQuests : quests;
    return target.map((quest) => ({ value: quest.id, label: quest.title }));
  }, [quests]);
  const generationOptions = useMemo(
    () => [{ value: '', label: 'Все квесты' }, ...questOptions],
    [questOptions]
  );
  const questMap = useMemo(
    () => new Map(questOptions.map((quest) => [quest.value, quest.label])),
    [questOptions]
  );

  const filteredRules = useMemo(() => {
    if (selectedQuestIds.length === 0) {
      return rules;
    }
    return rules.filter((rule) =>
      rule.questIds.some((questId) => selectedQuestIds.includes(questId))
    );
  }, [rules, selectedQuestIds]);

  const formatDays = (days: number[]) =>
    days
      .map((day) => dayLabels.get(day) || day.toString())
      .join(', ');

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) {
      return '';
    }
    if (startDate && endDate) {
      return `${startDate} – ${endDate}`;
    }
    return startDate || endDate || '';
  };

  const previewSlots = editingRule
    ? buildTimeSlots(editingRule.startTime, editingRule.endTime, editingRule.intervalMinutes)
    : [];

  if (!canView) {
    return <AccessDenied />;
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <>
      <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Ценовые правила и календарь</h2>
        <button
          onClick={handleCreate}
          disabled={!canEdit}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
            canEdit
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'cursor-not-allowed bg-red-200 text-white/80'
          }`}
        >
          <Plus className="w-5 h-5" />
          Добавить правило
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Квест для фильтрации
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedQuestIds([])}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  selectedQuestIds.length === 0
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Все квесты
              </button>
              {questFilterOptions.map((quest) => {
                const isActive = selectedQuestIds.includes(quest.value);
                return (
                  <button
                    key={quest.value}
                    type="button"
                    onClick={() => toggleQuestFilter(quest.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      isActive
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {quest.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-lg max-h-full overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingRule.id ? 'Редактирование правила' : 'Новое правило'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="inline-flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Квесты
                  </label>
                  <div className="grid gap-2 rounded-lg border border-gray-200 p-4 max-h-52 overflow-y-auto">
                    {questOptions.map((quest) => (
                      <label
                        key={quest.value}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={editingRule.questIds.includes(quest.value)}
                          onChange={() => toggleQuest(quest.value)}
                          className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                        />
                        {quest.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Название правила
                  </label>
                  <input
                    type="text"
                    value={editingRule.title}
                    onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Будни с 10:00 до 18:00"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={editingRule.startDate || ''}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        startDate: e.target.value || null,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={editingRule.endDate || ''}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        endDate: e.target.value || null,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Приоритет (больше = важнее)
                  </label>
                  <input
                    type="number"
                    value={editingRule.priority}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        priority: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Дни недели
                </label>
                <div className="flex flex-wrap gap-3">
                  {dayOptions.map((day) => (
                    <label
                      key={day.value}
                      className={`px-3 py-2 rounded-lg border cursor-pointer text-sm font-semibold transition-colors ${
                        editingRule.daysOfWeek.includes(day.value)
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={editingRule.daysOfWeek.includes(day.value)}
                        onChange={() => toggleDay(day.value)}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Время начала
                  </label>
                  <input
                    type="time"
                    value={editingRule.startTime}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, startTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Время окончания
                  </label>
                  <input
                    type="time"
                    value={editingRule.endTime}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, endTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Интервал (мин.)
                  </label>
                  <input
                    type="number"
                    value={editingRule.intervalMinutes}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        intervalMinutes: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    min="15"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Цена (₽)
                  </label>
                  <input
                    type="number"
                    value={editingRule.price}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        price: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    min="0"
                    disabled={editingRule.isBlocked}
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingRule.isBlocked}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, isBlocked: e.target.checked })
                      }
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    Время недоступно (блокировка)
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingRule.isActive}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, isActive: e.target.checked })
                      }
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    Правило активно
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                <div className="font-semibold text-gray-700">Проверка отображения</div>
                <div className="mt-3 space-y-3 text-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {previewSlots.map((slot) => (
                      <span
                        key={slot}
                        className="w-[68px] px-2 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-[0.08em] text-center bg-green-600 text-white"
                      >
                        {slot}
                      </span>
                    ))}
                    {previewSlots.length === 0 && (
                      <span className="text-xs text-gray-500">
                        Нет доступных слотов при выбранных параметрах.
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    {editingRule.isBlocked ? 'Блокировка' : `Цена: ${editingRule.price} ₽`}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleSave}
                  disabled={!canEdit}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                    canEdit
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'cursor-not-allowed bg-red-200 text-white/80'
                  }`}
                >
                  <Save className="w-5 h-5" />
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingRule(null)}
                  className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  <X className="w-5 h-5" />
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-800">Генерация расписания</h3>
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Квест
            </label>
            <select
              value={generationQuestId}
              onChange={(e) => setGenerationQuestId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              {generationOptions.map((quest) => (
                <option key={quest.value || 'all'} value={quest.value}>
                  {quest.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Дата начала
            </label>
            <input
              type="date"
              value={generateFrom}
              onChange={(e) => setGenerateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Дата окончания
            </label>
            <input
              type="date"
              value={generateTo}
              onChange={(e) => setGenerateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Сгенерировать
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckConsistency}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Проверить и исправить занятость
          </button>
        </div>
        {generateResult && (
          <p className="text-sm text-gray-600">{generateResult}</p>
        )}
        {consistencyResult && (
          <p className="text-sm text-gray-600">{consistencyResult}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-800">Список правил</h3>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-gray-500">Вид:</span>
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setRulesView('cards')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  rulesView === 'cards'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Карточки
              </button>
              <button
                type="button"
                onClick={() => setRulesView('table')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  rulesView === 'table'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Таблица
              </button>
            </div>
          </div>
        </div>

        {filteredRules.length === 0 ? (
          <p className="text-gray-500">Правила пока не заданы.</p>
        ) : rulesView === 'cards' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRules.map((rule) => {
              const dateRange = formatDateRange(rule.startDate, rule.endDate);
              return (
                <div
                  key={rule.id}
                  className="flex flex-col justify-between gap-4 border border-gray-200 rounded-lg p-4 h-full"
                >
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-800">{rule.title}</div>
                    <div className="text-sm text-gray-500">
                      {rule.isBlocked ? (
                        <>Блокировка · Время: {rule.startTime.slice(0, 5)}–{rule.endTime.slice(0, 5)}</>
                      ) : (
                        <>
                          Цена: {rule.price} ₽ · Интервал: {rule.intervalMinutes} мин. ·
                          Время: {rule.startTime.slice(0, 5)}–{rule.endTime.slice(0, 5)}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {dateRange ? (
                        <>
                          Даты: {dateRange} ·{' '}
                        </>
                      ) : null}
                      Дни: {formatDays(rule.daysOfWeek)} · Приоритет: {rule.priority}{' '}
                      {rule.isActive ? '' : '(не активно)'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Квесты:{' '}
                      {rule.questIds
                        .map((id) => questMap.get(id) || id.slice(0, 6))
                        .join(', ')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(rule)}
                      disabled={!canEdit}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                        canEdit
                          ? 'bg-gray-100 hover:bg-gray-200'
                          : 'cursor-not-allowed bg-gray-50 text-gray-300'
                      }`}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={!canDelete}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                        canDelete
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'cursor-not-allowed bg-red-50 text-red-200'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Название</th>
                  <th className="py-2 pr-4">Параметры</th>
                  <th className="py-2 pr-4">Даты и дни</th>
                  <th className="py-2 pr-4">Квесты</th>
                  <th className="py-2">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => {
                  const dateRange = formatDateRange(rule.startDate, rule.endDate);
                  return (
                    <tr key={rule.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-semibold text-gray-800">{rule.title}</td>
                      <td className="py-3 pr-4 text-gray-500">
                        {rule.isBlocked ? (
                          <>Блокировка · {rule.startTime.slice(0, 5)}–{rule.endTime.slice(0, 5)}</>
                        ) : (
                          <>
                            Цена: {rule.price} ₽ · Интервал: {rule.intervalMinutes} мин. ·{' '}
                            {rule.startTime.slice(0, 5)}–{rule.endTime.slice(0, 5)}
                          </>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-400">
                        {dateRange ? <div>{dateRange}</div> : null}
                        <div>
                          {formatDays(rule.daysOfWeek)} · Приоритет: {rule.priority}{' '}
                          {rule.isActive ? '' : '(не активно)'}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-400">
                        {rule.questIds
                          .map((id) => questMap.get(id) || id.slice(0, 6))
                          .join(', ')}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(rule)}
                            disabled={!canEdit}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                              canEdit
                                ? 'bg-gray-100 hover:bg-gray-200'
                                : 'cursor-not-allowed bg-gray-50 text-gray-300'
                            }`}
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            disabled={!canDelete}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                              canDelete
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'cursor-not-allowed bg-red-50 text-red-200'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      <NotificationModal
        isOpen={Boolean(ruleToDeleteId)}
        title="Удаление правила"
        message="Вы уверены, что хотите удалить это правило?"
        tone="info"
        showToneLabel={false}
        actions={(
          <>
            <button
              type="button"
              onClick={() => setRuleToDeleteId(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Удалить
            </button>
          </>
        )}
        onClose={() => setRuleToDeleteId(null)}
      />


      <NotificationModal
        isOpen={isConsistencyModalOpen}
        title="Результат проверки расписания"
        tone="info"
        showToneLabel={false}
        message={(
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div><strong>Период:</strong> {consistencyReport?.fromDate} — {consistencyReport?.toDate}</div>
              <div><strong>Проверено слотов:</strong> {consistencyReport?.checkedSlots ?? 0}</div>
              <div><strong>Исправлено:</strong> {consistencyReport?.updatedSlots ?? 0}</div>
              <div><strong>Освобождено:</strong> {consistencyReport?.releasedSlots ?? 0}</div>
              <div><strong>Помечено занятыми:</strong> {consistencyReport?.occupiedSlots ?? 0}</div>
              <div><strong>Бронирований без слота:</strong> {consistencyReport?.orphanBookings ?? 0}</div>
            </div>
            {consistencyReport?.messages?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                {consistencyReport.messages.map((message, idx) => (
                  <li key={`${message}-${idx}`}>{message}</li>
                ))}
              </ul>
            ) : null}
            {consistencyReport?.logs?.length ? (
              <div className="max-h-56 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-2 py-2 text-left">Квест</th>
                      <th className="px-2 py-2 text-left">Дата</th>
                      <th className="px-2 py-2 text-left">Время</th>
                      <th className="px-2 py-2 text-left">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consistencyReport.logs.slice(0, 50).map((entry, idx) => (
                      <tr key={`${entry.questId ?? 'none'}-${entry.date ?? 'none'}-${idx}`} className="border-t border-gray-100">
                        <td className="px-2 py-1.5">{entry.questTitle || '—'}</td>
                        <td className="px-2 py-1.5">{entry.date || '—'}</td>
                        <td className="px-2 py-1.5">{entry.timeSlot ? entry.timeSlot.slice(0, 5) : '—'}</td>
                        <td className="px-2 py-1.5">{entry.resolution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
        actions={(
          <>
            <button
              type="button"
              onClick={downloadConsistencyReport}
              disabled={!consistencyReport?.logs?.length}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                consistencyReport?.logs?.length
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              Скачать лог (CSV)
            </button>
            <button
              type="button"
              onClick={() => setIsConsistencyModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Закрыть
            </button>
          </>
        )}
        onClose={() => setIsConsistencyModalOpen(false)}
      />
      <NotificationModal
        isOpen={isGenerateConfirmOpen}
        title="Генерация расписания"
        message="Сгенерировать расписание для всех квестов?"
        tone="info"
        showToneLabel={false}
        actions={(
          <>
            <button
              type="button"
              onClick={() => setIsGenerateConfirmOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={async () => {
                setIsGenerateConfirmOpen(false);
                await executeGenerate();
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Сгенерировать
            </button>
          </>
        )}
        onClose={() => setIsGenerateConfirmOpen(false)}
      />
    </>
  );
}
