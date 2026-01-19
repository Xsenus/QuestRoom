import { useState, useEffect } from 'react';
import { supabase, Settings } from '../../lib/supabase';
import { Save, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading settings:', error);
    } else if (data) {
      setSettings(data);
    } else {
      setSettings({
        id: '00000000-0000-0000-0000-000000000001',
        vk_url: null,
        youtube_url: null,
        instagram_url: null,
        telegram_url: null,
        address: null,
        email: null,
        phone: null,
        logo_url: null,
        updated_at: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);

    const { error } = await supabase
      .from('settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      alert('Ошибка при сохранении настроек: ' + error.message);
    } else {
      alert('Настройки успешно сохранены!');
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (!settings) {
    return <div className="text-center py-12">Ошибка загрузки настроек</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Настройки сайта</h2>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
            Социальные сети
          </h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  VKontakte
                </div>
              </label>
              <input
                type="url"
                value={settings.vk_url || ''}
                onChange={(e) =>
                  setSettings({ ...settings, vk_url: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="https://vk.com/your_page"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  YouTube
                </div>
              </label>
              <input
                type="url"
                value={settings.youtube_url || ''}
                onChange={(e) =>
                  setSettings({ ...settings, youtube_url: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="https://youtube.com/@your_channel"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Instagram
                </div>
              </label>
              <input
                type="url"
                value={settings.instagram_url || ''}
                onChange={(e) =>
                  setSettings({ ...settings, instagram_url: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="https://instagram.com/your_profile"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Telegram
                </div>
              </label>
              <input
                type="url"
                value={settings.telegram_url || ''}
                onChange={(e) =>
                  setSettings({ ...settings, telegram_url: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="https://t.me/your_channel"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
            Контактная информация
          </h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Адрес
              </label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) =>
                  setSettings({ ...settings, address: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="ул. Диксона, д. 1, стр. 4"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={settings.phone || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="8 (391) 294-59-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="info@questroom.ru"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
            Брендинг
          </h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              URL логотипа
            </label>
            <input
              type="url"
              value={settings.logo_url || ''}
              onChange={(e) =>
                setSettings({ ...settings, logo_url: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="https://example.com/logo.png"
            />
            {settings.logo_url && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Предпросмотр:</p>
                <img
                  src={settings.logo_url}
                  alt="Logo preview"
                  className="max-h-20 object-contain border border-gray-300 rounded p-2"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t-2 border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  );
}
