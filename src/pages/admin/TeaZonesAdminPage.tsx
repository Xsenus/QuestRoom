import { useEffect, useState } from 'react';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '../../lib/imageOptimizations';
import { TeaZone, TeaZoneUpsert } from '../../lib/types';
import ImageLibraryPanel from '../../components/admin/ImageLibraryPanel';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';
import NotificationModal from '../../components/NotificationModal';

export default function TeaZonesAdminPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('tea-zones.view');
  const canEdit = hasPermission('tea-zones.edit');
  const canDelete = hasPermission('tea-zones.delete');
  const [teaZones, setTeaZones] = useState<TeaZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingZone, setEditingZone] = useState<(TeaZoneUpsert & { id?: string }) | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<TeaZone | null>(null);

  useEffect(() => {
    loadTeaZones();
  }, []);

  const loadTeaZones = async () => {
    try {
      const data = await api.getTeaZones();
      setTeaZones(data || []);
    } catch (error) {
      console.error('Error loading tea zones:', error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    if (!canEdit) return;
    setEditingZone({
      name: '',
      description: '',
      address: '',
      branch: '',
      images: [],
      isActive: true,
      sortOrder: teaZones.length,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (!editingZone) return;

    const { id, ...payload } = editingZone;

    try {
      if (isCreating) {
        await api.createTeaZone(payload);
      } else if (id) {
        await api.updateTeaZone(id, payload);
      }
    } catch (error) {
      alert('Ошибка при сохранении зоны: ' + (error as Error).message);
      return;
    }

    setEditingZone(null);
    setIsCreating(false);
    loadTeaZones();
  };

  const handleCancel = () => {
    setEditingZone(null);
    setIsCreating(false);
  };

  const handleToggleActive = async (zone: TeaZone) => {
    if (!canEdit) return;
    try {
      const { id, createdAt, updatedAt, ...payload } = zone;
      await api.updateTeaZone(id, { ...payload, isActive: !zone.isActive });
      loadTeaZones();
    } catch (error) {
      alert('Ошибка при изменении статуса: ' + (error as Error).message);
    }
  };

  const handleDelete = (zone: TeaZone) => {
    if (!canDelete) return;
    setZoneToDelete(zone);
  };

  const confirmDelete = async () => {
    if (!zoneToDelete) return;

    try {
      await api.deleteTeaZone(zoneToDelete.id);
      loadTeaZones();
    } catch (error) {
      alert('Ошибка при удалении зоны: ' + (error as Error).message);
    } finally {
      setZoneToDelete(null);
    }
  };

  const addImage = () => {
    if (!editingZone) return;
    const images = editingZone?.images || [];
    setEditingZone({ ...editingZone, images: [...images, ''] });
  };

  const removeImage = (index: number) => {
    if (!editingZone) return;
    const images = [...(editingZone?.images || [])];
    images.splice(index, 1);
    setEditingZone({ ...editingZone, images });
  };

  const handleImageUpload = async (files?: FileList | null) => {
    if (!canEdit) return;
    if (!files || !editingZone) return;
    const filesToUpload = Array.from(files);
    if (!filesToUpload.length) return;

    setIsUploadingImage(true);
    try {
      const uploaded = await Promise.all(filesToUpload.map((file) => api.uploadImage(file)));
      const images = [...(editingZone.images || []), ...uploaded.map((img) => img.url)];
      setEditingZone({ ...editingZone, images });
    } catch (error) {
      alert('Ошибка загрузки изображения: ' + (error as Error).message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!canView) {
    return <AccessDenied />;
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (editingZone) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Создание зоны' : 'Редактирование зоны'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Наименование
              </label>
              <input
                type="text"
                value={editingZone.name || ''}
                onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Чайная зона «Лофт»"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                value={editingZone.description || ''}
                onChange={(e) =>
                  setEditingZone({ ...editingZone, description: e.target.value })
                }
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Подробное описание зоны..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Адрес
              </label>
              <input
                type="text"
                value={editingZone.address || ''}
                onChange={(e) => setEditingZone({ ...editingZone, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="ул. Примерная, 1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Филиал
              </label>
              <input
                type="text"
                value={editingZone.branch || ''}
                onChange={(e) => setEditingZone({ ...editingZone, branch: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Центральный"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Фотографии зоны
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {isUploadingImage ? 'Загрузка...' : 'Загрузить файлы'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                  </label>
                  <span className="text-sm text-gray-500">
                    Можно загрузить несколько изображений или вставить URL вручную.
                  </span>
                </div>
                <ImageLibraryPanel
                  onSelect={(url) => {
                    const images = editingZone?.images || [];
                    setEditingZone({ ...editingZone, images: [...images, url] });
                  }}
                  allowUpload={canEdit}
                  allowDelete={canDelete}
                  toggleLabelClosed="Выбрать из библиотеки"
                  toggleLabelOpen="Скрыть библиотеку"
                  title="Галерея"
                />
                {(editingZone.images || []).map((img, index) => (
                  <div key={`${img}-${index}`} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={img}
                      onChange={(e) => {
                        const newImages = [...(editingZone.images || [])];
                        newImages[index] = e.target.value;
                        setEditingZone({ ...editingZone, images: newImages });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="URL изображения"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addImage}
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
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={editingZone.sortOrder || 0}
                  onChange={(e) =>
                    setEditingZone({
                      ...editingZone,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingZone.isActive !== false}
                    onChange={(e) =>
                      setEditingZone({ ...editingZone, isActive: e.target.checked })
                    }
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Зона активна
                  </span>
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Зоны для чаепития</h2>
        <button
          onClick={handleCreate}
          disabled={!canEdit}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
            canEdit
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'cursor-not-allowed bg-red-200 text-white/80'
          }`}
        >
          <Plus className="w-5 h-5" />
          Создать зону
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {teaZones.map((zone) => (
          <div
            key={zone.id}
            className={`flex h-full flex-col rounded-lg bg-white p-6 shadow-lg ${
              !zone.isActive ? 'opacity-60' : ''
            }`}
          >
            <span
              className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                zone.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {zone.isActive ? 'Активна' : 'Неактивна'}
            </span>

            {zone.images?.[0] && (
              <img
                src={getOptimizedImageUrl(zone.images[0], { width: 720 })}
                srcSet={getResponsiveSrcSet(zone.images[0], [360, 540, 720, 960])}
                sizes="(min-width: 768px) 50vw, 100vw"
                alt={zone.name}
                className="mt-4 h-48 w-full object-cover rounded-lg"
                loading="lazy"
                decoding="async"
              />
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">{zone.name}</h3>
              {zone.branch && (
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                  {zone.branch}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-600">{zone.address}</p>
            <p className="mt-2 text-sm text-gray-500">{zone.description}</p>
            <p className="mt-2 text-xs text-gray-400">
              Фото: {zone.images?.length || 0}
            </p>

            <div className="mt-auto pt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingZone({ ...zone })}
                disabled={!canEdit}
                className={`p-2 rounded-lg transition-colors ${
                  canEdit
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    : 'cursor-not-allowed bg-blue-50 text-blue-200'
                }`}
                title="Редактировать"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToggleActive(zone)}
                disabled={!canEdit}
                className={`p-2 rounded-lg transition-colors ${
                  canEdit
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                    : 'cursor-not-allowed bg-yellow-50 text-yellow-200'
                }`}
                title={zone.isActive ? 'Деактивировать' : 'Активировать'}
              >
                {zone.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => handleDelete(zone)}
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

        {teaZones.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">Зоны не найдены</p>
            <p className="text-gray-500 mt-2">Создайте первую зону</p>
          </div>
        )}

        <NotificationModal
          isOpen={Boolean(zoneToDelete)}
          title="Удаление зоны"
          message={
            zoneToDelete
              ? `Вы уверены, что хотите удалить зону "${zoneToDelete.name}"?`
              : ''
          }
          tone="info"
          showToneLabel={false}
          actions={(
            <>
              <button
                type="button"
                onClick={() => setZoneToDelete(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Удалить
              </button>
            </>
          )}
          onClose={() => setZoneToDelete(null)}
        />
      </div>
    </div>
  );
}
