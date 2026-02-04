import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Quest, Settings } from '../lib/types';
import Hero from '../components/Hero';
import QuestCard from '../components/QuestCard';

export default function HomePage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'adult' | 'kids'>('adult');

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    try {
      const [questsResult, settingsResult] = await Promise.allSettled([
        api.getQuests(true),
        api.getSettings(),
      ]);

      if (questsResult.status === 'fulfilled') {
        setQuests(questsResult.value || []);
      } else {
        console.error('Error loading quests:', questsResult.reason);
      }

      if (settingsResult.status === 'fulfilled') {
        setSettings(settingsResult.value);
      } else {
        console.error('Error loading settings:', settingsResult.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredQuests = quests.filter((quest) => {
    if (activeCategory === 'kids') {
      return Boolean(quest.parentQuestId);
    }
    return !quest.parentQuestId;
  });

  return (
    <>
      <Hero />
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        <div className="flex flex-col items-center gap-3 md:gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveCategory('adult')}
              className={`px-6 py-2 md:px-8 md:py-3 text-sm md:text-base font-bold uppercase tracking-wider border-2 transition-all font-display ${
                activeCategory === 'adult'
                  ? 'bg-[#c51f2e] border-[#c51f2e] text-white shadow-lg'
                  : 'bg-transparent border-white/60 text-white/80 hover:text-white hover:border-white'
              }`}
            >
              Взрослые
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('kids')}
              className={`px-6 py-2 md:px-8 md:py-3 text-sm md:text-base font-bold uppercase tracking-wider border-2 transition-all font-display ${
                activeCategory === 'kids'
                  ? 'bg-[#c51f2e] border-[#c51f2e] text-white shadow-lg'
                  : 'bg-transparent border-white/60 text-white/80 hover:text-white hover:border-white'
              }`}
            >
              Детские
            </button>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
            <p className="text-white font-semibold text-lg">Загрузка квестов...</p>
          </div>
        ) : filteredQuests.length > 0 ? (
          filteredQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              useVideoModal={settings?.videoModalEnabled ?? false}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-lg">
            <p className="text-white text-xl font-semibold">Квесты временно недоступны</p>
            <p className="text-white/80 mt-2">Скоро появятся новые квесты!</p>
          </div>
        )}
      </div>
    </>
  );
}
