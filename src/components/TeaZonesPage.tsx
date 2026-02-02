import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Settings, TeaZone } from '../lib/types';

type ScrollDirection = 'left' | 'right';

const TeaZoneGallery = ({ name, images }: { name: string; images: string[] }) => {
  const [selectedImage, setSelectedImage] = useState(images[0] || '');
  const [isOpen, setIsOpen] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedImage(images[0] || '');
  }, [images]);

  const handleThumbnailScroll = (direction: ScrollDirection) => {
    const container = thumbnailsRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!images.length) {
    return (
      <div className="h-56 rounded-lg border border-dashed border-white/40 flex items-center justify-center text-white/70">
        Фото не указаны
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-56 overflow-hidden rounded-lg bg-white/5">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-full w-full"
          aria-label={`Открыть фото зоны ${name}`}
        >
          <img
            src={selectedImage}
            alt={name}
            className="h-full w-full object-cover"
          />
        </button>
      </div>
      {images.length > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleThumbnailScroll('left')}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Прокрутить влево"
          >
            ‹
          </button>
          <div ref={thumbnailsRef} className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth flex-1">
            {images.map((img) => (
              <button
                key={img}
                onClick={() => setSelectedImage(img)}
                className={`flex-shrink-0 rounded-lg border-2 transition-all ${
                  selectedImage === img ? 'border-yellow-400' : 'border-transparent'
                }`}
                type="button"
              >
                <img src={img} alt={`${name} фото`} className="h-20 w-28 object-cover rounded-md" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleThumbnailScroll('right')}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Прокрутить вправо"
          >
            ›
          </button>
        </div>
      )}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Фото зоны ${name}`}
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-h-full max-w-5xl w-full" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute -top-10 right-0 text-white text-3xl leading-none"
              aria-label="Закрыть"
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt={name}
              className="max-h-[80vh] w-full rounded-lg object-contain bg-black/30"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function TeaZonesPage() {
  const [teaZones, setTeaZones] = useState<TeaZone[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeaZones();
  }, []);

  const loadTeaZones = async () => {
    try {
      const [teaZoneData, settingsData] = await Promise.all([
        api.getTeaZones(true),
        api.getSettings(),
      ]);
      setTeaZones(teaZoneData || []);
      setSettings(settingsData);
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

        <div
          className={`grid gap-8 ${
            settings?.teaZonesPerRow === 3
              ? 'md:grid-cols-3'
              : settings?.teaZonesPerRow === 1
                ? 'md:grid-cols-1'
                : 'md:grid-cols-2'
          }`}
        >
          {teaZones.map((zone) => (
            <div key={zone.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-5">
              <TeaZoneGallery name={zone.name} images={zone.images || []} />
              <div className="space-y-3 text-white">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">{zone.name}</h2>
                  {zone.branch && (
                    <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-sm font-semibold text-yellow-200">
                      {zone.branch}
                    </span>
                  )}
                </div>
                {zone.address && <p className="text-white/80 text-sm">Адрес: {zone.address}</p>}
                {zone.description && (
                  <p className="text-white/90 text-base whitespace-pre-wrap">{zone.description}</p>
                )}
              </div>
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
