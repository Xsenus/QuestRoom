import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Review, ReviewUpsert } from '../../lib/types';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X, Star } from 'lucide-react';

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<
    (ReviewUpsert & { id?: string }) | null
  >(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') {
      return 'cards';
    }
    const saved = localStorage.getItem('admin_reviews_view');
    return saved === 'table' ? 'table' : 'cards';
  });

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_reviews_view', viewMode);
    }
  }, [viewMode]);

  const loadReviews = async () => {
    try {
      const data = await api.getReviews();
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingReview({
      customerName: '',
      questTitle: '',
      rating: 5,
      reviewText: '',
      reviewDate: new Date().toISOString().split('T')[0],
      isVisible: true,
      isFeatured: false,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingReview) return;

    const { id, ...payload } = editingReview;

    try {
      if (isCreating) {
        await api.createReview(payload);
      } else if (id) {
        await api.updateReview(id, payload);
      }
    } catch (error) {
      alert('Ошибка при сохранении отзыва: ' + (error as Error).message);
      return;
    }

    setEditingReview(null);
    setIsCreating(false);
    loadReviews();
  };

  const handleCancel = () => {
    setEditingReview(null);
    setIsCreating(false);
  };

  const handleToggleVisibility = async (review: Review) => {
    try {
      const { id, createdAt, updatedAt, ...payload } = review;
      await api.updateReview(id, { ...payload, isVisible: !review.isVisible });
      loadReviews();
    } catch (error) {
      alert('Ошибка при изменении видимости: ' + (error as Error).message);
    }
  };

  const handleToggleFeatured = async (review: Review) => {
    try {
      const { id, createdAt, updatedAt, ...payload } = review;
      await api.updateReview(id, { ...payload, isFeatured: !review.isFeatured });
      loadReviews();
    } catch (error) {
      alert('Ошибка при изменении статуса избранного: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return;

    try {
      await api.deleteReview(id);
      loadReviews();
    } catch (error) {
      alert('Ошибка при удалении отзыва: ' + (error as Error).message);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (editingReview) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Добавление отзыва' : 'Редактирование отзыва'}
          </h2>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Имя клиента
                </label>
                <input
                  type="text"
                  value={editingReview.customerName || ''}
                  onChange={(e) =>
                    setEditingReview({ ...editingReview, customerName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Название квеста
                </label>
                <input
                  type="text"
                  value={editingReview.questTitle || ''}
                  onChange={(e) =>
                    setEditingReview({ ...editingReview, questTitle: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="ШЕРЛОК"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Рейтинг (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={editingReview.rating || 5}
                  onChange={(e) =>
                    setEditingReview({
                      ...editingReview,
                      rating: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Дата отзыва
                </label>
                <input
                  type="date"
                  value={editingReview.reviewDate || ''}
                  onChange={(e) =>
                    setEditingReview({ ...editingReview, reviewDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Текст отзыва
              </label>
              <textarea
                value={editingReview.reviewText || ''}
                onChange={(e) =>
                  setEditingReview({ ...editingReview, reviewText: e.target.value })
                }
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Отличный квест! Очень понравилось..."
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingReview.isVisible !== false}
                  onChange={(e) =>
                    setEditingReview({ ...editingReview, isVisible: e.target.checked })
                  }
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Показывать на сайте
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingReview.isFeatured || false}
                  onChange={(e) =>
                    setEditingReview({ ...editingReview, isFeatured: e.target.checked })
                  }
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Избранный отзыв
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление отзывами</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Карточки
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Таблица
            </button>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Добавить отзыв
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Клиент</th>
                <th className="text-left px-4 py-3 font-semibold">Квест</th>
                <th className="text-left px-4 py-3 font-semibold">Рейтинг</th>
                <th className="text-left px-4 py-3 font-semibold">Отзыв</th>
                <th className="text-left px-4 py-3 font-semibold">Статус</th>
                <th className="text-right px-4 py-3 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reviews.map((review) => (
                <tr key={review.id} className={!review.isVisible ? 'opacity-60' : ''}>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {review.customerName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{review.questTitle}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p className="line-clamp-2">{review.reviewText}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.reviewDate).toLocaleDateString('ru-RU')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {review.isFeatured && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">
                          Избранный
                        </span>
                      )}
                      {review.isVisible ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          На сайте
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          Скрыт
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingReview(review)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleFeatured(review)}
                        className={`p-2 rounded-lg transition-colors ${
                          review.isFeatured
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                        title={
                          review.isFeatured ? 'Убрать из избранных' : 'Добавить в избранные'
                        }
                      >
                        <Star
                          className="w-4 h-4"
                          fill={review.isFeatured ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(review)}
                        className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                        title={review.isVisible ? 'Скрыть' : 'Показать'}
                      >
                        {review.isVisible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        title="Удалить"
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
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`flex h-full flex-col rounded-lg bg-white p-6 shadow-lg ${
                !review.isVisible ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-center">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-gray-900">{review.customerName}</h3>
                <div className="flex flex-col items-end gap-2 text-xs font-semibold">
                  {review.isFeatured && (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
                      Избранный
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 ${
                      review.isVisible
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {review.isVisible ? 'На сайте' : 'Скрыт'}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-600">
                Квест: <span className="font-semibold text-gray-800">{review.questTitle}</span>
              </p>
              <p className="mt-2 text-sm text-gray-700">{review.reviewText}</p>

              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-xs text-gray-500">
                  {new Date(review.reviewDate).toLocaleDateString('ru-RU')}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingReview(review)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleToggleFeatured(review)}
                    className={`p-2 rounded-lg transition-colors ${
                      review.isFeatured
                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                    title={review.isFeatured ? 'Убрать из избранных' : 'Добавить в избранные'}
                  >
                    <Star
                      className="w-5 h-5"
                      fill={review.isFeatured ? 'currentColor' : 'none'}
                    />
                  </button>
                  <button
                    onClick={() => handleToggleVisibility(review)}
                    className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                    title={review.isVisible ? 'Скрыть' : 'Показать'}
                  >
                    {review.isVisible ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg">Отзывы не найдены</p>
          <p className="text-gray-500 mt-2">Добавьте первый отзыв</p>
        </div>
      )}
    </div>
  );
}
