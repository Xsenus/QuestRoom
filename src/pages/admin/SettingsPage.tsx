import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '../../lib/imageOptimizations';
import { Settings, SettingsUpdate } from '../../lib/types';
import { Database, ExternalLink, Save } from 'lucide-react';
import NotificationModal from '../../components/NotificationModal';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

const tabs = [
  { id: 'general', label: 'Общие' },
  { id: 'social', label: 'Соцсети' },
  { id: 'icons', label: 'Иконки' },
  { id: 'email', label: 'Почта' },
  { id: 'email-templates', label: 'Шаблоны писем' },
  { id: 'certificates', label: 'Сертификаты' },
  { id: 'reviews', label: 'Отзывы' },
  { id: 'booking', label: 'Бронирование' },
  { id: 'promotions', label: 'Акции' },
  { id: 'api', label: 'API' },
];

type SettingsTab = (typeof tabs)[number]['id'];

const socialIconGallery = {
  vk: [
    { label: 'VK (тёмная)', url: '/images/social/vk-light.svg' },
    { label: 'VK (светлая)', url: '/images/social/vk-dark.svg' },
  ],
  youtube: [
    { label: 'YouTube (тёмная)', url: '/images/social/youtube-light.svg' },
    { label: 'YouTube (светлая)', url: '/images/social/youtube-dark.svg' },
  ],
  instagram: [
    { label: 'Instagram (тёмная)', url: '/images/social/instagram-light.svg' },
    { label: 'Instagram (светлая)', url: '/images/social/instagram-dark.svg' },
  ],
  telegram: [
    { label: 'Telegram (тёмная)', url: '/images/social/telegram-light.svg' },
    { label: 'Telegram (светлая)', url: '/images/social/telegram-dark.svg' },
  ],
};

const isValidHexColor = (value?: string | null) =>
  Boolean(value && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value));

const getColorValue = (value: string | null, fallback: string) =>
  isValidHexColor(value) ? (value as string) : fallback;

const defaultBookingAdminTemplate = `
<p><strong>Информация о квесте:</strong></p>
<p>
  <strong>Квест:</strong> {{questTitle}}<br />
  <strong>Дата, время:</strong> {{bookingDateTime}}<br />
  <strong>Цена:</strong> {{totalPrice}} ₽
</p>
<p><strong>Данные клиента:</strong></p>
<p>
  Имя: {{customerName}}<br />
  Телефон: {{customerPhone}}<br />
  Email: {{customerEmail}}<br />
  Комментарий: {{notes}}
</p>
<p><strong>Дополнительная информация:</strong></p>
<p>
  Участников: {{participantsCount}}<br />
  Доп. участники: {{extraParticipantsCount}}<br />
  Доп. услуги: {{extraServicesText}}
</p>
<p>
  Адрес: {{companyAddress}}<br />
  Телефон: {{companyPhone}}
</p>
<p>С уважением,<br />Администрация</p>
`.trim();

const defaultBookingCustomerTemplate = `
<p>Спасибо за бронирование!</p>
<p><strong>Информация о квесте:</strong></p>
<p>
  <strong>Квест:</strong> {{questTitle}}<br />
  <strong>Дата, время:</strong> {{bookingDateTime}}<br />
  <strong>Цена:</strong> {{totalPrice}} ₽
</p>
<p><strong>Ваши данные:</strong></p>
<p>
  Имя: {{customerName}}<br />
  Телефон: {{customerPhone}}<br />
  Email: {{customerEmail}}<br />
  Комментарий: {{notes}}
</p>
<p>
  Адрес: {{companyAddress}}<br />
  Телефон: {{companyPhone}}
</p>
<p>Мы свяжемся с вами для подтверждения бронирования.</p>
`.trim();

const defaultCertificateAdminTemplate = `
<p><strong>Новая заявка на сертификат:</strong></p>
<p>
  Сертификат: {{certificateTitle}}<br />
  Тип доставки: {{deliveryType}}<br />
  Статус: {{status}}
</p>
<p><strong>Данные клиента:</strong></p>
<p>
  Имя: {{customerName}}<br />
  Телефон: {{customerPhone}}<br />
  Email: {{customerEmail}}<br />
  Комментарий: {{notes}}
</p>
<p>
  Адрес: {{companyAddress}}<br />
  Телефон: {{companyPhone}}
</p>
`.trim();

