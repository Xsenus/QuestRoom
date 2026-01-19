import { useState, useEffect } from 'react';
import { supabase, Rule } from '../lib/supabase';

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading rules:', error);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-12">
            Правила участия
          </h1>
        </div>

        <div className="space-y-6">
          {rules.map((rule, index) => (
            <div key={rule.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="flex gap-4">
                <span className="text-red-500 font-bold text-xl flex-shrink-0">{index + 1}.</span>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{rule.title}</h3>
                  <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{rule.content}</p>
                </div>
              </div>
            </div>
          ))}

          {rules.length === 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center">
              <p className="text-white text-lg">Правила не найдены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
