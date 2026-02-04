import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '../lib/imageOptimizations';
import { Quest, QuestSchedule, Settings } from '../lib/types';
import { Users, Clock, Star, BadgeDollarSign, Key } from 'lucide-react';
import BookingModal from '../components/BookingModal';

export default function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [schedule, setSchedule] = useState<QuestSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<QuestSchedule | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement | null>(null);
  const formatAgeRating = (value?: string | null) => {
    const trimmed = value?.trim() ?? '';
    const match = trimmed.match(/^(\d+)\s*\+$/);
    return match ? `${match[1]} +` : trimmed;
  };

  useEffect(() => {
    if (id) {
      loadQuest();
    }
  }, [id]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (quest?.id) {
      loadSchedule(quest.id);
    }
  }, [quest?.id, settings?.bookingDaysAhead]);

  const loadQuest = async () => {
    setLoading(true);
    try {
      const data = await api.getQuest(id!);
      if (data.isVisible) {
        setQuest(data);
      } else {
        setQuest(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading quest:', error);
      setQuest(null);
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadSchedule = async (questId: string) => {
    const today = new Date();
    const twoWeeksLater = new Date();
    const daysAhead = settings?.bookingDaysAhead ?? 10;
    twoWeeksLater.setDate(today.getDate() + Math.max(0, daysAhead - 1));

    try {
      const data = await api.getQuestSchedule(
        questId,
        formatDateForApi(today),
        formatDateForApi(twoWeeksLater)
      );
      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (quest) {
      setSelectedImage(quest.mainImage || quest.images?.[0] || null);
    }
  }, [quest]);

  const handleSlotClick = (slot: QuestSchedule) => {
    if (!slot.isBooked && !isSlotClosed(slot)) {
      setSelectedSlot(slot);
      setShowBookingModal(true);
    }
  };

  const handleThumbnailScroll = (direction: 'left' | 'right') => {
    const container = thumbnailsRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleBookingComplete = () => {
    setShowBookingModal(false);
    if (quest?.id) {
      loadSchedule(quest.id);
    }
  };

  const handleBookingCreated = (slotId: string) => {
    setSchedule((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, isBooked: true } : slot))
    );
  };

  const groupScheduleByDate = () => {
    const grouped: { [date: string]: QuestSchedule[] } = {};
    schedule.forEach((slot) => {
      if (!grouped[slot.date]) {
        grouped[slot.date] = [];
      }
      grouped[slot.date].push(slot);
    });
    return grouped;
  };

  const groupSlotsByPrice = (slots: QuestSchedule[]) => {
    return slots.reduce<{ price: number; slots: QuestSchedule[] }[]>((groups, slot) => {
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.price !== slot.price) {
        groups.push({ price: slot.price, slots: [slot] });
      } else {
        lastGroup.slots.push(slot);
      }
      return groups;
    }, []);
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { weekday: 'long' });
  };

  const getDisplayDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const getNowInTimeZone = (timeZone?: string | null) => {
    if (!timeZone) {
      return new Date();
    }
    try {
      return new Date(new Date().toLocaleString('en-US', { timeZone }));
    } catch (error) {
      console.warn('Invalid time zone, fallback to local time.', error);
      return new Date();
    }
  };

  const isSlotClosed = (slot: QuestSchedule) => {
    const cutoffMinutes = settings?.bookingCutoffMinutes ?? 10;
    if (cutoffMinutes <= 0) {
      return false;
    }
    const timePart = slot.timeSlot.substring(0, 5);
    const slotDate = new Date(`${slot.date}T${timePart}:00`);
    const now = getNowInTimeZone(settings?.timeZone);
    const minutesLeft = (slotDate.getTime() - now.getTime()) / 60000;
    return minutesLeft <= cutoffMinutes;
  };

  const slotWidth = 68;
  const slotGap = 8;
  const priceLineInset = 10;

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-white text-xl">Квест не найден</div>
      </div>
    );
  }

  const groupedSchedule = groupScheduleByDate();
  const galleryImages = [
    quest.mainImage,
    ...(quest.images || []),
  ].filter((img, index, arr): img is string => Boolean(img) && arr.indexOf(img) === index);
  const durationBadgeUrl = `/images/other/${quest.duration}min.png`;
  const selectedImageUrl = selectedImage
    ? getOptimizedImageUrl(selectedImage, { width: 1200 })
    : null;
  const selectedImageSrcSet = selectedImage
    ? getResponsiveSrcSet(selectedImage, [480, 720, 960, 1200, 1600])
    : undefined;
  const difficultyValue = quest.difficulty || 1;
  const difficultyMax = Math.max(1, quest.difficultyMax || 5);
  const filledKeys = Math.min(difficultyValue, difficultyMax);
  const scheduleBackgroundStyle = settings?.scheduleBackground?.trim()
    ? { background: settings.scheduleBackground.trim() }
    : undefined;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="relative">
            {selectedImage && (
              <button
                type="button"
                onClick={() => setIsImageOpen(true)}
                className="group w-full overflow-hidden rounded-lg shadow-2xl"
                aria-label="Открыть изображение в полном размере"
              >
                <img
                  src={selectedImageUrl ?? selectedImage}
                  srcSet={selectedImageSrcSet}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt={quest.title}
                  className="w-full h-96 object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </button>
            )}
            <div className="absolute -top-3 -right-3 md:-top-5 md:-right-5 z-20">
              <img
                src={durationBadgeUrl}
                alt={`${quest.duration} минут`}
                className="w-14 h-14 md:w-20 md:h-20 object-contain drop-shadow-2xl"
              />
            </div>
            {galleryImages.length > 1 && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleThumbnailScroll('left')}
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  type="button"
                  aria-label="Прокрутить влево"
                >
                  ‹
                </button>
                <div
                  ref={thumbnailsRef}
                  className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth flex-1"
                >
                  {galleryImages.map((img) => (
                    <button
                      key={img}
                      onClick={() => setSelectedImage(img)}
                      className={`flex-shrink-0 rounded-lg border-2 transition-all ${
                        selectedImage === img ? 'border-yellow-400' : 'border-transparent'
                      }`}
                      type="button"
                    >
                      <img
                        src={getOptimizedImageUrl(img, { width: 240 })}
                        srcSet={getResponsiveSrcSet(img, [120, 180, 240, 320])}
                        sizes="120px"
                        alt={`${quest.title} фото`}
                        className="h-20 w-28 object-cover rounded-md"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleThumbnailScroll('right')}
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  type="button"
                  aria-label="Прокрутить вправо"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="text-white">
            <div className="flex flex-col items-center gap-3 mb-4">
              <h1 className="text-3xl lg:text-4xl font-bold text-center">
                {quest.title}
              </h1>
              {quest.parentQuestId && (
                <span className="inline-flex items-center bg-[#c51f2e] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                  ДЕТСКИЙ
                </span>
              )}
              <div className="grid w-full max-w-md grid-cols-2 gap-3">
                <div className="bg-red-600 rounded-full px-4 py-2 flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 fill-white" />
                  <span className="font-bold">{formatAgeRating(quest.ageRating)}</span>
                </div>
                <div className="bg-white/20 rounded-full px-4 py-2 flex items-center justify-center gap-2">
                  <span className="flex items-center gap-1">
                    {Array.from({ length: difficultyMax }).map((_, index) => (
                      <Key
                        key={index}
                        className={`w-4 h-4 ${
                          index < filledKeys ? 'text-yellow-300' : 'text-white/40'
                        }`}
                      />
                    ))}
                  </span>
                  <span className="font-semibold">
                    {difficultyValue}/{difficultyMax}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-base mb-6 whitespace-pre-wrap">{quest.description}</p>

            <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <span className="text-base font-semibold text-white">Возрастное ограничение</span>
                </div>
                <p className="text-base text-white/90">{quest.ageRestriction}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-base font-semibold text-white">Количество участников</span>
                </div>
                <p className="text-base text-white/90">
                  от {quest.participantsMin} до {quest.participantsMax} человек
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span className="text-base font-semibold text-white">Длительность</span>
                </div>
                <p className="text-base text-white/90">{quest.duration} минут</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <BadgeDollarSign className="w-5 h-5 text-emerald-400" />
                  <span className="text-base font-semibold text-white">Стоимость</span>
                </div>
                <p className="text-base text-white/90">от {quest.price} ₽</p>
              </div>
            </div>

            {quest.addresses && quest.addresses.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-white/60">Адрес:</p>
                <p className="text-lg">{quest.addresses.join(', ')}</p>
              </div>
            )}

            {quest.phones && quest.phones.length > 0 && (
              <div>
                <p className="text-sm text-white/60">Телефон:</p>
                <p className="text-lg">{quest.phones.join(', ')}</p>
              </div>
            )}
          </div>
        </div>

        <div
          className={`backdrop-blur-sm rounded-lg p-8 overflow-x-visible ${
            scheduleBackgroundStyle ? '' : 'bg-purple-900/40'
          }`}
          style={scheduleBackgroundStyle}
        >
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Расписание на квест {quest.title}
          </h2>

          {Object.keys(groupedSchedule).length > 0 ? (
            <div className="space-y-6 min-w-0">
              {Object.entries(groupedSchedule).map(([date, slots]) => (
                <div key={date} className="flex flex-col gap-3 lg:flex-row lg:gap-6 lg:items-start">
                  <div className="flex-shrink-0 w-full lg:w-40 text-white pt-1 lg:pt-0 lg:text-center">
                    <div className="text-sm lg:text-base font-semibold text-center leading-tight">
                      <span className="block">{getDisplayDate(date)}</span>
                      <span className="block text-xs lg:text-sm font-medium text-white/75">
                        {getDayName(date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-2 pb-1 lg:flex-nowrap lg:overflow-x-auto">
                      {slots.map((slot) => {
                        const slotIsClosed = isSlotClosed(slot);
                        const isDisabled = slot.isBooked || slotIsClosed;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => {
                              if (!isDisabled) {
                                handleSlotClick(slot);
                              }
                            }}
                            aria-disabled={isDisabled}
                            type="button"
                            className={`w-[68px] shrink-0 px-2 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors flex flex-col items-center ${
                              slot.isBooked || slotIsClosed
                                ? 'bg-amber-500 text-slate-900 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-500'
                            }`}
                          >
                            <span
                              className={`block w-full text-center ${
                                slot.isBooked || slotIsClosed
                                  ? 'line-through decoration-2 decoration-slate-900/70'
                                  : ''
                              }`}
                            >
                              {slot.timeSlot.substring(0, 5)}
                            </span>
                            <span
                              className={`mt-1 block text-[10px] font-medium normal-case tracking-normal lg:hidden ${
                                slot.isBooked || slotIsClosed ? 'text-slate-900/70' : 'text-white/80'
                              }`}
                            >
                              {slot.price} ₽
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="hidden flex-wrap gap-2 text-[11px] text-white/80 lg:flex lg:flex-nowrap">
                      {groupSlotsByPrice(slots).map((group) => (
                        <div
                          key={`${date}-${group.price}-${group.slots[0].id}`}
                          className="relative flex flex-col items-center gap-1"
                          style={{
                            width: `${group.slots.length * slotWidth + (group.slots.length - 1) * slotGap}px`,
                            ['--price-line-inset' as string]: `${priceLineInset}px`,
                            maxWidth: '100%',
                          }}
                        >
                          <div className="relative h-[1px] w-[calc(100%-var(--price-line-inset))] bg-white/50">
                            <span className="absolute left-0 top-0 h-2 w-[2px] -translate-y-full bg-white/60" />
                            <span className="absolute right-0 top-0 h-2 w-[2px] -translate-y-full bg-white/60" />
                          </div>
                          <span>{group.price} ₽</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white py-12">
              <p className="text-xl">Расписание пока не доступно</p>
            </div>
          )}
        </div>
      </div>

      {isImageOpen && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsImageOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsImageOpen(false)}
              className="absolute -top-4 -right-4 h-10 w-10 rounded-full bg-white text-black text-2xl leading-none flex items-center justify-center shadow-lg"
              aria-label="Закрыть изображение"
            >
              ×
            </button>
            <img
              src={getOptimizedImageUrl(selectedImage, { width: 1600 })}
              srcSet={getResponsiveSrcSet(selectedImage, [800, 1200, 1600, 2000])}
              sizes="90vw"
              alt={quest.title}
              className="w-full max-h-[80vh] object-contain rounded-lg"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      )}

      {showBookingModal && selectedSlot && quest && (
        <BookingModal
          slot={selectedSlot}
          quest={quest}
          onClose={() => setShowBookingModal(false)}
          onBookingCreated={handleBookingCreated}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </div>
  );
}
