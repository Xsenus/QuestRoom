import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { PromoCode, PromoCodeUpsert } from '../../lib/types';
import { Edit, PlusCircle, Save, Trash2, X } from 'lucide-react';

const emptyForm: PromoCodeUpsert = {
  code: '',
  name: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: null,
  isActive: true,
};

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeUpsert>(emptyForm);

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

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.updatePromoCode(editingId, form);
      } else {
        await api.createPromoCode(form);
      }
      await loadPromoCodes();
      resetForm();
    } catch (error) {
      alert('Ошибка при сохранении промокода: ' + (error as Error).message);
    }
  };

  const handleEdit = (promo: PromoCode) => {
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
  };

  const handleDelete = async (promo: PromoCode) => {
    if (!confirm(`Удалить промокод ${promo.code}?`)) return;
    try {
      await api.deletePromoCode(promo.id);
      await loadPromoCodes();
    } catch (error) {
      alert('Ошибка при удалении: ' + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Промокоды</h2>
          <p className="text-gray-500">Управляйте скидками для бронирований.</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <PlusCircle className="h-4 w-4" />
          Новый
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingId ? 'Редактирование промокода' : 'Добавить промокод'}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
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
          <input
            type="date"
            value={form.validFrom}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="date"
            value={form.validUntil || ''}
            onChange={(e) => setForm({ ...form, validUntil: e.target.value || null })}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <textarea
          placeholder="Описание"
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          rows={3}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Активен
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Save className="h-4 w-4" />
            Сохранить
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Отменить
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Загрузка...</div>
        ) : promoCodes.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Промокодов пока нет.</div>
        ) : (
          <div className="space-y-3">
            {promoCodes.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-gray-900">
                    {promo.code} {promo.isActive ? '' : '(неактивен)'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {promo.discountType === 'percent'
                      ? `${promo.discountValue}%`
                      : `${promo.discountValue} ₽`}
                    {' · '}
                    {promo.validFrom}
                    {promo.validUntil ? ` → ${promo.validUntil}` : ''}
                  </div>
                  {promo.description && (
                    <div className="text-xs text-gray-500">{promo.description}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(promo)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                    Редактировать
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(promo)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
