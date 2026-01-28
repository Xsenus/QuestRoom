import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Settings, SettingsUpdate } from '../../lib/types';
import { ExternalLink, Save } from 'lucide-react';

const tabs = [
  { id: 'general', label: 'Общие' },
  { id: 'social', label: 'Соцсети' },
  { id: 'icons', label: 'Иконки' },
  { id: 'email', label: 'Почта' },
  { id: 'certificates', label: 'Сертификаты' },
  { id: 'reviews', label: 'Отзывы' },
  { id: 'booking', label: 'Бронирование' },
];

type SettingsTab = (typeof tabs)[number]['id'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
        vkIconUrl: null,
        vkIconColor: null,
        vkIconBackground: null,
        youtubeIconUrl: null,
        youtubeIconColor: null,
        youtubeIconBackground: null,
        instagramIconUrl: null,
        instagramIconColor: null,
        instagramIconBackground: null,
        telegramIconUrl: null,
        telegramIconColor: null,
        telegramIconBackground: null,
        address: null,
        email: null,
        notificationEmail: null,
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPassword: null,
        smtpUseSsl: true,
        smtpFromEmail: null,
        smtpFromName: null,
        notifyBookingAdmin: false,
        notifyBookingCustomer: false,
        bookingEmailTemplateAdmin: null,
        bookingEmailTemplateCustomer: null,
        notifyCertificateAdmin: false,
        notifyCertificateCustomer: false,
        phone: null,
        logoUrl: null,
        certificatePageTitle: 'Подарочные сертификаты',
        certificatePageDescription: null,
        certificatePagePricing: null,
        reviewsMode: 'internal',
        reviewsFlampEmbed: null,
        bookingDaysAhead: 10,
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
      vkIconUrl: settings.vkIconUrl,
      vkIconColor: settings.vkIconColor,
      vkIconBackground: settings.vkIconBackground,
      youtubeIconUrl: settings.youtubeIconUrl,
      youtubeIconColor: settings.youtubeIconColor,
      youtubeIconBackground: settings.youtubeIconBackground,
      instagramIconUrl: settings.instagramIconUrl,
      instagramIconColor: settings.instagramIconColor,
      instagramIconBackground: settings.instagramIconBackground,
      telegramIconUrl: settings.telegramIconUrl,
      telegramIconColor: settings.telegramIconColor,
      telegramIconBackground: settings.telegramIconBackground,
      address: settings.address,
      email: settings.email,
      notificationEmail: settings.notificationEmail,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPassword: settings.smtpPassword,
      smtpUseSsl: settings.smtpUseSsl,
      smtpFromEmail: settings.smtpFromEmail,
      smtpFromName: settings.smtpFromName,
      notifyBookingAdmin: settings.notifyBookingAdmin,
      notifyBookingCustomer: settings.notifyBookingCustomer,
      bookingEmailTemplateAdmin: settings.bookingEmailTemplateAdmin,
      bookingEmailTemplateCustomer: settings.bookingEmailTemplateCustomer,
      notifyCertificateAdmin: settings.notifyCertificateAdmin,
      notifyCertificateCustomer: settings.notifyCertificateCustomer,
      phone: settings.phone,
      logoUrl: settings.logoUrl,
      certificatePageTitle: settings.certificatePageTitle,
      certificatePageDescription: settings.certificatePageDescription,
      certificatePagePricing: settings.certificatePagePricing,
      reviewsMode: settings.reviewsMode,
      reviewsFlampEmbed: settings.reviewsFlampEmbed,
      bookingDaysAhead: settings.bookingDaysAhead,
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
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Настройки сайта</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-70"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Общие настройки</h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Адрес</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Телефон</label>
                <input
                  type="tel"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Логотип</label>
              <input
                type="url"
                value={settings.logoUrl || ''}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Социальные сети</h3>
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
                onChange={(e) => setSettings({ ...settings, vkUrl: e.target.value })}
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
                onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })}
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
                onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
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
                onChange={(e) => setSettings({ ...settings, telegramUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="https://t.me/your_channel"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'icons' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Иконки соцсетей</h3>
          <div className="grid gap-6">
            {([
              { key: 'vk', label: 'VK', iconUrl: 'vkIconUrl', iconColor: 'vkIconColor', iconBackground: 'vkIconBackground' },
              { key: 'youtube', label: 'YouTube', iconUrl: 'youtubeIconUrl', iconColor: 'youtubeIconColor', iconBackground: 'youtubeIconBackground' },
              { key: 'instagram', label: 'Instagram', iconUrl: 'instagramIconUrl', iconColor: 'instagramIconColor', iconBackground: 'instagramIconBackground' },
              { key: 'telegram', label: 'Telegram', iconUrl: 'telegramIconUrl', iconColor: 'telegramIconColor', iconBackground: 'telegramIconBackground' },
            ] as const).map((item) => {
              const iconUrlKey = item.iconUrl as keyof Settings;
              const iconColorKey = item.iconColor as keyof Settings;
              const iconBackgroundKey = item.iconBackground as keyof Settings;
              return (
              <div key={item.key} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="text-sm font-semibold text-gray-700">{item.label}</div>
                <div className="grid md:grid-cols-3 gap-3">
                  <input
                    type="url"
                    value={(settings[iconUrlKey] as string | null) || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, [iconUrlKey]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Ссылка на иконку"
                  />
                  <input
                    type="text"
                    value={(settings[iconColorKey] as string | null) || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, [iconColorKey]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Цвет иконки (#fff)"
                  />
                  <input
                    type="text"
                    value={(settings[iconBackgroundKey] as string | null) || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, [iconBackgroundKey]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Цвет фона (#c51f2e)"
                  />
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Почтовые уведомления</h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email для уведомлений
              </label>
              <input
                type="email"
                value={settings.notificationEmail || ''}
                onChange={(e) =>
                  setSettings({ ...settings, notificationEmail: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtpHost || ''}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.smtpPort ?? ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smtpPort: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SMTP User
                </label>
                <input
                  type="text"
                  value={settings.smtpUser || ''}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={settings.smtpPassword || ''}
                  onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Отправитель (email)
                </label>
                <input
                  type="email"
                  value={settings.smtpFromEmail || ''}
                  onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Отправитель (имя)
                </label>
                <input
                  type="text"
                  value={settings.smtpFromName || ''}
                  onChange={(e) => setSettings({ ...settings, smtpFromName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.smtpUseSsl}
                  onChange={(e) => setSettings({ ...settings, smtpUseSsl: e.target.checked })}
                />
                Использовать SSL
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.notifyBookingAdmin}
                  onChange={(e) =>
                    setSettings({ ...settings, notifyBookingAdmin: e.target.checked })
                  }
                />
                Уведомлять администратора о бронированиях
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.notifyBookingCustomer}
                  onChange={(e) =>
                    setSettings({ ...settings, notifyBookingCustomer: e.target.checked })
                  }
                />
                Уведомлять клиента о бронированиях
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.notifyCertificateAdmin}
                  onChange={(e) =>
                    setSettings({ ...settings, notifyCertificateAdmin: e.target.checked })
                  }
                />
                Сертификат → администратор
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.notifyCertificateCustomer}
                  onChange={(e) =>
                    setSettings({ ...settings, notifyCertificateCustomer: e.target.checked })
                  }
                />
                Сертификат → пользователь
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Шаблон письма администратору
              </label>
              <textarea
                value={settings.bookingEmailTemplateAdmin || ''}
                onChange={(e) =>
                  setSettings({ ...settings, bookingEmailTemplateAdmin: e.target.value })
                }
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Шаблон письма клиенту
              </label>
              <textarea
                value={settings.bookingEmailTemplateCustomer || ''}
                onChange={(e) =>
                  setSettings({ ...settings, bookingEmailTemplateCustomer: e.target.value })
                }
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Тексты страницы сертификатов</h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Заголовок</label>
              <input
                type="text"
                value={settings.certificatePageTitle || ''}
                onChange={(e) =>
                  setSettings({ ...settings, certificatePageTitle: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Описание</label>
              <textarea
                value={settings.certificatePageDescription || ''}
                onChange={(e) =>
                  setSettings({ ...settings, certificatePageDescription: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Стоимость</label>
              <textarea
                value={settings.certificatePagePricing || ''}
                onChange={(e) =>
                  setSettings({ ...settings, certificatePagePricing: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Отзывы</h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Режим отзывов</label>
              <select
                value={settings.reviewsMode || 'internal'}
                onChange={(e) =>
                  setSettings({ ...settings, reviewsMode: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="internal">Встроенные отзывы</option>
                <option value="flamp">Flamp (виджет/код)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Код виджета Flamp
              </label>
              <textarea
                value={settings.reviewsFlampEmbed || ''}
                onChange={(e) =>
                  setSettings({ ...settings, reviewsFlampEmbed: e.target.value })
                }
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Вставьте HTML/iframe код"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'booking' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Бронирование</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Количество дней для отображения расписания
            </label>
            <input
              type="number"
              value={settings.bookingDaysAhead ?? 10}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bookingDaysAhead: parseInt(e.target.value, 10) || 0,
                })
              }
              min={1}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
