import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { ProductionCalendarDay, ProductionCalendarDayUpsert } from '../../lib/types';
import { CalendarPlus, RefreshCw, Trash2 } from 'lucide-react';

export default function ProductionCalendarPage() {
  const [days, setDays] = useState<ProductionCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [form, setForm] = useState<ProductionCalendarDayUpsert>({
    date: new Date().toISOString().split('T')[0],
    title: '',
    isHoliday: true,
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

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.createProductionCalendarDay(form);
      await loadDays();
    } catch (error) {
      alert('Ошибка при сохранении дня: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить запись?')) return;
    try {
      await api.deleteProductionCalendarDay(id);
      await loadDays();
    } catch (error) {
      alert('Ошибка при удалении: ' + (error as Error).message);
    }
  };

  const handleImport = async () => {
    if (!importUrl) {
      alert('Укажите ссылку для импорта.');
      return;
    }
    setSaving(true);
    try {
      await api.importProductionCalendar(importUrl);
      setImportUrl('');
      await loadDays();
    } catch (error) {
      alert('Ошибка импорта: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Производственный календарь</h2>
          <p className="text-gray-500">
            Добавляйте праздничные дни вручную или импортируйте список из внешнего сервиса.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDays}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Обновить
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Добавить день</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="text"
            placeholder="Название"
            value={form.title || ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <select
            value={form.isHoliday ? 'holiday' : 'work'}
            onChange={(e) => setForm({ ...form, isHoliday: e.target.value === 'holiday' })}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="holiday">Праздничный</option>
            <option value="work">Рабочий</option>
          </select>
          <input
            type="text"
            placeholder="Источник"
            value={form.source || ''}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          <CalendarPlus className="h-4 w-4" />
          Добавить
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Импорт</h3>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="URL с JSON массивом дат"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            Импортировать
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Формат: массив объектов с полями date (YYYY-MM-DD), title, isHoliday, source.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Загрузка...</div>
        ) : days.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Дней пока нет.</div>
        ) : (
          <div className="space-y-3">
            {days.map((day) => (
              <div
                key={day.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-gray-900">
                    {new Date(day.date).toLocaleDateString('ru-RU')}
                    {day.title ? ` — ${day.title}` : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    {day.isHoliday ? 'Праздничный день' : 'Рабочий день'}
                    {day.source ? ` · ${day.source}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(day.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
