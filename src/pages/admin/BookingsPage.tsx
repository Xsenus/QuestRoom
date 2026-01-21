import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Booking, Quest, QuestSchedule } from '../../lib/types';
import { Calendar, User, Phone, Mail, Users, FileText } from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<string>('');
  const [scheduleSlots, setScheduleSlots] = useState<QuestSchedule[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [participantsCount, setParticipantsCount] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [createResult, setCreateResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 30);
    setDateFrom(today.toISOString().split('T')[0]);
    setDateTo(future.toISOString().split('T')[0]);
    loadBookings();
    loadQuests();
  }, []);

  useEffect(() => {
    if (selectedQuestId && dateFrom && dateTo) {
      loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
    }
  }, [selectedQuestId, dateFrom, dateTo]);

  const loadBookings = async () => {
    try {
      const data = await api.getBookings();
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
    setLoading(false);
  };

  const loadQuests = async () => {
    try {
      const data = await api.getQuests();
      setQuests(data || []);
      if (data?.length) {
        setSelectedQuestId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading quests:', error);
    }
  };

  const loadScheduleSlots = async (questId: string, fromDate: string, toDate: string) => {
    try {
      const data = await api.getQuestSchedule(questId, fromDate, toDate);
      setScheduleSlots(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedSlotId) {
      setCreateResult('Выберите слот для брони.');
      return;
    }

    const slot = scheduleSlots.find((s) => s.id === selectedSlotId);
    if (!slot) {
      setCreateResult('Слот не найден.');
      return;
    }

    if (!customerName || !customerPhone) {
      setCreateResult('Укажите имя и телефон клиента.');
      return;
    }

    try {
      await api.createBooking({
        questId: selectedQuestId,
        questScheduleId: slot.id,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        bookingDate: slot.date,
        participantsCount,
        notes: notes || null,
      });
      setCreateResult('Бронь создана.');
      setSelectedSlotId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setParticipantsCount(2);
      setNotes('');
      loadBookings();
      loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
    } catch (error) {
      setCreateResult('Ошибка создания брони: ' + (error as Error).message);
    }
  };

  const updateStatus = async (booking: Booking, status: Booking['status']) => {
    try {
      await api.updateBooking(booking.id, { status, notes: booking.notes });
      loadBookings();
      if (selectedQuestId && dateFrom && dateTo) {
        loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
      }
    } catch (error) {
      alert('Ошибка при обновлении статуса: ' + (error as Error).message);
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'confirmed':
        return 'Подтверждено';
      case 'cancelled':
        return 'Отменено';
      case 'completed':
        return 'Завершено';
      default:
        return status;
    }
  };

  const filteredBookings =
    filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  const availableSlots = scheduleSlots.filter((slot) => !slot.isBooked);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление бронированиями</h2>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-800">Создать бронь (администратор)</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Квест</label>
            <select
              value={selectedQuestId}
              onChange={(e) => setSelectedQuestId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              {quests.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Дата начала
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Дата окончания
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Слот</label>
            <select
              value={selectedSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              <option value="">Выберите слот</option>
              {availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.date} · {slot.timeSlot.slice(0, 5)} · {slot.price} ₽
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Доступно слотов: {availableSlots.length}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Имя клиента
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Телефон
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email (опционально)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Участников
              </label>
              <input
                type="number"
                value={participantsCount}
                onChange={(e) => setParticipantsCount(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                min="1"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Примечания
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleCreateBooking}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Создать бронь
          </button>
          {createResult && <span className="text-sm text-gray-600">{createResult}</span>}
        </div>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Все ({bookings.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'pending'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Ожидают ({bookings.filter((b) => b.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'confirmed'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Подтверждено ({bookings.filter((b) => b.status === 'confirmed').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'completed'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Завершено ({bookings.filter((b) => b.status === 'completed').length})
        </button>
      </div>

      <div className="grid gap-4">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(
                      booking.status
                    )}`}
                  >
                    {getStatusText(booking.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ID: {booking.id.slice(0, 8)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {booking.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(booking, 'confirmed')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Подтвердить
                  </button>
                )}
                {booking.status === 'confirmed' && (
                  <button
                    onClick={() => updateStatus(booking, 'completed')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Завершить
                  </button>
                )}
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <button
                    onClick={() => updateStatus(booking, 'cancelled')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Отменить
                  </button>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-red-600" />
                <span className="font-semibold">Клиент:</span>
                <span>{booking.customerName}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-red-600" />
                <span className="font-semibold">Телефон:</span>
                <a
                  href={`tel:${booking.customerPhone}`}
                  className="hover:text-red-600"
                >
                  {booking.customerPhone}
                </a>
              </div>

              {booking.customerEmail && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-red-600" />
                  <span className="font-semibold">Email:</span>
                  <a
                    href={`mailto:${booking.customerEmail}`}
                    className="hover:text-red-600"
                  >
                    {booking.customerEmail}
                  </a>
                </div>
              )}

              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-red-600" />
                <span className="font-semibold">Дата:</span>
                <span>
                  {new Date(booking.bookingDate).toLocaleString('ru-RU', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Users className="w-4 h-4 text-red-600" />
                <span className="font-semibold">Участников:</span>
                <span>{booking.participantsCount}</span>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-start gap-2 text-gray-700">
                  <FileText className="w-4 h-4 text-red-600 mt-1" />
                  <div>
                    <span className="font-semibold">Примечания:</span>
                    <p className="text-sm mt-1">{booking.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">Бронирования не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
