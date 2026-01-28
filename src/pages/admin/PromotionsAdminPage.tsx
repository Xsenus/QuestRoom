import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Promotion, PromotionUpsert } from '../../lib/types';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X } from 'lucide-react';

export default function PromotionsAdminPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPromo, setEditingPromo] = useState<
    (PromotionUpsert & { id?: string }) | null
  >(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const data = await api.getPromotions();
      setPromotions(data || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingPromo({
      title: '',
      description: '',
      discountText: '',
      imageUrl: '',
      displayMode: 'text_description',
      showTitle: false,
      showDescription: false,
      showDiscountText: false,
      showPeriod: false,
      showImage: true,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: null,
      isActive: true,
      sortOrder: promotions.length,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingPromo) return;

    const { id, ...payload } = editingPromo;

    try {
      if (isCreating) {
        await api.createPromotion(payload);
      } else if (id) {
        await api.updatePromotion(id, payload);
      }
    } catch (error) {
      alert('Ошибка при сохранении акции: ' + (error as Error).message);
      return;
    }

    setEditingPromo(null);
    setIsCreating(false);
    loadPromotions();
  };

  const handleCancel = () => {
    setEditingPromo(null);
    setIsCreating(false);
  };

  const handleToggleActive = async (promo: Promotion) => {
    try {
      const { id, createdAt, updatedAt, ...payload } = promo;
      await api.updatePromotion(id, { ...payload, isActive: !promo.isActive });
      loadPromotions();
    } catch (error) {
      alert('Ошибка при изменении статуса: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту акцию?')) return;

    try {
      await api.deletePromotion(id);
      loadPromotions();
    } catch (error) {
      alert('Ошибка при удалении акции: ' + (error as Error).message);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (editingPromo) {
    const isUnlimited = !editingPromo.validUntil;
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Создание акции' : 'Редактирование акции'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Название акции
              </label>
              <input
                type="text"
                value={editingPromo.title || ''}
                onChange={(e) =>
                  setEditingPromo({ ...editingPromo, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Скидка 20% на все квесты"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Описание акции
              </label>
              <textarea
                value={editingPromo.description || ''}
                onChange={(e) =>
                  setEditingPromo({ ...editingPromo, description: e.target.value })
                }
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Подробное описание акции..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Текст скидки
              </label>
              <input
                type="text"
                value={editingPromo.discountText || ''}
                onChange={(e) =>
                  setEditingPromo({ ...editingPromo, discountText: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="-20%"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL изображения
              </label>
              <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                <input
                  type="text"
                  value={editingPromo.imageUrl || ''}
                  onChange={(e) =>
                    setEditingPromo({ ...editingPromo, imageUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="/images/promotions/promo1.jpg"
                />
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setIsUploadingImage(true);
                      try {
                        const uploaded = await api.uploadImage(file);
                        setEditingPromo({ ...editingPromo, imageUrl: uploaded.url });
                      } catch (error) {
                        alert('Ошибка загрузки изображения: ' + (error as Error).message);
                      } finally {
                        setIsUploadingImage(false);
                      }
                    }}
                  />
                  {isUploadingImage ? 'Загрузка...' : 'Загрузить файл'}
                </label>
              </div>
              {editingPromo.imageUrl && (
                <img
                  src={editingPromo.imageUrl}
                  alt="Preview"
                  className="mt-3 max-w-xs rounded-lg border"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Отображение на странице акций
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editingPromo.showTitle}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, showTitle: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Показывать название
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editingPromo.showDescription}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, showDescription: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Показывать описание
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editingPromo.showDiscountText}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, showDiscountText: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Показывать текст скидки
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editingPromo.showPeriod}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, showPeriod: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Показывать период действия
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editingPromo.showImage}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, showImage: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Показывать изображение
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Действует с
                </label>
                <input
                  type="date"
                  value={editingPromo.validFrom || ''}
                  onChange={(e) =>
                    setEditingPromo({ ...editingPromo, validFrom: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Действует до
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isUnlimited}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          validUntil: e.target.checked
                            ? null
                            : editingPromo.validFrom || new Date().toISOString().split('T')[0],
                        })
                      }
                      className="h-4 w-4"
                    />
                    Без ограничения
                  </label>
                  {!isUnlimited && (
                    <input
                      type="date"
                      value={editingPromo.validUntil || ''}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, validUntil: e.target.value || null })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={editingPromo.sortOrder || 0}
                  onChange={(e) =>
                    setEditingPromo({
                      ...editingPromo,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPromo.isActive !== false}
                  onChange={(e) =>
                    setEditingPromo({ ...editingPromo, isActive: e.target.checked })
                  }
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Акция активна
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
        <h2 className="text-3xl font-bold text-gray-900">Управление акциями</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Создать акцию
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className={`flex h-full flex-col rounded-lg bg-white p-6 shadow-lg ${
              !promo.isActive ? 'opacity-60' : ''
            }`}
          >
            <span
              className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                promo.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {promo.isActive ? 'Активна' : 'Неактивна'}
            </span>

            {promo.imageUrl && (
              <img
                src={promo.imageUrl}
                alt={promo.title}
                className="mt-4 h-48 w-full object-cover rounded-lg"
              />
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">{promo.title}</h3>
              {promo.discountText && (
                <span className="rounded-full bg-red-600 px-4 py-1 text-sm font-bold text-white">
                  {promo.discountText}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-600">{promo.description}</p>

            <div className="mt-4 text-sm text-gray-500">
              <p>
                Действует с: {new Date(promo.validFrom).toLocaleDateString('ru-RU')} до{' '}
                {promo.validUntil
                  ? new Date(promo.validUntil).toLocaleDateString('ru-RU')
                  : 'без ограничения'}
              </p>
            </div>

            <div className="mt-auto pt-4 flex justify-end gap-2">
              <button
                onClick={() =>
                  setEditingPromo({
                    ...promo,
                    showTitle: promo.showTitle ?? false,
                    showDescription: promo.showDescription ?? false,
                    showDiscountText: promo.showDiscountText ?? false,
                    showPeriod: promo.showPeriod ?? false,
                    showImage: promo.showImage ?? true,
                  })
                }
                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                title="Редактировать"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToggleActive(promo)}
                className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                title={promo.isActive ? 'Деактивировать' : 'Активировать'}
              >
                {promo.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => handleDelete(promo.id)}
                className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {promotions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">Акции не найдены</p>
            <p className="text-gray-500 mt-2">Создайте первую акцию</p>
          </div>
        )}
      </div>
    </div>
  );
}
