import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Mail, Phone, User } from 'lucide-react';
import { api } from '../../lib/api';
import type { CertificateOrder } from '../../lib/types';

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
  const [error, setError] = useState<string | null>(null);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getCertificateOrders();
        setOrders(data);
      } catch (loadError) {
        setError((loadError as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, []);

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
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow">
          <ClipboardList className="h-4 w-4 text-red-500" />
          Всего: {orders.length}
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

      <div className="grid gap-4 lg:grid-cols-2">
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
          </article>
        ))}
      </div>
    </div>
  );
}
