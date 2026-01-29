import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Booking, Quest, QuestSchedule, Settings } from '../../lib/types';
import {
  Calendar,
  User,
  Phone,
  Mail,
  Users,
  FileText,
  Edit,
  Save,
  X,
  BadgeDollarSign,
  Trash2,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import NotificationModal from '../../components/NotificationModal';

type ActionModalState = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'info' | 'danger';
  onConfirm: () => Promise<void> | void;
};

type BookingTableColumnKey =
  | 'status'
  | 'bookingDate'
  | 'createdAt'
  | 'quest'
  | 'questPrice'
  | 'participants'
  | 'extraParticipants'
  | 'extraParticipantPrice'
  | 'extraServices'
  | 'extraServicesPrice'
  | 'aggregator'
  | 'promoCode'
  | 'totalPrice'
  | 'customer'
  | 'notes'
  | 'actions';

type BookingTableColumnConfig = {
  key: BookingTableColumnKey;
  label: string;
  width: number;
  visible: boolean;
  locked?: boolean;
};

const bookingTableDefaultColumns: BookingTableColumnConfig[] = [
  { key: 'status', label: 'Статус', width: 140, visible: true },
  { key: 'bookingDate', label: 'Дата брони', width: 160, visible: true },
  { key: 'createdAt', label: 'Создано', width: 160, visible: true },
  { key: 'quest', label: 'Квест', width: 180, visible: true },
  { key: 'questPrice', label: 'Цена квеста', width: 140, visible: true },
  { key: 'participants', label: 'Участников', width: 120, visible: true },
  { key: 'extraParticipants', label: 'Доп. участники', width: 130, visible: true },
  { key: 'extraParticipantPrice', label: 'Цена доп.', width: 120, visible: true },
  { key: 'extraServices', label: 'Доп. услуги', width: 220, visible: true },
  { key: 'extraServicesPrice', label: 'Цена доп. услуг', width: 150, visible: true },
  { key: 'aggregator', label: 'Агрегатор', width: 140, visible: true },
  { key: 'promoCode', label: 'Промокод', width: 140, visible: true },
  { key: 'totalPrice', label: 'Итог', width: 120, visible: true },
  { key: 'customer', label: 'Клиент', width: 220, visible: true },
  { key: 'notes', label: 'Комментарий', width: 200, visible: true },
  { key: 'actions', label: 'Действия', width: 200, visible: true, locked: true },
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') {
      return 'cards';
    }
    const saved = localStorage.getItem('admin_bookings_view');
    return saved === 'table' ? 'table' : 'cards';
  });
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | 'all'>('all');
  const [questFilter, setQuestFilter] = useState<string>('all');
  const [aggregatorFilter, setAggregatorFilter] = useState<string>('all');
  const [promoCodeFilter, setPromoCodeFilter] = useState<string>('all');
  const [listDateFrom, setListDateFrom] = useState<string>('');
  const [listDateTo, setListDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    tone: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
  });
  const [editingBooking, setEditingBooking] = useState<{
    id: string;
    questId: string | null;
    questScheduleId: string | null;
    aggregator: string;
    questTitle: string;
    questPrice: number;
    extraParticipantPrice: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    bookingDate: string;
    createdAt: string;
    participantsCount: number;
    extraParticipantsCount: number;
    totalPrice: number;
    paymentType: string;
    promoCode: string;
    promoDiscountType: string;
    promoDiscountValue: number;
    promoDiscountAmount: number;
    notes: string;
    status: Booking['status'];
    extraServices: Booking['extraServices'];
  } | null>(null);
  const listRangeStorageKey = 'admin_bookings_list_range';
  const tableColumnsStorageKey = 'admin_bookings_table_columns';
  const [tableColumns, setTableColumns] = useState<BookingTableColumnConfig[]>(() => {
    if (typeof window === 'undefined') {
      return bookingTableDefaultColumns;
    }
    const saved = localStorage.getItem(tableColumnsStorageKey);
    if (!saved) {
      return bookingTableDefaultColumns;
    }
    try {
      const parsed = JSON.parse(saved) as BookingTableColumnConfig[];
      const parsedMap = new Map(parsed.map((col) => [col.key, col]));
      return bookingTableDefaultColumns.map((col) => ({
        ...col,
        ...parsedMap.get(col.key),
        locked: col.locked,
      }));
    } catch {
      return bookingTableDefaultColumns;
    }
  });

  const formatDate = (value: Date) => value.toISOString().split('T')[0];

  const getEndOfNextMonth = (baseDate: Date) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  useEffect(() => {
    const today = new Date();
    const createRangeEnd = new Date(today);
    createRangeEnd.setDate(today.getDate() + 30);
    const listRangeEnd = new Date(today);
    listRangeEnd.setDate(today.getDate() + 14);
    let storedListFrom = '';
    let storedListTo = '';

    if (typeof window !== 'undefined') {
      const savedRange = localStorage.getItem(listRangeStorageKey);
      if (savedRange) {
        try {
          const parsed = JSON.parse(savedRange) as { from?: string; to?: string };
          storedListFrom = parsed.from || '';
          storedListTo = parsed.to || '';
        } catch {
          storedListFrom = '';
          storedListTo = '';
        }
      }
    }

    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const listFrom = storedListFrom || formatDate(today);
    let listTo = storedListTo || formatDate(listRangeEnd);
    if (listTo && new Date(listTo) < todayStart) {
      listTo = formatDate(getEndOfNextMonth(today));
    }

    setDateFrom(formatDate(today));
    setDateTo(formatDate(createRangeEnd));
    setListDateFrom(listFrom);
    setListDateTo(listTo);
    loadBookings();
    loadQuests();
    loadSettings();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_bookings_view', viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        listRangeStorageKey,
        JSON.stringify({ from: listDateFrom, to: listDateTo })
      );
    }
  }, [listDateFrom, listDateTo, listRangeStorageKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(tableColumnsStorageKey, JSON.stringify(tableColumns));
    }
  }, [tableColumns, tableColumnsStorageKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, questFilter, aggregatorFilter, promoCodeFilter, listDateFrom, listDateTo, viewMode]);

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

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(null);
    }
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

  const normalizeListEndDate = (value: string) => {
    if (!value) {
      return value;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(value);
    if (selected < today) {
      return formatDate(getEndOfNextMonth(today));
    }
    return value;
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
        extraServiceIds: [],
      });
      setCreateResult('Бронь создана.');
      setSelectedSlotId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setParticipantsCount(2);
      setNotes('');
      setIsCreateModalOpen(false);
      loadBookings();
      loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
    } catch (error) {
      setCreateResult('Ошибка создания брони: ' + (error as Error).message);
    }
  };

  const closeActionModal = () => {
    setActionModal(null);
  };

  const openActionModal = (modal: ActionModalState) => {
    setActionModal(modal);
  };

  const performAction = async (action: () => Promise<void> | void) => {
    setActionLoading(true);
    try {
      await action();
      closeActionModal();
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Не удалось выполнить действие',
        message: (error as Error).message,
        tone: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBooking = (booking: Booking) => {
    openActionModal({
      title: 'Удалить бронь',
      message: `Удалить бронь клиента ${booking.customerName}? Это действие необратимо.`,
      confirmLabel: 'Удалить',
      tone: 'danger',
      onConfirm: async () => {
        await api.deleteBooking(booking.id);
        await loadBookings();
        if (selectedQuestId && dateFrom && dateTo) {
          await loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
        }
        setNotification({
          isOpen: true,
          title: 'Бронь удалена',
          message: `Бронь клиента ${booking.customerName} удалена.`,
          tone: 'success',
        });
      },
    });
  };

  const updateStatus = (booking: Booking, status: Booking['status']) => {
    const statusLabel = getStatusText(status);
    openActionModal({
      title: `Изменить статус`,
      message: `Подтвердите действие: установить статус «${statusLabel}» для брони клиента ${booking.customerName}.`,
      confirmLabel: 'Подтвердить',
      onConfirm: async () => {
        await api.updateBooking(booking.id, { status, notes: booking.notes });
        await loadBookings();
        if (selectedQuestId && dateFrom && dateTo) {
          await loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
        }
        setNotification({
          isOpen: true,
          title: 'Статус обновлён',
          message: `Бронь клиента ${booking.customerName} теперь «${statusLabel}».`,
          tone: 'success',
        });
      },
    });
  };

  const openCreateModal = () => {
    setCreateResult('');
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking({
      id: booking.id,
      questId: booking.questId,
      questScheduleId: booking.questScheduleId,
      aggregator: booking.aggregator || '',
      questTitle: booking.questTitle || getQuestTitle(booking),
      questPrice: getQuestPrice(booking) ?? 0,
      extraParticipantPrice: getExtraParticipantPrice(booking) ?? 0,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail || '',
      bookingDate: formatDateTimeLocal(booking.bookingDate),
      createdAt: booking.createdAt,
      participantsCount: booking.participantsCount,
      extraParticipantsCount: booking.extraParticipantsCount ?? 0,
      totalPrice: booking.totalPrice,
      paymentType: booking.paymentType || '',
      promoCode: booking.promoCode || '',
      promoDiscountType: booking.promoDiscountType || '',
      promoDiscountValue: booking.promoDiscountValue ?? 0,
      promoDiscountAmount: booking.promoDiscountAmount ?? 0,
      notes: booking.notes || '',
      status: booking.status,
      extraServices: booking.extraServices || [],
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
        questId: editingBooking.questId,
        questScheduleId: editingBooking.questScheduleId,
        aggregator: editingBooking.aggregator || null,
        questTitle: editingBooking.questTitle || null,
        questPrice: editingBooking.questPrice,
        extraParticipantPrice: editingBooking.extraParticipantPrice,
        customerName: editingBooking.customerName,
        customerPhone: editingBooking.customerPhone,
        customerEmail: editingBooking.customerEmail || null,
        bookingDate: normalizeDateTimeForApi(editingBooking.bookingDate),
        participantsCount: editingBooking.participantsCount,
        extraParticipantsCount: editingBooking.extraParticipantsCount,
        totalPrice: editingBooking.totalPrice,
        paymentType: editingBooking.paymentType || null,
        promoCode: editingBooking.promoCode || null,
        promoDiscountType: editingBooking.promoDiscountType || null,
        promoDiscountValue: editingBooking.promoDiscountValue,
        promoDiscountAmount: editingBooking.promoDiscountAmount,
        notes: editingBooking.notes || null,
        status: editingBooking.status,
        extraServices: editingBooking.extraServices,
      });
      setEditingBooking(null);
      loadBookings();
      if (selectedQuestId && dateFrom && dateTo) {
        loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
      }
      setNotification({
        isOpen: true,
        title: 'Бронь обновлена',
        message: 'Изменения успешно сохранены.',
        tone: 'success',
      });
    } catch (error) {
      setNotification({
        isOpen: true,
        title: 'Ошибка обновления',
        message: (error as Error).message,
        tone: 'error',
      });
    }
  };

  const addExtraService = () => {
    if (!editingBooking) {
      return;
    }
    setEditingBooking({
      ...editingBooking,
      extraServices: [
        ...editingBooking.extraServices,
        { id: crypto.randomUUID(), title: '', price: 0 },
      ],
    });
  };

  const updateExtraService = (index: number, field: 'title' | 'price', value: string) => {
    if (!editingBooking) {
      return;
    }
    const nextServices = editingBooking.extraServices.map((service, serviceIndex) =>
      serviceIndex === index
        ? {
            ...service,
            [field]: field === 'price' ? Number(value) || 0 : value,
          }
        : service
    );
    setEditingBooking({ ...editingBooking, extraServices: nextServices });
  };

  const removeExtraService = (index: number) => {
    if (!editingBooking) {
      return;
    }
    setEditingBooking({
      ...editingBooking,
      extraServices: editingBooking.extraServices.filter((_, i) => i !== index),
    });
  };

  const defaultStatusColors: Record<Booking['status'], string> = {
    pending: '#f59e0b',
    confirmed: '#22c55e',
    cancelled: '#ef4444',
    completed: '#3b82f6',
    planned: '#7c3aed',
    created: '#0ea5e9',
    not_confirmed: '#f97316',
  };

  const getStatusColorValue = (status: Booking['status']) => {
    if (!settings) {
      return defaultStatusColors[status];
    }
    const mapping: Partial<Record<Booking['status'], string | null | undefined>> = {
      planned: settings.bookingStatusPlannedColor,
      created: settings.bookingStatusCreatedColor,
      pending: settings.bookingStatusPendingColor,
      not_confirmed: settings.bookingStatusNotConfirmedColor,
      confirmed: settings.bookingStatusConfirmedColor,
      completed: settings.bookingStatusCompletedColor,
      cancelled: settings.bookingStatusCancelledColor,
    };
    return mapping[status] || defaultStatusColors[status];
  };

  const hexToRgba = (color: string, alpha: number) => {
    const normalized = color.replace('#', '');
    const isShort = normalized.length === 3;
    const hex = isShort
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
      case 'planned':
        return 'Запланировано';
      case 'created':
        return 'Создано';
      case 'not_confirmed':
        return 'Не подтверждено';
      default:
        return status;
    }
  };

  const getStatusBadgeStyle = (status: Booking['status']) => {
    const color = getStatusColorValue(status);
    return {
      backgroundColor: hexToRgba(color, 0.12),
      color,
      borderColor: hexToRgba(color, 0.4),
    };
  };

  const getRowStyle = (status: Booking['status']) => ({
    backgroundColor: hexToRgba(getStatusColorValue(status), 0.08),
  });

  const questLookup = useMemo(() => {
    return new Map(quests.map((quest) => [quest.id, quest]));
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
        planned: 0,
        created: 0,
        not_confirmed: 0,
      }
    );
  }, [bookings]);

  const questCounts = useMemo(() => {
    const counts: Record<string, number> = { all: bookings.length };
    bookings.forEach((booking) => {
      if (booking.questId) {
        counts[booking.questId] = (counts[booking.questId] || 0) + 1;
      }
    });
    return counts;
  }, [bookings]);

  const aggregatorOptions = useMemo(() => {
    const values = new Set<string>();
    bookings.forEach((booking) => {
      if (booking.aggregator) {
        values.add(booking.aggregator);
      }
    });
    return Array.from(values);
  }, [bookings]);

  const promoCodeOptions = useMemo(() => {
    const values = new Set<string>();
    bookings.forEach((booking) => {
      if (booking.promoCode) {
        values.add(booking.promoCode);
      }
    });
    return Array.from(values);
  }, [bookings]);

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleString('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const formatDateTimeLocal = (value?: string | null) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    const pad = (num: number) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const normalizeDateTimeForApi = (value: string) => {
    if (!value) {
      return value;
    }
    const date = new Date(value);
    return date.toISOString();
  };

  const getQuestData = (booking: Booking) => {
    if (!booking.questId) {
      return null;
    }
    return questLookup.get(booking.questId) || null;
  };

  const getQuestTitle = (booking: Booking) => {
    const quest = getQuestData(booking);
    if (booking.questTitle) {
      return booking.questTitle;
    }
    if (quest) {
      return quest.title;
    }
    return booking.questId ? 'Квест не найден' : '—';
  };

  const getQuestPrice = (booking: Booking) => {
    const quest = getQuestData(booking);
    if (booking.questPrice != null) {
      return booking.questPrice;
    }
    return quest?.price ?? null;
  };

  const getExtraParticipantPrice = (booking: Booking) => {
    const quest = getQuestData(booking);
    if (booking.extraParticipantPrice != null) {
      return booking.extraParticipantPrice;
    }
    return quest?.extraParticipantPrice ?? null;
  };

  const getExtraServicesTotal = (booking: Booking) => {
    return booking.extraServices?.reduce((sum, service) => sum + service.price, 0) ?? 0;
  };

  const getAggregatorLabel = (booking: Booking) => {
    return booking.aggregator || 'Наш сайт';
  };

  const visibleTableColumns = useMemo(
    () => tableColumns.filter((column) => column.visible),
    [tableColumns]
  );

  const totalTableWidth = useMemo(
    () => visibleTableColumns.reduce((sum, column) => sum + column.width, 0),
    [visibleTableColumns]
  );

  const updateTableColumn = (key: BookingTableColumnKey, updates: Partial<BookingTableColumnConfig>) => {
    setTableColumns((prev) =>
      prev.map((column) => (column.key === key ? { ...column, ...updates } : column))
    );
  };

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

    if (aggregatorFilter !== 'all') {
      if (aggregatorFilter === 'site') {
        if (booking.aggregator) {
          return false;
        }
      } else if (booking.aggregator !== aggregatorFilter) {
        return false;
      }
    }

    if (promoCodeFilter !== 'all') {
      if (promoCodeFilter === 'none') {
        if (booking.promoCode) {
          return false;
        }
      } else if (booking.promoCode !== promoCodeFilter) {
        return false;
      }
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
  const renderActionButtons = (booking: Booking) => (
    <>
      <button
        onClick={() => handleEditBooking(booking)}
        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
        title="Редактировать"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleDeleteBooking(booking)}
        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
        title="Удалить"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {(booking.status === 'pending' || booking.status === 'not_confirmed') && (
        <button
          onClick={() => updateStatus(booking, 'confirmed')}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-colors"
        >
          Подтвердить
        </button>
      )}
      {(booking.status === 'pending' ||
        booking.status === 'confirmed' ||
        booking.status === 'not_confirmed') && (
        <button
          onClick={() => updateStatus(booking, 'cancelled')}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors"
        >
          Отменить
        </button>
      )}
    </>
  );

  const renderTableCell = (booking: Booking, columnKey: BookingTableColumnKey) => {
    const questPrice = getQuestPrice(booking);
    const extraParticipantPrice = getExtraParticipantPrice(booking);
    const extraServicesTotal = getExtraServicesTotal(booking);
    switch (columnKey) {
      case 'status':
        return (
          <span
            className="inline-flex px-3 py-1 rounded-full text-xs font-bold border"
            style={getStatusBadgeStyle(booking.status)}
          >
            {getStatusText(booking.status)}
          </span>
        );
      case 'bookingDate':
        return <span>{formatDateTime(booking.bookingDate)}</span>;
      case 'createdAt':
        return <span>{formatDateTime(booking.createdAt)}</span>;
      case 'quest':
        return <span>{getQuestTitle(booking)}</span>;
      case 'questPrice':
        return <span>{questPrice != null ? `${questPrice} ₽` : '—'}</span>;
      case 'participants':
        return <span>{booking.participantsCount}</span>;
      case 'extraParticipants':
        return <span>{booking.extraParticipantsCount ?? 0}</span>;
      case 'extraParticipantPrice':
        return <span>{extraParticipantPrice != null ? `${extraParticipantPrice} ₽` : '—'}</span>;
      case 'extraServices':
        return booking.extraServices?.length ? (
          <ul className="space-y-1">
            {booking.extraServices.map((service) => (
              <li key={service.id} className="text-xs">
                {service.title} · {service.price} ₽
              </li>
            ))}
          </ul>
        ) : (
          '—'
        );
      case 'extraServicesPrice':
        return <span>{extraServicesTotal ? `${extraServicesTotal} ₽` : '—'}</span>;
      case 'aggregator':
        return <span>{getAggregatorLabel(booking)}</span>;
      case 'promoCode':
        return booking.promoCode ? (
          <div>
            <div className="font-semibold">{booking.promoCode}</div>
            {booking.promoDiscountAmount != null && (
              <div className="text-xs text-gray-500">−{booking.promoDiscountAmount} ₽</div>
            )}
          </div>
        ) : (
          '—'
        );
      case 'totalPrice':
        return <span>{booking.totalPrice} ₽</span>;
      case 'customer':
        return (
          <div>
            <div className="font-semibold text-gray-900">{booking.customerName}</div>
            <div>
              <a href={`tel:${booking.customerPhone}`} className="hover:text-red-600">
                {booking.customerPhone}
              </a>
            </div>
            {booking.customerEmail && (
              <div>
                <a href={`mailto:${booking.customerEmail}`} className="hover:text-red-600">
                  {booking.customerEmail}
                </a>
              </div>
            )}
          </div>
        );
      case 'notes':
        return <p className="line-clamp-2">{booking.notes || '—'}</p>;
      case 'actions':
        return <div className="flex justify-end gap-2">{renderActionButtons(booking)}</div>;
      default:
        return null;
    }
  };

  return (
    <div>
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        tone={notification.tone}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление бронированиями</h2>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Создать бронь
        </button>
      </div>

      <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'all', label: 'Все', count: statusCounts.all },
                  { key: 'planned', label: 'Запланировано', count: statusCounts.planned },
                  { key: 'created', label: 'Создано', count: statusCounts.created },
                  { key: 'pending', label: 'Ожидают', count: statusCounts.pending },
                  { key: 'not_confirmed', label: 'Не подтверждено', count: statusCounts.not_confirmed },
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
            {viewMode === 'table' && (
              <button
                onClick={() => setIsColumnsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Колонки
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setQuestFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                questFilter === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Все квесты ({questCounts.all || 0})
            </button>
            {quests.map((quest) => (
              <button
                key={quest.id}
                onClick={() => setQuestFilter(quest.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  questFilter === quest.id
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {quest.title} ({questCounts[quest.id] || 0})
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Агрегатор
                </label>
                <select
                  value={aggregatorFilter}
                  onChange={(e) => setAggregatorFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                >
                  <option value="all">Все</option>
                  <option value="site">Наш сайт</option>
                  {aggregatorOptions.map((aggregator) => (
                    <option key={aggregator} value={aggregator}>
                      {aggregator}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Промокод
                </label>
                <select
                  value={promoCodeFilter}
                  onChange={(e) => setPromoCodeFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                >
                  <option value="all">Все</option>
                  <option value="none">Без промокода</option>
                  {promoCodeOptions.map((promo) => (
                    <option key={promo} value={promo}>
                      {promo}
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
                  onChange={(e) => setListDateTo(normalizeListEndDate(e.target.value))}
                  disabled={statusFilter === 'pending'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Показано: <span className="font-semibold">{filteredBookings.length}</span>
              </div>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setQuestFilter('all');
                  setAggregatorFilter('all');
                  setPromoCodeFilter('all');
                }}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
            {statusFilter === 'pending' && (
              <p className="text-xs text-gray-500 mt-3">
                Для ожидающих броней период не применяется — показываются все записи.
              </p>
            )}
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white rounded-lg shadow overflow-x-auto max-w-full">
              <table
                className="text-sm table-fixed min-w-full w-full"
                style={{ minWidth: totalTableWidth || '100%' }}
              >
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    {visibleTableColumns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-4 py-3 font-semibold ${column.key === 'actions' ? 'text-right' : 'text-left'}`}
                        style={{ width: column.width }}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedBookings.map((booking) => (
                    <tr key={booking.id} style={getRowStyle(booking.status)}>
                      {visibleTableColumns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-4 py-3 ${column.key === 'actions' ? 'text-right' : 'text-gray-700'}`}
                          style={{ width: column.width }}
                        >
                          {renderTableCell(booking, column.key)}
                        </td>
                      ))}
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
                          className="px-3 py-1 rounded-full text-xs font-bold border"
                          style={getStatusBadgeStyle(booking.status)}
                        >
                          {getStatusText(booking.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ID: {booking.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {getQuestTitle(booking)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Цена квеста:{' '}
                        {getQuestPrice(booking) != null ? `${getQuestPrice(booking)} ₽` : '—'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">{renderActionButtons(booking)}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
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

                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Дата:</span>
                      <span>{formatDateTime(booking.bookingDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Создано:</span>
                      <span>{formatDateTime(booking.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700">
                      <Users className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Участников:</span>
                      <span>{booking.participantsCount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Users className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Доп. участников:</span>
                      <span>{booking.extraParticipantsCount ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <BadgeDollarSign className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Цена доп. участников:</span>
                      <span>
                        {getExtraParticipantPrice(booking) != null
                          ? `${getExtraParticipantPrice(booking)} ₽`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <BadgeDollarSign className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Сумма:</span>
                      <span>{booking.totalPrice} ₽</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="font-semibold">Агрегатор:</span>
                      <span>{getAggregatorLabel(booking)}</span>
                    </div>
                    {booking.promoCode && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="font-semibold">Промокод:</span>
                        <span>{booking.promoCode}</span>
                        {booking.promoDiscountAmount != null && (
                          <span className="text-xs text-gray-500">
                            −{booking.promoDiscountAmount} ₽
                          </span>
                        )}
                      </div>
                    )}
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
                    <div className="flex items-start gap-2 text-gray-700 sm:col-span-2">
                      <span className="font-semibold">Доп. услуги:</span>
                      <div>
                        {booking.extraServices?.length ? (
                          <ul className="space-y-1">
                            {booking.extraServices.map((service) => (
                              <li key={service.id} className="text-xs">
                                {service.title} · {service.price} ₽
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span>—</span>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Цена доп. услуг:{' '}
                          {getExtraServicesTotal(booking)
                            ? `${getExtraServicesTotal(booking)} ₽`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-start gap-2 text-gray-700">
                      <FileText className="w-4 h-4 text-red-600 mt-1" />
                      <div>
                        <span className="font-semibold">Комментарий:</span>
                        <p className="text-xs mt-1">{booking.notes || '—'}</p>
                      </div>
                    </div>
                  </div>
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Создать бронь</h3>
                <p className="text-xs text-gray-500">Заполните данные и выберите слот</p>
              </div>
              <button
                onClick={closeCreateModal}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
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
                  Комментарий
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-gray-200">
              {createResult && <span className="text-sm text-gray-600">{createResult}</span>}
              <div className="flex items-center gap-3">
                <button
                  onClick={closeCreateModal}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateBooking}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Создать бронь
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Редактирование брони</h3>
                <p className="text-xs text-gray-500">ID: {editingBooking.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setEditingBooking(null)}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div
                className="inline-flex px-3 py-1 rounded-full text-xs font-bold border"
                style={getStatusBadgeStyle(editingBooking.status)}
              >
                {getStatusText(editingBooking.status)}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Квест
                  </label>
                  <select
                    value={editingBooking.questId || ''}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        questId: e.target.value || null,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  >
                    <option value="">Без квеста</option>
                    {quests.map((quest) => (
                      <option key={quest.id} value={quest.id}>
                        {quest.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ID слота
                  </label>
                  <input
                    type="text"
                    value={editingBooking.questScheduleId || ''}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        questScheduleId: e.target.value || null,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Название квеста
                  </label>
                  <input
                    type="text"
                    value={editingBooking.questTitle}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, questTitle: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Цена квеста
                  </label>
                  <input
                    type="number"
                    value={editingBooking.questPrice}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        questPrice: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Агрегатор
                  </label>
                  <input
                    type="text"
                    value={editingBooking.aggregator}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, aggregator: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Наш сайт"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата и время брони
                  </label>
                  <input
                    type="datetime-local"
                    value={editingBooking.bookingDate}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, bookingDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата создания
                  </label>
                  <input
                    type="text"
                    value={formatDateTime(editingBooking.createdAt)}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
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
                    Email
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
                    Доп. участников
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBooking.extraParticipantsCount}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        extraParticipantsCount: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Цена доп. участников
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBooking.extraParticipantPrice}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        extraParticipantPrice: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Итоговая сумма
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBooking.totalPrice}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        totalPrice: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Тип оплаты
                  </label>
                  <input
                    type="text"
                    value={editingBooking.paymentType}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, paymentType: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Промокод
                  </label>
                  <input
                    type="text"
                    value={editingBooking.promoCode}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, promoCode: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Тип скидки
                  </label>
                  <input
                    type="text"
                    value={editingBooking.promoDiscountType}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        promoDiscountType: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Значение скидки
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBooking.promoDiscountValue}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        promoDiscountValue: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Сумма скидки
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBooking.promoDiscountAmount}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        promoDiscountAmount: Number(e.target.value) || 0,
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
                    <option value="planned">Запланировано</option>
                    <option value="created">Создано</option>
                    <option value="pending">Ожидает</option>
                    <option value="not_confirmed">Не подтверждено</option>
                    <option value="confirmed">Подтверждено</option>
                    <option value="completed">Завершено</option>
                    <option value="cancelled">Отменено</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дополнительные услуги
                  </label>
                  <div className="space-y-3">
                    {editingBooking.extraServices.map((service, index) => (
                      <div key={service.id} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={service.title}
                          onChange={(e) => updateExtraService(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="Название услуги"
                        />
                        <input
                          type="number"
                          min="0"
                          value={service.price}
                          onChange={(e) => updateExtraService(index, 'price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="Цена"
                        />
                        <button
                          type="button"
                          onClick={() => removeExtraService(index)}
                          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addExtraService}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                    >
                      Добавить услугу
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Комментарий
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
            </div>
            <div className="flex flex-wrap gap-3 px-6 py-4 border-t border-gray-200">
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
        </div>
      )}

      {isColumnsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Настройка таблицы</h3>
                <p className="text-xs text-gray-500">Выберите колонки и их ширину</p>
              </div>
              <button
                onClick={() => setIsColumnsModalOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid gap-4 md:grid-cols-2">
                {tableColumns.map((column) => (
                  <div key={column.key} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={column.visible}
                          disabled={column.locked}
                          onChange={(e) =>
                            updateTableColumn(column.key, { visible: e.target.checked })
                          }
                          className="h-4 w-4 accent-red-600"
                        />
                        {column.label}
                      </label>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Ширина (px)
                      </label>
                      <input
                        type="number"
                        min={80}
                        value={column.width}
                        onChange={(e) =>
                          updateTableColumn(column.key, {
                            width: Math.max(80, Number(e.target.value) || column.width),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setTableColumns(bookingTableDefaultColumns)}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Сбросить настройки
                </button>
                <button
                  onClick={() => setIsColumnsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{actionModal.title}</h3>
              <button
                onClick={closeActionModal}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-gray-700">{actionModal.message}</div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={closeActionModal}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                disabled={actionLoading}
              >
                Отмена
              </button>
              <button
                onClick={() => performAction(actionModal.onConfirm)}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                  actionModal.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
                disabled={actionLoading}
              >
                {actionModal.confirmLabel || 'Да'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
