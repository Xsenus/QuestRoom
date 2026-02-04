import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CalendarCheck, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { Booking, Quest } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';

type SummaryStat = {
  id: string;
  label: string;
  value: string;
  icon: JSX.Element;
  hint?: string;
};

const formatDateParam = (date: Date) => date.toISOString().split('T')[0];

export default function AdminHomePage() {
  const { user, hasPermission } = useAuth();
  const canViewQuests = hasPermission('quests.view');
  const canViewBookings = hasPermission('bookings.view');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const monthRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: formatDateParam(start),
      to: formatDateParam(end),
    };
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [questsData, bookingsData] = await Promise.all([
          canViewQuests ? api.getQuests() : Promise.resolve([]),
          canViewBookings
            ? api.getBookings({ dateFrom: monthRange.from, dateTo: monthRange.to })
            : Promise.resolve([]),
        ]);
        setQuests(questsData || []);
        setBookings(bookingsData || []);
      } catch (error) {
        console.error('Ошибка загрузки сводных данных:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [canViewBookings, canViewQuests, monthRange.from, monthRange.to]);

  const pendingConfirmCount = bookings.filter((booking) =>
    ['pending', 'not_confirmed'].includes(booking.status)
  ).length;

  const stats: SummaryStat[] = [
    {
      id: 'quests',
      label: 'Квестов в системе',
      value: canViewQuests ? String(quests.length) : '—',
      icon: <BookOpenCheck className="h-5 w-5 text-red-600" />,
      hint: canViewQuests ? undefined : 'Нет доступа к просмотру квестов',
    },
    {
      id: 'bookings-month',
      label: 'Бронирований за месяц',
      value: canViewBookings ? String(bookings.length) : '—',
      icon: <CalendarCheck className="h-5 w-5 text-red-600" />,
      hint: canViewBookings
        ? `Период: ${monthRange.from} — ${monthRange.to}`
        : 'Нет доступа к просмотру бронирований',
    },
    {
      id: 'bookings-pending',
      label: 'Ожидают подтверждения',
      value: canViewBookings ? String(pendingConfirmCount) : '—',
      icon: <ClipboardCheck className="h-5 w-5 text-red-600" />,
      hint: canViewBookings ? undefined : 'Нет доступа к просмотру бронирований',
    },
  ];

  const permissionSummary = [
    { id: 'quests', label: 'Квесты', view: 'quests.view', edit: 'quests.edit' },
    { id: 'bookings', label: 'Бронирования', view: 'bookings.view', edit: 'bookings.edit' },
    { id: 'calendar-pricing', label: 'Календарь: цены', view: 'calendar.pricing.view', edit: 'calendar.pricing.edit' },
    { id: 'calendar-production', label: 'Календарь: производственный', view: 'calendar.production.view', edit: 'calendar.production.edit' },
    { id: 'certificates', label: 'Сертификаты', view: 'certificates.view', edit: 'certificates.edit' },
    { id: 'certificate-orders', label: 'Сертификаты: заявки', view: 'certificate-orders.view', edit: 'certificate-orders.edit' },
    { id: 'rules', label: 'Правила', view: 'rules.view', edit: 'rules.edit' },
    { id: 'settings', label: 'Настройки', view: 'settings.view', edit: 'settings.edit' },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Главная</h2>
            <p className="text-sm text-gray-500">
              Добро пожаловать, {user?.email ?? 'пользователь'}! Здесь собраны ключевые показатели и правила доступа.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            <ShieldCheck className="h-4 w-4" />
            Права обновляются сразу после изменения роли
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                {stat.icon}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400">{stat.label}</div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stat.value}
                </div>
              </div>
            </div>
            {stat.hint && (
              <div className="mt-2 text-xs text-gray-500">{stat.hint}</div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Принцип работы прав</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">1. Просмотр</p>
            <p className="mt-2">
              Право <strong>Просмотр</strong> показывает раздел в меню и даёт доступ к спискам, карточкам
              и модальным окнам объектов. Без него раздел скрывается и доступ запрещён.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">2. Редактирование</p>
            <p className="mt-2">
              Если <strong>Редактирование</strong> отсутствует, поля доступны только для чтения,
              а кнопки сохранения и изменения блокируются.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">3. Дополнительные права</p>
            <p className="mt-2">
              В разделе бронирований есть отдельные разрешения на подтверждение и импорт.
              Они управляют активностью кнопок и отображением подраздела импорта.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">4. Сертификаты</p>
            <p className="mt-2">
              Раздел сертификатов отображается, если есть доступ к сертификатам или заявкам.
              Без доступа к сертификатам вкладка остаётся видимой, но вход в неё заблокирован.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Текущие права роли</h3>
        <p className="mt-2 text-sm text-gray-500">
          Используйте список ниже, чтобы быстро проверить доступы. При изменении роли система
          автоматически перенаправит вас на эту страницу.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {permissionSummary.map((item) => {
            const canView = hasPermission(item.view);
            const canEdit = hasPermission(item.edit);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-gray-800">{item.label}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${
                      canView ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    Просмотр
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${
                      canEdit ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    Редактирование
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
