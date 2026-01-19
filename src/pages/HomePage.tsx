import { useState, useEffect } from 'react';
import { supabase, Quest } from '../lib/supabase';
import Hero from '../components/Hero';
import QuestCard from '../components/QuestCard';

export default function HomePage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading quests:', error);
    } else {
      setQuests(data || []);
    }
    setLoading(false);
  };

  const mappedQuests = quests.map((quest) => ({
    id: parseInt(quest.id),
    title: quest.title,
    image: quest.main_image || 'https://images.pexels.com/photos/7972737/pexels-photo-7972737.jpeg?auto=compress&cs=tinysrgb&w=800',
    ageRating: quest.age_rating,
    badgeImage: '/images/image copy copy.png',
    isNew: quest.is_new,
    participants: quest.participants,
    ageRestriction: quest.age_restriction,
    address: quest.address,
    phone: quest.phone,
    description: quest.description,
  }));

  return (
    <>
      <Hero />
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
            <p className="text-white font-semibold text-lg">Загрузка квестов...</p>
          </div>
        ) : mappedQuests.length > 0 ? (
          mappedQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
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