const defaultCertificateCustomerTemplate = `
<p>Спасибо за оформление сертификата!</p>
<p>
  Сертификат: {{certificateTitle}}<br />
  Тип доставки: {{deliveryType}}
</p>
<p><strong>Ваши данные:</strong></p>
<p>
  Имя: {{customerName}}<br />
  Телефон: {{customerPhone}}<br />
  Email: {{customerEmail}}<br />
  Комментарий: {{notes}}
</p>
<p>
  Адрес: {{companyAddress}}<br />
  Телефон: {{companyPhone}}
</p>
<p>Мы свяжемся с вами для подтверждения заказа.</p>
`.trim();

const bookingTemplateTokens = [
  {
    token: '{{questTitle}}',
    description: 'Название квеста из бронирования',
    example: 'Идеальное ограбление',
  },
  {
    token: '{{questAddress}}',
    description: 'Первый адрес из карточки квеста',
    example: 'г. Красноярск, ул. Кирова, 43',
  },
  {
    token: '{{questAddresses}}',
    description: 'Все адреса из карточки квеста (через запятую)',
    example: 'г. Красноярск, ул. Кирова, 43, ул. Ленина, 10',
  },
  {
    token: '{{questPhone}}',
    description: 'Первый телефон из карточки квеста',
    example: '8 (391) 294-59-50',
  },
  {
    token: '{{questPhones}}',
    description: 'Все телефоны из карточки квеста (через запятую)',
    example: '8 (391) 294-59-50, 8 (800) 555-35-35',
  },
  {
    token: '{{bookingDate}}',
    description: 'Дата бронирования (без времени)',
    example: '25.01.2026',
  },
  {
    token: '{{bookingTime}}',
    description: 'Время бронирования',
    example: '21:45',
  },
  {
    token: '{{bookingDateTime}}',
    description: 'Дата и время бронирования',
    example: '25.01.2026 21:45',
  },
  {
    token: '{{totalPrice}}',
    description: 'Итоговая стоимость',
    example: '5500',
  },
  {
    token: '{{customerName}}',
    description: 'Имя клиента',
    example: 'Дарья',
  },
  {
    token: '{{customerPhone}}',
    description: 'Телефон клиента',
    example: '89083126674',
  },
  {
    token: '{{customerEmail}}',
    description: 'Email клиента (или «не указан»)',
    example: 'daria@example.com',
  },
  {
    token: '{{participantsCount}}',
    description: 'Количество участников',
    example: '5',
  },
  {
    token: '{{extraParticipantsCount}}',
    description: 'Количество доп. участников',
    example: '1',
  },
  {
    token: '{{extraServices}}',
    description: 'HTML-список дополнительных услуг',
    example: '<ul><li>Аренда зоны отдыха — 500 ₽</li></ul>',
  },
  {
    token: '{{extraServicesText}}',
    description: 'Список доп. услуг в одну строку',
    example: 'Аренда зоны отдыха — 500 ₽, Аниматор — 1000 ₽',
  },
  {
    token: '{{status}}',
    description: 'Статус брони',
    example: 'pending',
  },
  {
    token: '{{notes}}',
    description: 'Комментарий клиента',
    example: '5 чел',
  },
  {
    token: '{{companyAddress}}',
    description: 'Адрес из настроек',
    example: 'г. Красноярск, ул. Кирова, 43',
  },
  {
    token: '{{companyPhone}}',
    description: 'Телефон из настроек',
    example: '8 (391) 294-59-50',
  },
];

const certificateTemplateTokens = [
  {
    token: '{{certificateTitle}}',
    description: 'Название сертификата',
    example: 'Подарочный сертификат',
  },
  {
    token: '{{deliveryType}}',
    description: 'Тип доставки сертификата',
    example: 'paper',
  },
  {
    token: '{{status}}',
    description: 'Статус заявки',
    example: 'pending',
  },
  {
    token: '{{customerName}}',
    description: 'Имя клиента',
    example: 'Дарья',
  },
  {
    token: '{{customerPhone}}',
    description: 'Телефон клиента',
    example: '89083126674',
  },
  {
    token: '{{customerEmail}}',
    description: 'Email клиента (или «не указан»)',
    example: 'daria@example.com',
  },
  {
    token: '{{notes}}',
    description: 'Комментарий клиента',
    example: 'Позвонить после 18:00',
  },
  {
    token: '{{companyAddress}}',
    description: 'Адрес из настроек',
    example: 'г. Красноярск, ул. Кирова, 43',
  },
  {
    token: '{{companyPhone}}',
    description: 'Телефон из настроек',
    example: '8 (391) 294-59-50',
  },
];

