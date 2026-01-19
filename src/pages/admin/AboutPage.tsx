import { useState, useEffect } from 'react';
import { supabase, AboutInfo } from '../../lib/supabase';
import { Save } from 'lucide-react';

export default function AboutPage() {
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAboutInfo();
  }, []);

  const loadAboutInfo = async () => {
    const { data, error } = await supabase
      .from('about_info')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading about info:', error);
    } else if (data) {
      setAboutInfo(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!aboutInfo) return;

    setSaving(true);

    const { error } = await supabase
      .from('about_info')
      .upsert({
        ...aboutInfo,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      alert('Ошибка при сохранении: ' + error.message);
    } else {
      alert('Информация успешно сохранена');
    }

    setSaving(false);
  };

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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="Видение компании..."
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
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
