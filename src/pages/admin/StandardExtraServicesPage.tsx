import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StandardExtraService, StandardExtraServiceUpsert } from '../../lib/types';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

export default function StandardExtraServicesPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('extra-services.view');
  const canEdit = hasPermission('extra-services.edit');
  const canDelete = hasPermission('extra-services.delete');
  const [services, setServices] = useState<StandardExtraService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<
    (StandardExtraServiceUpsert & { id?: string }) | null
  >(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  if (!canView) {
    return <AccessDenied />;
  }

  const loadServices = async () => {
    try {
      const data = await api.getStandardExtraServices();
      setServices(data || []);
    } catch (error) {
      console.error('Error loading standard extra services:', error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    if (!canEdit) return;
    setEditingService({
      title: '',
      price: 0,
      isActive: true,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (!editingService) return;

    const { id, ...payload } = editingService;

    try {
      if (isCreating) {
        await api.createStandardExtraService(payload);
      } else if (id) {
        await api.updateStandardExtraService(id, payload);
      }
    } catch (error) {
      alert('Ошибка при сохранении услуги: ' + (error as Error).message);
      return;
    }

    setEditingService(null);
    setIsCreating(false);
    loadServices();
  };

  const handleCancel = () => {
    setEditingService(null);
    setIsCreating(false);
  };

  const handleToggleActive = async (service: StandardExtraService) => {
    if (!canEdit) return;
    try {
      const { id, createdAt, updatedAt, ...payload } = service;
      await api.updateStandardExtraService(id, { ...payload, isActive: !service.isActive });
      loadServices();
    } catch (error) {
      alert('Ошибка при изменении статуса: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;

    try {
      await api.deleteStandardExtraService(id);
      loadServices();
    } catch (error) {
      alert('Ошибка при удалении услуги: ' + (error as Error).message);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (editingService) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Создание доп. услуги' : 'Редактирование доп. услуги'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Название услуги
              </label>
              <input
                type="text"
                value={editingService.title || ''}
                onChange={(e) =>
                  setEditingService({ ...editingService, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Доплата за ночные сеансы"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  value={editingService.price || 0}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  min="0"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingService.isActive !== false}
                    onChange={(e) =>
                      setEditingService({ ...editingService, isActive: e.target.checked })
                    }
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">Услуга активна</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Стандартные доп. услуги</h1>
          <p className="text-gray-600">Управляйте базовым списком доп. услуг для квестов.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={!canEdit}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
            canEdit
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'cursor-not-allowed bg-red-200 text-white/80'
          }`}
        >
          <Plus className="w-4 h-4" />
          Добавить услугу
        </button>
      </div>

      {services.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
          Нет доп. услуг. Добавьте первую.
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-lg shadow-md p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                <p className="text-sm text-gray-600">{service.price} ₽</p>
                <span
                  className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    service.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {service.isActive ? 'Активна' : 'Неактивна'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setEditingService({
                      id: service.id,
                      title: service.title,
                      price: service.price,
                      isActive: service.isActive,
                    })
                  }
                  disabled={!canEdit}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    canEdit
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : 'cursor-not-allowed bg-blue-50 text-blue-200'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  Изменить
                </button>
                <button
                  onClick={() => handleToggleActive(service)}
                  disabled={!canEdit}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    canEdit
                      ? service.isActive
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'cursor-not-allowed bg-gray-50 text-gray-300'
                  }`}
                >
                  {service.isActive ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Деактивировать
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Активировать
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  disabled={!canDelete}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    canDelete
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'cursor-not-allowed bg-red-50 text-red-200'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
