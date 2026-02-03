import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Mail,
  Phone,
  User,
  RefreshCw,
  Edit,
  LayoutGrid,
  List,
  Save,
  X,
  Trash2,
} from 'lucide-react';
import { api } from '../../lib/api';
import NotificationModal from '../../components/NotificationModal';
import type { CertificateOrder, CertificateOrderUpdate, Settings } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

const statusLabels: Record<string, string> = {
  pending: 'Новая',
  processed: 'Обработана',
  completed: 'Завершена',
  canceled: 'Отменена',
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function CertificateOrdersAdminPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('certificate-orders.view');
  const canEdit = hasPermission('certificate-orders.edit');
  const canDelete = hasPermission('certificate-orders.delete');
  const [orders, setOrders] = useState<CertificateOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') {
      return 'cards';
    }
    const saved = localStorage.getItem('admin_certificate_orders_view');
    return saved === 'table' ? 'table' : 'cards';
  });
  const [editingOrder, setEditingOrder] = useState<
    (CertificateOrderUpdate & { id: string; certificateTitle: string }) | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: ReactNode;
    tone?: 'success' | 'error' | 'info';
    showToneLabel?: boolean;
    actions?: ReactNode;
  }>({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
  });

  const defaultStatusColors: Record<string, string> = {
    pending: '#f59e0b',
    processed: '#0ea5e9',
    completed: '#22c55e',
    canceled: '#ef4444',
  };

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  const loadOrders = async (options?: { silent?: boolean }) => {
    try {
      if (options?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const data = await api.getCertificateOrders();
      setOrders(data);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (loadError) {
      console.error('Ошибка загрузки настроек заявок:', loadError);
    }
  };

  useEffect(() => {
    loadOrders();
    loadSettings();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_certificate_orders_view', viewMode);
    }
  }, [viewMode]);

  const handleEdit = (order: CertificateOrder) => {
    if (!canEdit) return;
    setEditingOrder({
      id: order.id,
      certificateTitle: order.certificateTitle,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      notes: order.notes,
      deliveryType: order.deliveryType,
      status: order.status,
    });
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (!editingOrder) return;
    setIsSaving(true);
    try {
      const { id, certificateTitle, ...payload } = editingOrder;
      await api.updateCertificateOrder(id, payload);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, ...payload, updatedAt: new Date().toISOString() } : order
        )
      );
      setEditingOrder(null);
    } catch (saveError) {
      alert('Ошибка при сохранении заявки: ' + (saveError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, isOpen: false }));
  };

  const confirmDelete = async (order: CertificateOrder) => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteCertificateOrder(order.id);
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setNotification({
        isOpen: true,
        title: 'Заявка удалена',
        message: `Заявка на сертификат «${order.certificateTitle}» удалена.`,
        tone: 'success',
      });
    } catch (deleteError) {
      setNotification({
        isOpen: true,
        title: 'Ошибка удаления',
        message: (deleteError as Error).message,
        tone: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (order: CertificateOrder) => {
    if (!canDelete) return;
    setNotification({
      isOpen: true,
      title: 'Удалить заявку?',
      message: (
        <div className="space-y-2">
          <p>Вы действительно хотите удалить эту заявку?</p>
          <p className="text-xs text-gray-500">{order.certificateTitle}</p>
        </div>
      ),
      tone: 'info',
      showToneLabel: false,
      actions: (
        <>
          <button
            type="button"
            onClick={closeNotification}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            disabled={isDeleting}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => confirmDelete(order)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить'}
          </button>
        </>
      ),
    });
  };

  const getStatusColorValue = (status: string) => {
    const mapping: Record<string, string | null | undefined> = {
      pending: settings?.certificateStatusPendingColor,
      processed: settings?.certificateStatusProcessedColor,
      completed: settings?.certificateStatusCompletedColor,
      canceled: settings?.certificateStatusCanceledColor,
    };
    return mapping[status] || defaultStatusColors[status] || '#ef4444';
  };

  const hexToRgba = (color: string, alpha: number) => {
    const normalized = color.replace('#', '');
    const isShort = normalized.length === 3;
    const hex = isShort
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getStatusBadgeStyle = (status: string) => {
    const color = getStatusColorValue(status);
    return {
      backgroundColor: hexToRgba(color, 0.12),
      color,
      borderColor: hexToRgba(color, 0.4),
    };
  };

  const getRowStyle = (status: string) => ({
    backgroundColor: hexToRgba(getStatusColorValue(status), 0.08),
  });

  if (!canView) {
    return <AccessDenied />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        Загрузка заявок...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Заявки</h2>
          <p className="text-gray-500">Все заявки на сертификаты с сайта.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadOrders({ silent: true })}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow">
            <ClipboardList className="h-4 w-4 text-red-500" />
            Всего: {orders.length}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 text-gray-500 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                viewMode === 'cards' ? 'bg-red-50 text-red-600' : 'hover:bg-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Карточки
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                viewMode === 'table' ? 'bg-red-50 text-red-600' : 'hover:bg-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <List className="h-4 w-4" />
                Таблица
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          Не удалось загрузить заявки: {error}
        </div>
      )}

      {!error && sortedOrders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-gray-500">
          Пока нет заявок на сертификаты.
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Дата</th>
                <th className="px-4 py-3 font-semibold">Сертификат</th>
                <th className="px-4 py-3 font-semibold">Клиент</th>
                <th className="px-4 py-3 font-semibold">Контакты</th>
                <th className="px-4 py-3 font-semibold">Тип</th>
                <th className="px-4 py-3 font-semibold">Статус</th>
                <th className="px-4 py-3 font-semibold">Комментарий</th>
                <th className="px-4 py-3 font-semibold text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-gray-100"
                  style={getRowStyle(order.status)}
                >
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {order.certificateTitle}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{order.customerName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{order.customerPhone}</div>
                    {order.customerEmail && (
                      <a className="text-blue-600 hover:underline" href={`mailto:${order.customerEmail}`}>
                        {order.customerEmail}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.deliveryType === 'paper'
                      ? 'Бумажный'
                      : order.deliveryType === 'digital'
                      ? 'Электронный'
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-semibold"
                      style={getStatusBadgeStyle(order.status)}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(order)}
                        disabled={!canEdit}
                        className={`inline-flex items-center rounded-lg border p-2 transition ${
                          canEdit
                            ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            : 'cursor-not-allowed border-gray-100 text-gray-300'
                        }`}
                        title="Редактировать"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(order)}
                        disabled={isDeleting || !canDelete}
                        className={`inline-flex items-center rounded-lg border p-2 transition disabled:opacity-60 ${
                          canDelete
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'cursor-not-allowed border-red-100 text-red-200'
                        }`}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              style={getRowStyle(order.status)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{order.certificateTitle}</h3>
                  <p className="text-sm text-gray-500">
                    Создано: {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <span
                  className="rounded-full border px-3 py-1 text-sm font-semibold"
                  style={getStatusBadgeStyle(order.status)}
                >
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{order.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{order.customerPhone}</span>
                </div>
                {order.customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a
                      className="text-blue-600 hover:underline"
                      href={`mailto:${order.customerEmail}`}
                    >
                      {order.customerEmail}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 text-gray-400">🎁</span>
                  <span>
                    {order.deliveryType === 'paper'
                      ? 'Бумажный'
                      : order.deliveryType === 'digital'
                      ? 'Электронный'
                      : 'Тип не указан'}
                  </span>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {order.notes}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(order)}
                  disabled={!canEdit}
                  className={`inline-flex items-center rounded-lg border p-2 transition ${
                    canEdit
                      ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'cursor-not-allowed border-gray-100 text-gray-300'
                  }`}
                  title="Редактировать"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(order)}
                  disabled={isDeleting || !canDelete}
                  className={`inline-flex items-center rounded-lg border p-2 transition disabled:opacity-60 ${
                    canDelete
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'cursor-not-allowed border-red-100 text-red-200'
                  }`}
                  title="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Редактирование заявки</h3>
                <p className="text-sm text-gray-500">{editingOrder.certificateTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Имя</label>
                  <input
                    type="text"
                    value={editingOrder.customerName || ''}
                    onChange={(event) =>
                      setEditingOrder({ ...editingOrder, customerName: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Телефон</label>
                  <input
                    type="text"
                    value={editingOrder.customerPhone || ''}
                    onChange={(event) =>
                      setEditingOrder({ ...editingOrder, customerPhone: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Тип сертификата</label>
                <select
                  value={editingOrder.deliveryType || ''}
                  onChange={(event) =>
                    setEditingOrder({ ...editingOrder, deliveryType: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="">Не указано</option>
                  <option value="paper">Бумажный</option>
                  <option value="digital">Электронный</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingOrder.customerEmail || ''}
                    onChange={(event) =>
                      setEditingOrder({ ...editingOrder, customerEmail: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Статус</label>
                  <select
                    value={editingOrder.status || 'pending'}
                    onChange={(event) =>
                      setEditingOrder({ ...editingOrder, status: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Комментарий</label>
                <textarea
                  rows={4}
                  value={editingOrder.notes || ''}
                  onChange={(event) =>
                    setEditingOrder({ ...editingOrder, notes: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Комментарий..."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !canEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        tone={notification.tone}
        showToneLabel={notification.showToneLabel}
        actions={notification.actions}
        onClose={closeNotification}
      />
    </div>
  );
}
