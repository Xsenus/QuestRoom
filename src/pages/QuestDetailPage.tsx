import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Quest, QuestSchedule } from '../lib/types';
import { Users, Clock, Star } from 'lucide-react';
import BookingModal from '../components/BookingModal';

export default function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [schedule, setSchedule] = useState<QuestSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<QuestSchedule | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadQuest();
      loadSchedule();
    }
  }, [id]);

  const loadQuest = async () => {
    try {
      const data = await api.getQuest(id!);
      if (data.isVisible) {
        setQuest(data);
      } else {
        setQuest(null);
      }
    } catch (error) {
      console.error('Error loading quest:', error);
    }
  };

  const loadSchedule = async () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 14);

    try {
      const data = await api.getQuestSchedule(
        id!,
        today.toISOString().split('T')[0],
        nextWeek.toISOString().split('T')[0]
      );
      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
    setLoading(false);
  };

  const handleSlotClick = (slot: QuestSchedule) => {
    if (!slot.isBooked) {
      setSelectedSlot(slot);
      setShowBookingModal(true);
    }
  };

  const handleBookingComplete = () => {
    setShowBookingModal(false);
    loadSchedule();
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

  const getUniquePrices = (slots: QuestSchedule[]) => {
    return Array.from(new Set(slots.map((slot) => slot.price))).sort((a, b) => a - b);
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { weekday: 'long' });
  };

  const getDisplayDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

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

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="relative">
            {quest.mainImage && (
              <img
                src={quest.mainImage}
                alt={quest.title}
                className="w-full h-96 object-cover rounded-lg shadow-2xl"
              />
            )}
          </div>

          <div className="text-white">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-4xl font-bold">{quest.title}</h1>
              <div className="bg-red-600 rounded-full px-4 py-2 flex items-center gap-2">
                <Star className="w-5 h-5 fill-white" />
                <span className="font-bold">{quest.ageRating}</span>
              </div>
            </div>

            <p className="text-lg mb-6 whitespace-pre-wrap">{quest.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-white/80">Возрастное ограничение</span>
                </div>
                <p className="text-xl font-bold">{quest.ageRestriction}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-white/80">Количество участников</span>
                </div>
                <p className="text-xl font-bold">
                  от {quest.participantsMin} до {quest.participantsMax} человек
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-white/80">Длительность</span>
                </div>
                <p className="text-xl font-bold">{quest.duration} минут</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
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

        <div className="bg-purple-900/40 backdrop-blur-sm rounded-lg p-8">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Расписание на квест {quest.title}
          </h2>

          {Object.keys(groupedSchedule).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedSchedule).map(([date, slots]) => (
                <div key={date} className="flex gap-4 items-center">
                  <div className="flex-shrink-0 w-40 text-white">
                    <div className="text-lg font-bold">{getDisplayDate(date)}</div>
                    <div className="text-sm text-white/60">{getDayName(date)}</div>
                  </div>

                  <div className="flex-1 flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotClick(slot)}
                        disabled={slot.isBooked}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          slot.isBooked
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : slot.price >= 4000
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        <div className="text-sm">{slot.timeSlot.substring(0, 5)}</div>
                        <div className="text-xs opacity-80">{slot.price} ₽</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex-shrink-0 text-white text-sm">
                    {getUniquePrices(slots).map((price) => (
                      <div key={price}>{price} ₽</div>
                    ))}
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
