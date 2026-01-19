import { useState, useEffect } from 'react';
import { supabase, Quest, DurationBadge } from '../../lib/supabase';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X, Upload, Star } from 'lucide-react';

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [durationBadges, setDurationBadges] = useState<DurationBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuest, setEditingQuest] = useState<Partial<Quest> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadQuests();
    loadDurationBadges();
  }, []);

  const loadDurationBadges = async () => {
    const { data, error } = await supabase
      .from('duration_badges')
      .select('*')
      .order('duration', { ascending: true });

    if (error) {
      console.error('Error loading duration badges:', error);
    } else {
      setDurationBadges(data || []);
    }
  };

  const loadQuests = async () => {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading quests:', error);
    } else {
      setQuests(data || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingQuest({
      title: '',
      description: '',
      addresses: [],
      phones: [],
      participants_min: 2,
      participants_max: 6,
      age_restriction: '',
      age_rating: '18+',
      price: 0,
      duration: 60,
      is_new: false,
      is_visible: true,
      main_image: null,
      images: [],
      sort_order: quests.length,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingQuest) return;

    if (isCreating) {
      const { error } = await supabase.from('quests').insert([editingQuest]);
      if (error) {
        alert('Ошибка при создании квеста: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('quests')
        .update(editingQuest)
        .eq('id', editingQuest.id);
      if (error) {
        alert('Ошибка при обновлении квеста: ' + error.message);
        return;
      }
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
    const { error } = await supabase
      .from('quests')
      .update({ is_visible: !quest.is_visible })
      .eq('id', quest.id);

    if (error) {
      alert('Ошибка при изменении видимости: ' + error.message);
    } else {
      loadQuests();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот квест?')) return;

    const { error } = await supabase.from('quests').delete().eq('id', id);

    if (error) {
      alert('Ошибка при удалении квеста: ' + error.message);
    } else {
      loadQuests();
    }
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
    setEditingQuest({ ...editingQuest, main_image: url });
  };

  const removeImage = (index: number) => {
    const images = [...(editingQuest?.images || [])];
    const removedUrl = images[index];
    images.splice(index, 1);

    if (editingQuest?.main_image === removedUrl) {
      setEditingQuest({ ...editingQuest, images, main_image: images[0] || null });
    } else {
      setEditingQuest({ ...editingQuest, images });
    }
  };

  if (editingQuest) {
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Создание квеста' : 'Редактирование квеста'}
          </h2>

          <div className="space-y-6">
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Изображения квеста
              </label>
              <div className="space-y-3">
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
                    <button
                      onClick={() => setMainImage(img)}
                      className={`p-2 rounded-lg transition-colors ${
                        editingQuest.main_image === img
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title="Сделать основным"
                    >
                      <Star className="w-5 h-5" fill={editingQuest.main_image === img ? 'currentColor' : 'none'} />
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
              {editingQuest.main_image && (
                <p className="text-sm text-gray-600 mt-2">
                  Основное изображение: {editingQuest.main_image}
                </p>
              )}
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

            <div className="grid md:grid-cols-3 gap-6">
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
                  value={editingQuest.participants_min || 2}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      participants_min: parseInt(e.target.value) || 2,
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
                  value={editingQuest.participants_max || 6}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      participants_max: parseInt(e.target.value) || 6,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  min="1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Возрастное ограничение
                </label>
                <input
                  type="text"
                  value={editingQuest.age_restriction || ''}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      age_restriction: e.target.value,
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
                <select
                  value={editingQuest.age_rating || '18+'}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, age_rating: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                >
                  <option value="6+">6+</option>
                  <option value="12+">12+</option>
                  <option value="16+">16+</option>
                  <option value="18+">18+</option>
                </select>
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
                  value={editingQuest.sort_order || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingQuest.is_new || false}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, is_new: e.target.checked })
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
                  checked={editingQuest.is_visible !== false}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, is_visible: e.target.checked })
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

      <div className="grid gap-6">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`bg-white rounded-lg shadow-lg p-6 ${
              !quest.is_visible ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{quest.title}</h3>
                  {quest.is_new && (
                    <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      NEW
                    </span>
                  )}
                  {!quest.is_visible && (
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
                    от {quest.participants_min} до {quest.participants_max} чел.
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Длительность:</span>{' '}
                    {quest.duration} минут
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
                  onClick={() => setEditingQuest(quest)}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                  title="Редактировать"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleToggleVisibility(quest)}
                  className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                  title={quest.is_visible ? 'Скрыть' : 'Показать'}
                >
                  {quest.is_visible ? (
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
