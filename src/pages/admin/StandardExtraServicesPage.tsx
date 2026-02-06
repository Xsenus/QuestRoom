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

  const loadServices = async () => {
    try {
      const data = await api.getStandardExtraServices();
      setServices(data || []);
    } catch (error) {
      console.error('Error loading standard extra services:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    loadServices();
  }, [canView]);

  if (!canView) {
    return <AccessDenied />;
  }

  const handleCreate = () => {
    if (!canEdit) return;
    setEditingService({
      title: '',
      price: 0,
      isActive: true,
      mandatoryForChildQuests: false,
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
            {isCreating ? 'Создание дополнительной услуги' : 'Редактирование дополнительной услуги'}
          </h2>

          <fieldset disabled={!canEdit} className="space-y-6">
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

              <div className="space-y-3">
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingService.mandatoryForChildQuests || false}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        mandatoryForChildQuests: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Обязательна для детских квестов
                  </span>
                </label>
              </div>
            </div>
          </fieldset>

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
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Дополнительные услуги</h1>
          <p className="text-gray-600">Управляйте базовым списком дополнительных услуг.</p>
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
          Нет дополнительных услуг. Добавьте первую.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={`flex h-full flex-col rounded-lg bg-white p-6 shadow-lg ${
                !service.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    service.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {service.isActive ? 'Активна' : 'Неактивна'}
                </span>
                {service.mandatoryForChildQuests && (
                  <span className="inline-flex w-fit items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                    Обязательна для детских
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-xl font-bold text-gray-900">{service.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{service.price} ₽</p>

              <div className="mt-auto pt-4 flex justify-end gap-2">
                <button
                  onClick={() =>
                    setEditingService({
                      id: service.id,
                      title: service.title,
                      price: service.price,
                      isActive: service.isActive,
                      mandatoryForChildQuests: service.mandatoryForChildQuests,
                    })
                  }
                  className="p-2 rounded-lg transition-colors bg-blue-100 text-blue-600 hover:bg-blue-200"
                  title="Редактировать"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleToggleActive(service)}
                  disabled={!canEdit}
                  className={`p-2 rounded-lg transition-colors ${
                    canEdit
                      ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                      : 'cursor-not-allowed bg-yellow-50 text-yellow-200'
                  }`}
                  title={service.isActive ? 'Деактивировать' : 'Активировать'}
                >
                  {service.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  disabled={!canDelete}
                  className={`p-2 rounded-lg transition-colors ${
                    canDelete
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'cursor-not-allowed bg-red-50 text-red-200'
                  }`}
                  title="Удалить"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
