import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Quest, Settings } from '../lib/types';
import Hero from '../components/Hero';
import QuestCard from '../components/QuestCard';

export default function HomePage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <Hero />
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
            <p className="text-white font-semibold text-lg">Загрузка квестов...</p>
          </div>
        ) : quests.length > 0 ? (
          quests.map((quest) => (
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
