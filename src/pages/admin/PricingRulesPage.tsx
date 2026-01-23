import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Quest, QuestPricingRule, QuestPricingRuleUpsert } from '../../lib/types';
import { Plus, Save, X, Trash2, RefreshCw } from 'lucide-react';

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

const getCurrentYearRange = () => {
  const year = new Date().getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
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
  const [quests, setQuests] = useState<Quest[]>([]);
  const [rules, setRules] = useState<QuestPricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestId, setSelectedQuestId] = useState<string>('');
  const [editingRule, setEditingRule] = useState<
    (QuestPricingRuleUpsert & { id?: string }) | null
  >(null);
  const [generationQuestId, setGenerationQuestId] = useState<string>('');
  const [generateFrom, setGenerateFrom] = useState<string>('');
  const [generateTo, setGenerateTo] = useState<string>('');
  const [generateResult, setGenerateResult] = useState<string>('');
  const [rulesView, setRulesView] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    loadQuests();
  }, []);

  useEffect(() => {
    if (selectedQuestId) {
      loadRules(selectedQuestId);
    } else {
      loadRules();
    }
  }, [selectedQuestId]);

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

  const loadRules = async (questId?: string) => {
    try {
      const data = await api.getPricingRules(questId);
      setRules(data || []);
    } catch (error) {
      console.error('Ошибка загрузки правил:', error);
    }
  };

  const handleCreate = () => {
    if (!selectedQuestId) {
      alert('Выберите квест для нового правила.');
      return;
    }
    setEditingRule(buildEmptyRule([selectedQuestId]));
  };

  const handleEdit = (rule: QuestPricingRule) => {
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
    if (!editingRule) return;
    if (editingRule.questIds.length === 0) {
      alert('Выберите хотя бы один квест для правила.');
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
      loadRules(selectedQuestId || undefined);
    } catch (error) {
      alert('Ошибка сохранения: ' + (error as Error).message);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Удалить правило?')) return;
    try {
      await api.deletePricingRule(ruleId);
      loadRules(selectedQuestId || undefined);
    } catch (error) {
      alert('Ошибка удаления: ' + (error as Error).message);
    }
  };

  const toggleDay = (day: number) => {
    if (!editingRule) return;
    const days = editingRule.daysOfWeek.includes(day)
      ? editingRule.daysOfWeek.filter((d) => d !== day)
      : [...editingRule.daysOfWeek, day];
    setEditingRule({ ...editingRule, daysOfWeek: days });
  };

  const handleGenerate = async () => {
    if (!generateFrom || !generateTo) {
      setGenerateResult('Заполните диапазон дат.');
      return;
    }

    try {
      const isAllQuests = !generationQuestId;
      if (isAllQuests && !confirm('Сгенерировать расписание для всех квестов?')) {
        return;
      }

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

  const questOptions = useMemo(
    () => quests.map((quest) => ({ value: quest.id, label: quest.title })),
    [quests]
  );
  const questFilterOptions = useMemo(
    () => [{ value: '', label: 'Все квесты' }, ...questOptions],
    [questOptions]
  );
  const generationOptions = useMemo(
    () => [{ value: '', label: 'Все квесты' }, ...questOptions],
    [questOptions]
  );
  const questMap = useMemo(
    () => new Map(questOptions.map((quest) => [quest.value, quest.label])),
    [questOptions]
  );

  const formatDays = (days: number[]) =>
    days
      .map((day) => dayLabels.get(day) || day.toString())
      .join(', ');

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Ценовые правила и календарь</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
            <select
              value={selectedQuestId}
              onChange={(e) => setSelectedQuestId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              {questFilterOptions.map((quest) => (
                <option key={quest.value || 'all'} value={quest.value}>
                  {quest.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500 md:col-span-2">
            Настраивайте периоды, дни недели и интервалы времени. Эти правила
            используются для генерации расписания.
          </div>
        </div>
      </div>

      {editingRule && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-800">
            {editingRule.id ? 'Редактирование правила' : 'Новое правило'}
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Квесты
              </label>
              <select
                multiple
                value={editingRule.questIds}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    questIds: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none min-h-[140px]"
              >
                {questOptions.map((quest) => (
                  <option key={quest.value} value={quest.value}>
                    {quest.label}
                  </option>
                ))}
              </select>
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

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
        {generateResult && (
          <p className="text-sm text-gray-600">{generateResult}</p>
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

        {rules.length === 0 ? (
          <p className="text-gray-500">Правила пока не заданы.</p>
        ) : rulesView === 'cards' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rules.map((rule) => (
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
                    Даты: {rule.startDate || 'без начала'} – {rule.endDate || 'без конца'}
                    · Дни: {formatDays(rule.daysOfWeek)} · Приоритет: {rule.priority}{' '}
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
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
                {rules.map((rule) => (
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
                      {rule.startDate || 'без начала'} – {rule.endDate || 'без конца'}
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
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-semibold"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
