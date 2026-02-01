import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { TeaZone } from '../lib/types';

export default function TeaZonesPage() {
  const [teaZones, setTeaZones] = useState<TeaZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeaZones();
  }, []);

  const loadTeaZones = async () => {
    try {
      const data = await api.getTeaZones(true);
      setTeaZones(data || []);
    } catch (error) {
      console.error('Error loading tea zones:', error);
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Зоны для чаепития
          </h1>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {teaZones.map((zone) => (
            <div key={zone.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white text-center">{zone.name}</h2>
            </div>
          ))}
        </div>

        {teaZones.length === 0 && (
          <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-lg">
            <p className="text-white text-lg">Зоны для чаепития пока не добавлены</p>
          </div>
        )}
      </div>
    </div>
  );
}
