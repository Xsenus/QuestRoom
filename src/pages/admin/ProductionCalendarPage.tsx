import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { ProductionCalendarDay, ProductionCalendarDayUpsert } from '../../lib/types';
import {
  CalendarPlus,
  Download,
  Pencil,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

type DayType = 'holidays' | 'preholidays' | 'nowork';

type CalendarDraft = Omit<ProductionCalendarDayUpsert, 'isHoliday' | 'dayType'> & {
  dayType: DayType;
};

const dayTypeLabels: Record<DayType, string> = {
  holidays: 'Выходной/праздничный',
  preholidays: 'Предпраздничный',
  nowork: 'Внезапный нерабочий',
};

const dayTypeDescriptions: Record<DayType, string> = {
  holidays: 'Выходные и официальные праздничные дни.',
  preholidays: 'Предпраздничные дни со сокращенной продолжительностью работы.',
  nowork: 'Нерабочие дни по отдельным указам или решениям.',
};

const defaultCalendarUrl =
  'https://raw.githubusercontent.com/d10xa/holidays-calendar/master/json/calendar.json';

const todayIso = () => new Date().toISOString().split('T')[0];
const parseDate = (value: string) => new Date(`${value}T00:00:00`);
const formatDate = (value: string) =>
  parseDate(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
const formatYear = (value: string) => parseDate(value).getFullYear();

const buildPayload = (draft: CalendarDraft): ProductionCalendarDayUpsert => ({
  ...draft,
  isHoliday: draft.dayType !== 'preholidays',
});

const normalizeDayType = (day?: { dayType?: string | null; isHoliday?: boolean }) => {
  if (!day) return 'holidays';
  if (day.dayType === 'holidays' || day.dayType === 'preholidays' || day.dayType === 'nowork') {
    return day.dayType;
  }
  return day.isHoliday ? 'holidays' : 'preholidays';
};

export default function ProductionCalendarPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('calendar.production.view');
  const canEdit = hasPermission('calendar.production.edit');
  const canDelete = hasPermission('calendar.production.delete');
  const [days, setDays] = useState<ProductionCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [yearFilter, setYearFilter] = useState('');
  const [importUrl, setImportUrl] = useState(defaultCalendarUrl);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const isYearSelectionLocked = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<ProductionCalendarDay | null>(null);
  const [draft, setDraft] = useState<CalendarDraft>({
    date: todayIso(),
    title: '',
    dayType: 'holidays',
    source: 'manual',
  });

  const loadDays = async () => {
    setLoading(true);
    try {
      const data = await api.getProductionCalendar();
      setDays(data || []);
    } catch (error) {
      console.error('Error loading production calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDays();
  }, []);

  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(days.map((day) => formatYear(day.date)))).sort((a, b) => a - b);
    return years;
  }, [days]);

  const filteredDays = useMemo(() => {
    if (!yearFilter || yearFilter === 'all') {
      return days;
    }
    return days.filter((day) => formatYear(day.date).toString() === yearFilter);
  }, [days, yearFilter]);

  useEffect(() => {
    if (days.length === 0 || isYearSelectionLocked.current) {
      if (days.length === 0 && !isYearSelectionLocked.current) {
        setYearFilter('all');
      }
      return;
    }
    const latestYear = Math.max(...days.map((day) => formatYear(day.date)));
    setYearFilter(String(latestYear));
  }, [days]);

  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, ProductionCalendarDay[]>();
    filteredDays.forEach((day) => {
      const date = parseDate(day.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const group = groups.get(key) ?? [];
      group.push(day);
      groups.set(key, group);
    });
    return Array.from(groups.entries())
      .map(([key, group]) => {
        const [year, month] = key.split('-').map(Number);
        const monthName = new Date(year, month, 1).toLocaleDateString('ru-RU', {
          month: 'long',
          year: 'numeric',
        });
        return { key, monthName, days: group };
      })
      .sort((a, b) => (a.key > b.key ? 1 : -1));
  }, [filteredDays]);

  const openCreateModal = () => {
    if (!canEdit) return;
    setEditingDay(null);
    setDraft({
      date: todayIso(),
      title: '',
      dayType: 'holidays',
      source: 'manual',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (day: ProductionCalendarDay) => {
    if (!canEdit) return;
    setEditingDay(day);
    setDraft({
      date: day.date,
      title: day.title ?? '',
      dayType: normalizeDayType(day),
      source: day.source ?? 'manual',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const payload = buildPayload(draft);
      if (editingDay) {
        await api.updateProductionCalendarDay(editingDay.id, payload);
      } else {
        await api.createProductionCalendarDay(payload);
      }
      await loadDays();
      setIsModalOpen(false);
    } catch (error) {
      alert('Ошибка при сохранении дня: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!confirm('Удалить запись?')) return;
    try {
      await api.deleteProductionCalendarDay(id);
      await loadDays();
    } catch (error) {
      alert('Ошибка при удалении: ' + (error as Error).message);
    }
  };

  const normalizeImportEntry = (
    entry: Partial<ProductionCalendarDayUpsert> & { date?: string; dayType?: DayType | null },
    sourceLabel?: string
  ): ProductionCalendarDayUpsert => {
    if (!entry.date) {
      throw new Error('Каждая запись должна содержать поле date.');
    }
    const dayType =
      entry.dayType ?? (entry.isHoliday === false ? 'preholidays' : 'holidays');
    if (!dayTypeLabels[dayType]) {
      throw new Error('Неизвестный тип дня: ' + entry.dayType);
    }
    return {
      date: entry.date,
      title: entry.title ?? '',
      dayType,
      isHoliday: dayType !== 'preholidays',
      source: entry.source ?? sourceLabel ?? 'import',
    };
  };

  const parseImportedJson = (raw: string, sourceLabel?: string) => {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => normalizeImportEntry(entry, sourceLabel));
    }
    if (parsed && (parsed.holidays || parsed.preholidays || parsed.nowork)) {
      const entries: ProductionCalendarDayUpsert[] = [];
      if (Array.isArray(parsed.holidays)) {
        entries.push(
          ...parsed.holidays.map((date: string) =>
            normalizeImportEntry({ date, dayType: 'holidays' }, sourceLabel)
          )
        );
      }
      if (Array.isArray(parsed.preholidays)) {
        entries.push(
          ...parsed.preholidays.map((date: string) =>
            normalizeImportEntry({ date, dayType: 'preholidays' }, sourceLabel)
          )
        );
      }
      if (Array.isArray(parsed.nowork)) {
        entries.push(
          ...parsed.nowork.map((date: string) =>
            normalizeImportEntry({ date, dayType: 'nowork' }, sourceLabel)
          )
        );
      }
      return entries;
    }
    throw new Error('Неверный формат JSON для импорта.');
  };

  const applyImportedEntries = async (
    entries: ProductionCalendarDayUpsert[],
    sourceLabel?: string
  ) => {
    const uniqueEntries = new Map(entries.map((entry) => [entry.date, entry]));
    const existingByDate = new Map(days.map((day) => [day.date, day]));
    const tasks = Array.from(uniqueEntries.values()).map((entry) => {
      const normalized = normalizeImportEntry(entry, sourceLabel);
      const existing = existingByDate.get(normalized.date);
      if (existing) {
        return api.updateProductionCalendarDay(existing.id, normalized);
      }
      return api.createProductionCalendarDay(normalized);
    });
    await Promise.all(tasks);
    await loadDays();
  };

  const handleImportJson = async () => {
    if (!canEdit) {
      return;
    }
    if (!importJson.trim()) {
      setImportError('Вставьте JSON для импорта.');
      return;
    }
    setImporting(true);
    setImportStatus('Импортируем JSON...');
    setImportError(null);
    try {
      const entries = parseImportedJson(importJson, 'manual-json');
      await applyImportedEntries(entries, 'manual-json');
      setImportJson('');
      setImportStatus('Импорт JSON завершён.');
    } catch (error) {
      setImportError((error as Error).message);
      setImportStatus('');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFromUrl = async (urlOverride?: string) => {
    if (!canEdit) {
      return;
    }
    const urlToFetch = urlOverride ?? importUrl;
    if (!urlToFetch.trim()) {
      setImportError('Укажите URL для импорта.');
      return;
    }
    setImporting(true);
    setImportStatus('Скачиваем календарь...');
    setImportError(null);
    try {
      await api.importProductionCalendar(urlToFetch);
      await loadDays();
      setImportStatus('Импорт из URL завершён.');
    } catch (error) {
      setImportError((error as Error).message);
      setImportStatus('');
    } finally {
      setImporting(false);
    }
  };

  const handleAutoImport = async () => {
    if (!canEdit) {
      return;
    }
    setImportUrl(defaultCalendarUrl);
    setImportStatus('Запускаем автозагрузку календаря...');
    await handleImportFromUrl(defaultCalendarUrl);
  };

  const handleRefresh = async () => {
    if (!confirm('Обновить данные календаря?')) {
      return;
    }
    await loadDays();
  };

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Производственный календарь</h2>
          <p className="text-gray-500">
            Управляйте календарем, импортируйте JSON и быстро обновляйте данные по типам дней.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              canEdit
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'cursor-not-allowed bg-red-200 text-white/80'
            }`}
          >
            <CalendarPlus className="h-4 w-4" />
            Добавить день
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Календарь</h3>
              <p className="text-sm text-gray-500">
                Отображение дней с учетом выбранного года и типа.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Год</label>
              <select
                value={yearFilter}
                onChange={(e) => {
                  isYearSelectionLocked.current = true;
                  setYearFilter(e.target.value);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">Все</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {loading ? (
              <div className="py-12 text-center text-gray-500">Загрузка...</div>
            ) : filteredDays.length === 0 ? (
              <div className="py-12 text-center text-gray-500">Дней пока нет.</div>
            ) : (
              groupedByMonth.map((group) => (
                <div key={group.key} className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {group.monthName}
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.days.map((day) => {
                      const dayType = normalizeDayType(day);
                      return (
                        <div
                          key={day.id}
                          className="flex h-full flex-col justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
                        >
                          <div>
                            <div className="font-semibold text-gray-900">
                              {formatDate(day.date)}
                              {day.title ? ` — ${day.title}` : ''}
                            </div>
                            <div className="text-xs text-gray-500">
                              {dayTypeLabels[dayType]} · {dayTypeDescriptions[dayType]}
                              {day.source ? ` · ${day.source}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(day)}
                              disabled={!canEdit}
                              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                                canEdit
                                  ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                  : 'cursor-not-allowed border-gray-100 text-gray-300'
                              }`}
                            >
                              <Pencil className="h-4 w-4" />
                              Редактировать
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(day.id)}
                              disabled={!canDelete}
                              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                                canDelete
                                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                                  : 'cursor-not-allowed border-red-100 text-red-200'
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Удалить
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Импорт JSON</h3>
            <p className="text-sm text-gray-500">
              Загрузите JSON с типами дней или вставьте структуру с полями holidays,
              preholidays, nowork.
            </p>
            <div className="space-y-3">
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Вставьте JSON для импорта"
                disabled={!canEdit}
                className="min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={handleImportJson}
                disabled={importing || !canEdit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UploadCloud className="h-4 w-4" />
                Импортировать JSON
              </button>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Импорт по URL
                </label>
                <div className="grid gap-2">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="URL с календарем"
                    disabled={!canEdit}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => void handleImportFromUrl()}
                    disabled={importing || !canEdit}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    Скачать и заполнить
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoImport}
                    disabled={importing || !canEdit}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    Автозагрузка календаря
                  </button>
                </div>
              </div>
              {importStatus && !importError && (
                <p className="text-sm text-gray-500">{importStatus}</p>
              )}
              {importError && <p className="text-sm text-red-600">{importError}</p>}
            </div>
            <details className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              <summary className="cursor-pointer font-semibold text-gray-700">
                Формат JSON
              </summary>
              <pre className="mt-3 whitespace-pre-wrap">
{`{
  "holidays": ["2024-01-01", "2024-01-02"],
  "preholidays": ["2024-02-22"],
  "nowork": ["2024-05-10"]
}

или массив объектов:
[
  { "date": "2024-01-01", "dayType": "holidays", "title": "Новый год" },
  { "date": "2024-02-22", "dayType": "preholidays" }
]`}
              </pre>
            </details>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Типы дней</h3>
            <div className="space-y-2 text-sm text-gray-600">
              {Object.entries(dayTypeDescriptions).map(([type, description]) => (
                <div key={type} className="rounded-lg border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900">
                    {dayTypeLabels[type as DayType]}
                  </div>
                  <div>{description}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingDay ? 'Редактировать день' : 'Добавить день'}
                </h3>
                <p className="text-sm text-gray-500">
                  Укажите тип дня, дату и при необходимости название (необязательно).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-2 py-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-600">
                <span>Дата</span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-600">
                <span>Тип дня</span>
                <select
                  value={draft.dayType}
                  onChange={(e) => setDraft({ ...draft, dayType: e.target.value as DayType })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {Object.entries(dayTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-gray-600 md:col-span-2">
                <span>Название (необязательно)</span>
                <input
                  type="text"
                  value={draft.title ?? ''}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Например, Новогодние каникулы"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-600 md:col-span-2">
                <span>Источник (необязательно)</span>
                <input
                  type="text"
                  value={draft.source ?? ''}
                  onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                  placeholder="manual, consultant, superjob и т.д."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !canEdit}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
