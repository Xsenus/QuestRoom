import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Rule } from '../lib/types';

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await api.getRules(true);
      setRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
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
          {rules.map((rule, index) => {
            const isWarningRule = rule.title.toLowerCase().startsWith('мы не допускаем');
            if (isWarningRule) {
              return (
                <div
                  key={rule.id}
                  className="bg-white/5 border border-red-500/70 rounded-lg p-6 md:p-8 text-center"
                >
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                    {rule.title}
                  </h3>
                  <div className="text-white/90 leading-relaxed whitespace-pre-wrap space-y-2">
                    {rule.content
                      .split('\n')
                      .filter(Boolean)
                      .map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={rule.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="flex gap-4">
                  <span className="text-red-500 font-bold text-xl flex-shrink-0">{index + 1}.</span>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{rule.title}</h3>
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{rule.content}</p>
                  </div>
                </div>
              </div>
            );
          })}

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
