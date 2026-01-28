import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Quest, QuestSchedule, Settings } from '../lib/types';
import { Users, Clock, Star, BadgeDollarSign } from 'lucide-react';
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
    if (!slot.isBooked) {
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

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="relative">
            {selectedImage && (
              <img
                src={selectedImage}
                alt={quest.title}
                className="w-full h-96 object-cover rounded-lg shadow-2xl"
              />
            )}
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
                        src={img}
                        alt={`${quest.title} фото`}
                        className="h-20 w-28 object-cover rounded-md"
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
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-4xl font-bold">{quest.title}</h1>
              <div className="bg-red-600 rounded-full px-4 py-2 flex items-center gap-2">
                <Star className="w-5 h-5 fill-white" />
                <span className="font-bold">{formatAgeRating(quest.ageRating)}</span>
              </div>
            </div>

            <p className="text-lg mb-6 whitespace-pre-wrap">{quest.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-white/80">Возрастное ограничение</span>
                </div>
                <p className="text-xl font-bold">{quest.ageRestriction}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-white/80">Количество участников</span>
                </div>
                <p className="text-xl font-bold">
                  от {quest.participantsMin} до {quest.participantsMax} человек
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-white/80">Длительность</span>
                </div>
                <p className="text-xl font-bold">{quest.duration} минут</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <BadgeDollarSign className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-white/80">Стоимость</span>
                </div>
                <p className="text-xl font-bold">от {quest.price} ₽</p>
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

        <div className="bg-purple-900/40 backdrop-blur-sm rounded-lg p-8 overflow-x-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Расписание на квест {quest.title}
          </h2>

          {Object.keys(groupedSchedule).length > 0 ? (
            <div className="space-y-6 min-w-max">
              {Object.entries(groupedSchedule).map(([date, slots]) => (
                <div key={date} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-32 sm:w-40 text-white pt-1">
                    <div className="text-base sm:text-lg font-bold">{getDisplayDate(date)}</div>
                    <div className="text-xs sm:text-sm text-white/60">{getDayName(date)}</div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                      {slots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => {
                            if (!slot.isBooked) {
                              handleSlotClick(slot);
                            }
                          }}
                          aria-disabled={slot.isBooked}
                          type="button"
                          className={`w-[68px] shrink-0 px-2 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                            slot.isBooked
                              ? 'bg-amber-500 text-slate-900 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-500'
                          }`}
                        >
                          <span
                            className={`block w-full text-center ${
                              slot.isBooked ? 'line-through decoration-2 decoration-slate-900/70' : ''
                            }`}
                          >
                            {slot.timeSlot.substring(0, 5)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-nowrap gap-2 text-[11px] text-white/80">
                      {groupSlotsByPrice(slots).map((group) => (
                        <div
                          key={`${date}-${group.price}-${group.slots[0].id}`}
                          className="relative flex flex-col items-center gap-1"
                          style={{
                            width: `${group.slots.length * slotWidth + (group.slots.length - 1) * slotGap}px`,
                            ['--price-line-inset' as string]: `${priceLineInset}px`,
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

      {showBookingModal && selectedSlot && quest && (
        <BookingModal
          slot={selectedSlot}
          quest={quest}
          onClose={() => setShowBookingModal(false)}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </div>
  );
}
