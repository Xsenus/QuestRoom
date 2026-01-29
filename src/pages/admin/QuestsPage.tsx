import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Quest,
  QuestDateOverride,
  QuestScheduleConfig,
  QuestWeeklySlot,
  QuestUpsert,
  DurationBadge,
} from '../../lib/types';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X, Upload, Star } from 'lucide-react';

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [durationBadges, setDurationBadges] = useState<DurationBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuest, setEditingQuest] = useState<(QuestUpsert & { id?: string }) | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'schedule'>('details');
  const [weeklySlots, setWeeklySlots] = useState<QuestWeeklySlot[]>([]);
  const [dateOverrides, setDateOverrides] = useState<QuestDateOverride[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(1);

  const dayOptions = [
    { value: 1, label: 'Пн' },
    { value: 2, label: 'Вт' },
    { value: 3, label: 'Ср' },
    { value: 4, label: 'Чт' },
    { value: 5, label: 'Пт' },
    { value: 6, label: 'Сб' },
    { value: 0, label: 'Вс' },
  ];

  const ensureMainImageInList = (images: string[] = [], mainImage: string | null) => {
    if (mainImage && !images.includes(mainImage)) {
      return [mainImage, ...images];
    }
    return images;
  };

  const normalizeOptional = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };
  const formatAgeRating = (value?: string | null) => {
    const trimmed = value?.trim() ?? '';
    const match = trimmed.match(/^(\d+)\s*\+$/);
    return match ? `${match[1]} +` : trimmed;
  };
  const extractAgeRatingNumber = (value?: string | null) => {
    const trimmed = value?.trim() ?? '';
    const match = trimmed.match(/^(\d+)/);
    return match ? match[1] : '';
  };
  useEffect(() => {
    loadQuests();
    loadDurationBadges();
  }, []);

  useEffect(() => {
    if (editingQuest?.id) {
      loadScheduleConfig(editingQuest.id);
    } else {
      setWeeklySlots([]);
      setDateOverrides([]);
    }
  }, [editingQuest?.id]);

  const loadDurationBadges = async () => {
    try {
      const data = await api.getDurationBadges();
      setDurationBadges(data || []);
    } catch (error) {
      console.error('Error loading duration badges:', error);
    }
  };

  const loadQuests = async () => {
    try {
      const data = await api.getQuests();
      setQuests(data || []);
    } catch (error) {
      console.error('Error loading quests:', error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingQuest({
      title: '',
      description: '',
      addresses: [],
      phones: [],
      participantsMin: 2,
      participantsMax: 6,
      extraParticipantsMax: 0,
      extraParticipantPrice: 0,
      ageRestriction: '',
      ageRating: '18 +',
      price: 0,
      duration: 60,
      difficulty: 2,
      difficultyMax: 5,
      isNew: false,
      isVisible: true,
      mainImage: null,
      images: [],
      giftGameLabel: 'Подарить игру',
      giftGameUrl: '/certificate',
      videoUrl: '',
      sortOrder: quests.length,
      extraServices: [],
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingQuest) return;

    const { id, ...payload } = editingQuest;
    const normalizedPayload: QuestUpsert = {
      ...payload,
      giftGameLabel: normalizeOptional(payload.giftGameLabel) || 'Подарить игру',
      giftGameUrl: normalizeOptional(payload.giftGameUrl) || '/certificate',
      videoUrl: normalizeOptional(payload.videoUrl),
    };

    try {
      if (isCreating) {
        await api.createQuest(normalizedPayload);
      } else if (id) {
        await api.updateQuest(id, normalizedPayload);
      }
    } catch (error) {
      alert('Ошибка при сохранении квеста: ' + (error as Error).message);
      return;
    }

    setEditingQuest(null);
    setIsCreating(false);
    loadQuests();
  };

  const handleCancel = () => {
    setEditingQuest(null);
    setIsCreating(false);
  };

  const handleToggleVisibility = async (quest: Quest) => {
    try {
      const payload: QuestUpsert = {
        title: quest.title,
        description: quest.description,
        addresses: quest.addresses || [],
        phones: quest.phones || [],
        participantsMin: quest.participantsMin,
        participantsMax: quest.participantsMax,
        extraParticipantsMax: quest.extraParticipantsMax,
        extraParticipantPrice: quest.extraParticipantPrice,
        ageRestriction: quest.ageRestriction,
        ageRating: quest.ageRating,
        price: quest.price,
        duration: quest.duration,
        difficulty: quest.difficulty || 1,
        difficultyMax: quest.difficultyMax || 5,
        isNew: quest.isNew,
        isVisible: !quest.isVisible,
        mainImage: quest.mainImage,
        images: quest.images || [],
        giftGameLabel: quest.giftGameLabel,
        giftGameUrl: quest.giftGameUrl,
        videoUrl: quest.videoUrl,
        sortOrder: quest.sortOrder,
        extraServices: quest.extraServices || [],
      };
      await api.updateQuest(quest.id, payload);
      loadQuests();
    } catch (error) {
      alert('Ошибка при изменении видимости: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот квест?')) return;

    try {
      await api.deleteQuest(id);
      loadQuests();
    } catch (error) {
      alert('Ошибка при удалении квеста: ' + (error as Error).message);
    }
  };

  const addExtraService = () => {
    if (!editingQuest) return;
    const extraServices = editingQuest.extraServices || [];
    setEditingQuest({
      ...editingQuest,
      extraServices: [...extraServices, { title: '', price: 0 }],
    });
  };

  const updateExtraService = (index: number, field: 'title' | 'price', value: string) => {
    if (!editingQuest) return;
    const extraServices = [...(editingQuest.extraServices || [])];
    extraServices[index] = {
      ...extraServices[index],
      [field]: field === 'price' ? Number(value) : value,
    };
    setEditingQuest({ ...editingQuest, extraServices });
  };

  const removeExtraService = (index: number) => {
    if (!editingQuest) return;
    const extraServices = [...(editingQuest.extraServices || [])];
    extraServices.splice(index, 1);
    setEditingQuest({ ...editingQuest, extraServices });
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  const addPhone = () => {
    const phones = editingQuest?.phones || [];
    setEditingQuest({ ...editingQuest, phones: [...phones, ''] });
  };

  const updatePhone = (index: number, value: string) => {
    const phones = [...(editingQuest?.phones || [])];
    phones[index] = value;
    setEditingQuest({ ...editingQuest, phones });
  };

  const removePhone = (index: number) => {
    const phones = [...(editingQuest?.phones || [])];
    phones.splice(index, 1);
    setEditingQuest({ ...editingQuest, phones });
  };

  const addAddress = () => {
    const addresses = editingQuest?.addresses || [];
    setEditingQuest({ ...editingQuest, addresses: [...addresses, ''] });
  };

  const updateAddress = (index: number, value: string) => {
    const addresses = [...(editingQuest?.addresses || [])];
    addresses[index] = value;
    setEditingQuest({ ...editingQuest, addresses });
  };

  const removeAddress = (index: number) => {
    const addresses = [...(editingQuest?.addresses || [])];
    addresses.splice(index, 1);
    setEditingQuest({ ...editingQuest, addresses });
  };

  const addImage = (url: string) => {
    const images = editingQuest?.images || [];
    setEditingQuest({ ...editingQuest, images: [...images, url] });
  };

  const setMainImage = (url: string) => {
    setEditingQuest({ ...editingQuest, mainImage: url });
  };

  const removeImage = (index: number) => {
    const images = [...(editingQuest?.images || [])];
    const removedUrl = images[index];
    images.splice(index, 1);

    if (editingQuest?.mainImage === removedUrl) {
      setEditingQuest({ ...editingQuest, images, mainImage: images[0] || null });
    } else {
      setEditingQuest({ ...editingQuest, images });
    }
  };

  const handleImageUpload = async (file?: File) => {
    if (!file || !editingQuest) return;

    try {
      const image = await api.uploadImage(file);
      const images = [...(editingQuest.images || []), image.url];
      setEditingQuest({
        ...editingQuest,
        images,
        mainImage: editingQuest.mainImage || image.url,
      });
    } catch (error) {
      alert('Ошибка загрузки изображения: ' + (error as Error).message);
    }
  };

  const handleEditQuest = (quest: Quest) => {
    setEditingQuest({
      ...quest,
      images: ensureMainImageInList(quest.images || [], quest.mainImage),
      giftGameLabel: quest.giftGameLabel || 'Подарить игру',
      giftGameUrl: quest.giftGameUrl || '/certificate',
      videoUrl: quest.videoUrl || '',
    });
    setIsCreating(false);
    setActiveTab('details');
  };

  const loadScheduleConfig = async (questId: string) => {
    setScheduleLoading(true);
    try {
      const config = await api.getQuestScheduleConfig(questId);
      setWeeklySlots(config.weeklySlots || []);
      setDateOverrides(config.dateOverrides || []);
      setScheduleMessage('');
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
      setScheduleMessage('Не удалось загрузить расписание.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleScheduleSave = async () => {
    if (!editingQuest?.id) {
      setScheduleMessage('Сначала сохраните карточку квеста.');
      return;
    }

    setScheduleSaving(true);
    setScheduleMessage('');
    try {
      const payload: Omit<QuestScheduleConfig, 'questId'> = {
        weeklySlots,
        dateOverrides,
      };
      await api.updateQuestScheduleConfig(editingQuest.id, payload);
      setScheduleMessage('Расписание сохранено.');
    } catch (error) {
      setScheduleMessage(`Ошибка сохранения: ${(error as Error).message}`);
    } finally {
      setScheduleSaving(false);
    }
  };

  const updateWeeklySlot = (index: number, patch: Partial<QuestWeeklySlot>) => {
    setWeeklySlots((prev) =>
      prev.map((slot, idx) => (idx === index ? { ...slot, ...patch } : slot))
    );
  };

  const removeWeeklySlot = (index: number) => {
    setWeeklySlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addWeeklySlot = () => {
    setWeeklySlots((prev) => [
      ...prev,
      {
        dayOfWeek: selectedDay,
        timeSlot: '10:00',
        price: 0,
        holidayPrice: null,
      },
    ]);
  };

  const updateOverride = (index: number, patch: Partial<QuestDateOverride>) => {
    setDateOverrides((prev) =>
      prev.map((override, idx) => (idx === index ? { ...override, ...patch } : override))
    );
  };

  const removeOverride = (index: number) => {
    setDateOverrides((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addOverride = () => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    setDateOverrides((prev) => [
      ...prev,
      {
        date: iso,
        isClosed: false,
        slots: [],
      },
    ]);
  };

  const addOverrideSlot = (overrideIndex: number) => {
    setDateOverrides((prev) =>
      prev.map((override, idx) =>
        idx === overrideIndex
          ? {
              ...override,
              slots: [
                ...override.slots,
                {
                  timeSlot: '10:00',
                  price: 0,
                },
              ],
            }
          : override
      )
    );
  };

  const updateOverrideSlot = (
    overrideIndex: number,
    slotIndex: number,
    patch: Partial<QuestDateOverride['slots'][number]>
  ) => {
    setDateOverrides((prev) =>
      prev.map((override, idx) =>
        idx === overrideIndex
          ? {
              ...override,
              slots: override.slots.map((slot, sidx) =>
                sidx === slotIndex ? { ...slot, ...patch } : slot
              ),
            }
          : override
      )
    );
  };

  const removeOverrideSlot = (overrideIndex: number, slotIndex: number) => {
    setDateOverrides((prev) =>
      prev.map((override, idx) =>
        idx === overrideIndex
          ? { ...override, slots: override.slots.filter((_, sidx) => sidx !== slotIndex) }
          : override
      )
    );
  };

  if (editingQuest) {
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Создание квеста' : 'Редактирование квеста'}
          </h2>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'details'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Карточка квеста
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Время и цены
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-800">Основная информация</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Название квеста
              </label>
              <input
                type="text"
                value={editingQuest.title || ''}
                onChange={(e) =>
                  setEditingQuest({ ...editingQuest, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="ШЕРЛОК"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                value={editingQuest.description || ''}
                onChange={(e) =>
                  setEditingQuest({ ...editingQuest, description: e.target.value })
                }
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Подробное описание квеста..."
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Медиа и ссылки</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Изображения квеста
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Загрузить файл
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0])}
                    />
                  </label>
                  <span className="text-sm text-gray-500">
                    Можно загрузить изображение в базу или вставить URL вручную.
                  </span>
                </div>
                {(editingQuest.images || []).map((img, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={img}
                      onChange={(e) => {
                        const newImages = [...(editingQuest.images || [])];
                        newImages[index] = e.target.value;
                        setEditingQuest({ ...editingQuest, images: newImages });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="URL изображения"
                    />
                    {editingQuest.mainImage === img && (
                      <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                        Основное
                      </span>
                    )}
                    <button
                      onClick={() => setMainImage(img)}
                      className={`p-2 rounded-lg transition-colors ${
                        editingQuest.mainImage === img
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title="Сделать основным"
                    >
                      <Star
                        className="w-5 h-5"
                        fill={editingQuest.mainImage === img ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      onClick={() => removeImage(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addImage('')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить изображение
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Текст кнопки «Подарить игру»
                </label>
                <input
                  type="text"
                  value={editingQuest.giftGameLabel || ''}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, giftGameLabel: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Подарить игру"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ссылка для «Подарить игру»
                </label>
                <input
                  type="text"
                  value={editingQuest.giftGameUrl || ''}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, giftGameUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="/certificate"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ссылка на видео (YouTube)
                </label>
                <input
                  type="text"
                  value={editingQuest.videoUrl || ''}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, videoUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Контакты</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Адреса
              </label>
              <div className="space-y-3">
                {(editingQuest.addresses || []).map((addr, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={addr}
                      onChange={(e) => updateAddress(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="ул. Диксона, д. 1, стр. 4"
                    />
                    <button
                      onClick={() => removeAddress(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addAddress}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить адрес
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Телефоны
              </label>
              <div className="space-y-3">
                {(editingQuest.phones || []).map((phone, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => updatePhone(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="8 (391) 294-59-50"
                    />
                    <button
                      onClick={() => removePhone(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addPhone}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить телефон
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Параметры квеста</h3>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Длительность
                </label>
                <select
                  value={editingQuest.duration || 60}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, duration: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                >
                  {durationBadges.map(badge => (
                    <option key={badge.duration} value={badge.duration}>
                      {badge.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Мин. участников
                </label>
                <input
                  type="number"
                  value={editingQuest.participantsMin || 2}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      participantsMin: parseInt(e.target.value) || 2,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Макс. участников
                </label>
                <input
                  type="number"
                  value={editingQuest.participantsMax || 6}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                  participantsMax: parseInt(e.target.value) || 6,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Сложность
            </label>
            <input
              type="number"
              value={editingQuest.difficulty ?? 1}
              onChange={(e) =>
                setEditingQuest({
                  ...editingQuest,
                  difficulty: parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Максимум сложности
            </label>
            <input
              type="number"
              value={editingQuest.difficultyMax ?? 5}
              onChange={(e) =>
                setEditingQuest({
                  ...editingQuest,
                  difficultyMax: parseInt(e.target.value, 10) || 5,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              min="1"
            />
          </div>
        </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Доплаты и услуги</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Доп. участников (максимум)
                </label>
                <input
                  type="number"
                  value={editingQuest.extraParticipantsMax || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      extraParticipantsMax: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  min="0"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Сколько игроков можно добавить сверх максимума.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Доплата за доп. участника (₽)
                </label>
                <input
                  type="number"
                  value={editingQuest.extraParticipantPrice || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      extraParticipantPrice: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Дополнительные услуги
              </label>
              <div className="space-y-3">
                {(editingQuest.extraServices || []).map((service, index) => (
                  <div key={service.id ?? index} className="grid md:grid-cols-[2fr_1fr_auto] gap-3">
                    <input
                      type="text"
                      value={service.title || ''}
                      onChange={(e) => updateExtraService(index, 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="Название услуги"
                    />
                    <input
                      type="number"
                      value={service.price || 0}
                      onChange={(e) => updateExtraService(index, 'price', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="Цена"
                      min="0"
                    />
                    <button
                      onClick={() => removeExtraService(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      title="Удалить услугу"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addExtraService}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить услугу
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Возраст и стоимость</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Возрастное ограничение
                </label>
                <input
                  type="text"
                  value={editingQuest.ageRestriction || ''}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      ageRestriction: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="С 6 лет родителями или с 14 лет самостоятельно"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Возрастной рейтинг
                </label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={extractAgeRatingNumber(editingQuest.ageRating)}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      ageRating: formatAgeRating(`${e.target.value} +`),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="12"
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
                  value={editingQuest.price || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="2500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={editingQuest.sortOrder || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Отображение</h3>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingQuest.isNew || false}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, isNew: e.target.checked })
                  }
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Показывать бейдж "NEW"
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingQuest.isVisible !== false}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, isVisible: e.target.checked })
                  }
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Показывать на главной странице
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Save className="w-5 h-5" />
                Сохранить
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <X className="w-5 h-5" />
                Отмена
              </button>
            </div>
          </div>
          ) : (
            <div className="space-y-8">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold text-red-700">Как работает расписание</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Сначала задайте базовое расписание по дням недели: время и цена.</li>
                  <li>Если день в календаре отмечен как праздничный, применяется цена выходного/праздничного дня.</li>
                  <li>Для конкретной даты можно задать собственные слоты или закрыть запись.</li>
                  <li>Расписание автоматически применяется при открытии страницы квеста.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-800">Неделя: базовые слоты</h3>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700"
                  >
                    {dayOptions.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  {(weeklySlots
                    .map((slot, index) => ({ slot, index }))
                    .filter(({ slot }) => slot.dayOfWeek === selectedDay)
                    .sort((a, b) => a.slot.timeSlot.localeCompare(b.slot.timeSlot))
                  ).length === 0 && (
                    <p className="text-sm text-gray-500">Слоты на выбранный день пока не заданы.</p>
                  )}

                  {weeklySlots
                    .map((slot, index) => ({ slot, index }))
                    .filter(({ slot }) => slot.dayOfWeek === selectedDay)
                    .sort((a, b) => a.slot.timeSlot.localeCompare(b.slot.timeSlot))
                    .map(({ slot, index }) => (
                      <div key={`${slot.timeSlot}-${index}`} className="grid md:grid-cols-[120px_1fr_1fr_auto] gap-3 items-center">
                        <input
                          type="time"
                          value={slot.timeSlot}
                          onChange={(e) => updateWeeklySlot(index, { timeSlot: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Цена буднего дня
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={slot.price}
                            onChange={(e) =>
                              updateWeeklySlot(index, { price: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Цена выходного/праздника
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={slot.holidayPrice ?? ''}
                            onChange={(e) =>
                              updateWeeklySlot(index, {
                                holidayPrice: e.target.value ? parseInt(e.target.value) || 0 : null,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Не задано"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWeeklySlot(index)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                          title="Удалить слот"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                  <button
                    type="button"
                    onClick={addWeeklySlot}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить время
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-800">Исключения по датам</h3>
                  <button
                    type="button"
                    onClick={addOverride}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить дату
                  </button>
                </div>

                {dateOverrides.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Здесь можно задать индивидуальные цены или полностью закрыть запись на дату.
                  </p>
                )}

                <div className="space-y-4">
                  {dateOverrides
                    .slice()
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((override, index) => (
                      <div key={`${override.date}-${index}`} className="rounded-lg border border-gray-200 p-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                              Дата
                            </label>
                            <input
                              type="date"
                              value={override.date}
                              onChange={(e) => updateOverride(index, { date: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                            <input
                              type="checkbox"
                              checked={override.isClosed}
                              onChange={(e) =>
                                updateOverride(index, {
                                  isClosed: e.target.checked,
                                  slots: e.target.checked ? [] : override.slots,
                                })
                              }
                              className="w-4 h-4 text-red-600 rounded"
                            />
                            День закрыт для записи
                          </label>
                          <button
                            type="button"
                            onClick={() => removeOverride(index)}
                            className="ml-auto p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                            title="Удалить дату"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {!override.isClosed && (
                          <div className="space-y-3">
                            {override.slots.length === 0 && (
                              <p className="text-xs text-gray-500">
                                Слоты отсутствуют — добавьте время и цену.
                              </p>
                            )}
                            {override.slots.map((slot, slotIndex) => (
                              <div
                                key={`${slot.timeSlot}-${slotIndex}`}
                                className="grid md:grid-cols-[120px_1fr_auto] gap-3 items-center"
                              >
                                <input
                                  type="time"
                                  value={slot.timeSlot}
                                  onChange={(e) =>
                                    updateOverrideSlot(index, slotIndex, { timeSlot: e.target.value })
                                  }
                                  className="px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={slot.price}
                                  onChange={(e) =>
                                    updateOverrideSlot(index, slotIndex, {
                                      price: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Цена"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOverrideSlot(index, slotIndex)}
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                                  title="Удалить слот"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOverrideSlot(index)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Добавить время
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600">
                  {scheduleLoading ? 'Загрузка расписания...' : scheduleMessage || ' '}
                </div>
                <button
                  type="button"
                  onClick={handleScheduleSave}
                  disabled={scheduleSaving || scheduleLoading}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {scheduleSaving ? 'Сохранение...' : 'Сохранить расписание'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление квестами</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Создать квест
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`bg-white rounded-lg shadow-lg p-6 ${
              !quest.isVisible ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{quest.title}</h3>
                  {quest.isNew && (
                    <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      NEW
                    </span>
                  )}
                  {!quest.isVisible && (
                    <span className="bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                      СКРЫТ
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4 line-clamp-2">{quest.description}</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Адреса:</span>{' '}
                    {quest.addresses?.join(', ') || 'Не указаны'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Телефоны:</span>{' '}
                    {quest.phones?.join(', ') || 'Не указаны'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Участники:</span>{' '}
                    от {quest.participantsMin} до {quest.participantsMax} чел.
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Длительность:</span>{' '}
                    {quest.duration} минут
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Сложность:</span>{' '}
                    {quest.difficulty}/{quest.difficultyMax || 5}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Цена:</span> {quest.price} ₽
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Изображения:</span>{' '}
                    {quest.images?.length || 0} шт.
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEditQuest(quest)}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                  title="Редактировать"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleToggleVisibility(quest)}
                  className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                  title={quest.isVisible ? 'Скрыть' : 'Показать'}
                >
                  {quest.isVisible ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(quest.id)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {quests.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">Квесты не найдены</p>
            <p className="text-gray-500 mt-2">Создайте первый квест</p>
          </div>
        )}
      </div>
    </div>
  );
}
