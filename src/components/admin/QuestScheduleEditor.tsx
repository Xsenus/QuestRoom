import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import {
  QuestScheduleOverride,
  QuestScheduleOverrideUpsert,
  QuestScheduleSettingsUpsert,
  QuestWeeklySlot,
} from '../../lib/types';
import { CalendarClock, Plus, Save, Trash2, X } from 'lucide-react';
import NotificationModal from '../NotificationModal';
import { showAdminNotification } from '../../lib/adminNotifications';

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

const buildEmptyOverride = (questId: string): QuestScheduleOverrideUpsert => ({
  questId,
  date: getTodayISO(),
  isClosed: false,
  slots: [{ timeSlot: '10:00', price: 0 }],
});

type Props = {
  questId: string;
  canEdit: boolean;
};

export default function QuestScheduleEditor({ questId, canEdit }: Props) {
  const [weeklySlots, setWeeklySlots] = useState<QuestWeeklySlot[]>([]);
  const [overrides, setOverrides] = useState<QuestScheduleOverride[]>([]);
  const [holidayPriceInput, setHolidayPriceInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [newSlotTime, setNewSlotTime] = useState('10:00');
  const [newSlotPrice, setNewSlotPrice] = useState('');
  const [editingOverride, setEditingOverride] = useState<
    (QuestScheduleOverrideUpsert & { id?: string }) | null
  >(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadWeeklySlots(), loadOverrides(), loadSettings()])
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [questId]);

  const loadWeeklySlots = async () => {
    try {
      const data = await api.getQuestWeeklySlots(questId);
      setWeeklySlots(data || []);
    } catch (error) {
      console.error('Ошибка загрузки недельного расписания:', error);
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

  const loadSettings = async () => {
    try {
      const data = await api.getQuestScheduleSettings(questId);
      setHolidayPriceInput(
        data?.holidayPrice === null || data?.holidayPrice === undefined
          ? ''
          : String(data.holidayPrice)
      );
    } catch (error) {
      console.error('Ошибка загрузки настроек расписания:', error);
    }
  };

  const slotsForDay = useMemo(() => {
    return weeklySlots
      .filter((slot) => slot.dayOfWeek === selectedDay)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [weeklySlots, selectedDay]);

  const handleUpdateSlotField = (
    slotId: string,
    field: 'timeSlot' | 'price',
    value: string
  ) => {
    setWeeklySlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        if (field === 'price') {
          return { ...slot, price: Number(value) || 0 };
        }
        return { ...slot, timeSlot: value };
      })
    );
  };

  const handleSaveSlot = async (slot: QuestWeeklySlot) => {
    if (!canEdit) return;
    try {
      await api.updateQuestWeeklySlot(slot.id, {
        questId,
        dayOfWeek: slot.dayOfWeek,
        timeSlot: slot.timeSlot,
        price: slot.price,
      });
      await loadWeeklySlots();
    } catch (error) {
      showAdminNotification({ title: 'Уведомление', message: String('Ошибка сохранения слота: ' + (error as Error).message), tone: 'info' });
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    if (!canEdit) return;

    setPendingDeleteAction({
      title: 'Удаление слота',
      message: 'Удалить слот?',
      onConfirm: async () => {
        try {
          await api.deleteQuestWeeklySlot(slotId);
          await loadWeeklySlots();
        } catch (error) {
          showAdminNotification({ title: 'Уведомление', message: String('Ошибка удаления слота: ' + (error as Error).message), tone: 'info' });
        }
      },
    });
  };

  const handleAddSlot = async () => {
    if (!canEdit) return;
    if (!newSlotTime) {
      showAdminNotification({ title: 'Уведомление', message: String('Укажите время.'), tone: 'info' });
      return;
    }
    const price = Number(newSlotPrice);
    if (!Number.isFinite(price)) {
      showAdminNotification({ title: 'Уведомление', message: String('Укажите цену.'), tone: 'info' });
      return;
    }

    try {
      await api.createQuestWeeklySlot({
        questId,
        dayOfWeek: selectedDay,
        timeSlot: newSlotTime,
        price,
      });
      setNewSlotTime('10:00');
      setNewSlotPrice('');
      await loadWeeklySlots();
    } catch (error) {
      showAdminNotification({ title: 'Уведомление', message: String('Ошибка добавления слота: ' + (error as Error).message), tone: 'info' });
    }
  };

  const handleSaveSettings = async () => {
    if (!canEdit) return;
    const payload: QuestScheduleSettingsUpsert = {
      questId,
      holidayPrice: holidayPriceInput === '' ? null : Number(holidayPriceInput) || 0,
    };

    try {
      const updated = await api.updateQuestScheduleSettings(payload);
      setHolidayPriceInput(
        updated.holidayPrice === null || updated.holidayPrice === undefined
          ? ''
          : String(updated.holidayPrice)
      );
    } catch (error) {
      showAdminNotification({ title: 'Уведомление', message: String('Ошибка сохранения настроек: ' + (error as Error).message), tone: 'info' });
    }
  };

  const openOverrideEditor = (override?: QuestScheduleOverride) => {
    if (!canEdit) return;
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
    if (!canEdit) return;
    if (!editingOverride) return;
    const slots = [...editingOverride.slots];
    slots[index] = {
      ...slots[index],
      [field]: field === 'price' ? Number(value) || 0 : value,
    };
    setEditingOverride({ ...editingOverride, slots });
  };

  const addOverrideSlot = () => {
    if (!canEdit) return;
    if (!editingOverride) return;
    setEditingOverride({
      ...editingOverride,
      slots: [...editingOverride.slots, { timeSlot: '10:00', price: 0 }],
    });
  };

  const removeOverrideSlot = (index: number) => {
    if (!canEdit) return;
    if (!editingOverride) return;
    const slots = [...editingOverride.slots];
    slots.splice(index, 1);
    setEditingOverride({ ...editingOverride, slots });
  };

  const handleSaveOverride = async () => {
    if (!canEdit) return;
    if (!editingOverride) return;
    if (!editingOverride.date) {
      showAdminNotification({ title: 'Уведомление', message: String('Укажите дату.'), tone: 'info' });
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
      showAdminNotification({ title: 'Уведомление', message: String('Ошибка сохранения: ' + (error as Error).message), tone: 'info' });
    }
  };

  const handleDeleteOverride = (overrideId: string) => {
    if (!canEdit) return;

    setPendingDeleteAction({
      title: 'Удаление переопределения',
      message: 'Удалить переопределение?',
      onConfirm: async () => {
        try {
          await api.deleteQuestScheduleOverride(overrideId);
          await loadOverrides();
        } catch (error) {
          showAdminNotification({ title: 'Уведомление', message: String('Ошибка удаления: ' + (error as Error).message), tone: 'info' });
        }
      },
    });
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка расписания...</div>;
  }

  return (
    <>
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
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Цена в праздники (общая)
            </label>
            <input
              type="number"
              value={holidayPriceInput}
              onChange={(e) => setHolidayPriceInput(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="Например, 5000"
              min="0"
            />
            <p className="mt-2 text-xs text-gray-500">
              Используется для всех праздничных и выходных дат. Если не задано, берется базовая цена слота.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={!canEdit}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold ${
              canEdit
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'cursor-not-allowed bg-green-200 text-white/80'
            }`}
          >
            <Save className="w-4 h-4" />
            Сохранить
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-800">Недельное расписание</h3>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => setSelectedDay(day.value)}
                disabled={!canEdit}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  selectedDay === day.value && canEdit
                    ? 'bg-red-600 text-white border-red-600'
                    : canEdit
                      ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      : 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
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
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-center"
              >
                <input
                  type="time"
                  value={formatTime(slot.timeSlot)}
                  onChange={(e) =>
                    handleUpdateSlotField(slot.id, 'timeSlot', e.target.value)
                  }
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <input
                  type="number"
                  value={slot.price}
                  onChange={(e) => handleUpdateSlotField(slot.id, 'price', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Цена"
                  min="0"
                />
                <button
                  type="button"
                  onClick={() => handleSaveSlot(slot)}
                  disabled={!canEdit}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                    canEdit
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'cursor-not-allowed bg-green-200 text-white/80'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSlot(slot.id)}
                  disabled={!canEdit}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg ${
                    canEdit
                      ? 'bg-red-100 hover:bg-red-200 text-red-600'
                      : 'cursor-not-allowed bg-red-50 text-red-200'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h4 className="font-semibold text-gray-700">Добавить слот</h4>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
            <input
              type="time"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <input
              type="number"
              value={newSlotPrice}
              onChange={(e) => setNewSlotPrice(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="Цена"
              min="0"
            />
            <button
              type="button"
              onClick={handleAddSlot}
              disabled={!canEdit}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                canEdit
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'cursor-not-allowed bg-red-200 text-white/80'
              }`}
            >
              <Plus className="w-4 h-4" />
              Добавить
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-800">Переопределения по датам</h3>
          <button
            type="button"
            onClick={() => openOverrideEditor()}
            disabled={!canEdit}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
              canEdit
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'cursor-not-allowed bg-red-200 text-white/80'
            }`}
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
                    disabled={!canEdit}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      canEdit
                        ? 'bg-gray-100 hover:bg-gray-200'
                        : 'cursor-not-allowed bg-gray-100 text-gray-400'
                    }`}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOverride(override.id)}
                    disabled={!canEdit}
                    className={`px-3 py-2 rounded-lg ${
                      canEdit
                        ? 'bg-red-100 hover:bg-red-200 text-red-600'
                        : 'cursor-not-allowed bg-red-50 text-red-200'
                    }`}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                      disabled={!canEdit}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                        canEdit
                          ? 'bg-gray-100 hover:bg-gray-200'
                          : 'cursor-not-allowed bg-gray-100 text-gray-400'
                      }`}
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
                            disabled={!canEdit}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          />
                          <input
                            type="number"
                            value={slot.price}
                            onChange={(e) =>
                              updateOverrideSlot(index, 'price', e.target.value)
                            }
                            disabled={!canEdit}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            min="0"
                          />
                          <button
                            type="button"
                            onClick={() => removeOverrideSlot(index)}
                            disabled={!canEdit}
                            className={`p-2 rounded-lg ${
                              canEdit
                                ? 'bg-red-100 hover:bg-red-200 text-red-600'
                                : 'cursor-not-allowed bg-red-50 text-red-200'
                            }`}
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

      <NotificationModal
        isOpen={Boolean(pendingDeleteAction)}
        title={pendingDeleteAction?.title ?? ''}
        message={pendingDeleteAction?.message ?? ''}
        tone="info"
        showToneLabel={false}
        actions={(
          <>
            <button
              type="button"
              onClick={() => setPendingDeleteAction(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!pendingDeleteAction) return;
                await pendingDeleteAction.onConfirm();
                setPendingDeleteAction(null);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Удалить
            </button>
          </>
        )}
        onClose={() => setPendingDeleteAction(null)}
      />
    </>
  );
}
