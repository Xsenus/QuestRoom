import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '../lib/imageOptimizations';
import { Promotion, Settings } from '../lib/types';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const [promoData, settingsData] = await Promise.all([
        api.getPromotions(true),
        api.getSettings(),
      ]);
      setPromotions(promoData || []);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
    setLoading(false);
  };

  const frameClass = 'bg-white/10 backdrop-blur-sm rounded-lg p-5';
  const promotionsPerRow = settings?.promotionsPerRow || 1;
  const gridColumnsClass =
    promotionsPerRow >= 3
      ? 'md:grid-cols-3'
      : promotionsPerRow === 2
        ? 'md:grid-cols-2'
        : 'md:grid-cols-1';

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

        <div className={`grid gap-8 ${gridColumnsClass}`}>
          {promotions.map((promo) => {
            const periodText = promo.validUntil
              ? `${new Date(promo.validFrom).toLocaleDateString('ru-RU')} — ${new Date(
                  promo.validUntil
                ).toLocaleDateString('ru-RU')}`
              : `${new Date(promo.validFrom).toLocaleDateString('ru-RU')} — без ограничения`;

            return (
              <div key={promo.id} className={`${frameClass} flex flex-col gap-4`}>
                {promo.showTitle && (
                  <h2 className="text-2xl font-bold text-white text-center">{promo.title}</h2>
                )}
                {promo.showImage && (
                  <>
                    {promo.imageUrl ? (
                      <img
                        src={getOptimizedImageUrl(promo.imageUrl, { width: 1200 })}
                        srcSet={getResponsiveSrcSet(promo.imageUrl, [600, 900, 1200, 1600])}
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        alt={promo.title}
                        className={`w-full rounded-lg bg-white/5 ${
                          promotionsPerRow === 1
                            ? 'max-h-[420px] object-contain'
                            : 'max-h-[320px] object-cover'
                        }`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-56 rounded-lg border border-dashed border-white/40 flex items-center justify-center text-white/70">
                        Изображение не указано
                      </div>
                    )}
                  </>
                )}
                {promo.showDescription && (
                  <p className="text-white/90 text-base text-center">{promo.description}</p>
                )}
                {(promo.showDiscountText || promo.showPeriod) && (
                  <div className="mt-auto space-y-2 text-center">
                    {promo.showDiscountText && (
                      <div className="text-lg font-bold text-red-300">{promo.discountText}</div>
                    )}
                    {promo.showPeriod && (
                      <div className="text-sm text-white/70">Период: {periodText}</div>
                    )}
                  </div>
                )}
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
