import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { api } from '../../lib/api';
import type { CertificateOrder, CertificateOrderUpdate } from '../../lib/types';

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
  const [orders, setOrders] = useState<CertificateOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_certificate_orders_view', viewMode);
    }
  }, [viewMode]);

  const handleEdit = (order: CertificateOrder) => {
    setEditingOrder({
      id: order.id,
      certificateTitle: order.certificateTitle,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      notes: order.notes,
      status: order.status,
    });
  };

  const handleSave = async () => {
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
          <p className="text-gray-500">Заявки на сертификаты, оформленные через модальное окно.</p>
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
                <th className="px-4 py-3 font-semibold">Статус</th>
                <th className="px-4 py-3 font-semibold">Комментарий</th>
                <th className="px-4 py-3 font-semibold text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => (
                <tr key={order.id} className="border-t border-gray-100">
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
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(order)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4" />
                      Редактировать
                    </button>
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
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{order.certificateTitle}</h3>
                  <p className="text-sm text-gray-500">
                    Создано: {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600">
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
              </div>

              {order.notes && (
                <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {order.notes}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleEdit(order)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4" />
                  Редактировать
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
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
