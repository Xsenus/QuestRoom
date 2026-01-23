import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Booking, Quest, QuestSchedule } from '../../lib/types';
import { Calendar, User, Phone, Mail, Users, FileText, Edit, Save, X } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') {
      return 'cards';
    }
    const saved = localStorage.getItem('admin_bookings_view');
    return saved === 'table' ? 'table' : 'cards';
  });
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'all'>('all');
  const [questFilter, setQuestFilter] = useState<string>('all');
  const [listDateFrom, setListDateFrom] = useState<string>('');
  const [listDateTo, setListDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editingBooking, setEditingBooking] = useState<{
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    participantsCount: number;
    notes: string;
    status: Booking['status'];
  } | null>(null);

  useEffect(() => {
    const today = new Date();
    const createRangeEnd = new Date(today);
    createRangeEnd.setDate(today.getDate() + 30);
    const listRangeEnd = new Date(today);
    listRangeEnd.setDate(today.getDate() + 14);
    const formatDate = (value: Date) => value.toISOString().split('T')[0];
    setDateFrom(formatDate(today));
    setDateTo(formatDate(createRangeEnd));
    setListDateFrom(formatDate(today));
    setListDateTo(formatDate(listRangeEnd));
    loadBookings();
    loadQuests();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_bookings_view', viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, questFilter, listDateFrom, listDateTo, viewMode]);

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

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking({
      id: booking.id,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail || '',
      participantsCount: booking.participantsCount,
      notes: booking.notes || '',
      status: booking.status,
    });
  };

  const handleUpdateBooking = async () => {
    if (!editingBooking) {
      return;
    }

    if (!editingBooking.customerName || !editingBooking.customerPhone) {
      alert('Укажите имя и телефон клиента.');
      return;
    }

    try {
      await api.updateBooking(editingBooking.id, {
        customerName: editingBooking.customerName,
        customerPhone: editingBooking.customerPhone,
        customerEmail: editingBooking.customerEmail || null,
        participantsCount: editingBooking.participantsCount,
        notes: editingBooking.notes || null,
        status: editingBooking.status,
      });
      setEditingBooking(null);
      loadBookings();
      if (selectedQuestId && dateFrom && dateTo) {
        loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
      }
    } catch (error) {
      alert('Ошибка при обновлении брони: ' + (error as Error).message);
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

  const questLookup = useMemo(() => {
    return new Map(quests.map((quest) => [quest.id, quest.title]));
  }, [quests]);

  const statusCounts = useMemo(() => {
    return bookings.reduce(
      (acc, booking) => {
        acc.all += 1;
        acc[booking.status] += 1;
        return acc;
      },
      {
        all: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
      }
    );
  }, [bookings]);

  const listItemsPerPage = viewMode === 'table' ? 10 : 9;
  const rangeStart = listDateFrom ? new Date(`${listDateFrom}T00:00:00`) : null;
  const rangeEnd = listDateTo ? new Date(`${listDateTo}T23:59:59`) : null;

  const filteredBookings = bookings.filter((booking) => {
    if (statusFilter !== 'all' && booking.status !== statusFilter) {
      return false;
    }

    if (questFilter !== 'all' && booking.questId !== questFilter) {
      return false;
    }

    if (statusFilter !== 'pending' && (rangeStart || rangeEnd)) {
      const bookingDate = new Date(booking.bookingDate);
      if (rangeStart && bookingDate < rangeStart) {
        return false;
      }
      if (rangeEnd && bookingDate > rangeEnd) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / listItemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safePage - 1) * listItemsPerPage,
    safePage * listItemsPerPage
  );

  useEffect(() => {
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [safePage, currentPage]);

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  const availableSlots = scheduleSlots.filter((slot) => !slot.isBooked);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление бронированиями</h2>
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'create'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Создать бронь
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'list'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Список брони
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
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
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'all', label: 'Все', count: statusCounts.all },
                  { key: 'pending', label: 'Ожидают', count: statusCounts.pending },
                  { key: 'confirmed', label: 'Подтверждено', count: statusCounts.confirmed },
                  { key: 'completed', label: 'Завершено', count: statusCounts.completed },
                  { key: 'cancelled', label: 'Отменено', count: statusCounts.cancelled },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    statusFilter === item.key
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Карточки
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Таблица
              </button>
            </div>
          </div>

          {editingBooking && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Редактирование брони</h3>
                  <p className="text-xs text-gray-500">ID: {editingBooking.id.slice(0, 8)}</p>
                </div>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                    editingBooking.status
                  )}`}
                >
                  {getStatusText(editingBooking.status)}
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Имя клиента
                  </label>
                  <input
                    type="text"
                    value={editingBooking.customerName}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, customerName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Телефон
                  </label>
                  <input
                    type="text"
                    value={editingBooking.customerPhone}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, customerPhone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email (опционально)
                  </label>
                  <input
                    type="email"
                    value={editingBooking.customerEmail}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, customerEmail: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Участников
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingBooking.participantsCount}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        participantsCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Статус
                  </label>
                  <select
                    value={editingBooking.status}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        status: e.target.value as Booking['status'],
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  >
                    <option value="pending">Ожидает</option>
                    <option value="confirmed">Подтверждено</option>
                    <option value="completed">Завершено</option>
                    <option value="cancelled">Отменено</option>
                  </select>
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Примечания
                  </label>
                  <textarea
                    value={editingBooking.notes}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleUpdateBooking}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Сохранить изменения
                </button>
                <button
                  onClick={() => setEditingBooking(null)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                >
                  <X className="w-4 h-4" />
                  Отмена
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Квест</label>
                <select
                  value={questFilter}
                  onChange={(e) => setQuestFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                >
                  <option value="all">Все квесты</option>
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
                  value={listDateFrom}
                  onChange={(e) => setListDateFrom(e.target.value)}
                  disabled={statusFilter === 'pending'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Дата окончания
                </label>
                <input
                  type="date"
                  value={listDateTo}
                  onChange={(e) => setListDateTo(e.target.value)}
                  disabled={statusFilter === 'pending'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-500">
                  Показано: <span className="font-semibold">{filteredBookings.length}</span>
                </div>
              </div>
            </div>
            {statusFilter === 'pending' && (
              <p className="text-xs text-gray-500 mt-3">
                Для ожидающих броней период не применяется — показываются все записи.
              </p>
            )}
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Статус</th>
                    <th className="text-left px-4 py-3 font-semibold">Дата</th>
                    <th className="text-left px-4 py-3 font-semibold">Квест</th>
                    <th className="text-left px-4 py-3 font-semibold">Клиент</th>
                    <th className="text-left px-4 py-3 font-semibold">Участников</th>
                    <th className="text-left px-4 py-3 font-semibold">Примечания</th>
                    <th className="text-right px-4 py-3 font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {getStatusText(booking.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(booking.bookingDate).toLocaleString('ru-RU', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {booking.questId
                          ? questLookup.get(booking.questId) || 'Квест не найден'
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-semibold text-gray-900">
                          {booking.customerName}
                        </div>
                        <div>
                          <a href={`tel:${booking.customerPhone}`} className="hover:text-red-600">
                            {booking.customerPhone}
                          </a>
                        </div>
                        {booking.customerEmail && (
                          <div>
                            <a
                              href={`mailto:${booking.customerEmail}`}
                              className="hover:text-red-600"
                            >
                              {booking.customerEmail}
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{booking.participantsCount}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <p className="line-clamp-2">{booking.notes || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditBooking(booking)}
                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {booking.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(booking, 'confirmed')}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-colors"
                            >
                              Подтвердить
                            </button>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => updateStatus(booking, 'completed')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors"
                            >
                              Завершить
                            </button>
                          )}
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <button
                              onClick={() => updateStatus(booking, 'cancelled')}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors"
                            >
                              Отменить
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {getStatusText(booking.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ID: {booking.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {booking.questId
                          ? questLookup.get(booking.questId) || 'Квест не найден'
                          : 'Квест не указан'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBooking(booking)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(booking, 'confirmed')}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-colors"
                        >
                          Подтвердить
                        </button>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(booking, 'completed')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors"
                        >
                          Завершить
                        </button>
                      )}
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <button
                          onClick={() => updateStatus(booking, 'cancelled')}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors"
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Клиент:</span>
                      <span>{booking.customerName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Телефон:</span>
                      <a href={`tel:${booking.customerPhone}`} className="hover:text-red-600">
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
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-start gap-2 text-gray-700">
                        <FileText className="w-4 h-4 text-red-600 mt-1" />
                        <div>
                          <span className="font-semibold">Примечания:</span>
                          <p className="text-xs mt-1">{booking.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredBookings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600 text-lg">Бронирования не найдены</p>
            </div>
          )}

          {filteredBookings.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-gray-600">
                Страница {safePage} из {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Назад
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      page === safePage
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
