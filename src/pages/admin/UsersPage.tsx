import { useMemo, useState, useEffect } from 'react';
import { Plus, ShieldCheck, Trash2, Lock, Unlock, KeyRound, Search, RefreshCw, X, Pencil } from 'lucide-react';
import { api } from '../../lib/api';
import type { AdminUser, AdminUserUpsert, RoleDefinition } from '../../lib/types';
import NotificationModal from '../../components/NotificationModal';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

interface EditableUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  status: AdminUser['status'];
  notes?: string;
}

const statusLabels: Record<AdminUser['status'], string> = {
  active: 'Активен',
  blocked: 'Заблокирован',
  pending: 'Ожидает доступа',
};

const statusBadgeStyles: Record<AdminUser['status'], string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('users.view');
  const canEdit = hasPermission('users.edit');
  const canDelete = hasPermission('users.delete');
  const protectedAdminEmail = 'admin@questroom.local';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminUser['status'] | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editor, setEditor] = useState<EditableUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    tone: 'success' | 'error' | 'info';
  }>({ isOpen: false, title: '', message: '', tone: 'info' });

  useEffect(() => {
    loadData();
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) || null,
    [users, selectedId]
  );

  useEffect(() => {
    setNoteDraft(selectedUser?.notes || '');
    setPasswordDraft('');
    setPasswordStatus('');
    setCreatePassword('');
  }, [selectedUser?.id]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesQuery =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone || '').includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesRole = roleFilter === 'all' || user.roleId === roleFilter;
      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const roleMap = useMemo(() => {
    return roles.reduce<Record<string, RoleDefinition>>((acc, role) => {
      acc[role.id] = role;
      return acc;
    }, {});
  }, [roles]);

  const isAdminUser = (user: AdminUser) => roleMap[user.roleId]?.code === 'admin';

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([api.getAdminUsers(), api.getRoles()]);
      setUsers(usersData);
      setRoles(rolesData);
      setSelectedId(usersData[0]?.id ?? null);
      setError(null);
    } catch (fetchError) {
      setError((fetchError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    const defaultRole = roles.find((role) => role.code !== 'admin') ?? roles[0];
    setEditor({
      id: '',
      name: '',
      email: '',
      phone: '',
      roleId: defaultRole?.id ?? '',
      status: 'pending',
      notes: '',
    });
    setIsCreating(true);
    setPasswordDraft('');
    setPasswordStatus('');
    setCreatePassword('');
  };

  const startEdit = (user: AdminUser) => {
    const fallbackRoleId = roles[0]?.id ?? '';
    setEditor({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId || fallbackRoleId,
      status: user.status || 'active',
      notes: user.notes,
    });
    setIsCreating(false);
    setPasswordDraft('');
    setPasswordStatus('');
    setCreatePassword('');
  };

  const saveEditor = async () => {
    if (!canEdit) return;
    if (!editor) return;
    if (!editor.name.trim() || !editor.email.trim()) {
      setNotification({
        isOpen: true,
        title: 'Проверьте данные',
        message: 'Заполните имя и email пользователя.',
        tone: 'error',
      });
      return;
    }
    if (isCreating && !createPassword.trim()) {
      setNotification({
        isOpen: true,
        title: 'Проверьте данные',
        message: 'Введите пароль для нового пользователя.',
        tone: 'error',
      });
      return;
    }

    const resolvedRoleId = editor.roleId || roles[0]?.id;
    if (!resolvedRoleId) {
      setNotification({
        isOpen: true,
        title: 'Проверьте данные',
        message: 'Выберите роль для пользователя.',
        tone: 'error',
      });
      return;
    }

    const payload: AdminUserUpsert = {
      name: editor.name,
      email: editor.email,
      phone: editor.phone || null,
      roleId: resolvedRoleId,
      status: editor.status,
      notes: editor.notes || null,
      password: isCreating ? createPassword : undefined,
    };

    try {
      if (isCreating) {
        const created = await api.createAdminUser(payload);
        setUsers((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setNotification({
          isOpen: true,
          title: 'Пользователь создан',
          message: `Пользователь ${created.name} успешно добавлен.`,
          tone: 'success',
        });
      } else {
        const updated = await api.updateAdminUser(editor.id, payload);
        setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
        setNotification({
          isOpen: true,
          title: 'Изменения сохранены',
          message: `Данные пользователя ${updated.name} обновлены.`,
          tone: 'success',
        });
      }
      setEditor(null);
      setIsCreating(false);
      setCreatePassword('');
      setError(null);
    } catch (saveError) {
      setNotification({
        isOpen: true,
        title: 'Ошибка сохранения',
        message: (saveError as Error).message,
        tone: 'error',
      });
    }
  };

  const cancelEditor = () => {
    setEditor(null);
    setIsCreating(false);
  };

  const toggleBlock = async (user: AdminUser) => {
    if (!canEdit) return;
    const nextStatus = user.status === 'blocked' ? 'active' : 'blocked';
    try {
      const updated = await api.updateAdminUserStatus(user.id, nextStatus);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (blockError) {
      setNotification({
        isOpen: true,
        title: 'Ошибка изменения статуса',
        message: (blockError as Error).message,
        tone: 'error',
      });
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!canDelete) return;
    if (user.email.toLowerCase() === protectedAdminEmail) {
      setNotification({
        isOpen: true,
        title: 'Удаление запрещено',
        message: 'Нельзя удалить основного администратора.',
        tone: 'error',
      });
      return;
    }
    if (!confirm(`Удалить пользователя ${user.name}?`)) return;
    try {
      await api.deleteAdminUser(user.id);
      const remaining = users.filter((item) => item.id !== user.id);
      setUsers(remaining);
      if (selectedId === user.id) {
        setSelectedId(remaining[0]?.id ?? null);
      }
    } catch (deleteError) {
      setNotification({
        isOpen: true,
        title: 'Ошибка удаления',
        message: (deleteError as Error).message,
        tone: 'error',
      });
    }
  };

  const updateRole = async (user: AdminUser, roleId: string) => {
    if (isAdminUser(user)) {
      setNotification({
        isOpen: true,
        title: 'Роль закреплена',
        message: 'У администратора роль менять нельзя.',
        tone: 'error',
      });
      return;
    }
    if (!canEdit) return;
    try {
      const updated = await api.updateAdminUser(user.id, {
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        roleId,
        status: user.status,
        notes: user.notes || null,
      });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (updateError) {
      setNotification({
        isOpen: true,
        title: 'Ошибка обновления роли',
        message: (updateError as Error).message,
        tone: 'error',
      });
    }
  };

  const updateStatus = async (user: AdminUser, status: AdminUser['status']) => {
    if (!canEdit) return;
    if (user.email.toLowerCase() === protectedAdminEmail && status !== 'active') {
      setNotification({
        isOpen: true,
        title: 'Статус защищён',
        message: 'Основной администратор всегда должен быть активен.',
        tone: 'error',
      });
      return;
    }
    try {
      const updated = await api.updateAdminUserStatus(user.id, status);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (updateError) {
      setNotification({
        isOpen: true,
        title: 'Ошибка обновления статуса',
        message: (updateError as Error).message,
        tone: 'error',
      });
    }
  };

  const submitPasswordReset = async () => {
    if (!canEdit) return;
    if (!passwordDraft.trim()) {
      setPasswordStatus('Введите новый пароль.');
      return;
    }
    if (!selectedUser) return;
    try {
      await api.updateAdminUserPassword(selectedUser.id, passwordDraft);
      setPasswordStatus('Пароль обновлен.');
      setPasswordDraft('');
      setNotification({
        isOpen: true,
        title: 'Пароль обновлен',
        message: 'Новый пароль сохранен.',
        tone: 'success',
      });
    } catch (resetError) {
      setPasswordStatus(`Ошибка: ${(resetError as Error).message}`);
      setNotification({
        isOpen: true,
        title: 'Ошибка смены пароля',
        message: (resetError as Error).message,
        tone: 'error',
      });
    }
  };

  const saveNotes = async () => {
    if (!canEdit) return;
    if (!selectedUser) return;
    try {
      const updated = await api.updateAdminUser(selectedUser.id, {
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone || null,
        roleId: selectedUser.roleId,
        status: selectedUser.status,
        notes: noteDraft,
      });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setNotification({
        isOpen: true,
        title: 'Заметки сохранены',
        message: 'Комментарий пользователя обновлен.',
        tone: 'success',
      });
    } catch (notesError) {
      setNotification({
        isOpen: true,
        title: 'Ошибка сохранения заметок',
        message: (notesError as Error).message,
        tone: 'error',
      });
    }
  };

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Пользователи</h2>
          <p className="text-sm text-gray-500">
            Управляйте доступом, статусом и ролями пользователей админ-панели.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
          <button
            type="button"
            onClick={startCreate}
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold shadow ${
              canEdit
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'cursor-not-allowed bg-red-200 text-white/80'
            }`}
          >
            <Plus className="h-4 w-4" />
            Добавить пользователя
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="relative text-sm">
            <span className="sr-only">Поиск</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по имени, email или телефону"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as AdminUser['status'] | 'all')}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="pending">Ожидают доступа</option>
            <option value="blocked">Заблокированные</option>
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Все роли</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Всего пользователей: <span className="font-semibold text-gray-900">{filteredUsers.length}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,_1fr)_340px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Пользователь</th>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Последний вход</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      Загрузка пользователей...
                    </td>
                  </tr>
                )}
                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      Пользователи не найдены.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`cursor-pointer transition hover:bg-gray-50 ${
                      selectedId === user.id ? 'bg-red-50' : ''
                    }`}
                    onClick={() => setSelectedId(user.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      {user.phone && <div className="text-xs text-gray-400">{user.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        <ShieldCheck className="h-3.5 w-3.5 text-gray-500" />
                        {roleMap[user.roleId]?.name || user.roleName || 'Без роли'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                          statusBadgeStyles[user.status]
                        }`}
                      >
                        {statusLabels[user.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString('ru-RU')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            startEdit(user);
                          }}
                          disabled={!canEdit}
                          className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                            canEdit
                              ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              : 'cursor-not-allowed border-gray-100 text-gray-300'
                          }`}
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleBlock(user);
                          }}
                          disabled={!canEdit}
                          className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                            canEdit
                              ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              : 'cursor-not-allowed border-gray-100 text-gray-300'
                          }`}
                          title={user.status === 'blocked' ? 'Разблокировать' : 'Блокировать'}
                        >
                          {user.status === 'blocked' ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Карточка пользователя</h3>
            {selectedUser ? (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <div className="text-xs uppercase text-gray-400">Имя</div>
                  <div className="font-semibold text-gray-900">{selectedUser.name}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Email</div>
                  <div className="text-gray-700">{selectedUser.email}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Телефон</div>
                  <div className="text-gray-700">{selectedUser.phone || '—'}</div>
                </div>
                <div className="grid gap-2 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Роль</span>
                    <span>{roleMap[selectedUser.roleId]?.name || selectedUser.roleName}</span>
                  </div>
                  <select
                    value={selectedUser.roleId || roles[0]?.id || ''}
                    onChange={(event) => updateRole(selectedUser, event.target.value)}
                    disabled={!canEdit || isAdminUser(selectedUser)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Статус</span>
                    <span>{statusLabels[selectedUser.status]}</span>
                  </div>
                  <select
                    value={
                      selectedUser.email.toLowerCase() === protectedAdminEmail
                        ? 'active'
                        : selectedUser.status
                    }
                    onChange={(event) =>
                      updateStatus(selectedUser, event.target.value as AdminUser['status'])
                    }
                    disabled={!canEdit || selectedUser.email.toLowerCase() === protectedAdminEmail}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    <option value="active">Активен</option>
                    <option value="pending">Ожидает доступа</option>
                    <option value="blocked">Заблокирован</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Создан</div>
                  <div className="text-gray-700">{selectedUser.createdAt}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Последний вход</div>
                  <div className="text-gray-700">
                    {selectedUser.lastLoginAt
                      ? new Date(selectedUser.lastLoginAt).toLocaleString('ru-RU')
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Заметки</div>
                  <textarea
                    value={noteDraft}
                    onChange={(event) => {
                      setNoteDraft(event.target.value);
                    }}
                    rows={3}
                    disabled={!canEdit}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                    placeholder="Комментарий по пользователю"
                  />
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={!canEdit}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-300"
                  >
                    Сохранить заметки
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <KeyRound className="h-4 w-4" />
                    Смена пароля
                  </div>
                  <input
                    type="password"
                    value={passwordDraft}
                    onChange={(event) => setPasswordDraft(event.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                    placeholder="Введите новый пароль"
                  />
                  <button
                    type="button"
                    onClick={submitPasswordReset}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-300"
                  >
                    Сменить пароль и отправить email
                  </button>
                  {passwordStatus && (
                    <p className="text-xs text-green-600">{passwordStatus}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toggleBlock(selectedUser)}
                    disabled={!canEdit}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-300"
                  >
                    {selectedUser.status === 'blocked' ? (
                      <>
                        <Unlock className="h-4 w-4" />
                        Разблокировать
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Заблокировать
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUser(selectedUser)}
                    disabled={!canDelete || selectedUser.email.toLowerCase() === protectedAdminEmail}
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить пользователя
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                Выберите пользователя из списка, чтобы увидеть подробности.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700">Сводка по доступу</h4>
            <div className="mt-3 space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between">
                  <span className="text-gray-600">{role.name}</span>
                  <span className="font-semibold text-gray-900">
                    {users.filter((user) => user.roleId === role.id).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {isCreating ? 'Новый пользователь' : 'Редактирование пользователя'}
              </h3>
              <button
                type="button"
                onClick={cancelEditor}
                className="inline-flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">Имя</label>
                <input
                  type="text"
                  value={editor.name}
                  onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Иван Иванов"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  value={editor.email}
                  onChange={(event) => setEditor({ ...editor, email: event.target.value })}
                  disabled={!isCreating && editor.email.toLowerCase() === protectedAdminEmail}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
                  placeholder="admin@questroom.ru"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Телефон</label>
                <input
                  type="tel"
                  value={editor.phone || ''}
                  onChange={(event) => setEditor({ ...editor, phone: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="+7 (999) 999-99-99"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Роль</label>
                <select
                  value={editor.roleId}
                  onChange={(event) => setEditor({ ...editor, roleId: event.target.value })}
                  disabled={!canEdit || (!isCreating && roleMap[editor.roleId]?.code === 'admin')}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Статус</label>
                <select
                  value={
                    editor.email.toLowerCase() === protectedAdminEmail ? 'active' : editor.status
                  }
                  onChange={(event) =>
                    setEditor({ ...editor, status: event.target.value as AdminUser['status'] })
                  }
                  disabled={editor.email.toLowerCase() === protectedAdminEmail}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="active">Активен</option>
                  <option value="pending">Ожидает доступа</option>
                  <option value="blocked">Заблокирован</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Заметки</label>
                <input
                  type="text"
                  value={editor.notes || ''}
                  onChange={(event) => setEditor({ ...editor, notes: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Ответственный менеджер, роль согласована"
                />
              </div>
              {isCreating && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Пароль</label>
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(event) => setCreatePassword(event.target.value)}
                    disabled={!canEdit}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                    placeholder="Минимум 6 символов"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={cancelEditor}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveEditor}
                disabled={!canEdit}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  canEdit
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'cursor-not-allowed bg-red-200 text-white/80'
                }`}
              >
                Сохранить
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
        onClose={() =>
          setNotification((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
    </div>
  );
}
