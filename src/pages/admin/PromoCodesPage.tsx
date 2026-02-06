import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { PromoCode, PromoCodeUpsert } from '../../lib/types';
import { Edit, PlusCircle, Save, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';
import NotificationModal from '../../components/NotificationModal';
import { showAdminNotification } from '../../lib/adminNotifications';

const getToday = () => new Date().toISOString().split('T')[0];

const getEndOfMonth = () => {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return endOfMonth.toISOString().split('T')[0];
};

const createEmptyForm = (): PromoCodeUpsert => ({
  code: '',
  name: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  validFrom: getToday(),
  validUntil: getEndOfMonth(),
  isActive: true,
});

export default function PromoCodesPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('promo-codes.view');
  const canEdit = hasPermission('promo-codes.edit');
  const canDelete = hasPermission('promo-codes.delete');
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeUpsert>(createEmptyForm());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<PromoCode | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return (localStorage.getItem('promoCodesViewMode') as 'cards' | 'table') || 'cards';
  });
  const isDateRangeInvalid = useMemo(() => {
    if (!form.validUntil) return false;
    return form.validFrom > form.validUntil;
  }, [form.validFrom, form.validUntil]);
  const exampleBasePrice = 5000;
  const exampleDiscountAmount =
    form.discountType === 'percent'
      ? Math.round(exampleBasePrice * (form.discountValue / 100))
      : form.discountValue;
  const exampleFinalPrice = Math.max(exampleBasePrice - exampleDiscountAmount, 0);

  const loadPromoCodes = async () => {
    try {
      const data = await api.getPromoCodes();
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error loading promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromoCodes();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('promoCodesViewMode', viewMode);
    }
  }, [viewMode]);

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
  };

  const openCreateModal = () => {
    if (!canEdit) return;
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      if (isDateRangeInvalid) {
        showAdminNotification({ title: 'Уведомление', message: String('Дата начала не может быть позже даты окончания.'), tone: 'info' });
        return;
      }
      if (editingId) {
        await api.updatePromoCode(editingId, form);
      } else {
        await api.createPromoCode(form);
      }
      await loadPromoCodes();
      resetForm();
      closeModal();
    } catch (error) {
      showAdminNotification({ title: 'Уведомление', message: String('Ошибка при сохранении промокода: ' + (error as Error).message), tone: 'info' });
    }
  };

  const handleEdit = (promo: PromoCode) => {
    if (!canEdit) return;
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      name: promo.name,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      validFrom: promo.validFrom,
      validUntil: promo.validUntil,
      isActive: promo.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (promo: PromoCode) => {
    if (!canDelete) return;
    setPromoToDelete(promo);
  };

  const confirmDelete = async () => {
    if (!promoToDelete) return;
    try {
      await api.deletePromoCode(promoToDelete.id);
      await loadPromoCodes();
    } catch (error) {
      showAdminNotification({ title: 'Уведомление', message: String('Ошибка при удалении: ' + (error as Error).message), tone: 'info' });
    } finally {
      setPromoToDelete(null);
    }
  };

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Промокоды</h2>
          <p className="text-gray-500">Управляйте скидками для бронирований.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!canEdit}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm ${
            canEdit
              ? 'bg-white text-gray-600 hover:bg-gray-50'
              : 'cursor-not-allowed bg-gray-100 text-gray-300'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          Новый
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-6">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Загрузка...</div>
        ) : promoCodes.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Промокодов пока нет.</div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Отображение</h3>
              <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-2 text-sm font-semibold ${
                    viewMode === 'cards' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'
                  }`}
                >
                  Карточки
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 text-sm font-semibold ${
                    viewMode === 'table' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'
                  }`}
                >
                  Таблица
                </button>
              </div>
            </div>

            {viewMode === 'cards' ? (
              <div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {promoCodes.map((promo) => (
                    <div
                      key={promo.id}
                      className="flex h-full flex-col justify-between rounded-lg border border-gray-200 p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900">
                            {promo.code} {promo.isActive ? '' : '(неактивен)'}
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              promo.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {promo.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          {promo.discountType === 'percent'
                            ? `${promo.discountValue}%`
                            : `${promo.discountValue} ₽`}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {promo.validFrom}
                          {promo.validUntil ? ` → ${promo.validUntil}` : ' → без ограничения'}
                        </div>
                        {promo.description && (
                          <div className="mt-2 text-xs text-gray-500">{promo.description}</div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(promo)}
                          disabled={!canEdit}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                            canEdit
                              ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                              : 'cursor-not-allowed border-gray-100 text-gray-300'
                          }`}
                        >
                          <Edit className="h-4 w-4" />
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(promo)}
                          disabled={!canDelete}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                            canDelete
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'cursor-not-allowed border-red-100 text-red-200'
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Код</th>
                        <th className="px-4 py-3">Скидка</th>
                        <th className="px-4 py-3">Период</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-700">
                      {promoCodes.map((promo) => (
                        <tr key={promo.id}>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            <div>{promo.code}</div>
                            {promo.description && (
                              <div className="text-xs text-gray-500">{promo.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {promo.discountType === 'percent'
                              ? `${promo.discountValue}%`
                              : `${promo.discountValue} ₽`}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {promo.validFrom}
                            {promo.validUntil ? ` → ${promo.validUntil}` : ' → без ограничения'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                promo.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {promo.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(promo)}
                                disabled={!canEdit}
                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                                  canEdit
                                    ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                    : 'cursor-not-allowed border-gray-100 text-gray-300'
                                }`}
                              >
                                <Edit className="h-4 w-4" />
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(promo)}
                                disabled={!canDelete}
                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                                  canDelete
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'cursor-not-allowed border-red-100 text-red-200'
                                }`}
                              >
                                <Trash2 className="h-4 w-4" />
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Редактирование промокода' : 'Новый промокод'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Промокод"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                type="text"
                placeholder="Название"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                type="number"
                placeholder="Скидка"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: parseInt(e.target.value, 10) || 0 })}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="percent">Проценты</option>
                <option value="amount">Рубли</option>
              </select>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 md:col-span-2">
                <div className="font-semibold text-gray-700">Как считается скидка</div>
                <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Базовая цена</th>
                        <th className="px-3 py-2">Скидка</th>
                        <th className="px-3 py-2">К оплате</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-gray-700">
                        <td className="px-3 py-2">{exampleBasePrice} ₽</td>
                        <td className="px-3 py-2">
                          {form.discountType === 'percent'
                            ? `${form.discountValue}% = ${exampleDiscountAmount} ₽`
                            : `${form.discountValue} ₽`}
                        </td>
                        <td className="px-3 py-2">{exampleFinalPrice} ₽</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-gray-500">
                  Пример приведён для цены {exampleBasePrice} ₽.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Дата начала</label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Дата окончания</label>
                <input
                  type="date"
                  value={form.validUntil || ''}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            {isDateRangeInvalid && (
              <p className="mt-2 text-sm text-red-600">
                Дата начала не может быть позже даты окончания.
              </p>
            )}
            <textarea
              placeholder="Описание"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2"
              rows={3}
            />
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Активен
            </label>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isDateRangeInvalid || !canEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Сохранить
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationModal
        isOpen={Boolean(promoToDelete)}
        title="Удаление промокода"
        message={promoToDelete ? `Удалить промокод "${promoToDelete.code}"?` : ''}
        tone="info"
        showToneLabel={false}
        actions={(
          <>
            <button
              type="button"
              onClick={() => setPromoToDelete(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Удалить
            </button>
          </>
        )}
        onClose={() => setPromoToDelete(null)}
      />
    </div>
  );
}
