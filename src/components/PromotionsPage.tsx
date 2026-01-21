import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Promotion } from '../lib/types';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const data = await api.getPromotions(true);
      setPromotions(data || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
    setLoading(false);
  };

  const frameClass = 'bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6';

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
            Акции
          </h1>
        </div>

        <div className="space-y-8">
          {promotions.map((promo) => {
            const displayMode = promo.displayMode || 'text_description';

            if (displayMode === 'image') {
              return (
                <div key={promo.id} className={frameClass}>
                  {promo.imageUrl ? (
                    <img
                      src={promo.imageUrl}
                      alt={promo.title}
                      className="w-full max-h-[520px] object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-white/70">
                      Изображение не указано
                    </div>
                  )}
                </div>
              );
            }

            if (displayMode === 'text') {
              return (
                <div key={promo.id} className={`${frameClass} text-center space-y-4`}>
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-wide uppercase">
                    {promo.title}
                  </h2>
                  {promo.discountText && (
                    <div className="text-5xl md:text-6xl font-black text-red-400">
                      {promo.discountText}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={promo.id} className={frameClass}>
                <div className="relative overflow-hidden rounded-lg">
                  <div
                    className="relative h-96 bg-cover bg-center"
                    style={{
                      backgroundImage: promo.imageUrl
                        ? `url(${promo.imageUrl})`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                      <h2 className="text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-2xl tracking-wide uppercase">
                        {promo.title}
                      </h2>
                      {promo.discountText && (
                        <div className="text-7xl md:text-8xl font-black text-red-500 drop-shadow-2xl mb-4">
                          {promo.discountText}
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-amber-800/90 backdrop-blur-sm py-4 px-6">
                      <p className="text-white text-center text-base md:text-lg font-semibold tracking-wide">
                        {promo.description}
                      </p>
                      {promo.validUntil && (
                        <p className="text-white/80 text-center text-sm mt-2">
                          Действует до: {new Date(promo.validUntil).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {promotions.length === 0 && (
          <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-lg">
            <p className="text-white text-lg">Нет активных акций</p>
          </div>
        )}
      </div>
    </div>
  );
}
