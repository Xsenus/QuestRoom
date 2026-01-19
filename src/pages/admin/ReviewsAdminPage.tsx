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

  useEffect(() => {
    loadReviews();
  }, []);

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление отзывами</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить отзыв
        </button>
      </div>

      <div className="grid gap-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className={`bg-white rounded-lg shadow-lg p-6 ${
              !review.isVisible ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {review.customerName}
                  </h3>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {review.isFeatured && (
                    <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      ИЗБРАННЫЙ
                    </span>
                  )}
                  {!review.isVisible && (
                    <span className="bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                      СКРЫТ
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-2">
                  Квест: <span className="font-semibold">{review.questTitle}</span>
                </p>
                <p className="text-gray-700 mb-2">{review.reviewText}</p>
                <p className="text-gray-500 text-xs">
                  {new Date(review.reviewDate).toLocaleDateString('ru-RU')}
                </p>
              </div>

              <div className="flex gap-2 ml-4">
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
                  <Star className="w-5 h-5" fill={review.isFeatured ? 'currentColor' : 'none'} />
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

        {reviews.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">Отзывы не найдены</p>
            <p className="text-gray-500 mt-2">Добавьте первый отзыв</p>
          </div>
        )}
      </div>
    </div>
  );
}
