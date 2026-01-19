import { useState, useEffect } from 'react';
import { supabase, Rule } from '../../lib/supabase';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X } from 'lucide-react';

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Partial<Rule> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading rules:', error);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingRule({
      title: '',
      content: '',
      sort_order: rules.length,
      is_visible: true,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingRule) return;

    if (isCreating) {
      const { error } = await supabase.from('rules').insert([editingRule]);
      if (error) {
        alert('Ошибка при создании правила: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('rules')
        .update(editingRule)
        .eq('id', editingRule.id);
      if (error) {
        alert('Ошибка при обновлении правила: ' + error.message);
        return;
      }
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
    const { error } = await supabase
      .from('rules')
      .update({ is_visible: !rule.is_visible })
      .eq('id', rule.id);

    if (error) {
      alert('Ошибка при изменении видимости: ' + error.message);
    } else {
      loadRules();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это правило?')) return;

    const { error } = await supabase.from('rules').delete().eq('id', id);

    if (error) {
      alert('Ошибка при удалении правила: ' + error.message);
    } else {
      loadRules();
    }
  };

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
                  value={editingRule.sort_order || 0}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.is_visible !== false}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, is_visible: e.target.checked })
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
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление правилами</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить правило
        </button>
      </div>

      <div className="grid gap-6">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white rounded-lg shadow-lg p-6 ${
              !rule.is_visible ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{rule.title}</h3>
                  {!rule.is_visible && (
                    <span className="bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                      СКРЫТ
                    </span>
                  )}
                </div>
                <p className="text-gray-600 whitespace-pre-wrap">{rule.content}</p>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setEditingRule(rule)}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                  title="Редактировать"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleToggleVisibility(rule)}
                  className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                  title={rule.is_visible ? 'Скрыть' : 'Показать'}
                >
                  {rule.is_visible ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">Правила не найдены</p>
            <p className="text-gray-500 mt-2">Создайте первое правило</p>
          </div>
        )}
      </div>
    </div>
  );
}