const mirKvestovScheduleFieldOptions = [
  { key: 'date', label: 'Дата' },
  { key: 'time', label: 'Время' },
  { key: 'is_free', label: 'Доступность' },
  { key: 'price', label: 'Цена' },
  { key: 'discount_price', label: 'Скидочная цена' },
  { key: 'your_slot_id', label: 'ID слота (your_slot_id)' },
];

const defaultMirKvestovScheduleFields = mirKvestovScheduleFieldOptions.map(
  (option) => option.key,
);

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('settings.view');
  const canEdit = hasPermission('settings.edit');
  const timeZoneOptions = [
    { value: 'Europe/Kaliningrad', label: 'Europe/Kaliningrad (Калининград, UTC+2)' },
    { value: 'Europe/Moscow', label: 'Europe/Moscow (Москва, UTC+3)' },
    { value: 'Europe/Samara', label: 'Europe/Samara (Самара, UTC+4)' },
    { value: 'Asia/Yekaterinburg', label: 'Asia/Yekaterinburg (Екатеринбург, UTC+5)' },
    { value: 'Asia/Omsk', label: 'Asia/Omsk (Омск, UTC+6)' },
    { value: 'Asia/Novosibirsk', label: 'Asia/Novosibirsk (Новосибирск, UTC+7)' },
    { value: 'Asia/Krasnoyarsk', label: 'Asia/Krasnoyarsk (Красноярск, UTC+7)' },
    { value: 'Asia/Irkutsk', label: 'Asia/Irkutsk (Иркутск, UTC+8)' },
    { value: 'Asia/Yakutsk', label: 'Asia/Yakutsk (Якутск, UTC+9)' },
    { value: 'Asia/Chita', label: 'Asia/Chita (Чита, UTC+9)' },
    { value: 'Asia/Vladivostok', label: 'Asia/Vladivostok (Владивосток, UTC+10)' },
    { value: 'Asia/Magadan', label: 'Asia/Magadan (Магадан, UTC+11)' },
    { value: 'Asia/Sakhalin', label: 'Asia/Sakhalin (Сахалин, UTC+11)' },
    { value: 'Asia/Kamchatka', label: 'Asia/Kamchatka (Камчатка, UTC+12)' },
    { value: 'Asia/Anadyr', label: 'Asia/Anadyr (Анадырь, UTC+12)' },
  ];
  const bookingStatusColorOptions = [
    { key: 'bookingStatusPlannedColor', label: 'Запланировано', fallback: '#7c3aed' },
    { key: 'bookingStatusCreatedColor', label: 'Создано', fallback: '#0ea5e9' },
    { key: 'bookingStatusPendingColor', label: 'Ожидает', fallback: '#f59e0b' },
    { key: 'bookingStatusNotConfirmedColor', label: 'Не подтверждено', fallback: '#f97316' },
    { key: 'bookingStatusConfirmedColor', label: 'Подтверждено', fallback: '#22c55e' },
    { key: 'bookingStatusCompletedColor', label: 'Завершено', fallback: '#3b82f6' },
    { key: 'bookingStatusCancelledColor', label: 'Отменено', fallback: '#ef4444' },
  ] as const;
  const certificateStatusColorOptions = [
    { key: 'certificateStatusPendingColor', label: 'Новая', fallback: '#f59e0b' },
    { key: 'certificateStatusProcessedColor', label: 'Обработана', fallback: '#0ea5e9' },
    { key: 'certificateStatusCompletedColor', label: 'Завершена', fallback: '#22c55e' },
    { key: 'certificateStatusCanceledColor', label: 'Отменена', fallback: '#ef4444' },
  ] as const;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupCreating, setBackupCreating] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testRecipientSending, setTestRecipientSending] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [activeTemplateTab, setActiveTemplateTab] = useState<
    'booking-admin' | 'booking-customer' | 'certificate-admin' | 'certificate-customer'
  >('booking-admin');
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    tone: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings({
        ...data,
        bookingEmailTemplateAdmin:
          data.bookingEmailTemplateAdmin ?? defaultBookingAdminTemplate,
        bookingEmailTemplateCustomer:
          data.bookingEmailTemplateCustomer ?? defaultBookingCustomerTemplate,
        certificateEmailTemplateAdmin:
          data.certificateEmailTemplateAdmin ?? defaultCertificateAdminTemplate,
        certificateEmailTemplateCustomer:
          data.certificateEmailTemplateCustomer ?? defaultCertificateCustomerTemplate,
        bookingDaysAhead: data.bookingDaysAhead ?? 10,
        bookingCutoffMinutes: data.bookingCutoffMinutes ?? 10,
        timeZone: data.timeZone ?? null,
        videoModalEnabled: data.videoModalEnabled ?? false,
        backgroundGradientFrom: data.backgroundGradientFrom ?? null,
        backgroundGradientVia: data.backgroundGradientVia ?? null,
        backgroundGradientTo: data.backgroundGradientTo ?? null,
        scheduleBackground: data.scheduleBackground ?? null,
        bookingStatusPlannedColor: data.bookingStatusPlannedColor ?? null,
        bookingStatusCreatedColor: data.bookingStatusCreatedColor ?? null,
        bookingStatusPendingColor: data.bookingStatusPendingColor ?? null,
        bookingStatusNotConfirmedColor: data.bookingStatusNotConfirmedColor ?? null,
        bookingStatusConfirmedColor: data.bookingStatusConfirmedColor ?? null,
        bookingStatusCompletedColor: data.bookingStatusCompletedColor ?? null,
        bookingStatusCancelledColor: data.bookingStatusCancelledColor ?? null,
        certificateStatusPendingColor: data.certificateStatusPendingColor ?? null,
        certificateStatusProcessedColor: data.certificateStatusProcessedColor ?? null,
        certificateStatusCompletedColor: data.certificateStatusCompletedColor ?? null,
        certificateStatusCanceledColor: data.certificateStatusCanceledColor ?? null,
        mirKvestovMd5Key: data.mirKvestovMd5Key ?? null,
        mirKvestovPrepayMd5Key: data.mirKvestovPrepayMd5Key ?? null,
        mirKvestovSlotIdFormat: data.mirKvestovSlotIdFormat ?? 'numeric',
        mirKvestovScheduleDaysAhead: data.mirKvestovScheduleDaysAhead ?? 14,
        mirKvestovScheduleFields:
          data.mirKvestovScheduleFields?.length > 0
            ? data.mirKvestovScheduleFields
            : defaultMirKvestovScheduleFields,
        mirKvestovApiLoggingEnabled: data.mirKvestovApiLoggingEnabled ?? false,
      });
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
        bookingEmailTemplateAdmin: defaultBookingAdminTemplate,
        bookingEmailTemplateCustomer: defaultBookingCustomerTemplate,
        notifyCertificateAdmin: false,
        notifyCertificateCustomer: false,
        certificateEmailTemplateAdmin: defaultCertificateAdminTemplate,
        certificateEmailTemplateCustomer: defaultCertificateCustomerTemplate,
        phone: null,
        logoUrl: null,
        certificatePageTitle: 'Подарочные сертификаты',
        certificatePageDescription: null,
        certificatePagePricing: null,
        reviewsMode: 'internal',
        reviewsFlampEmbed: null,
        bookingStatusPlannedColor: '#7c3aed',
        bookingStatusCreatedColor: '#0ea5e9',
        bookingStatusPendingColor: '#f59e0b',
        bookingStatusNotConfirmedColor: '#f97316',
        bookingStatusConfirmedColor: '#22c55e',
        bookingStatusCompletedColor: '#3b82f6',
        bookingStatusCancelledColor: '#ef4444',
        certificateStatusPendingColor: '#f59e0b',
        certificateStatusProcessedColor: '#0ea5e9',
        certificateStatusCompletedColor: '#22c55e',
        certificateStatusCanceledColor: '#ef4444',
        bookingDaysAhead: 10,
        bookingCutoffMinutes: 10,
        timeZone: 'Asia/Krasnoyarsk',
        promotionsPerRow: 1,
        teaZonesPerRow: 2,
        videoModalEnabled: false,
        backgroundGradientFrom: '#070816',
        backgroundGradientVia: '#160a2e',
        backgroundGradientTo: '#2c0b3f',
        scheduleBackground: null,
        mirKvestovMd5Key: null,
        mirKvestovPrepayMd5Key: null,
        mirKvestovSlotIdFormat: 'numeric',
        mirKvestovScheduleDaysAhead: 14,
        mirKvestovScheduleFields: defaultMirKvestovScheduleFields,
        mirKvestovApiLoggingEnabled: false,
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
      certificateEmailTemplateAdmin: settings.certificateEmailTemplateAdmin,
      certificateEmailTemplateCustomer: settings.certificateEmailTemplateCustomer,
      phone: settings.phone,
      logoUrl: settings.logoUrl,
      certificatePageTitle: settings.certificatePageTitle,
      certificatePageDescription: settings.certificatePageDescription,
      certificatePagePricing: settings.certificatePagePricing,
      reviewsMode: settings.reviewsMode,
      reviewsFlampEmbed: settings.reviewsFlampEmbed,
      bookingStatusPlannedColor: settings.bookingStatusPlannedColor,
      bookingStatusCreatedColor: settings.bookingStatusCreatedColor,
      bookingStatusPendingColor: settings.bookingStatusPendingColor,
      bookingStatusNotConfirmedColor: settings.bookingStatusNotConfirmedColor,
      bookingStatusConfirmedColor: settings.bookingStatusConfirmedColor,
      bookingStatusCompletedColor: settings.bookingStatusCompletedColor,
      bookingStatusCancelledColor: settings.bookingStatusCancelledColor,
      certificateStatusPendingColor: settings.certificateStatusPendingColor,
      certificateStatusProcessedColor: settings.certificateStatusProcessedColor,
      certificateStatusCompletedColor: settings.certificateStatusCompletedColor,
      certificateStatusCanceledColor: settings.certificateStatusCanceledColor,
      bookingDaysAhead: settings.bookingDaysAhead,
      bookingCutoffMinutes: settings.bookingCutoffMinutes,
      timeZone: settings.timeZone,
      promotionsPerRow: settings.promotionsPerRow,
      teaZonesPerRow: settings.teaZonesPerRow,
      videoModalEnabled: settings.videoModalEnabled,
      backgroundGradientFrom: settings.backgroundGradientFrom,
      backgroundGradientVia: settings.backgroundGradientVia,
      backgroundGradientTo: settings.backgroundGradientTo,
      scheduleBackground: settings.scheduleBackground,
      mirKvestovMd5Key: settings.mirKvestovMd5Key,
      mirKvestovPrepayMd5Key: settings.mirKvestovPrepayMd5Key,
      mirKvestovSlotIdFormat: settings.mirKvestovSlotIdFormat,
      mirKvestovScheduleDaysAhead: settings.mirKvestovScheduleDaysAhead,
      mirKvestovScheduleFields: settings.mirKvestovScheduleFields,
      mirKvestovApiLoggingEnabled: settings.mirKvestovApiLoggingEnabled,
    };

    try {
      await api.updateSettings(payload);
      setNotification({
        isOpen: true,
        title: 'Настройки сохранены',
        message: 'Изменения успешно применены и сохранены.',
        tone: 'success',
      });
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Не удалось сохранить настройки',
        message: `Ошибка: ${(error as Error).message}`,
        tone: 'error',
      });
    }

    setSaving(false);
  };

  const handleSendTestEmail = async () => {
    setTestEmailSending(true);

    try {
      const response = await api.sendTestEmail();
      setNotification({
        isOpen: true,
        title: 'Тестовое письмо отправлено',
        message: response.message || 'Проверьте почтовый ящик отправителя.',
        tone: 'success',
      });
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Не удалось отправить тестовое письмо',
        message: `Ошибка: ${(error as Error).message}`,
        tone: 'error',
      });
    }

    setTestEmailSending(false);
  };

  const handleSendRecipientTestEmail = async () => {
    if (!testEmailRecipient.trim()) {
      setNotification({
        isOpen: true,
        title: 'Укажите email',
        message: 'Введите адрес получателя для тестового письма.',
        tone: 'info',
      });
      return;
    }

    setTestRecipientSending(true);

    try {
      const response = await api.sendTestEmailToRecipient(testEmailRecipient.trim());
      setNotification({
        isOpen: true,
        title: 'Тестовое письмо отправлено',
        message: response.message || 'Проверьте почтовый ящик получателя.',
        tone: 'success',
      });
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Не удалось отправить тестовое письмо',
        message: `Ошибка: ${(error as Error).message}`,
        tone: 'error',
      });
    }

    setTestRecipientSending(false);
  };

  const handleCreateBackup = async () => {
    setBackupCreating(true);

    try {
      const { blob, fileName } = await api.createDatabaseBackup();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotification({
        isOpen: true,
        title: 'Резервная копия создана',
        message: `Резервная копия базы данных сохранена как ${fileName}.`,
        tone: 'success',
      });
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Не удалось создать резервную копию',
        message: `Ошибка: ${(error as Error).message}`,
        tone: 'error',
      });
    }

    setBackupCreating(false);
  };

  if (!canView) {
    return <AccessDenied />;
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (!settings) {
    return <div className="text-center py-12">Ошибка загрузки настроек</div>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        tone={notification.tone}
        onClose={() =>
          setNotification((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Настройки сайта</h2>
        <button
          onClick={handleSave}
          disabled={saving || !canEdit}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
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
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Фон сайта (градиент)</h4>
              <div className="grid md:grid-cols-3 gap-4">
                {([
                  { key: 'backgroundGradientFrom', label: 'Начальный цвет', fallback: '#070816' },
                  { key: 'backgroundGradientVia', label: 'Средний цвет', fallback: '#160a2e' },
                  { key: 'backgroundGradientTo', label: 'Конечный цвет', fallback: '#2c0b3f' },
                ] as const).map((item) => {
                  const key = item.key as keyof Settings;
                  const currentValue = getColorValue(
                    settings[key] as string | null,
                    item.fallback,
                  );
                  return (
                    <div key={item.key} className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentValue}
                          onChange={(e) =>
                            setSettings({ ...settings, [key]: e.target.value })
                          }
                          className="h-10 w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={(settings[key] as string | null) || ''}
                          onChange={(e) =>
                            setSettings({ ...settings, [key]: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder={item.fallback}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            <div
              className="mt-4 h-16 rounded-lg border border-gray-200"
              style={{
                background: `linear-gradient(135deg, ${
                  getColorValue(settings.backgroundGradientFrom, '#070816')
                }, ${
                  getColorValue(settings.backgroundGradientVia, '#160a2e')
                }, ${
                  getColorValue(settings.backgroundGradientTo, '#2c0b3f')
                })`,
              }}
            />
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Фон расписания (страница квеста)
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={getColorValue(settings.scheduleBackground, '#2c0b3f')}
                onChange={(e) =>
                  setSettings({ ...settings, scheduleBackground: e.target.value })
                }
                className="h-10 w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
              />
              <input
                type="text"
                value={settings.scheduleBackground || ''}
                onChange={(e) =>
                  setSettings({ ...settings, scheduleBackground: e.target.value })
                }
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="#2c0b3f или linear-gradient(...)"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Можно указать цвет или CSS-значение фона для блока расписания.
            </p>
            <div
              className="mt-3 h-10 rounded-md border border-gray-200"
              style={{
                background: settings.scheduleBackground?.trim() || '#2c0b3f',
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Видео в модальном окне</p>
              <p className="text-xs text-gray-500">
                Открывать видео квестов внутри сайта без перехода по ссылке.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={settings.videoModalEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, videoModalEnabled: e.target.checked })
                }
              />
              <span
                className={`relative h-6 w-11 rounded-full transition ${
                  settings.videoModalEnabled ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                    settings.videoModalEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Резервное копирование</p>
              <p className="text-xs text-gray-500">
                Создайте резервную копию базы данных и сохраните её на сервере.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={backupCreating}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-70"
            >
              <Database className="h-4 w-4" />
              {backupCreating ? 'Создание...' : 'Создать резервную копию'}
            </button>
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
              const iconColorValue = getColorValue(settings[iconColorKey] as string | null, '#ffffff');
              const iconBackgroundValue = getColorValue(
                settings[iconBackgroundKey] as string | null,
                '#c51f2e',
              );
              const galleryItems = socialIconGallery[item.key];
              return (
              <div key={item.key} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="text-sm font-semibold text-gray-700">{item.label}</div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Ссылка на иконку
                    </span>
                    <input
                      type="url"
                      value={(settings[iconUrlKey] as string | null) || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, [iconUrlKey]: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="Ссылка на иконку"
                    />
                    <div className="flex flex-wrap gap-2">
                      {galleryItems.map((option) => (
                        <button
                          key={option.url}
                          type="button"
                          onClick={() =>
                            setSettings({ ...settings, [iconUrlKey]: option.url })
                          }
                          className="group flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:border-red-300 hover:text-red-600"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-50">
                            <img
                              src={getOptimizedImageUrl(option.url, { width: 64 })}
                              srcSet={getResponsiveSrcSet(option.url, [32, 64, 96])}
                              sizes="28px"
                              alt={option.label}
                              className="h-6 w-6"
                              loading="lazy"
                              decoding="async"
                            />
                          </span>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Цвет иконки
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={iconColorValue}
                          onChange={(e) =>
                            setSettings({ ...settings, [iconColorKey]: e.target.value })
                          }
                          className="h-10 w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
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
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Цвет фона
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={iconBackgroundValue}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [iconBackgroundKey]: e.target.value,
                            })
                          }
                          className="h-10 w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
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
                  </div>
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

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Тестовое письмо</p>
                  <p className="text-sm text-gray-500">
                    Письмо придет на адрес отправителя из настроек выше.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testEmailSending}
                  className="inline-flex items-center justify-center rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {testEmailSending ? 'Отправляем...' : 'Отправить тестовое письмо'}
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                <div className="w-full md:flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email для теста
                  </label>
                  <input
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendRecipientTestEmail}
                  disabled={testRecipientSending}
                  className="inline-flex items-center justify-center rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 md:mt-7"
                >
                  {testRecipientSending ? 'Отправляем...' : 'Отправить на адрес'}
                </button>
              </div>
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
          </div>
        </div>
      )}

      {activeTab === 'email-templates' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Шаблоны писем</h3>
            <p className="text-sm text-gray-500 mt-2">
              Используйте переменные в формате <span className="font-semibold">{'{{token}}'}</span>. 
              Ниже указано описание и примеры подстановок.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800">Переменные для бронирований</h4>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Переменная</th>
                    <th className="px-4 py-2 text-left font-semibold">Описание</th>
                    <th className="px-4 py-2 text-left font-semibold">Пример</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {bookingTemplateTokens.map((item) => (
                    <tr key={item.token}>
                      <td className="px-4 py-2 font-mono text-xs">{item.token}</td>
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-4 py-2">{item.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800">Переменные для сертификатов</h4>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Переменная</th>
                    <th className="px-4 py-2 text-left font-semibold">Описание</th>
                    <th className="px-4 py-2 text-left font-semibold">Пример</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {certificateTemplateTokens.map((item) => (
                    <tr key={item.token}>
                      <td className="px-4 py-2 font-mono text-xs">{item.token}</td>
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-4 py-2">{item.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'booking-admin', label: 'Бронь → админ' },
                { id: 'booking-customer', label: 'Бронь → клиент' },
                { id: 'certificate-admin', label: 'Сертификат → админ' },
                { id: 'certificate-customer', label: 'Сертификат → клиент' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTemplateTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTemplateTab === tab.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTemplateTab === 'booking-admin' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Шаблон письма администратору (бронирование)
                </label>
                <textarea
                  value={settings.bookingEmailTemplateAdmin || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, bookingEmailTemplateAdmin: e.target.value })
                  }
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {activeTemplateTab === 'booking-customer' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Шаблон письма клиенту (бронирование)
                </label>
                <textarea
                  value={settings.bookingEmailTemplateCustomer || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, bookingEmailTemplateCustomer: e.target.value })
                  }
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {activeTemplateTab === 'certificate-admin' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Шаблон письма администратору (сертификат)
                </label>
                <textarea
                  value={settings.certificateEmailTemplateAdmin || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, certificateEmailTemplateAdmin: e.target.value })
                  }
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {activeTemplateTab === 'certificate-customer' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Шаблон письма клиенту (сертификат)
                </label>
                <textarea
                  value={settings.certificateEmailTemplateCustomer || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, certificateEmailTemplateCustomer: e.target.value })
                  }
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            )}
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
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Цвета статусов заявок</h4>
              <p className="text-sm text-gray-500 mt-1">
                Используются для подсветки строк и статусов в разделе заявок на сертификаты.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {certificateStatusColorOptions.map((item) => {
                  const key = item.key as keyof Settings;
                  const currentValue = getColorValue(
                    settings[key] as string | null,
                    item.fallback,
                  );
                  return (
                    <div key={item.key} className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">{item.label}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentValue}
                          onChange={(e) =>
                            setSettings({ ...settings, [key]: e.target.value })
                          }
                          className="h-10 w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={(settings[key] as string | null) || ''}
                          onChange={(e) =>
                            setSettings({ ...settings, [key]: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder={item.fallback}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
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
          <div className="grid gap-6 md:grid-cols-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Закрывать бронь за (минут)
              </label>
              <input
                type="number"
                value={settings.bookingCutoffMinutes ?? 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bookingCutoffMinutes: parseInt(e.target.value, 10) || 0,
                  })
                }
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                За сколько минут до начала игры слот становится недоступным.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Часовой пояс (IANA)
              </label>
              <select
                value={settings.timeZone || 'Asia/Krasnoyarsk'}
                onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                {timeZoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Используется для расчета времени закрытия слотов на публичной странице.
              </p>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-lg font-semibold text-gray-900">Цвета статусов брони</h4>
              <p className="text-sm text-gray-500 mt-1">
                Используются в админке для подсветки статусов и строк таблицы.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {bookingStatusColorOptions.map((item) => {
                  const key = item.key as keyof Settings;
                  const currentValue = getColorValue(
                    settings[key] as string | null,
                    item.fallback,
                  );
                  return (
                    <div key={item.key} className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">{item.label}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentValue}
                          onChange={(e) =>
                            setSettings({ ...settings, [key]: e.target.value })
                          }
                          className="h-10 w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={(settings[key] as string | null) || ''}
                          onChange={(e) =>
                            setSettings({ ...settings, [key]: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder={item.fallback}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'promotions' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Акции</h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Количество акций в строке
              </label>
              <select
                value={settings.promotionsPerRow || 1}
                onChange={(e) =>
                  setSettings({ ...settings, promotionsPerRow: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value={1}>1 акция в строке</option>
                <option value={2}>2 акции в строке</option>
                <option value={3}>3 акции в строке</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Настройка влияет на отображение карточек акций на публичной странице.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Количество зон для чаепития в строке
              </label>
              <select
                value={settings.teaZonesPerRow || 2}
                onChange={(e) =>
                  setSettings({ ...settings, teaZonesPerRow: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value={1}>1 зона в строке</option>
                <option value={2}>2 зоны в строке</option>
                <option value={3}>3 зоны в строке</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Настройка влияет на отображение зон для чаепития на публичной странице.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Интеграции API</h3>
          <div className="grid gap-6">
            <div className="rounded-lg border border-gray-200 p-4 space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">mir-kvestov.ru</h4>
                <p className="text-sm text-gray-500">
                  Управление параметрами расписания и проверок для интеграции.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Md5 key для бронирований
                  </label>
                  <input
                    type="text"
                    value={settings.mirKvestovMd5Key || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, mirKvestovMd5Key: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Оставьте пустым, чтобы отключить проверку"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Можно указать несколько ключей через запятую или точку с запятой.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Md5 key для предоплаты
                  </label>
                  <input
                    type="text"
                    value={settings.mirKvestovPrepayMd5Key || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, mirKvestovPrepayMd5Key: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Можно указать несколько ключей через запятую или точку с запятой.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Формат your_slot_id
                  </label>
                  <select
                    value={settings.mirKvestovSlotIdFormat || 'numeric'}
                    onChange={(e) =>
                      setSettings({ ...settings, mirKvestovSlotIdFormat: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  >
                    <option value="numeric">Числовой (YYYYMMDDHHMM)</option>
                    <option value="guid">GUID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дней расписания по умолчанию
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={settings.mirKvestovScheduleDaysAhead ?? 14}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mirKvestovScheduleDaysAhead: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Применяется, когда запрос идёт без параметров from/to.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Поля расписания, которые отдаём в API
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  {mirKvestovScheduleFieldOptions.map((option) => {
                    const isChecked = settings.mirKvestovScheduleFields.includes(option.key);
                    return (
                      <label
                        key={option.key}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-red-600"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...settings.mirKvestovScheduleFields, option.key]
                              : settings.mirKvestovScheduleFields.filter(
                                  (field) => field !== option.key,
                                );
                            setSettings({
                              ...settings,
                              mirKvestovScheduleFields: next,
                            });
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Если снять все галочки, будут применены поля по умолчанию.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Логирование запросов mir-kvestov
                  </p>
                  <p className="text-xs text-gray-500">
                    Сохранять IP, параметры и тело запросов интеграции в базе данных.
                  </p>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={settings.mirKvestovApiLoggingEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mirKvestovApiLoggingEnabled: e.target.checked,
                      })
                    }
                  />
                  <span
                    className={`relative h-6 w-11 rounded-full transition ${
                      settings.mirKvestovApiLoggingEnabled ? 'bg-red-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                        settings.mirKvestovApiLoggingEnabled
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
