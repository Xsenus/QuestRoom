import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Settings, SettingsUpdate } from '../../lib/types';
import { Save, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings({
        id: '00000000-0000-0000-0000-000000000001',
        vkUrl: null,
        youtubeUrl: null,
        instagramUrl: null,
        telegramUrl: null,
        address: null,
        email: null,
        phone: null,
        logoUrl: null,
        updatedAt: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);

    const payload: SettingsUpdate = {
      vkUrl: settings.vkUrl,
      youtubeUrl: settings.youtubeUrl,
      instagramUrl: settings.instagramUrl,
      telegramUrl: settings.telegramUrl,
      address: settings.address,
      email: settings.email,
      phone: settings.phone,
      logoUrl: settings.logoUrl,
    };

    try {
      await api.updateSettings(payload);
      alert('Настройки успешно сохранены!');
    } catch (error) {
      alert('Ошибка при сохранении настроек: ' + (error as Error).message);
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
                value={settings.vkUrl || ''}
                onChange={(e) =>
                  setSettings({ ...settings, vkUrl: e.target.value })
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
                value={settings.youtubeUrl || ''}
                onChange={(e) =>
                  setSettings({ ...settings, youtubeUrl: e.target.value })
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
                value={settings.instagramUrl || ''}
                onChange={(e) =>
                  setSettings({ ...settings, instagramUrl: e.target.value })
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
                value={settings.telegramUrl || ''}
                onChange={(e) =>
                  setSettings({ ...settings, telegramUrl: e.target.value })
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
              value={settings.logoUrl || ''}
              onChange={(e) =>
                setSettings({ ...settings, logoUrl: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="https://example.com/logo.png"
            />
            {settings.logoUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Предпросмотр:</p>
                <img
                  src={settings.logoUrl}
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
