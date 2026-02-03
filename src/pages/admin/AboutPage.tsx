import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { AboutInfo, AboutInfoUpdate } from '../../lib/types';
import { Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

export default function AboutPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('about.view');
  const canEdit = hasPermission('about.edit');
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAboutInfo();
  }, []);

  const loadAboutInfo = async () => {
    try {
      const data = await api.getAboutInfo();
      setAboutInfo(data);
    } catch (error) {
      console.error('Error loading about info:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (!aboutInfo) return;

    setSaving(true);

    const payload: AboutInfoUpdate = {
      title: aboutInfo.title,
      content: aboutInfo.content,
      mission: aboutInfo.mission,
      vision: aboutInfo.vision,
    };

    try {
      await api.updateAboutInfo(payload);
      alert('Информация успешно сохранена');
    } catch (error) {
      alert('Ошибка при сохранении: ' + (error as Error).message);
    }

    setSaving(false);
  };

  if (!canView) {
    return <AccessDenied />;
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (!aboutInfo) {
    return <div className="text-center py-12">Информация не найдена</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Информация о проекте</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Заголовок страницы
            </label>
            <input
              type="text"
              value={aboutInfo.title || ''}
              onChange={(e) =>
                setAboutInfo({ ...aboutInfo, title: e.target.value })
              }
              disabled={!canEdit}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="О нас"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Основной контент
            </label>
            <textarea
              value={aboutInfo.content || ''}
              onChange={(e) =>
                setAboutInfo({ ...aboutInfo, content: e.target.value })
              }
              rows={10}
              disabled={!canEdit}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="Описание вашей компании..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Наша миссия
            </label>
            <textarea
              value={aboutInfo.mission || ''}
              onChange={(e) =>
                setAboutInfo({ ...aboutInfo, mission: e.target.value })
              }
              rows={4}
              disabled={!canEdit}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="Миссия компании..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Наше видение
            </label>
            <textarea
              value={aboutInfo.vision || ''}
              onChange={(e) =>
                setAboutInfo({ ...aboutInfo, vision: e.target.value })
              }
              rows={4}
              disabled={!canEdit}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="Видение компании..."
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !canEdit}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
