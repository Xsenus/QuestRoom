import { useEffect, useState } from 'react';
import { Edit, Plus, Save, Trash2, X } from 'lucide-react';
import NotificationModal from '../../components/NotificationModal';
import AccessDenied from '../../components/admin/AccessDenied';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { BlacklistEntry } from '../../lib/types';

type FormState = {
  id?: string;
  name: string;
  phonesRaw: string;
  emailsRaw: string;
  comment: string;
};

const splitContacts = (value: string) =>
  value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export default function BlacklistPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('blacklist.view');
  const canEdit = hasPermission('blacklist.edit');
  const canDelete = hasPermission('blacklist.delete');

  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<BlacklistEntry | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
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

  const loadEntries = async () => {
    try {
      const data = await api.getBlacklistEntries();
      setEntries(data || []);
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Ошибка загрузки',
        message: (error as Error).message,
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void loadEntries();
  }, [canView]);

  if (!canView) {
    return <AccessDenied title="Нет доступа к черному списку" message="Нужно право blacklist.view" />;
  }

  const openCreate = () => {
    if (!canEdit) return;
    setForm({
      name: '',
      phonesRaw: '',
      emailsRaw: '',
      comment: '',
    });
  };

  const openEdit = (entry: BlacklistEntry) => {
    if (!canEdit) return;
    setForm({
      id: entry.id,
      name: entry.name,
      phonesRaw: entry.phones.join('\n'),
      emailsRaw: entry.emails.join('\n'),
      comment: entry.comment ?? '',
    });
  };

  const closeForm = () => setForm(null);

  const saveEntry = async () => {
    if (!form || !canEdit) return;

    setActionLoading(true);
    try {
      const payload = {
        name: form.name,
        phones: splitContacts(form.phonesRaw),
        emails: splitContacts(form.emailsRaw),
        comment: form.comment || null,
      };

      if (form.id) {
        await api.updateBlacklistEntry(form.id, payload);
        setNotification({
          isOpen: true,
          title: 'Запись обновлена',
          message: `Контакт «${form.name || 'Без имени'}» успешно обновлен.`,
          tone: 'success',
        });
      } else {
        await api.createBlacklistEntry(payload);
        setNotification({
          isOpen: true,
          title: 'Запись добавлена',
          message: `Контакт «${form.name || 'Без имени'}» добавлен в черный список.`,
          tone: 'success',
        });
      }

      closeForm();
      await loadEntries();
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Не удалось сохранить запись',
        message: (error as Error).message,
        tone: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate || !canDelete) return;

    setActionLoading(true);
    try {
      await api.deleteBlacklistEntry(deleteCandidate.id);
      setNotification({
        isOpen: true,
        title: 'Запись удалена',
        message: `Контакт «${deleteCandidate.name}» удален из черного списка.`,
        tone: 'success',
      });
      setDeleteCandidate(null);
      await loadEntries();
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Не удалось удалить запись',
        message: (error as Error).message,
        tone: 'error',
      });
      setDeleteCandidate(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center">Загрузка...</div>;
  }

  if (form) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-bold">
            {form.id ? 'Редактирование записи черного списка' : 'Новая запись черного списка'}
          </h2>

          <fieldset disabled={!canEdit || actionLoading} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Наименование</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-red-500"
                placeholder="Например: Конфликтный клиент"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Телефоны (по одному в строке)
                </label>
                <textarea
                  rows={6}
                  value={form.phonesRaw}
                  onChange={(e) => setForm({ ...form, phonesRaw: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-red-500"
                  placeholder={'+7 (900) 123-45-67\n8 (391) 200-00-00'}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Email (по одному в строке)
                </label>
                <textarea
                  rows={6}
                  value={form.emailsRaw}
                  onChange={(e) => setForm({ ...form, emailsRaw: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-red-500"
                  placeholder={'user@example.com\nblocked@domain.ru'}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Комментарий</label>
              <textarea
                rows={4}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-red-500"
                placeholder="Причина добавления в черный список"
              />
            </div>
          </fieldset>

          <div className="flex gap-4 pt-4">
            <button
              onClick={saveEntry}
              disabled={!canEdit || actionLoading}
              className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors ${
                canEdit ? 'bg-red-600 text-white hover:bg-red-700' : 'cursor-not-allowed bg-red-200 text-white/80'
              }`}
            >
              <Save className="h-5 w-5" />
              Сохранить
            </button>
            <button
              onClick={closeForm}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-400"
            >
              <X className="h-5 w-5" />
              Отмена
            </button>
          </div>
        </div>

        <NotificationModal
          isOpen={notification.isOpen}
          title={notification.title}
          message={notification.message}
          tone={notification.tone}
          onClose={() => setNotification({ ...notification, isOpen: false })}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Черный список</h1>
          <p className="text-gray-600">Контакты, по которым требуется ограничение бронирования.</p>
        </div>
        <button
          onClick={openCreate}
          disabled={!canEdit}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
            canEdit ? 'bg-red-600 text-white hover:bg-red-700' : 'cursor-not-allowed bg-red-200 text-white/80'
          }`}
        >
          <Plus className="h-4 w-4" />
          Добавить запись
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow-lg">
          Список пуст. Добавьте первую запись.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex h-full flex-col rounded-lg bg-white p-6 shadow-lg">
              <div className="flex flex-wrap gap-2">
                {entry.phones.length > 0 && (
                  <span className="inline-flex w-fit items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                    Телефонов: {entry.phones.length}
                  </span>
                )}
                {entry.emails.length > 0 && (
                  <span className="inline-flex w-fit items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    Email: {entry.emails.length}
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-xl font-bold text-gray-900">{entry.name}</h3>
              <p className="mt-3 text-sm text-gray-600">
                <span className="font-semibold text-gray-700">Телефоны:</span>{' '}
                {entry.phones.length ? entry.phones.join(', ') : '—'}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold text-gray-700">Email:</span>{' '}
                {entry.emails.length ? entry.emails.join(', ') : '—'}
              </p>
              {entry.comment && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">Комментарий:</span> {entry.comment}
                </p>
              )}

              <div className="mt-auto flex justify-end gap-2 pt-4">
                <button
                  onClick={() => openEdit(entry)}
                  disabled={!canEdit}
                  className={`rounded-lg p-2 transition-colors ${
                    canEdit ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'cursor-not-allowed bg-blue-50 text-blue-200'
                  }`}
                  title="Редактировать"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setDeleteCandidate(entry)}
                  disabled={!canDelete}
                  className={`rounded-lg p-2 transition-colors ${
                    canDelete ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'cursor-not-allowed bg-red-50 text-red-200'
                  }`}
                  title="Удалить"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NotificationModal
        isOpen={Boolean(deleteCandidate)}
        title="Удалить запись?"
        message={`Удалить контакт «${deleteCandidate?.name ?? ''}» из черного списка?`}
        tone="info"
        showToneLabel={false}
        actions={
          <>
            <button
              type="button"
              onClick={() => setDeleteCandidate(null)}
              disabled={actionLoading}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-300"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={actionLoading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Удалить
            </button>
          </>
        }
        onClose={() => setDeleteCandidate(null)}
      />

      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        tone={notification.tone}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
  );
}
