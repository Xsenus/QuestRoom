import { useState, useEffect } from 'react';
import { Users, UserPlus, GraduationCap, Heart, Baby } from 'lucide-react';
import { supabase, AboutInfo } from '../lib/supabase';

export default function AboutPage() {
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAboutInfo();
  }, []);

  const loadAboutInfo = async () => {
    const { data, error } = await supabase
      .from('about_info')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading about info:', error);
    } else if (data) {
      setAboutInfo(data);
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">
            {aboutInfo?.title || 'О проекте'}
          </h1>

          <p className="text-xl text-white/90 mb-12">
            Собери команду и побей рекорды предыдущих участников. Ты отлично проведешь время!
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="flex flex-col items-center space-y-3">
            <Users className="w-12 h-12 text-white" />
            <span className="text-white text-center text-sm">С друзьями</span>
          </div>
          <div className="flex flex-col items-center space-y-3">
            <Heart className="w-12 h-12 text-white" />
            <span className="text-white text-center text-sm">С семьей</span>
          </div>
          <div className="flex flex-col items-center space-y-3">
            <GraduationCap className="w-12 h-12 text-white" />
            <span className="text-white text-center text-sm">С одногруппниками</span>
          </div>
          <div className="flex flex-col items-center space-y-3">
            <UserPlus className="w-12 h-12 text-white" />
            <span className="text-white text-center text-sm">С коллегами</span>
          </div>
          <div className="flex flex-col items-center space-y-3">
            <Baby className="w-12 h-12 text-white" />
            <span className="text-white text-center text-sm">С любимым человеком</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 space-y-6 text-white">
          <div className="text-lg leading-relaxed whitespace-pre-wrap">
            {aboutInfo?.content}
          </div>

          {aboutInfo?.mission && (
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-3">Наша миссия</h3>
              <p className="text-lg leading-relaxed">{aboutInfo.mission}</p>
            </div>
          )}

          {aboutInfo?.vision && (
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-3">Наше видение</h3>
              <p className="text-lg leading-relaxed">{aboutInfo.vision}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
