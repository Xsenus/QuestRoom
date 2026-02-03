import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Rule, RuleUpsert } from '../../lib/types';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

export default function RulesPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('rules.view');
  const canEdit = hasPermission('rules.edit');
  const canDelete = hasPermission('rules.delete');
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<(RuleUpsert & { id?: string }) | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') {
      return 'cards';
    }
    const saved = localStorage.getItem('admin_rules_view');
    return saved === 'table' ? 'table' : 'cards';
  });

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_rules_view', viewMode);
    }
  }, [viewMode]);

  const loadRules = async () => {
    try {
      const data = await api.getRules();
      setRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    if (!canEdit) return;
    setEditingRule({
      title: '',
      content: '',
      sortOrder: rules.length,
      isVisible: true,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (!editingRule) return;

    const { id, ...payload } = editingRule;

    try {
      if (isCreating) {
        await api.createRule(payload);
      } else if (id) {
        await api.updateRule(id, payload);
      }
    } catch (error) {
      alert('Ошибка при сохранении правила: ' + (error as Error).message);
      return;
    }

    setEditingRule(null);
    setIsCreating(false);
    loadRules();
  };

  const handleCancel = () => {
    setEditingRule(null);
    setIsCreating(false);
  };

  const handleToggleVisibility = async (rule: Rule) => {
    if (!canEdit) return;
    try {
      const { id, createdAt, updatedAt, ...payload } = rule;
      await api.updateRule(id, { ...payload, isVisible: !rule.isVisible });
      loadRules();
    } catch (error) {
      alert('Ошибка при изменении видимости: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!confirm('Вы уверены, что хотите удалить это правило?')) return;

    try {
      await api.deleteRule(id);
      loadRules();
    } catch (error) {
      alert('Ошибка при удалении правила: ' + (error as Error).message);
    }
  };

  if (!canView) {
    return <AccessDenied />;
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (editingRule) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Создание правила' : 'Редактирование правила'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Заголовок правила
              </label>
              <input
                type="text"
                value={editingRule.title || ''}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Например: Правила безопасности"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Содержание правила
              </label>
              <textarea
                value={editingRule.content || ''}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, content: e.target.value })
                }
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Подробное описание правила..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={editingRule.sortOrder || 0}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.isVisible !== false}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, isVisible: e.target.checked })
                    }
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Показывать на сайте
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                disabled={!canEdit}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  canEdit
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'cursor-not-allowed bg-red-200 text-white/80'
                }`}
              >
                <Save className="w-5 h-5" />
                Сохранить
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <X className="w-5 h-5" />
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление правилами</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Карточки
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Таблица
            </button>
          </div>
          <button
            onClick={handleCreate}
            disabled={!canEdit}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              canEdit
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'cursor-not-allowed bg-red-200 text-white/80'
            }`}
          >
            <Plus className="w-5 h-5" />
            Добавить правило
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Название</th>
                <th className="text-left px-4 py-3 font-semibold">Описание</th>
                <th className="text-left px-4 py-3 font-semibold">Сортировка</th>
                <th className="text-left px-4 py-3 font-semibold">Статус</th>
                <th className="text-right px-4 py-3 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id} className={!rule.isVisible ? 'opacity-60' : ''}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{rule.title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <p className="line-clamp-2 whitespace-pre-wrap">{rule.content}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{rule.sortOrder}</td>
                  <td className="px-4 py-3">
                    {rule.isVisible ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        На сайте
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        Скрыт
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingRule(rule)}
                        disabled={!canEdit}
                        className={`p-2 rounded-lg transition-colors ${
                          canEdit
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            : 'cursor-not-allowed bg-blue-50 text-blue-200'
                        }`}
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(rule)}
                        disabled={!canEdit}
                        className={`p-2 rounded-lg transition-colors ${
                          canEdit
                            ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                            : 'cursor-not-allowed bg-yellow-50 text-yellow-200'
                        }`}
                        title={rule.isVisible ? 'Скрыть' : 'Показать'}
                      >
                        {rule.isVisible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={!canDelete}
                        className={`p-2 rounded-lg transition-colors ${
                          canDelete
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'cursor-not-allowed bg-red-50 text-red-200'
                        }`}
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`group flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-lg ${
                !rule.isVisible ? 'opacity-60' : ''
              }`}
            >
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  rule.isVisible ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {rule.isVisible ? 'На сайте' : 'Скрыт'}
              </span>

              <div className="mt-4 flex-1 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">{rule.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                  {rule.content}
                </p>
              </div>

              <div className="mt-5">
                <div className="text-xs font-medium text-gray-400">
                  Порядок: <span className="text-gray-500">{rule.sortOrder}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setEditingRule(rule)}
                    disabled={!canEdit}
                    className={`rounded-lg border border-transparent p-2 transition-colors ${
                      canEdit
                        ? 'bg-blue-50 text-blue-600 hover:border-blue-100 hover:bg-blue-100'
                        : 'cursor-not-allowed bg-blue-50 text-blue-200'
                    }`}
                    title="Редактировать"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleVisibility(rule)}
                    disabled={!canEdit}
                    className={`rounded-lg border border-transparent p-2 transition-colors ${
                      canEdit
                        ? 'bg-amber-50 text-amber-600 hover:border-amber-100 hover:bg-amber-100'
                        : 'cursor-not-allowed bg-amber-50 text-amber-200'
                    }`}
                    title={rule.isVisible ? 'Скрыть' : 'Показать'}
                  >
                    {rule.isVisible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={!canDelete}
                    className={`rounded-lg border border-transparent p-2 transition-colors ${
                      canDelete
                        ? 'bg-rose-50 text-rose-600 hover:border-rose-100 hover:bg-rose-100'
                        : 'cursor-not-allowed bg-rose-50 text-rose-200'
                    }`}
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg">Правила не найдены</p>
          <p className="text-gray-500 mt-2">Создайте первое правило</p>
        </div>
      )}
    </div>
  );
}
