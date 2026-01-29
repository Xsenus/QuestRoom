import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import {
  QuestScheduleOverride,
  QuestScheduleOverrideUpsert,
  QuestWeeklySlot,
} from '../../lib/types';
import { CalendarClock, Plus, Save, Trash2, X, RefreshCw } from 'lucide-react';

const dayOptions = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 0, label: 'Воскресенье' },
];

const formatTime = (value: string) => value.slice(0, 5);

const getTodayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const addDays = (date: string, days: number) => {
  const base = new Date(date + 'T00:00:00');
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
};

const buildEmptyOverride = (questId: string): QuestScheduleOverrideUpsert => ({
  questId,
  date: getTodayISO(),
  isClosed: false,
  slots: [{ timeSlot: '10:00', price: 0 }],
});

type Props = {
  questId: string;
};

export default function QuestScheduleEditor({ questId }: Props) {
  const [weeklySlots, setWeeklySlots] = useState<QuestWeeklySlot[]>([]);
  const [overrides, setOverrides] = useState<QuestScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [newSlotTime, setNewSlotTime] = useState('10:00');
  const [newSlotPrice, setNewSlotPrice] = useState('');
  const [newSlotHolidayPrice, setNewSlotHolidayPrice] = useState('');
  const [editingOverride, setEditingOverride] = useState<
    (QuestScheduleOverrideUpsert & { id?: string }) | null
  >(null);
  const [importRange, setImportRange] = useState({
    from: getTodayISO(),
    to: addDays(getTodayISO(), 30),
  });
  const [importResult, setImportResult] = useState('');

  useEffect(() => {
    setLoading(true);
    loadWeeklySlots();
    loadOverrides();
  }, [questId]);

  const loadWeeklySlots = async () => {
    try {
      const data = await api.getQuestWeeklySlots(questId);
      setWeeklySlots(data || []);
    } catch (error) {
      console.error('Ошибка загрузки недельного расписания:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverrides = async () => {
    try {
      const data = await api.getQuestScheduleOverrides(questId);
      setOverrides(data || []);
    } catch (error) {
      console.error('Ошибка загрузки переопределений:', error);
    }
  };

  const slotsForDay = useMemo(() => {
    return weeklySlots
      .filter((slot) => slot.dayOfWeek === selectedDay)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [weeklySlots, selectedDay]);

  const handleUpdateSlotField = (
    slotId: string,
    field: 'timeSlot' | 'price' | 'holidayPrice',
    value: string
  ) => {
    setWeeklySlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        if (field === 'price') {
          return { ...slot, price: Number(value) || 0 };
        }
        if (field === 'holidayPrice') {
          return { ...slot, holidayPrice: value === '' ? null : Number(value) || 0 };
        }
        return { ...slot, timeSlot: value };
      })
    );
  };

  const handleSaveSlot = async (slot: QuestWeeklySlot) => {
    try {
      await api.updateQuestWeeklySlot(slot.id, {
        questId,
        dayOfWeek: slot.dayOfWeek,
        timeSlot: slot.timeSlot,
        price: slot.price,
        holidayPrice: slot.holidayPrice,
      });
      await loadWeeklySlots();
    } catch (error) {
      alert('Ошибка сохранения слота: ' + (error as Error).message);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Удалить слот?')) return;
    try {
      await api.deleteQuestWeeklySlot(slotId);
      await loadWeeklySlots();
    } catch (error) {
      alert('Ошибка удаления слота: ' + (error as Error).message);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlotTime) {
      alert('Укажите время.');
      return;
    }
    const price = Number(newSlotPrice);
    if (!Number.isFinite(price)) {
      alert('Укажите цену.');
      return;
    }

    try {
      await api.createQuestWeeklySlot({
        questId,
        dayOfWeek: selectedDay,
        timeSlot: newSlotTime,
        price,
        holidayPrice: newSlotHolidayPrice ? Number(newSlotHolidayPrice) : null,
      });
      setNewSlotTime('10:00');
      setNewSlotPrice('');
      setNewSlotHolidayPrice('');
      await loadWeeklySlots();
    } catch (error) {
      alert('Ошибка добавления слота: ' + (error as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      const result = await api.importQuestWeeklySlots(questId, {
        fromDate: importRange.from,
        toDate: importRange.to,
      });
      setImportResult(`Добавлено слотов: ${result.createdCount}`);
      await loadWeeklySlots();
    } catch (error) {
      setImportResult('Ошибка импорта: ' + (error as Error).message);
    }
  };

  const openOverrideEditor = (override?: QuestScheduleOverride) => {
    if (override) {
      setEditingOverride({
        id: override.id,
        questId,
        date: override.date,
        isClosed: override.isClosed,
        slots: override.slots.map((slot) => ({
          timeSlot: formatTime(slot.timeSlot),
          price: slot.price,
        })),
      });
    } else {
      setEditingOverride(buildEmptyOverride(questId));
    }
  };

  const updateOverrideSlot = (index: number, field: 'timeSlot' | 'price', value: string) => {
    if (!editingOverride) return;
    const slots = [...editingOverride.slots];
    slots[index] = {
      ...slots[index],
      [field]: field === 'price' ? Number(value) || 0 : value,
    };
    setEditingOverride({ ...editingOverride, slots });
  };

  const addOverrideSlot = () => {
    if (!editingOverride) return;
    setEditingOverride({
      ...editingOverride,
      slots: [...editingOverride.slots, { timeSlot: '10:00', price: 0 }],
    });
  };

  const removeOverrideSlot = (index: number) => {
    if (!editingOverride) return;
    const slots = [...editingOverride.slots];
    slots.splice(index, 1);
    setEditingOverride({ ...editingOverride, slots });
  };

  const handleSaveOverride = async () => {
    if (!editingOverride) return;
    if (!editingOverride.date) {
      alert('Укажите дату.');
      return;
    }

    const payload: QuestScheduleOverrideUpsert = {
      questId,
      date: editingOverride.date,
      isClosed: editingOverride.isClosed,
      slots: editingOverride.isClosed ? [] : editingOverride.slots,
    };

    try {
      if (editingOverride.id) {
        await api.updateQuestScheduleOverride(editingOverride.id, payload);
      } else {
        await api.createQuestScheduleOverride(payload);
      }
      setEditingOverride(null);
      await loadOverrides();
    } catch (error) {
      alert('Ошибка сохранения: ' + (error as Error).message);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm('Удалить переопределение?')) return;
    try {
      await api.deleteQuestScheduleOverride(overrideId);
      await loadOverrides();
    } catch (error) {
      alert('Ошибка удаления: ' + (error as Error).message);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка расписания...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <CalendarClock className="h-5 w-5 text-red-600" />
          Как работает расписание
        </div>
        <ul className="mt-3 space-y-2 text-gray-600">
          <li>1. В разделе «Недельное расписание» задайте слоты и цены по дням недели.</li>
          <li>
            2. Поле «Цена в праздники» применяется для выходных и дат из производственного
            календаря (праздники/выходные).
          </li>
          <li>
            3. В «Переопределениях» можно задать отдельные дни с индивидуальными слотами или
            полностью закрыть запись.
          </li>
          <li>
            4. После сохранения расписание автоматически подтягивается на странице квеста.
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-800">Недельное расписание</h3>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => setSelectedDay(day.value)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  selectedDay === day.value
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {slotsForDay.length === 0 ? (
          <p className="text-sm text-gray-500">Слотов для выбранного дня пока нет.</p>
        ) : (
          <div className="space-y-3">
            {slotsForDay.map((slot) => (
              <div
                key={slot.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-center"
              >
                <input
                  type="time"
                  value={formatTime(slot.timeSlot)}
                  onChange={(e) =>
                    handleUpdateSlotField(slot.id, 'timeSlot', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <input
                  type="number"
                  value={slot.price}
                  onChange={(e) => handleUpdateSlotField(slot.id, 'price', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Цена"
                  min="0"
                />
                <input
                  type="number"
                  value={slot.holidayPrice ?? ''}
                  onChange={(e) =>
                    handleUpdateSlotField(slot.id, 'holidayPrice', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Цена в праздники"
                  min="0"
                />
                <button
                  type="button"
                  onClick={() => handleSaveSlot(slot)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
                >
                  <Save className="w-4 h-4" />
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="flex items-center justify-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h4 className="font-semibold text-gray-700">Добавить слот</h4>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
            <input
              type="time"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <input
              type="number"
              value={newSlotPrice}
              onChange={(e) => setNewSlotPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="Цена"
              min="0"
            />
            <input
              type="number"
              value={newSlotHolidayPrice}
              onChange={(e) => setNewSlotHolidayPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="Цена в праздники"
              min="0"
            />
            <button
              type="button"
              onClick={handleAddSlot}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              <Plus className="w-4 h-4" />
              Добавить
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h4 className="font-semibold text-gray-700">Импорт из существующего расписания</h4>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
            <input
              type="date"
              value={importRange.from}
              onChange={(e) => setImportRange({ ...importRange, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <input
              type="date"
              value={importRange.to}
              onChange={(e) => setImportRange({ ...importRange, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <button
              type="button"
              onClick={handleImport}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              Импортировать
            </button>
          </div>
          {importResult && <p className="text-sm text-gray-600">{importResult}</p>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-800">Переопределения по датам</h3>
          <button
            type="button"
            onClick={() => openOverrideEditor()}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Plus className="w-4 h-4" />
            Добавить дату
          </button>
        </div>

        {overrides.length === 0 ? (
          <p className="text-sm text-gray-500">Переопределений пока нет.</p>
        ) : (
          <div className="space-y-3">
            {overrides.map((override) => (
              <div
                key={override.id}
                className="rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-gray-800">{override.date}</div>
                  {override.isClosed ? (
                    <div className="text-sm text-red-600">Запись закрыта</div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      {override.slots.length === 0
                        ? 'Слоты не заданы.'
                        : override.slots
                            .map((slot) => `${formatTime(slot.timeSlot)} · ${slot.price} ₽`)
                            .join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openOverrideEditor(override)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOverride(override.id)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg max-h-full overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingOverride.id ? 'Редактирование даты' : 'Новое переопределение'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingOverride(null)}
                className="inline-flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата
                  </label>
                  <input
                    type="date"
                    value={editingOverride.date}
                    onChange={(e) =>
                      setEditingOverride({ ...editingOverride, date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 mt-7">
                  <input
                    type="checkbox"
                    checked={editingOverride.isClosed}
                    onChange={(e) =>
                      setEditingOverride({ ...editingOverride, isClosed: e.target.checked })
                    }
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Закрыть запись на этот день
                  </span>
                </div>
              </div>

              {!editingOverride.isClosed && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-700">Слоты</h4>
                    <button
                      type="button"
                      onClick={addOverrideSlot}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить слот
                    </button>
                  </div>

                  {editingOverride.slots.length === 0 ? (
                    <p className="text-sm text-gray-500">Слоты не заданы.</p>
                  ) : (
                    <div className="space-y-3">
                      {editingOverride.slots.map((slot, index) => (
                        <div
                          key={`${slot.timeSlot}-${index}`}
                          className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center"
                        >
                          <input
                            type="time"
                            value={slot.timeSlot}
                            onChange={(e) =>
                              updateOverrideSlot(index, 'timeSlot', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          />
                          <input
                            type="number"
                            value={slot.price}
                            onChange={(e) =>
                              updateOverrideSlot(index, 'price', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            min="0"
                          />
                          <button
                            type="button"
                            onClick={() => removeOverrideSlot(index)}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleSaveOverride}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setEditingOverride(null)}
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
    </div>
  );
}
