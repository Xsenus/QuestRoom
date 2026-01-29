import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Booking, BookingExtraService, Quest, QuestSchedule, Settings } from '../../lib/types';
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

type TableColumnKey =
  | 'status'
  | 'bookingDate'
  | 'createdAt'
  | 'quest'
  | 'questPrice'
  | 'participants'
  | 'extraParticipants'
  | 'extraParticipantPrice'
  | 'extraServices'
  | 'extraServicesTotal'
  | 'aggregator'
  | 'promoCode'
  | 'total'
  | 'customer'
  | 'notes'
  | 'actions';

const tableColumns: { key: TableColumnKey; label: string; defaultWidth: number }[] = [
  { key: 'status', label: 'Статус', defaultWidth: 140 },
  { key: 'bookingDate', label: 'Дата брони', defaultWidth: 140 },
  { key: 'createdAt', label: 'Создано', defaultWidth: 140 },
  { key: 'quest', label: 'Квест', defaultWidth: 180 },
  { key: 'questPrice', label: 'Цена квеста', defaultWidth: 120 },
  { key: 'participants', label: 'Участников', defaultWidth: 110 },
  { key: 'extraParticipants', label: 'Доп. участники', defaultWidth: 130 },
  { key: 'extraParticipantPrice', label: 'Цена доп.', defaultWidth: 110 },
  { key: 'extraServices', label: 'Доп. услуги', defaultWidth: 160 },
  { key: 'extraServicesTotal', label: 'Цена доп. услуг', defaultWidth: 140 },
  { key: 'aggregator', label: 'Агрегатор', defaultWidth: 120 },
  { key: 'promoCode', label: 'Промокод', defaultWidth: 130 },
  { key: 'total', label: 'Итог', defaultWidth: 100 },
  { key: 'customer', label: 'Клиент', defaultWidth: 180 },
  { key: 'notes', label: 'Комментарий', defaultWidth: 160 },
  { key: 'actions', label: 'Действия', defaultWidth: 180 },
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
  const [extraParticipantsCount, setExtraParticipantsCount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [aggregator, setAggregator] = useState<string>('');
  const [selectedExtraServiceIds, setSelectedExtraServiceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [createResult, setCreateResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
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
  const [editingBooking, setEditingBooking] = useState<{
    id: string;
    questId: string | null;
    questScheduleId: string | null;
    bookingDate: string;
    createdAt: string;
    aggregator: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    participantsCount: number;
    extraParticipantsCount: number;
    questPrice: number;
    extraParticipantPrice: number;
    totalPrice: number;
    paymentType: string;
    promoCode: string;
    promoDiscountAmount: number | null;
    extraServices: BookingExtraService[];
    notes: string;
    status: Booking['status'];
  } | null>(null);
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
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: null | (() => void);
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Подтвердить',
    onConfirm: null,
  });
  const [tableColumnsState, setTableColumnsState] = useState<
    Record<TableColumnKey, { visible: boolean; width: number }>
  >(() =>
    tableColumns.reduce(
      (acc, column) => {
        acc[column.key] = { visible: true, width: column.defaultWidth };
        return acc;
      },
      {} as Record<TableColumnKey, { visible: boolean; width: number }>
    )
  );
  const listRangeStorageKey = 'admin_bookings_list_range';
  const tableSettingsStorageKey = 'admin_bookings_table_settings';

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
      const saved = localStorage.getItem(tableSettingsStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Record<
            TableColumnKey,
            { visible: boolean; width: number }
          >;
          setTableColumnsState((prev) => ({
            ...prev,
            ...parsed,
          }));
        } catch {
          setTableColumnsState((prev) => ({ ...prev }));
        }
      }
    }
  }, [tableSettingsStorageKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_bookings_view', viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(tableSettingsStorageKey, JSON.stringify(tableColumnsState));
    }
  }, [tableColumnsState, tableSettingsStorageKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        listRangeStorageKey,
        JSON.stringify({ from: listDateFrom, to: listDateTo })
      );
    }
  }, [listDateFrom, listDateTo, listRangeStorageKey]);

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

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings({
        ...data,
        bookingStatusColorPlanned: data.bookingStatusColorPlanned ?? '#ede9fe',
        bookingStatusColorCreated: data.bookingStatusColorCreated ?? '#e0f2fe',
        bookingStatusColorPending: data.bookingStatusColorPending ?? '#fef3c7',
        bookingStatusColorNotConfirmed: data.bookingStatusColorNotConfirmed ?? '#ffedd5',
        bookingStatusColorConfirmed: data.bookingStatusColorConfirmed ?? '#dcfce7',
        bookingStatusColorCompleted: data.bookingStatusColorCompleted ?? '#dbeafe',
        bookingStatusColorCancelled: data.bookingStatusColorCancelled ?? '#fee2e2',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(null);
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
        extraParticipantsCount,
        aggregator: aggregator || null,
        notes: notes || null,
        extraServiceIds: selectedExtraServiceIds,
        paymentType: paymentType || null,
        promoCode: promoCode || null,
      });
      setCreateResult('Бронь создана.');
      setSelectedSlotId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setParticipantsCount(2);
      setExtraParticipantsCount(0);
      setPaymentType('');
      setPromoCode('');
      setAggregator('');
      setSelectedExtraServiceIds([]);
      setNotes('');
      setIsCreateModalOpen(false);
      loadBookings();
      loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
    } catch (error) {
      setCreateResult('Ошибка создания брони: ' + (error as Error).message);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    try {
      await api.deleteBooking(booking.id);
      loadBookings();
      if (selectedQuestId && dateFrom && dateTo) {
        loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
      }
      openNotification(
        'Бронь удалена',
        `Бронь клиента ${booking.customerName} успешно удалена.`,
        'success'
      );
    } catch (error) {
      openNotification(
        'Не удалось удалить бронь',
        `Ошибка: ${(error as Error).message}`,
        'error'
      );
    }
  };

  const updateStatus = async (booking: Booking, status: Booking['status']) => {
    try {
      await api.updateBooking(booking.id, { status, notes: booking.notes });
      loadBookings();
      if (selectedQuestId && dateFrom && dateTo) {
        loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
      }
      openNotification(
        'Статус обновлен',
        `Статус брони клиента ${booking.customerName} обновлен на «${getStatusText(status)}».`,
        'success'
      );
    } catch (error) {
      openNotification(
        'Не удалось обновить статус',
        `Ошибка: ${(error as Error).message}`,
        'error'
      );
    }
  };

  const openCreateModal = () => {
    setCreateResult('');
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const openActionModal = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => {
    setActionModal({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || 'Подтвердить',
      onConfirm: options.onConfirm,
    });
  };

  const closeActionModal = () => {
    setActionModal((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  const openNotification = (title: string, message: string, tone: 'success' | 'error' | 'info') => {
    setNotification({
      isOpen: true,
      title,
      message,
      tone,
    });
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking({
      id: booking.id,
      questId: booking.questId,
      questScheduleId: booking.questScheduleId,
      bookingDate: booking.bookingDate,
      createdAt: booking.createdAt,
      aggregator: booking.aggregator || '',
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail || '',
      participantsCount: booking.participantsCount,
      extraParticipantsCount: booking.extraParticipantsCount || 0,
      questPrice: booking.questPrice ?? getQuestPrice(booking) ?? 0,
      extraParticipantPrice: booking.extraParticipantPrice ?? getExtraParticipantPrice(booking) ?? 0,
      totalPrice: booking.totalPrice,
      paymentType: booking.paymentType || '',
      promoCode: booking.promoCode || '',
      promoDiscountAmount: booking.promoDiscountAmount,
      extraServices: booking.extraServices || [],
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
        extraParticipantsCount: editingBooking.extraParticipantsCount,
        questPrice: editingBooking.questPrice,
        extraParticipantPrice: editingBooking.extraParticipantPrice,
        totalPrice: editingBooking.totalPrice,
        promoCode: editingBooking.promoCode || null,
        promoDiscountAmount: editingBooking.promoDiscountAmount ?? null,
        paymentType: editingBooking.paymentType || null,
        aggregator: editingBooking.aggregator || null,
        bookingDate: editingBooking.bookingDate,
        createdAt: editingBooking.createdAt,
        questId: editingBooking.questId,
        questScheduleId: editingBooking.questScheduleId,
        extraServices: editingBooking.extraServices,
        notes: editingBooking.notes || null,
        status: editingBooking.status,
      });
      setEditingBooking(null);
      loadBookings();
      if (selectedQuestId && dateFrom && dateTo) {
        loadScheduleSlots(selectedQuestId, dateFrom, dateTo);
      }
      openNotification(
        'Бронь обновлена',
        'Изменения сохранены и применены.',
        'success'
      );
    } catch (error) {
      openNotification(
        'Не удалось обновить бронь',
        `Ошибка: ${(error as Error).message}`,
        'error'
      );
    }
  };

  const requestEditBooking = (booking: Booking) => {
    openActionModal({
      title: 'Редактирование брони',
      message: `Открыть редактирование брони клиента ${booking.customerName}?`,
      confirmLabel: 'Открыть',
      onConfirm: () => {
        closeActionModal();
        handleEditBooking(booking);
      },
    });
  };

  const requestDeleteBooking = (booking: Booking) => {
    openActionModal({
      title: 'Удалить бронь',
      message: `Удалить бронь клиента ${booking.customerName}? Это действие необратимо.`,
      confirmLabel: 'Удалить',
      onConfirm: () => {
        closeActionModal();
        handleDeleteBooking(booking);
      },
    });
  };

  const requestStatusChange = (booking: Booking, status: Booking['status']) => {
    openActionModal({
      title: 'Подтвердите действие',
      message: `Изменить статус брони клиента ${booking.customerName} на «${getStatusText(
        status
      )}»?`,
      confirmLabel: 'Изменить',
      onConfirm: () => {
        closeActionModal();
        updateStatus(booking, status);
      },
    });
  };

  const addEditingExtraService = () => {
    if (!editingBooking) {
      return;
    }
    const newService: BookingExtraService = {
      id: crypto.randomUUID(),
      title: '',
      price: 0,
    };
    setEditingBooking({
      ...editingBooking,
      extraServices: [...editingBooking.extraServices, newService],
    });
  };

  const updateEditingExtraService = (
    index: number,
    field: 'title' | 'price',
    value: string
  ) => {
    if (!editingBooking) {
      return;
    }
    const updated = editingBooking.extraServices.map((service, serviceIndex) => {
      if (serviceIndex !== index) {
        return service;
      }
      return {
        ...service,
        [field]: field === 'price' ? Number(value) || 0 : value,
      };
    });
    setEditingBooking({ ...editingBooking, extraServices: updated });
  };

  const removeEditingExtraService = (index: number) => {
    if (!editingBooking) {
      return;
    }
    const updated = editingBooking.extraServices.filter((_, serviceIndex) => serviceIndex !== index);
    setEditingBooking({ ...editingBooking, extraServices: updated });
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getStatusColorValue = (status: Booking['status']) => {
    const fallback: Record<Booking['status'], string> = {
      pending: '#fef3c7',
      confirmed: '#dcfce7',
      cancelled: '#fee2e2',
      completed: '#dbeafe',
      planned: '#ede9fe',
      created: '#e0f2fe',
      not_confirmed: '#ffedd5',
    };

    if (!settings) {
      return fallback[status];
    }

    const map: Record<Booking['status'], string | null> = {
      planned: settings.bookingStatusColorPlanned,
      created: settings.bookingStatusColorCreated,
      pending: settings.bookingStatusColorPending,
      not_confirmed: settings.bookingStatusColorNotConfirmed,
      confirmed: settings.bookingStatusColorConfirmed,
      completed: settings.bookingStatusColorCompleted,
      cancelled: settings.bookingStatusColorCancelled,
    };

    return map[status] || fallback[status];
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

  const questLookup = useMemo(() => {
    return new Map(quests.map((quest) => [quest.id, quest]));
  }, [quests]);

  const selectedQuest = useMemo(() => {
    return quests.find((quest) => quest.id === selectedQuestId) || null;
  }, [quests, selectedQuestId]);

  const editingQuest = useMemo(() => {
    if (!editingBooking?.questId) {
      return null;
    }
    return questLookup.get(editingBooking.questId) || null;
  }, [editingBooking, questLookup]);

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

  const formatDateTimeInput = (value: string) => {
    const date = new Date(value);
    const pad = (input: number) => input.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
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

  const listItemsPerPage = viewMode === 'table' ? 10 : 9;
  const rangeStart = listDateFrom ? new Date(`${listDateFrom}T00:00:00`) : null;
  const rangeEnd = listDateTo ? new Date(`${listDateTo}T23:59:59`) : null;

  const isColumnVisible = (key: TableColumnKey) => tableColumnsState[key]?.visible ?? true;
  const getColumnWidth = (key: TableColumnKey) =>
    tableColumnsState[key]?.width ??
    tableColumns.find((column) => column.key === key)?.defaultWidth ??
    120;

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

  return (
    <div>
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        tone={notification.tone}
        onClose={() =>
          setNotification((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
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
                onClick={() => setIsTableSettingsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:text-gray-900 hover:border-gray-300 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Настроить таблицу
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
            <div className="bg-white rounded-lg shadow overflow-auto">
              <table className="min-w-full text-sm table-fixed">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    {isColumnVisible('status') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('status') }}
                      >
                        Статус
                      </th>
                    )}
                    {isColumnVisible('bookingDate') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('bookingDate') }}
                      >
                        Дата брони
                      </th>
                    )}
                    {isColumnVisible('createdAt') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('createdAt') }}
                      >
                        Создано
                      </th>
                    )}
                    {isColumnVisible('quest') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('quest') }}
                      >
                        Квест
                      </th>
                    )}
                    {isColumnVisible('questPrice') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('questPrice') }}
                      >
                        Цена квеста
                      </th>
                    )}
                    {isColumnVisible('participants') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('participants') }}
                      >
                        Участников
                      </th>
                    )}
                    {isColumnVisible('extraParticipants') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('extraParticipants') }}
                      >
                        Доп. участники
                      </th>
                    )}
                    {isColumnVisible('extraParticipantPrice') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('extraParticipantPrice') }}
                      >
                        Цена доп.
                      </th>
                    )}
                    {isColumnVisible('extraServices') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('extraServices') }}
                      >
                        Доп. услуги
                      </th>
                    )}
                    {isColumnVisible('extraServicesTotal') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('extraServicesTotal') }}
                      >
                        Цена доп. услуг
                      </th>
                    )}
                    {isColumnVisible('aggregator') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('aggregator') }}
                      >
                        Агрегатор
                      </th>
                    )}
                    {isColumnVisible('promoCode') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('promoCode') }}
                      >
                        Промокод
                      </th>
                    )}
                    {isColumnVisible('total') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('total') }}
                      >
                        Итог
                      </th>
                    )}
                    {isColumnVisible('customer') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('customer') }}
                      >
                        Клиент
                      </th>
                    )}
                    {isColumnVisible('notes') && (
                      <th
                        className="text-left px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('notes') }}
                      >
                        Комментарий
                      </th>
                    )}
                    {isColumnVisible('actions') && (
                      <th
                        className="text-right px-4 py-3 font-semibold"
                        style={{ width: getColumnWidth('actions') }}
                      >
                        Действия
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedBookings.map((booking) => {
                    const questPrice = getQuestPrice(booking);
                    const extraParticipantPrice = getExtraParticipantPrice(booking);
                    const extraServicesTotal = getExtraServicesTotal(booking);
                    const rowStyle = {
                      backgroundColor: hexToRgba(getStatusColorValue(booking.status), 0.12),
                    };
                    return (
                      <tr key={booking.id} style={rowStyle} className="transition-colors">
                        {isColumnVisible('status') && (
                          <td className="px-4 py-3" style={{ width: getColumnWidth('status') }}>
                            <span
                              className="inline-flex px-3 py-1 rounded-full text-xs font-bold border"
                              style={{
                                backgroundColor: getStatusColorValue(booking.status),
                                borderColor: getStatusColorValue(booking.status),
                              }}
                            >
                              {getStatusText(booking.status)}
                            </span>
                          </td>
                        )}
                        {isColumnVisible('bookingDate') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('bookingDate') }}
                          >
                            {formatDateTime(booking.bookingDate)}
                          </td>
                        )}
                        {isColumnVisible('createdAt') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('createdAt') }}
                          >
                            {formatDateTime(booking.createdAt)}
                          </td>
                        )}
                        {isColumnVisible('quest') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('quest') }}
                          >
                            {getQuestTitle(booking)}
                          </td>
                        )}
                        {isColumnVisible('questPrice') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('questPrice') }}
                          >
                            {questPrice != null ? `${questPrice} ₽` : '—'}
                          </td>
                        )}
                        {isColumnVisible('participants') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('participants') }}
                          >
                            {booking.participantsCount}
                          </td>
                        )}
                        {isColumnVisible('extraParticipants') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('extraParticipants') }}
                          >
                            {booking.extraParticipantsCount ?? 0}
                          </td>
                        )}
                        {isColumnVisible('extraParticipantPrice') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('extraParticipantPrice') }}
                          >
                            {extraParticipantPrice != null ? `${extraParticipantPrice} ₽` : '—'}
                          </td>
                        )}
                        {isColumnVisible('extraServices') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('extraServices') }}
                          >
                            {booking.extraServices?.length ? (
                              <ul className="space-y-1">
                                {booking.extraServices.map((service) => (
                                  <li key={service.id} className="text-xs">
                                    {service.title} · {service.price} ₽
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        {isColumnVisible('extraServicesTotal') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('extraServicesTotal') }}
                          >
                            {extraServicesTotal ? `${extraServicesTotal} ₽` : '—'}
                          </td>
                        )}
                        {isColumnVisible('aggregator') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('aggregator') }}
                          >
                            {getAggregatorLabel(booking)}
                          </td>
                        )}
                        {isColumnVisible('promoCode') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('promoCode') }}
                          >
                            {booking.promoCode ? (
                              <div>
                                <div className="font-semibold">{booking.promoCode}</div>
                                {booking.promoDiscountAmount != null && (
                                  <div className="text-xs text-gray-500">
                                    −{booking.promoDiscountAmount} ₽
                                  </div>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        {isColumnVisible('total') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('total') }}
                          >
                            {booking.totalPrice} ₽
                          </td>
                        )}
                        {isColumnVisible('customer') && (
                          <td
                            className="px-4 py-3 text-gray-700"
                            style={{ width: getColumnWidth('customer') }}
                          >
                            <div className="font-semibold text-gray-900">
                              {booking.customerName}
                            </div>
                            <div>
                              <a
                                href={`tel:${booking.customerPhone}`}
                                className="hover:text-red-600"
                              >
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
                        )}
                        {isColumnVisible('notes') && (
                          <td
                            className="px-4 py-3 text-gray-600"
                            style={{ width: getColumnWidth('notes') }}
                          >
                            <p className="line-clamp-2">{booking.notes || '—'}</p>
                          </td>
                        )}
                        {isColumnVisible('actions') && (
                          <td className="px-4 py-3" style={{ width: getColumnWidth('actions') }}>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => requestEditBooking(booking)}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => requestDeleteBooking(booking)}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {booking.status === 'pending' && (
                                <button
                                  onClick={() => requestStatusChange(booking, 'confirmed')}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-colors"
                                >
                                  Подтвердить
                                </button>
                              )}
                              {(booking.status === 'pending' ||
                                booking.status === 'confirmed') && (
                                <button
                                  onClick={() => requestStatusChange(booking, 'cancelled')}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors"
                                >
                                  Отменить
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
                          style={{
                            backgroundColor: getStatusColorValue(booking.status),
                            borderColor: getStatusColorValue(booking.status),
                          }}
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => requestEditBooking(booking)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestDeleteBooking(booking)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => requestStatusChange(booking, 'confirmed')}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-colors"
                        >
                          Подтвердить
                        </button>
                      )}
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <button
                          onClick={() => requestStatusChange(booking, 'cancelled')}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors"
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm md:grid-cols-2">
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
                    <div className="flex items-start gap-2 text-gray-700 md:col-span-2">
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

      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{actionModal.title}</h3>
              <button
                type="button"
                onClick={closeActionModal}
                className="rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-gray-700">{actionModal.message}</div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={closeActionModal}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => actionModal.onConfirm?.()}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                {actionModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTableSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Настройка таблицы</h3>
                <p className="text-xs text-gray-500">
                  Выберите колонки и задайте ширину в пикселях.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTableSettingsOpen(false)}
                className="rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {tableColumns.map((column) => (
                  <div key={column.key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={tableColumnsState[column.key]?.visible ?? true}
                      onChange={(e) =>
                        setTableColumnsState((prev) => ({
                          ...prev,
                          [column.key]: {
                            ...prev[column.key],
                            visible: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <div className="flex-1 text-sm font-medium text-gray-700">
                      {column.label}
                    </div>
                    <input
                      type="number"
                      min={80}
                      value={tableColumnsState[column.key]?.width ?? column.defaultWidth}
                      onChange={(e) =>
                        setTableColumnsState((prev) => ({
                          ...prev,
                          [column.key]: {
                            ...prev[column.key],
                            width: parseInt(e.target.value, 10) || column.defaultWidth,
                          },
                        }))
                      }
                      className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setTableColumnsState(
                    tableColumns.reduce(
                      (acc, column) => {
                        acc[column.key] = { visible: true, width: column.defaultWidth };
                        return acc;
                      },
                      {} as Record<TableColumnKey, { visible: boolean; width: number }>
                    )
                  )
                }
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Сбросить настройки
              </button>
              <button
                type="button"
                onClick={() => setIsTableSettingsOpen(false)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
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
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Квест</label>
                  <select
                    value={selectedQuestId}
                    onChange={(e) => {
                      setSelectedQuestId(e.target.value);
                      setSelectedExtraServiceIds([]);
                      setSelectedSlotId('');
                    }}
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
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Доп. участников
                    </label>
                    <input
                      type="number"
                      value={extraParticipantsCount}
                      onChange={(e) => setExtraParticipantsCount(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Агрегатор
                    </label>
                    <input
                      type="text"
                      value={aggregator}
                      onChange={(e) => setAggregator(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="Наш сайт"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Способ оплаты
                    </label>
                    <input
                      type="text"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="Наличные/карта/онлайн"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Промокод
                    </label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Дополнительные услуги
                </label>
                {selectedQuest?.extraServices?.length ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {selectedQuest.extraServices.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedExtraServiceIds.includes(service.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExtraServiceIds((prev) => [...prev, service.id]);
                            } else {
                              setSelectedExtraServiceIds((prev) =>
                                prev.filter((id) => id !== service.id)
                              );
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <span>
                          {service.title} · {service.price} ₽
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Дополнительные услуги не настроены.</p>
                )}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
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
            <div className="p-6 space-y-4">
              <div
                className="inline-flex px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: getStatusColorValue(editingBooking.status),
                  borderColor: getStatusColorValue(editingBooking.status),
                }}
              >
                {getStatusText(editingBooking.status)}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
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
                    value={formatDateTimeInput(editingBooking.bookingDate)}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        bookingDate: new Date(e.target.value).toISOString(),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата создания
                  </label>
                  <input
                    type="datetime-local"
                    value={formatDateTimeInput(editingBooking.createdAt)}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        createdAt: new Date(e.target.value).toISOString(),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
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
                    Доп. участников
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBooking.extraParticipantsCount}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        extraParticipantsCount: parseInt(e.target.value) || 0,
                      })
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
                    min="0"
                    value={editingBooking.questPrice}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        questPrice: parseInt(e.target.value) || 0,
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
                        extraParticipantPrice: parseInt(e.target.value) || 0,
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
                        totalPrice: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Способ оплаты
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
                    Скидка по промокоду (₽)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBooking.promoDiscountAmount ?? 0}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        promoDiscountAmount: parseInt(e.target.value) || 0,
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
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дополнительные услуги
                  </label>
                  <div className="space-y-3">
                    {editingBooking.extraServices.map((service, index) => (
                      <div key={service.id} className="grid md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={service.title}
                          onChange={(e) =>
                            updateEditingExtraService(index, 'title', e.target.value)
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="Название услуги"
                        />
                        <input
                          type="number"
                          min="0"
                          value={service.price}
                          onChange={(e) =>
                            updateEditingExtraService(index, 'price', e.target.value)
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="Цена"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditingExtraService(index)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                        >
                          Удалить услугу
                        </button>
                      </div>
                    ))}
                    {editingQuest?.extraServices?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {editingQuest.extraServices.map((service) => {
                          const isSelected = editingBooking.extraServices.some(
                            (extra) => extra.id === service.id
                          );
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setEditingBooking({
                                    ...editingBooking,
                                    extraServices: editingBooking.extraServices.filter(
                                      (extra) => extra.id !== service.id
                                    ),
                                  });
                                } else {
                                  setEditingBooking({
                                    ...editingBooking,
                                    extraServices: [
                                      ...editingBooking.extraServices,
                                      service,
                                    ],
                                  });
                                }
                              }}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                isSelected
                                  ? 'border-red-500 text-red-600'
                                  : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
                              }`}
                            >
                              {service.title} · {service.price} ₽
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={addEditingExtraService}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                    >
                      Добавить услугу вручную
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
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
    </div>
  );
}
