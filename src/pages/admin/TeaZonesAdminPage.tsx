import { useEffect, useState } from 'react';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X } from 'lucide-react';
import { api } from '../../lib/api';
import { TeaZone, TeaZoneUpsert } from '../../lib/types';

export default function TeaZonesAdminPage() {
  const [teaZones, setTeaZones] = useState<TeaZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingZone, setEditingZone] = useState<(TeaZoneUpsert & { id?: string }) | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);

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
    setEditingZone({
      name: '',
      isActive: true,
      sortOrder: teaZones.length,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
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
    try {
      const { id, createdAt, updatedAt, ...payload } = zone;
      await api.updateTeaZone(id, { ...payload, isActive: !zone.isActive });
      loadTeaZones();
    } catch (error) {
      alert('Ошибка при изменении статуса: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту зону?')) return;

    try {
      await api.deleteTeaZone(id);
      loadTeaZones();
    } catch (error) {
      alert('Ошибка при удалении зоны: ' + (error as Error).message);
    }
  };

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
        <h2 className="text-3xl font-bold text-gray-900">Зоны для чаепития</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">{zone.name}</h3>
            </div>

            <div className="mt-auto pt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingZone({ ...zone })}
                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                title="Редактировать"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToggleActive(zone)}
                className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                title={zone.isActive ? 'Деактивировать' : 'Активировать'}
              >
                {zone.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => handleDelete(zone.id)}
                className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
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
      </div>
    </div>
  );
}
