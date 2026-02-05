import { useMemo, useState, useEffect } from 'react';
import { Check, Shield, Plus, RefreshCw, X, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import type { PermissionGroup, RoleDefinition } from '../../lib/types';
import NotificationModal from '../../components/NotificationModal';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

interface EditableRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  system?: boolean;
}

export default function RolesPage() {
  const { isAdmin } = useAuth();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditableRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!activeGroupId && permissionGroups.length > 0) {
      setActiveGroupId(permissionGroups[0].id);
    }
  }, [activeGroupId, permissionGroups]);

  if (!isAdmin()) {
    return <AccessDenied />;
  }

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedId) || null,
    [roles, selectedId]
  );

  const permissionIndex = useMemo(() => {
    return permissionGroups.flatMap((group) =>
      group.permissions.map((item) => ({ ...item, groupId: group.id, groupTitle: group.title }))
    );
  }, [permissionGroups]);

  const activeGroup = useMemo(
    () => permissionGroups.find((group) => group.id === activeGroupId) || permissionGroups[0],
    [permissionGroups, activeGroupId]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        api.getRoles(),
        api.getPermissionGroups(),
      ]);
      setRoles(rolesData);
      setPermissionGroups(permissionsData);
      setSelectedId(rolesData[0]?.id ?? null);
      setError(null);
    } catch (fetchError) {
      setError((fetchError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditor({
      id: `role-${Date.now()}`,
      name: '',
      description: '',
      permissions: [],
    });
    setIsCreating(true);
  };

  const startEdit = (role: RoleDefinition) => {
    setEditor({
      id: role.id,
      name: role.name,
      description: role.description ?? '',
      permissions: [...role.permissions],
      system: role.code === 'admin',
    });
    setIsCreating(false);
  };

  const saveEditor = async () => {
    if (!editor) return;
    if (!editor.name.trim()) {
      setNotification({
        isOpen: true,
        title: 'Проверьте данные',
        message: 'Название роли обязательно.',
        tone: 'error',
      });
      return;
    }
    try {
      if (isCreating) {
        const created = await api.createRole({
          name: editor.name,
          description: editor.description,
          permissions: editor.permissions,
        });
        setRoles((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setNotification({
          isOpen: true,
          title: 'Роль создана',
          message: `Роль "${created.name}" успешно добавлена.`,
          tone: 'success',
        });
      } else {
        const updated = await api.updateRole(editor.id, {
          name: editor.name,
          description: editor.description,
          permissions: editor.permissions,
        });
        setRoles((prev) => prev.map((role) => (role.id === updated.id ? updated : role)));
        setNotification({
          isOpen: true,
          title: 'Роль обновлена',
          message: `Роль "${updated.name}" успешно обновлена.`,
          tone: 'success',
        });
      }
      setEditor(null);
      setIsCreating(false);
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

  const deleteRole = async (role: RoleDefinition) => {
    if (role.isSystem) {
      setNotification({
        isOpen: true,
        title: 'Удаление запрещено',
        message: 'Системные роли удалить нельзя.',
        tone: 'error',
      });
      return;
    }
    if (!confirm(`Удалить роль ${role.name}?`)) return;
    try {
      await api.deleteRole(role.id);
      const remaining = roles.filter((item) => item.id !== role.id);
      setRoles(remaining);
      if (selectedId === role.id) {
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

  const togglePermission = (permissionId: string) => {
    if (!editor) return;
    const hasPermission = editor.permissions.includes(permissionId);
    const nextPermissions = hasPermission
      ? editor.permissions.filter((id) => id !== permissionId)
      : [...editor.permissions, permissionId];
    setEditor({ ...editor, permissions: nextPermissions });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Роли и права</h2>
          <p className="text-sm text-gray-500">
            Настройте роли админ-панели и наборы правил для доступа к разделам.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white font-semibold shadow hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Создать роль
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_1fr)_380px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3">Права</th>
                  <th className="px-4 py-3">Обновлено</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                      Загрузка ролей...
                    </td>
                  </tr>
                )}
                {!loading && roles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                      Роли не найдены.
                    </td>
                  </tr>
                )}
                {!loading &&
                  roles.map((role) => {
                    const isAdminRole = role.code === 'admin';
                    return (
                      <tr
                        key={role.id}
                        className={`cursor-pointer transition hover:bg-gray-50 ${
                          selectedId === role.id ? 'bg-red-50' : ''
                        }`}
                        onClick={() => setSelectedId(role.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{role.name}</div>
                          <div className="text-xs text-gray-500">{role.description}</div>
                          {role.isSystem && (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-500">
                              <Shield className="h-3 w-3" />
                              Системная
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {role.permissions.length} прав
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{role.updatedAt}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                startEdit(role);
                              }}
                              className={`rounded-lg border p-1.5 text-xs font-semibold ${
                                isAdminRole
                                  ? 'cursor-not-allowed border-gray-200 text-gray-300'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                              disabled={isAdminRole}
                              title="Изменить"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteRole(role);
                              }}
                              className={`rounded-lg border p-1.5 text-xs font-semibold ${
                                role.isSystem
                                  ? 'cursor-not-allowed border-red-100 text-red-200'
                                  : 'border-red-200 text-red-600 hover:bg-red-50'
                              }`}
                              disabled={role.isSystem}
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Карточка роли</h3>
            {selectedRole ? (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <div className="text-xs uppercase text-gray-400">Название</div>
                  <div className="font-semibold text-gray-900">{selectedRole.name}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Описание</div>
                  <div className="text-gray-700">{selectedRole.description}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Права</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRole.permissions.map((permissionId) => {
                      const permission = permissionIndex.find((item) => item.id === permissionId);
                      const label = permission
                        ? `${permission.groupTitle}: ${permission.title}`
                        : permissionId;
                      return (
                        <span
                          key={permissionId}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                          title={permission?.description}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Обновлено</div>
                  <div className="text-gray-700">{selectedRole.updatedAt}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                Выберите роль из списка, чтобы увидеть подробности.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700">Обязательные правила</h4>
            <div className="mt-3 space-y-2 text-gray-600">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-green-600" />
                <span>Системные роли можно только дублировать, но не редактировать.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-green-600" />
                <span>Удаление роли доступно только для пользовательских наборов.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-green-600" />
                <span>Изменения прав сразу применяются к пользователям роли.</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isCreating ? 'Новая роль' : 'Редактирование роли'}
              </h3>
              <div className="flex items-center gap-2">
                {editor.system && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    Системная роль
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditor(null);
                    setIsCreating(false);
                  }}
                  className="inline-flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-6 pb-6">
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Название</label>
                  <input
                    type="text"
                    value={editor.name}
                    onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="Например: Старший менеджер"
                    disabled={editor.system}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Описание</label>
                  <textarea
                    value={editor.description}
                    onChange={(event) => setEditor({ ...editor, description: event.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    rows={3}
                    placeholder="Опишите, за что отвечает роль"
                    disabled={editor.system}
                  />
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Права доступа</h4>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {permissionGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveGroupId(group.id)}
                        className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                          activeGroup?.id === group.id
                            ? 'border-red-600 bg-red-50 text-red-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {group.title}
                      </button>
                    ))}
                  </div>

                  {activeGroup ? (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-gray-900">{activeGroup.title}</div>
                        <div className="text-xs text-gray-500">{activeGroup.description}</div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {activeGroup.permissions.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={editor.permissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                              disabled={editor.system}
                            />
                            <span>
                              <span className="font-semibold text-gray-800">{permission.title}</span>
                              <span className="block text-xs text-gray-500">
                                {permission.description}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Нет доступных групп прав.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setEditor(null);
                  setIsCreating(false);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveEditor}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Сохранить роль
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
