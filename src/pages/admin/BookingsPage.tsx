import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import {
  Booking,
  BookingTableColumnPreference,
  BookingTableFilter,
  BookingTablePreferences,
  BookingTableSort,
  PromoCode,
  Quest,
  QuestSchedule,
  Settings,
  StandardExtraService,
} from '../../lib/types';
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
  RefreshCw,
  Plus,
  SlidersHorizontal,
  GripVertical,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react';
import NotificationModal from '../../components/NotificationModal';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';
import { showAdminNotification } from '../../lib/adminNotifications';

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

type BookingColumnFilterKey =
  | 'status'
  | 'quest'
  | 'aggregator'
  | 'promoCode'
  | 'customerName'
  | 'customerPhone'
  | 'customerEmail'
  | 'bookingDate'
  | 'createdAt'
  | 'totalPrice'
  | 'notes';

type BookingColumnFilterDefinition = {
  key: BookingColumnFilterKey;
  label: string;
  kind: 'text' | 'multi';
  options?: { value: string; label: string }[];
};

type SearchOperatorKey =
  | 'status'
  | 'quest'
  | 'aggregator'
  | 'promo'
  | 'phone'
  | 'email'
  | 'name'
  | 'id'
  | 'date'
  | 'created'
  | 'total'
  | 'notes';

type ParsedSearchQuery = {
  freeTerms: string[];
  operators: Record<SearchOperatorKey, string[]>;
};

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

const bookingPageSizeOptions = [5, 10, 25, 50, 100];
const defaultBookingPageSize = 10;

export default function BookingsPage() {
  const { user, hasPermission } = useAuth();
  const canView = hasPermission('bookings.view');
  const canEdit = hasPermission('bookings.edit');
  const canDelete = hasPermission('bookings.delete');
  const canConfirm = hasPermission('bookings.confirm');
  const canViewPromoCodes = hasPermission('promo-codes.view');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [countBookings, setCountBookings] = useState<Booking[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [standardExtraServices, setStandardExtraServices] = useState<StandardExtraService[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [defaultQuestId, setDefaultQuestId] = useState<string>('');
  const [scheduleSlots, setScheduleSlots] = useState<QuestSchedule[]>([]);
  const [createResult, setCreateResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [bookingFormMode, setBookingFormMode] = useState<'create' | 'edit' | null>(null);
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
  const [listDateFromInput, setListDateFromInput] = useState<string>('');
  const [listDateToInput, setListDateToInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [columnFilters, setColumnFilters] = useState<BookingTableFilter[]>([]);
  const [tableSorts, setTableSorts] = useState<BookingTableSort[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [listItemsPerPage, setListItemsPerPage] = useState<number>(defaultBookingPageSize);
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
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isTotalPriceManual, setIsTotalPriceManual] = useState(false);
  const [selectedQuestExtraServiceIds, setSelectedQuestExtraServiceIds] = useState<string[]>(
    []
  );
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
    bookingTime: string;
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
  const normalizeServiceTitle = (title?: string | null) =>
    (title ?? '').trim().toLowerCase();
  const mandatoryChildServiceTitles = useMemo(
    () =>
      new Set(
        standardExtraServices
          .filter((service) => service.mandatoryForChildQuests)
          .map((service) => normalizeServiceTitle(service.title))
      ),
    [standardExtraServices]
  );
  const showCustomFilters = false;
  const tableColumnsStorageKey = useMemo(
    () => `admin_bookings_table_columns_${user?.email ?? 'guest'}`,
    [user?.email]
  );
  const [tableColumns, setTableColumns] = useState<BookingTableColumnConfig[]>(
    bookingTableDefaultColumns
  );
  const [columnsLoadedKey, setColumnsLoadedKey] = useState<string | null>(null);
  const [draggedColumnKey, setDraggedColumnKey] = useState<BookingTableColumnKey | null>(null);
  const [resizeState, setResizeState] = useState<{
    key: BookingTableColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);
  const preferencesSaveTimeout = useRef<number | null>(null);
  const hasUserEditedPreferences = useRef(false);

  const formatDate = (value: Date) => value.toISOString().split('T')[0];
  const normalizeDateParam = (value: string) => (value ? value : undefined);
  const isCompleteDateInput = (value: string) => {
    if (!value) {
      return true;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    return !Number.isNaN(new Date(value).getTime());
  };
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const getEndOfNextMonth = (baseDate: Date) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const buildTablePreferences = useCallback(
    (
      columns: BookingTableColumnConfig[],
      filters: BookingTableFilter[],
      search: string,
      sorts: BookingTableSort[],
      pageSize: number
    ): BookingTablePreferences => ({
      columns: columns.map((column) => ({
        key: column.key,
        width: column.width,
        visible: column.visible,
      })),
      searchQuery: search,
      columnFilters: filters.map((filter) => ({
        id: filter.id,
        key: filter.key,
        value: filter.value ?? '',
        values: filter.values ?? [],
      })),
      sorts: sorts.map((sort) => ({
        key: sort.key,
        direction: sort.direction,
      })),
      pageSize,
    }),
    []
  );

  const mergeTablePreferences = useCallback((preferences?: BookingTablePreferences | null) => {
    if (!preferences?.columns?.length) {
      return bookingTableDefaultColumns;
    }
    const defaultMap = new Map(bookingTableDefaultColumns.map((column) => [column.key, column]));
    const next: BookingTableColumnConfig[] = [];
    const seen = new Set<BookingTableColumnKey>();

    preferences.columns.forEach((column) => {
      const base = defaultMap.get(column.key as BookingTableColumnKey);
      if (!base) {
        return;
      }
      seen.add(base.key);
      next.push({
        ...base,
        width: column.width,
        visible: column.visible,
        locked: base.locked,
      });
    });

    bookingTableDefaultColumns.forEach((column) => {
      if (!seen.has(column.key)) {
        next.push(column);
      }
    });

    return next;
  }, []);

  const normalizeColumnFilters = useCallback((filters?: BookingTableFilter[] | null) => {
    if (!filters?.length) {
      return [];
    }
    return filters.map((filter) => ({
      id: filter.id || crypto.randomUUID(),
      key: filter.key,
      value: filter.value ?? '',
      values: filter.values ?? [],
    }));
  }, []);

  const normalizeSorts = useCallback((sorts?: BookingTableSort[] | null) => {
    if (!sorts?.length) {
      return [];
    }
    const seen = new Set<string>();
    return sorts.reduce<BookingTableSort[]>((acc, sort) => {
      if (!sort?.key || seen.has(sort.key)) {
        return acc;
      }
      seen.add(sort.key);
      acc.push({
        key: sort.key,
        direction: sort.direction === 'desc' ? 'desc' : 'asc',
      });
      return acc;
    }, []);
  }, []);

  const serializeSorts = useCallback((sorts: BookingTableSort[]) => {
    if (!sorts.length) {
      return '';
    }
    return sorts.map((sort) => `${sort.key}:${sort.direction}`).join(',');
  }, []);

  const normalizeStoredPreferences = useCallback(
    (
      stored:
        | BookingTablePreferences
        | BookingTableColumnConfig[]
        | BookingTableColumnPreference[]
        | null
    ) => {
      if (!stored) {
        return null;
      }
      if (Array.isArray(stored)) {
        const normalized = stored.map((column) => ({
          key: column.key,
          width: column.width,
          visible: column.visible,
        }));
        return { columns: normalized };
      }
      const normalizedColumns = (stored.columns || []).map((column) => ({
        key: column.key,
        width: column.width,
        visible: column.visible,
      }));
      return {
        columns: normalizedColumns,
        searchQuery: stored.searchQuery ?? '',
        columnFilters: normalizeColumnFilters(stored.columnFilters),
        sorts: normalizeSorts(stored.sorts),
        pageSize: stored.pageSize,
      };
    },
    [normalizeColumnFilters, normalizeSorts]
  );

  const updateTableColumn = useCallback(
    (key: BookingTableColumnKey, updates: Partial<BookingTableColumnConfig>) => {
      setTableColumns((prev) =>
        prev.map((column) => (column.key === key ? { ...column, ...updates } : column))
      );
    },
    []
  );

  const moveTableColumn = useCallback(
    (fromKey: BookingTableColumnKey, toKey: BookingTableColumnKey) => {
      if (fromKey === toKey) {
        return;
      }
      setTableColumns((prev) => {
        const fromIndex = prev.findIndex((column) => column.key === fromKey);
        const toIndex = prev.findIndex((column) => column.key === toKey);
        if (fromIndex === -1 || toIndex === -1) {
          return prev;
        }
        if (prev[fromIndex].locked || prev[toIndex].locked) {
          return prev;
        }
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    []
  );

  const handleColumnDragStart = useCallback(
    (key: BookingTableColumnKey, locked?: boolean) => (event: React.DragEvent) => {
      if (locked) {
        event.preventDefault();
        return;
      }
      setDraggedColumnKey(key);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', key);
    },
    []
  );

  const handleColumnDragOver = useCallback(
    (key: BookingTableColumnKey, locked?: boolean) => (event: React.DragEvent) => {
      if (locked || !draggedColumnKey || draggedColumnKey === key) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    [draggedColumnKey]
  );

  const handleColumnDrop = useCallback(
    (key: BookingTableColumnKey, locked?: boolean) => (event: React.DragEvent) => {
      if (locked) {
        return;
      }
      event.preventDefault();
      const sourceKey = draggedColumnKey ?? event.dataTransfer.getData('text/plain');
      if (sourceKey) {
        moveTableColumn(sourceKey as BookingTableColumnKey, key);
      }
      setDraggedColumnKey(null);
    },
    [draggedColumnKey, moveTableColumn]
  );

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColumnKey(null);
  }, []);

  useEffect(() => {
    if (!canView) {
      return;
    }
    const today = new Date();
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

    setListDateFrom(listFrom);
    setListDateTo(listTo);
    loadQuests();
    loadStandardExtraServices();
    loadSettings();
    loadPromoCodes();
  }, [canView]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_bookings_view', viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    setListDateFromInput(listDateFrom);
  }, [listDateFrom]);

  useEffect(() => {
    setListDateToInput(listDateTo);
  }, [listDateTo]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        listRangeStorageKey,
        JSON.stringify({ from: listDateFrom, to: listDateTo })
      );
    }
  }, [listDateFrom, listDateTo, listRangeStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!canView) {
      return;
    }
    let isActive = true;

    const loadPreferences = async () => {
      let preferences: BookingTablePreferences | null = null;

      if (user?.email) {
        try {
          preferences = await api.getBookingsTablePreferences();
        } catch (error) {
          console.warn('Не удалось загрузить настройки таблицы с сервера:', error);
        }
      }

      if (!preferences?.columns?.length) {
        const saved = localStorage.getItem(tableColumnsStorageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as
              | BookingTablePreferences
              | BookingTableColumnConfig[]
              | BookingTableColumnPreference[];
            preferences = normalizeStoredPreferences(parsed);
          } catch {
            preferences = null;
          }
        }
      }

      if (!isActive) {
        return;
      }

      setTableColumns(mergeTablePreferences(preferences));
      if (!hasUserEditedPreferences.current) {
        setSearchQuery(preferences?.searchQuery ?? '');
        setColumnFilters(normalizeColumnFilters(preferences?.columnFilters));
        setTableSorts(normalizeSorts(preferences?.sorts));
        const preferredPageSize = preferences?.pageSize;
        setListItemsPerPage(
          bookingPageSizeOptions.includes(preferredPageSize ?? -1)
            ? preferredPageSize ?? defaultBookingPageSize
            : defaultBookingPageSize
        );
      }
      setColumnsLoadedKey(tableColumnsStorageKey);
    };

    loadPreferences();

    return () => {
      isActive = false;
    };
  }, [
    canView,
    tableColumnsStorageKey,
    user?.email,
    mergeTablePreferences,
    normalizeColumnFilters,
    normalizeSorts,
    normalizeStoredPreferences,
  ]);

  const activeColumnFilters = useMemo(
    () => (showCustomFilters ? columnFilters : []),
    [showCustomFilters, columnFilters]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!canView) {
        return;
      }
      if (columnsLoadedKey !== tableColumnsStorageKey) {
        return;
      }
      const preferences = buildTablePreferences(
        tableColumns,
        activeColumnFilters,
        searchQuery,
        tableSorts,
        listItemsPerPage
      );
      localStorage.setItem(tableColumnsStorageKey, JSON.stringify(preferences));
      if (preferencesSaveTimeout.current) {
        window.clearTimeout(preferencesSaveTimeout.current);
      }
      if (user?.email) {
        preferencesSaveTimeout.current = window.setTimeout(() => {
          api.updateBookingsTablePreferences(preferences).catch((error) => {
            console.warn('Не удалось сохранить настройки таблицы:', error);
          });
        }, 500);
      }
    }
    return () => {
      if (preferencesSaveTimeout.current) {
        window.clearTimeout(preferencesSaveTimeout.current);
      }
    };
  }, [
    canView,
    tableColumns,
    activeColumnFilters,
    searchQuery,
    tableSorts,
    tableColumnsStorageKey,
    columnsLoadedKey,
    user?.email,
    buildTablePreferences,
    listItemsPerPage,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    statusFilter,
    questFilter,
    aggregatorFilter,
    promoCodeFilter,
    listDateFrom,
    listDateTo,
    searchQuery,
    activeColumnFilters,
    tableSorts,
    viewMode,
    listItemsPerPage,
  ]);

  useEffect(() => {
    if (!resizeState) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.max(80, resizeState.startWidth + (event.clientX - resizeState.startX));
      updateTableColumn(resizeState.key, { width: nextWidth });
    };

    const handleMouseUp = () => {
      setResizeState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, updateTableColumn]);

  useEffect(() => {
    if (!editingBooking?.questId || !editingBooking.bookingDate) {
      return;
    }
    loadScheduleSlots(editingBooking.questId, editingBooking.bookingDate, editingBooking.bookingDate);
  }, [editingBooking?.questId, editingBooking?.bookingDate]);

  useEffect(() => {
    if (!editingBooking?.bookingDate || !editingBooking.bookingTime) {
      return;
    }
    if (editingBooking.questScheduleId) {
      return;
    }
    const matchingSlot = scheduleSlots.find(
      (slot) =>
        slot.date === editingBooking.bookingDate &&
        slot.timeSlot.startsWith(editingBooking.bookingTime)
    );
    if (matchingSlot) {
      setEditingBooking((prev) =>
        prev ? { ...prev, questScheduleId: matchingSlot.id } : prev
      );
    }
  }, [editingBooking?.bookingDate, editingBooking?.bookingTime, editingBooking?.questScheduleId, scheduleSlots]);

  useEffect(() => {
    if (!editingBooking || isTotalPriceManual) {
      return;
    }
    const nextTotal = calculateTotalPrice(editingBooking, getSelectedQuestExtrasTotal());
    if (editingBooking.totalPrice !== nextTotal) {
      setEditingBooking({ ...editingBooking, totalPrice: nextTotal });
    }
  }, [editingBooking, isTotalPriceManual, selectedQuestExtraServiceIds]);

  useEffect(() => {
    if (!editingBooking?.promoCode) {
      return;
    }
    if (!editingBooking.promoDiscountType || editingBooking.promoDiscountValue <= 0) {
      return;
    }
    const nextAmount = calculateDiscountAmount(
      editingBooking,
      editingBooking.promoDiscountType,
      editingBooking.promoDiscountValue,
      getSelectedQuestExtrasTotal()
    );
    if (editingBooking.promoDiscountAmount !== nextAmount) {
      setEditingBooking({ ...editingBooking, promoDiscountAmount: nextAmount });
    }
  }, [
    editingBooking?.promoCode,
    editingBooking?.promoDiscountType,
    editingBooking?.promoDiscountValue,
    editingBooking?.questPrice,
    editingBooking?.extraParticipantPrice,
    editingBooking?.extraParticipantsCount,
    editingBooking?.extraServices,
    selectedQuestExtraServiceIds,
  ]);

  const dateFiltersEnabled = statusFilter !== 'pending';
  const sortParam = useMemo(() => serializeSorts(tableSorts), [serializeSorts, tableSorts]);

  const countFilterParams = useMemo(
    () => ({
      dateFrom: dateFiltersEnabled ? normalizeDateParam(listDateFrom) : undefined,
      dateTo: dateFiltersEnabled ? normalizeDateParam(listDateTo) : undefined,
    }),
    [listDateFrom, listDateTo, dateFiltersEnabled]
  );

  const listFilterParams = useMemo(
    () => ({
      ...countFilterParams,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      questId: questFilter !== 'all' ? questFilter : undefined,
      aggregator: aggregatorFilter !== 'all' ? aggregatorFilter : undefined,
      promoCode: promoCodeFilter !== 'all' ? promoCodeFilter : undefined,
      sort: sortParam || undefined,
    }),
    [countFilterParams, statusFilter, questFilter, aggregatorFilter, promoCodeFilter, sortParam]
  );

  const loadBookings = useCallback(
    async (showLoading = true) => {
      if (!canView) {
        setBookings([]);
        setCountBookings([]);
        return;
      }
      if (showLoading) {
        setLoading(true);
      }
      try {
        const [listData, countData] = await Promise.all([
          api.getBookings(listFilterParams),
          api.getBookings(countFilterParams),
        ]);
        setBookings(listData || []);
        setCountBookings(countData || []);
      } catch (error) {
        console.error('Error loading bookings:', error);
      }
      if (showLoading) {
        setLoading(false);
      }
    },
    [canView, listFilterParams, countFilterParams]
  );

  useEffect(() => {
    if (!canView) {
      return;
    }
    const canLoad = !dateFiltersEnabled || (listDateFrom && listDateTo);
    if (!canLoad) {
      return;
    }
    loadBookings();
  }, [canView, loadBookings, dateFiltersEnabled, listDateFrom, listDateTo]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadBookings(false);
    } finally {
      setIsRefreshing(false);
    }
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
        setDefaultQuestId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading quests:', error);
    }
  };

  const loadStandardExtraServices = async () => {
    try {
      const data = await api.getStandardExtraServices();
      setStandardExtraServices(data || []);
    } catch (error) {
      console.error('Error loading standard extra services:', error);
    }
  };

  const loadPromoCodes = async () => {
    if (!canViewPromoCodes) {
      setPromoCodes([]);
      return;
    }
    try {
      const data = await api.getPromoCodes();
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error loading promo codes:', error);
      setPromoCodes([]);
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

  const handleListDateFromChange = (value: string) => {
    setListDateFromInput(value);
  };

  const handleListDateToChange = (value: string) => {
    setListDateToInput(value);
  };

  const applyListDateFrom = () => {
    if (isCompleteDateInput(listDateFromInput)) {
      setListDateFrom(listDateFromInput);
      return;
    }
    setListDateFromInput(listDateFrom);
  };

  const applyListDateTo = () => {
    if (isCompleteDateInput(listDateToInput)) {
      setListDateTo(normalizeListEndDate(listDateToInput));
      return;
    }
    setListDateToInput(listDateTo);
  };

  const handleCreateBooking = async () => {
    if (!canEdit) {
      return;
    }
    if (!editingBooking) {
      return;
    }
    if (!editingBooking.questScheduleId) {
      setCreateResult('Выберите свободное время для брони.');
      return;
    }

    const slot = scheduleSlots.find((s) => s.id === editingBooking.questScheduleId);
    if (!slot) {
      setCreateResult('Слот не найден.');
      return;
    }

    if (!editingBooking.customerName || !editingBooking.customerPhone) {
      setCreateResult('Укажите имя и телефон клиента.');
      return;
    }

    try {
      await api.createBooking({
        questId: editingBooking.questId,
        questScheduleId: slot.id,
        customerName: editingBooking.customerName,
        customerPhone: editingBooking.customerPhone,
        customerEmail: editingBooking.customerEmail || null,
        bookingDate: slot.date,
        participantsCount: editingBooking.participantsCount,
        notes: editingBooking.notes || null,
        extraServiceIds: selectedQuestExtraServiceIds,
        extraServices: editingBooking.extraServices
          .map((service) => ({
            title: service.title.trim(),
            price: service.price,
          }))
          .filter((service) => service.title),
        paymentType: editingBooking.paymentType || undefined,
        promoCode: editingBooking.promoCode || null,
      });
      setCreateResult('Бронь создана.');
      setEditingBooking(null);
      setBookingFormMode(null);
      await loadBookings(false);
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
    if (!canDelete) {
      return;
    }
    openActionModal({
      title: 'Удалить бронь',
      message: `Удалить бронь клиента ${booking.customerName}? Это действие необратимо.`,
      confirmLabel: 'Удалить',
      tone: 'danger',
      onConfirm: async () => {
        await api.deleteBooking(booking.id);
        await loadBookings(false);
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
    if (!canConfirm) {
      return;
    }
    const statusLabel = getStatusText(status);
    openActionModal({
      title: `Изменить статус`,
      message: `Подтвердите действие: установить статус «${statusLabel}» для брони клиента ${booking.customerName}.`,
      confirmLabel: 'Подтвердить',
      onConfirm: async () => {
        await api.updateBooking(booking.id, { status, notes: booking.notes });
        await loadBookings(false);
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
    if (!canEdit) {
      return;
    }
    const quest = quests.find((item) => item.id === defaultQuestId) || quests[0];
    const today = formatDate(new Date());
    setCreateResult('');
    setIsTotalPriceManual(false);
    const initialTotal = calculateTotalPrice({
      questPrice: quest?.price ?? 0,
      extraParticipantPrice: quest?.extraParticipantPrice ?? 0,
      extraParticipantsCount: 0,
      extraServices: [],
      promoDiscountType: '',
      promoDiscountValue: 0,
      promoDiscountAmount: 0,
    });
    setBookingFormMode('create');
    setEditingBooking({
      id: 'new',
      questId: quest?.id ?? null,
      questScheduleId: null,
      aggregator: '',
      questTitle: quest?.title ?? '',
      questPrice: quest?.price ?? 0,
      extraParticipantPrice: quest?.extraParticipantPrice ?? 0,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      bookingDate: today,
      bookingTime: '',
      createdAt: new Date().toISOString(),
      participantsCount: 2,
      extraParticipantsCount: 0,
      totalPrice: initialTotal,
      paymentType: 'cash',
      promoCode: '',
      promoDiscountType: '',
      promoDiscountValue: 0,
      promoDiscountAmount: 0,
      notes: '',
      status: 'created',
      extraServices: [],
    });
    setSelectedQuestExtraServiceIds([]);
  };

  const closeBookingForm = () => {
    setEditingBooking(null);
    setBookingFormMode(null);
  };

  const handleEditBooking = (booking: Booking) => {
    if (!canEdit) {
      return;
    }
    const bookingDateParts = booking.bookingDateTime
      ? splitDateTimeLocal(booking.bookingDateTime)
      : booking.bookingTime
      ? { date: booking.bookingDate, time: booking.bookingTime }
      : { date: booking.bookingDate, time: '' };

    const calculatedTotal = calculateTotalPrice({
      questPrice: getQuestPrice(booking) ?? 0,
      extraParticipantPrice: getExtraParticipantPrice(booking) ?? 0,
      extraParticipantsCount: booking.extraParticipantsCount ?? 0,
      extraServices: booking.extraServices || [],
      promoDiscountType: normalizeDiscountType(booking.promoDiscountType || ''),
      promoDiscountValue: booking.promoDiscountValue ?? 0,
      promoDiscountAmount: booking.promoDiscountAmount ?? 0,
    });

    setCreateResult('');
    setIsTotalPriceManual(booking.totalPrice !== calculatedTotal);
    setBookingFormMode('edit');
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
      bookingDate: bookingDateParts.date,
      bookingTime: bookingDateParts.time,
      createdAt: booking.createdAt,
      participantsCount: booking.participantsCount,
      extraParticipantsCount: booking.extraParticipantsCount ?? 0,
      totalPrice: booking.totalPrice,
      paymentType:
        booking.paymentType === 'card'
          ? 'cash'
          : booking.paymentType || 'cash',
      promoCode: booking.promoCode || '',
      promoDiscountType: booking.promoDiscountType || '',
      promoDiscountValue: booking.promoDiscountValue ?? 0,
      promoDiscountAmount: booking.promoDiscountAmount ?? 0,
      notes: booking.notes || '',
      status: booking.status,
      extraServices: booking.extraServices || [],
    });
    setSelectedQuestExtraServiceIds([]);
  };

  const handleUpdateBooking = async () => {
    if (!canEdit) {
      return;
    }
    if (!editingBooking) {
      return;
    }

    if (!editingBooking.customerName || !editingBooking.customerPhone) {
      showAdminNotification({ title: 'Уведомление', message: String('Укажите имя и телефон клиента.'), tone: 'info' });
      return;
    }

    try {
      const bookingDateTimeValue = buildDateTimeValue(
        editingBooking.bookingDate,
        editingBooking.bookingTime
      );
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
        bookingDate: normalizeDateTimeForApi(bookingDateTimeValue),
        participantsCount: editingBooking.participantsCount,
        extraParticipantsCount: editingBooking.extraParticipantsCount,
        totalPrice: editingBooking.totalPrice,
        paymentType: editingBooking.paymentType || undefined,
        promoCode: editingBooking.promoCode || null,
        promoDiscountType: editingBooking.promoDiscountType || null,
        promoDiscountValue: editingBooking.promoDiscountValue,
        promoDiscountAmount: editingBooking.promoDiscountAmount,
        notes: editingBooking.notes || null,
        status: editingBooking.status,
        extraServices: editingBooking.extraServices.map((service) => ({
          ...service,
          id: normalizeExtraServiceId(service.id),
        })),
      });
      closeBookingForm();
      await loadBookings(false);
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

  const createExtraServiceId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `extra-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const addExtraService = () => {
    if (!canEdit) {
      return;
    }
    setEditingBooking((prev) =>
      prev
        ? {
            ...prev,
            extraServices: [
              ...prev.extraServices,
              { id: createExtraServiceId(), title: '', price: 0 },
            ],
          }
        : prev
    );
  };

  const toggleQuestExtraService = (serviceId: string) => {
    const mandatoryIds = getMandatoryQuestExtraServiceIds(
      editingBooking?.questId ? questLookup.get(editingBooking.questId) : null
    );
    if (mandatoryIds.includes(serviceId)) {
      return;
    }
    setSelectedQuestExtraServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const updateExtraService = (index: number, field: 'title' | 'price', value: string) => {
    if (!editingBooking) {
      return;
    }
    const service = editingBooking.extraServices[index];
    const mandatoryTitles = new Set(
      getMandatoryStandardServicesForQuest(editingBooking.questId).map((item) =>
        normalizeServiceTitle(item.title)
      )
    );
    if (mandatoryTitles.has(normalizeServiceTitle(service?.title))) {
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

  const handleApplyPromoCode = () => {
    if (!editingBooking) {
      return;
    }
    const code = editingBooking.promoCode.trim();
    if (!code) {
      setNotification({
        isOpen: true,
        title: 'Промокод не указан',
        message: 'Введите промокод и повторите попытку.',
        tone: 'info',
      });
      return;
    }
    const promo = promoCodes.find((item) => item.code.toLowerCase() === code.toLowerCase());
    if (!promo) {
      setNotification({
        isOpen: true,
        title: 'Промокод не найден',
        message: 'Проверьте правильность ввода промокода.',
        tone: 'error',
      });
      return;
    }
    const now = new Date();
    const validFrom = new Date(promo.validFrom);
    const validUntil = promo.validUntil ? new Date(promo.validUntil) : null;
    if (!promo.isActive || now < validFrom || (validUntil && now > validUntil)) {
      setNotification({
        isOpen: true,
        title: 'Промокод недействителен',
        message: 'Этот промокод не активен или срок его действия истёк.',
        tone: 'error',
      });
      return;
    }
    const normalizedType = normalizeDiscountType(promo.discountType);
    const discountAmount = calculateDiscountAmount(
      editingBooking,
      normalizedType,
      promo.discountValue,
      getSelectedQuestExtrasTotal()
    );
    const isPercent = normalizedType === 'percent';
    setEditingBooking({
      ...editingBooking,
      promoDiscountType: normalizedType,
      promoDiscountValue: promo.discountValue,
      promoDiscountAmount: discountAmount,
    });
    setNotification({
      isOpen: true,
      title: 'Промокод применён',
      message: `Скидка ${promo.discountValue}${isPercent ? '%' : ' ₽'} учтена.`,
      tone: 'success',
    });
  };

  const removeExtraService = (index: number) => {
    if (!canEdit) {
      return;
    }
    if (!editingBooking) {
      return;
    }
    const service = editingBooking.extraServices[index];
    const mandatoryTitles = new Set(
      getMandatoryStandardServicesForQuest(editingBooking.questId).map((item) =>
        normalizeServiceTitle(item.title)
      )
    );
    if (mandatoryTitles.has(normalizeServiceTitle(service?.title))) {
      return;
    }
    openActionModal({
      title: 'Удалить услугу',
      message: `Удалить дополнительную услугу${service?.title ? ` «${service.title}»` : ''}?`,
      confirmLabel: 'Удалить',
      tone: 'danger',
      onConfirm: () => {
        setEditingBooking((prev) =>
          prev
            ? {
                ...prev,
                extraServices: prev.extraServices.filter((_, i) => i !== index),
              }
            : prev
        );
      },
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

  const getRowStyle = (status: Booking['status']) => {
    const color = getStatusColorValue(status);
    return {
      backgroundColor: hexToRgba(color, 0.18),
      boxShadow: `inset 4px 0 0 ${hexToRgba(color, 0.7)}`,
    };
  };

  const getCardStyle = (status: Booking['status']) => {
    const color = getStatusColorValue(status);
    return {
      backgroundColor: hexToRgba(color, 0.08),
      borderColor: hexToRgba(color, 0.2),
    };
  };

  const questLookup = useMemo(() => {
    return new Map(quests.map((quest) => [quest.id, quest]));
  }, [quests]);

  const getMandatoryStandardServicesForQuest = useCallback(
    (questId?: string | null) => {
      if (!questId) {
        return [];
      }
      const quest = questLookup.get(questId);
      if (!quest?.parentQuestId) {
        return [];
      }
      return standardExtraServices.filter((service) => service.mandatoryForChildQuests);
    },
    [questLookup, standardExtraServices]
  );

  const getMandatoryQuestExtraServiceIds = (quest?: Quest | null) => {
    if (!quest?.parentQuestId || mandatoryChildServiceTitles.size === 0) {
      return [];
    }
    return (quest.extraServices || [])
      .filter((service) => mandatoryChildServiceTitles.has(normalizeServiceTitle(service.title)))
      .map((service) => service.id);
  };

  const statusCounts = useMemo(() => {
    const source =
      questFilter === 'all'
        ? countBookings
        : countBookings.filter((booking) => booking.questId === questFilter);
    return source.reduce(
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
  }, [countBookings, questFilter]);

  const questCounts = useMemo(() => {
    const source =
      statusFilter === 'all'
        ? countBookings
        : countBookings.filter((booking) => booking.status === statusFilter);
    const counts: Record<string, number> = { all: source.length };
    source.forEach((booking) => {
      if (booking.questId) {
        counts[booking.questId] = (counts[booking.questId] || 0) + 1;
      }
    });
    return counts;
  }, [countBookings, statusFilter]);

  const aggregatorOptions = useMemo(() => {
    const values = new Set<string>();
    countBookings.forEach((booking) => {
      if (booking.aggregator) {
        values.add(booking.aggregator);
      }
    });
    return Array.from(values);
  }, [countBookings]);

  const promoCodeOptions = useMemo(() => {
    const values = new Set<string>();
    countBookings.forEach((booking) => {
      if (booking.promoCode) {
        values.add(booking.promoCode);
      }
    });
    return Array.from(values);
  }, [countBookings]);

  const columnFilterDefinitions = useMemo<BookingColumnFilterDefinition[]>(() => {
    return [
      {
        key: 'status',
        label: 'Статус',
        kind: 'multi',
        options: [
          { value: 'planned', label: 'Запланировано' },
          { value: 'created', label: 'Создано' },
          { value: 'pending', label: 'Ожидает' },
          { value: 'not_confirmed', label: 'Не подтверждено' },
          { value: 'confirmed', label: 'Подтверждено' },
          { value: 'completed', label: 'Завершено' },
          { value: 'cancelled', label: 'Отменено' },
        ],
      },
      {
        key: 'quest',
        label: 'Квест',
        kind: 'multi',
        options: quests.map((quest) => ({ value: quest.id, label: quest.title })),
      },
      {
        key: 'aggregator',
        label: 'Агрегатор',
        kind: 'multi',
        options: [
          { value: 'site', label: 'Наш сайт' },
          ...aggregatorOptions.map((value) => ({ value, label: value })),
        ],
      },
      {
        key: 'promoCode',
        label: 'Промокод',
        kind: 'multi',
        options: [
          { value: 'none', label: 'Без промокода' },
          ...promoCodeOptions.map((value) => ({ value, label: value })),
        ],
      },
      { key: 'customerName', label: 'Имя клиента', kind: 'text' },
      { key: 'customerPhone', label: 'Телефон клиента', kind: 'text' },
      { key: 'customerEmail', label: 'Email клиента', kind: 'text' },
      { key: 'bookingDate', label: 'Дата брони', kind: 'text' },
      { key: 'createdAt', label: 'Дата создания', kind: 'text' },
      { key: 'totalPrice', label: 'Итоговая сумма', kind: 'text' },
      { key: 'notes', label: 'Комментарий', kind: 'text' },
    ];
  }, [quests, aggregatorOptions, promoCodeOptions]);

  const columnFilterDefinitionMap = useMemo(() => {
    return new Map(columnFilterDefinitions.map((item) => [item.key, item]));
  }, [columnFilterDefinitions]);

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleString('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const formatBookingDateTime = (booking: Booking) => {
    if (booking.bookingDateTime) {
      return formatDateTime(booking.bookingDateTime);
    }
    if (booking.bookingTime) {
      return formatDateTime(`${booking.bookingDate}T${booking.bookingTime}`);
    }
    if (booking.bookingDate) {
      return new Date(`${booking.bookingDate}T00:00:00`).toLocaleDateString('ru-RU');
    }
    return '—';
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

  const splitDateTimeLocal = (value?: string | null) => {
    if (!value) {
      return { date: '', time: '' };
    }
    const local = formatDateTimeLocal(value);
    const [date, time] = local.split('T');
    return { date: date || '', time: time || '' };
  };

  const buildDateTimeValue = (date: string, time: string) => {
    if (!date) {
      return '';
    }
    if (!time) {
      return date;
    }
    return `${date}T${time}`;
  };

  const normalizeDateTimeForApi = (value: string) => {
    if (!value) {
      return value;
    }
    return value;
  };

  const normalizeDiscountType = (value: string) => {
    const normalized = value.toLowerCase();
    if (!normalized) {
      return '';
    }
    if (normalized.includes('percent') || normalized.includes('%')) {
      return 'percent';
    }
    return 'amount';
  };

  const normalizeExtraServiceId = (value: string) => {
    const isGuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    return isGuid ? value : '00000000-0000-0000-0000-000000000000';
  };

  const parseSearchQuery = useCallback((value: string): ParsedSearchQuery => {
    const operators: ParsedSearchQuery['operators'] = {
      status: [],
      quest: [],
      aggregator: [],
      promo: [],
      phone: [],
      email: [],
      name: [],
      id: [],
      date: [],
      created: [],
      total: [],
      notes: [],
    };
    const freeTerms: string[] = [];
    if (!value.trim()) {
      return { freeTerms, operators };
    }
    const tokens = value.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    tokens.forEach((token) => {
      const trimmed = token.trim();
      if (!trimmed) {
        return;
      }
      const match = trimmed.match(/^([a-zA-Z]+):(.+)$/);
      if (match) {
        const key = match[1].toLowerCase();
        const rawValue = match[2].replace(/^"|"$/g, '');
        const normalized = rawValue.trim();
        if (!normalized) {
          return;
        }
        const pushValue = (operator: SearchOperatorKey) => {
          operators[operator].push(normalized);
        };
        switch (key) {
          case 'status':
            pushValue('status');
            return;
          case 'quest':
            pushValue('quest');
            return;
          case 'aggregator':
          case 'agg':
            pushValue('aggregator');
            return;
          case 'promo':
          case 'promocode':
            pushValue('promo');
            return;
          case 'phone':
          case 'tel':
            pushValue('phone');
            return;
          case 'email':
            pushValue('email');
            return;
          case 'name':
          case 'customer':
            pushValue('name');
            return;
          case 'id':
            pushValue('id');
            return;
          case 'date':
            pushValue('date');
            return;
          case 'created':
            pushValue('created');
            return;
          case 'total':
          case 'price':
            pushValue('total');
            return;
          case 'notes':
          case 'comment':
            pushValue('notes');
            return;
          default:
            break;
        }
      }
      freeTerms.push(trimmed.replace(/^"|"$/g, ''));
    });

    return { freeTerms, operators };
  }, []);

  const fuzzyMatch = (term: string, text: string) => {
    const normalizedTerm = term.toLowerCase();
    const normalizedText = text.toLowerCase();
    if (!normalizedTerm || !normalizedText) {
      return false;
    }
    if (normalizedText.includes(normalizedTerm)) {
      return true;
    }
    const maxDistance =
      normalizedTerm.length <= 4 ? 1 : normalizedTerm.length <= 7 ? 2 : 3;
    const computeDistance = (a: string, b: string) => {
      const aLen = a.length;
      const bLen = b.length;
      const dp = Array.from({ length: aLen + 1 }, () => new Array(bLen + 1).fill(0));
      for (let i = 0; i <= aLen; i += 1) dp[i][0] = i;
      for (let j = 0; j <= bLen; j += 1) dp[0][j] = j;
      for (let i = 1; i <= aLen; i += 1) {
        for (let j = 1; j <= bLen; j += 1) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
        }
      }
      return dp[aLen][bLen];
    };
    if (normalizedText.length <= 40) {
      return computeDistance(normalizedTerm, normalizedText) <= maxDistance;
    }
    const words = normalizedText.split(/\s+/);
    return words.some((word) => computeDistance(normalizedTerm, word) <= maxDistance);
  };

  const highlightText = (value: string, terms: string[]) => {
    if (!value || !terms.length) {
      return value || '—';
    }
    const filteredTerms = terms.filter((term) => term);
    if (!filteredTerms.length) {
      return value;
    }
    const regex = new RegExp(`(${filteredTerms.map(escapeRegExp).join('|')})`, 'gi');
    const parts = value.split(regex);
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-0.5">
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  };

  const calculateDiscountAmount = (
    booking: {
      questPrice: number;
      extraParticipantPrice: number;
      extraParticipantsCount: number;
      extraServices: Booking['extraServices'];
    },
    discountType: string,
    discountValue: number,
    extraServicesTotal = 0
  ) => {
    if (!discountValue || discountValue <= 0) {
      return 0;
    }
    const extrasTotal =
      (booking.extraServices?.reduce((sum, service) => sum + service.price, 0) ?? 0) +
      extraServicesTotal;
    const participantsTotal = booking.extraParticipantPrice * (booking.extraParticipantsCount ?? 0);
    const baseTotal = (booking.questPrice ?? 0) + participantsTotal + extrasTotal;
    const normalizedType = discountType.toLowerCase();
    const isPercent =
      normalizedType === 'percent' ||
      normalizedType.includes('percent') ||
      normalizedType.includes('%');
    return Math.round(isPercent ? (baseTotal * discountValue) / 100 : discountValue);
  };

  const calculateTotalPrice = (booking: {
    questPrice: number;
    extraParticipantPrice: number;
    extraParticipantsCount: number;
    extraServices: Booking['extraServices'];
    promoDiscountType: string;
    promoDiscountValue: number;
    promoDiscountAmount: number;
  }, extraServicesTotal = 0) => {
    const extrasTotal =
      (booking.extraServices?.reduce((sum, service) => sum + service.price, 0) ?? 0) +
      extraServicesTotal;
    const participantsTotal = booking.extraParticipantPrice * (booking.extraParticipantsCount ?? 0);
    const baseTotal = (booking.questPrice ?? 0) + participantsTotal + extrasTotal;
    const discountAmount =
      booking.promoDiscountAmount && booking.promoDiscountAmount > 0
        ? booking.promoDiscountAmount
        : calculateDiscountAmount(
            booking,
            booking.promoDiscountType,
            booking.promoDiscountValue,
            extraServicesTotal
          );
    return Math.max(0, Math.round(baseTotal - discountAmount));
  };

  const getSelectedQuestExtrasTotal = () => {
    if (bookingFormMode !== 'create' || !editingBooking?.questId) {
      return 0;
    }
    const quest = questLookup.get(editingBooking.questId);
    if (!quest?.extraServices?.length) {
      return 0;
    }
    return quest.extraServices
      .filter((service) => selectedQuestExtraServiceIds.includes(service.id))
      .reduce((sum, service) => sum + service.price, 0);
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

  const getQuestStandardPriceParticipantsMax = (booking: { questId: string | null }) => {
    if (!booking.questId) {
      return null;
    }
    const quest = questLookup.get(booking.questId);
    if (!quest) {
      return null;
    }
    return quest.standardPriceParticipantsMax || 4;
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

  const availableSlots = useMemo(() => {
    if (!editingBooking?.bookingDate) {
      return [];
    }
    return scheduleSlots.filter(
      (slot) =>
        slot.date === editingBooking.bookingDate &&
        (!slot.isBooked || slot.id === editingBooking.questScheduleId)
    );
  }, [editingBooking?.bookingDate, editingBooking?.questScheduleId, scheduleSlots]);

  const selectedSlot = useMemo(
    () =>
      editingBooking?.questScheduleId
        ? scheduleSlots.find((slot) => slot.id === editingBooking.questScheduleId) || null
        : null,
    [editingBooking?.questScheduleId, scheduleSlots]
  );

  const totalTableWidth = useMemo(
    () => visibleTableColumns.reduce((sum, column) => sum + column.width, 0),
    [visibleTableColumns]
  );

  const editingQuestStandardPriceParticipantsMax = useMemo(() => {
    if (!editingBooking) {
      return null;
    }
    return getQuestStandardPriceParticipantsMax(editingBooking);
  }, [editingBooking, questLookup]);

  const autoExtraParticipants = useMemo(() => {
    if (!editingBooking || editingQuestStandardPriceParticipantsMax == null) {
      return 0;
    }
    return Math.max(0, editingBooking.participantsCount - editingQuestStandardPriceParticipantsMax);
  }, [editingBooking?.participantsCount, editingQuestStandardPriceParticipantsMax]);

  const availableQuestExtras = useMemo(() => {
    if (bookingFormMode !== 'create' || !editingBooking?.questId) {
      return [];
    }
    return questLookup.get(editingBooking.questId)?.extraServices ?? [];
  }, [bookingFormMode, editingBooking?.questId, questLookup]);

  const mandatoryQuestExtraServiceIds = useMemo(() => {
    if (bookingFormMode !== 'create' || !editingBooking?.questId) {
      return [];
    }
    const quest = questLookup.get(editingBooking.questId);
    return getMandatoryQuestExtraServiceIds(quest);
  }, [bookingFormMode, editingBooking?.questId, questLookup, mandatoryChildServiceTitles]);

  const selectedQuestExtrasTotal = useMemo(
    () => getSelectedQuestExtrasTotal(),
    [bookingFormMode, editingBooking?.questId, questLookup, selectedQuestExtraServiceIds]
  );

  const mandatoryBookingExtraServiceTitles = useMemo(
    () =>
      new Set(
        getMandatoryStandardServicesForQuest(editingBooking?.questId).map((service) =>
          normalizeServiceTitle(service.title)
        )
      ),
    [editingBooking?.questId, getMandatoryStandardServicesForQuest]
  );

  useEffect(() => {
    if (!mandatoryQuestExtraServiceIds.length) {
      return;
    }
    setSelectedQuestExtraServiceIds((prev) => {
      const next = new Set(prev);
      mandatoryQuestExtraServiceIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  }, [mandatoryQuestExtraServiceIds]);

  useEffect(() => {
    if (!editingBooking?.questId) {
      return;
    }
    const mandatoryServices = getMandatoryStandardServicesForQuest(editingBooking.questId);
    if (!mandatoryServices.length) {
      return;
    }
    setEditingBooking((prev) => {
      if (!prev || prev.questId !== editingBooking.questId) {
        return prev;
      }

      const existingTitles = new Set(
        prev.extraServices.map((service) => normalizeServiceTitle(service.title))
      );
      const missingMandatoryServices = mandatoryServices.filter(
        (service) => !existingTitles.has(normalizeServiceTitle(service.title))
      );

      if (!missingMandatoryServices.length) {
        return prev;
      }

      return {
        ...prev,
        extraServices: [
          ...prev.extraServices,
          ...missingMandatoryServices.map((service) => ({
            id: createExtraServiceId(),
            title: service.title,
            price: service.price,
          })),
        ],
      };
    });
  }, [editingBooking?.questId, getMandatoryStandardServicesForQuest]);

  const addColumnFilter = () => {
    hasUserEditedPreferences.current = true;
    const defaultKey = columnFilterDefinitions[0]?.key ?? 'status';
    setColumnFilters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), key: defaultKey, value: '', values: [] },
    ]);
  };

  const updateColumnFilter = (id: string, updates: Partial<BookingTableFilter>) => {
    hasUserEditedPreferences.current = true;
    setColumnFilters((prev) => prev.map((filter) => (filter.id === id ? { ...filter, ...updates } : filter)));
  };

  const removeColumnFilter = (id: string) => {
    hasUserEditedPreferences.current = true;
    setColumnFilters((prev) => prev.filter((filter) => filter.id !== id));
  };

  const clearColumnFilters = () => {
    hasUserEditedPreferences.current = true;
    setColumnFilters([]);
  };

  const sortableColumnKeys = useMemo(
    () =>
      new Set<BookingTableColumnKey>([
        'status',
        'bookingDate',
        'createdAt',
        'quest',
        'questPrice',
        'participants',
        'extraParticipants',
        'extraParticipantPrice',
        'extraServicesPrice',
        'aggregator',
        'promoCode',
        'totalPrice',
        'customer',
        'notes',
      ]),
    []
  );

  const handleSortToggle = useCallback(
    (key: BookingTableColumnKey, multi: boolean) => {
      if (!sortableColumnKeys.has(key)) {
        return;
      }
      hasUserEditedPreferences.current = true;
      setTableSorts((prev) => {
        const existingIndex = prev.findIndex((sort) => sort.key === key);
        if (!multi) {
          if (existingIndex === -1) {
            return [{ key, direction: 'asc' }];
          }
          const existing = prev[existingIndex];
          if (existing.direction === 'asc') {
            return [{ key, direction: 'desc' }];
          }
          return [];
        }
        if (existingIndex === -1) {
          return [...prev, { key, direction: 'asc' }];
        }
        const existing = prev[existingIndex];
        if (existing.direction === 'asc') {
          const next = [...prev];
          next[existingIndex] = { ...existing, direction: 'desc' };
          return next;
        }
        const next = [...prev];
        next.splice(existingIndex, 1);
        return next;
      });
    },
    [sortableColumnKeys]
  );

  const parsedSearch = useMemo(() => parseSearchQuery(searchQuery), [parseSearchQuery, searchQuery]);
  const highlightTerms = useMemo(() => {
    const values = new Set<string>();
    parsedSearch.freeTerms.forEach((term) => values.add(term));
    Object.values(parsedSearch.operators).forEach((operatorValues) => {
      operatorValues.forEach((term) => values.add(term));
    });
    return Array.from(values).filter(Boolean);
  }, [parsedSearch]);
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const questTitle = getQuestTitle(booking);
      const statusLabel = getStatusText(booking.status);
      const aggregatorValue = booking.aggregator || 'site';

      const getOperatorText = (key: SearchOperatorKey) => {
        switch (key) {
          case 'status':
            return [booking.status, statusLabel];
          case 'quest':
            return [booking.questId ?? '', questTitle];
          case 'aggregator':
            return [aggregatorValue];
          case 'promo':
            return [booking.promoCode || 'none'];
          case 'phone':
            return [booking.customerPhone];
          case 'email':
            return [booking.customerEmail || ''];
          case 'name':
            return [booking.customerName];
          case 'id':
            return [booking.id];
          case 'date':
            return [formatBookingDateTime(booking)];
          case 'created':
            return [formatDateTime(booking.createdAt)];
          case 'total':
            return [String(booking.totalPrice ?? '')];
          case 'notes':
            return [booking.notes || ''];
          default:
            return [''];
        }
      };

      const checkOperator = (key: SearchOperatorKey, values: string[]) => {
        if (!values.length) {
          return true;
        }
        const candidates = getOperatorText(key)
          .filter(Boolean)
          .map((text) => text.toLowerCase());
        return values.every((value) =>
          candidates.some((candidate) => candidate.includes(value.toLowerCase()))
        );
      };

      const operatorMatches = (Object.keys(parsedSearch.operators) as SearchOperatorKey[]).every(
        (key) => checkOperator(key, parsedSearch.operators[key])
      );
      if (!operatorMatches) {
        return false;
      }

      if (parsedSearch.freeTerms.length) {
        const searchableFields = [
          booking.id,
          booking.customerName,
          booking.customerPhone,
          booking.customerEmail,
          booking.promoCode,
          booking.aggregator,
          booking.notes,
          questTitle,
          statusLabel,
          formatBookingDateTime(booking),
          formatDateTime(booking.createdAt),
          String(booking.totalPrice ?? ''),
        ].filter(Boolean) as string[];

        const matchesTerm = (term: string) => {
          const normalizedTerm = term.toLowerCase();
          return searchableFields.some((field) => field.toLowerCase().includes(normalizedTerm));
        };

        const matchesFuzzy = (term: string) =>
          fuzzyMatch(term, booking.customerName) || fuzzyMatch(term, booking.customerPhone);

        const matchesAllTerms = parsedSearch.freeTerms.every(
          (term) => matchesTerm(term) || matchesFuzzy(term)
        );
        if (!matchesAllTerms) {
          return false;
        }
      }

      for (const filter of activeColumnFilters) {
        const definition = columnFilterDefinitionMap.get(filter.key as BookingColumnFilterKey);
        if (!definition) {
          continue;
        }
        if (definition.kind === 'multi') {
          const selectedValues = filter.values ?? [];
          if (!selectedValues.length) {
            continue;
          }
          let bookingValue = '';
          switch (filter.key) {
            case 'status':
              bookingValue = booking.status;
              break;
            case 'quest':
              bookingValue = booking.questId ?? '';
              break;
            case 'aggregator':
              bookingValue = booking.aggregator || 'site';
              break;
            case 'promoCode':
              bookingValue = booking.promoCode || 'none';
              break;
            default:
              bookingValue = '';
          }
          if (!selectedValues.includes(bookingValue)) {
            return false;
          }
          continue;
        }
        const rawValue = filter.value?.trim().toLowerCase() ?? '';
        if (!rawValue) {
          continue;
        }
        let bookingText = '';
        switch (filter.key) {
          case 'customerName':
            bookingText = booking.customerName;
            break;
          case 'customerPhone':
            bookingText = booking.customerPhone;
            break;
          case 'customerEmail':
            bookingText = booking.customerEmail || '';
            break;
          case 'bookingDate':
            bookingText = formatBookingDateTime(booking);
            break;
          case 'createdAt':
            bookingText = formatDateTime(booking.createdAt);
            break;
          case 'totalPrice':
            bookingText = String(booking.totalPrice ?? '');
            break;
          case 'notes':
            bookingText = booking.notes || '';
            break;
          default:
            bookingText = '';
        }
        if (!bookingText.toLowerCase().includes(rawValue)) {
          return false;
        }
      }
      return true;
    });
  }, [
    bookings,
    parsedSearch,
    activeColumnFilters,
    columnFilterDefinitionMap,
    formatBookingDateTime,
    formatDateTime,
    getQuestTitle,
    getStatusText,
    fuzzyMatch,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / listItemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safePage - 1) * listItemsPerPage,
    safePage * listItemsPerPage
  );
  const paginationItems = useMemo<(number | 'ellipsis')[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages];
  }, [safePage, totalPages]);

  useEffect(() => {
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [safePage, currentPage]);

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  const renderActionButtons = (booking: Booking) => (
    <>
      <button
        onClick={() => handleEditBooking(booking)}
        disabled={!canEdit}
        className={`p-2 rounded-lg transition-colors ${
          canEdit
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'cursor-not-allowed bg-blue-50 text-blue-200'
        }`}
        title="Редактировать"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleDeleteBooking(booking)}
        disabled={!canDelete}
        className={`p-2 rounded-lg transition-colors ${
          canDelete
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'cursor-not-allowed bg-red-50 text-red-200'
        }`}
        title="Удалить"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {(booking.status === 'pending' || booking.status === 'not_confirmed') && (
        <button
          onClick={() => updateStatus(booking, 'confirmed')}
          disabled={!canConfirm}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
            canConfirm
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'cursor-not-allowed bg-green-200 text-white/80'
          }`}
        >
          Подтвердить
        </button>
      )}
      {(booking.status === 'pending' ||
        booking.status === 'confirmed' ||
        booking.status === 'not_confirmed') && (
        <button
          onClick={() => updateStatus(booking, 'cancelled')}
          disabled={!canConfirm}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
            canConfirm
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'cursor-not-allowed bg-red-200 text-white/80'
          }`}
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
            {highlightText(getStatusText(booking.status), highlightTerms)}
          </span>
        );
      case 'bookingDate':
        return <span>{highlightText(formatBookingDateTime(booking), highlightTerms)}</span>;
      case 'createdAt':
        return <span>{highlightText(formatDateTime(booking.createdAt), highlightTerms)}</span>;
      case 'quest':
        return <span>{highlightText(getQuestTitle(booking), highlightTerms)}</span>;
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
        return <span>{highlightText(getAggregatorLabel(booking), highlightTerms)}</span>;
      case 'promoCode':
        return booking.promoCode ? (
          <div>
            <div className="font-semibold">
              {highlightText(booking.promoCode, highlightTerms)}
            </div>
            {booking.promoDiscountAmount != null && (
              <div className="text-xs text-gray-500">−{booking.promoDiscountAmount} ₽</div>
            )}
          </div>
        ) : (
          '—'
        );
      case 'totalPrice':
        return <span>{highlightText(`${booking.totalPrice} ₽`, highlightTerms)}</span>;
      case 'customer':
        return (
          <div>
            <div className="font-semibold text-gray-900">
              {highlightText(booking.customerName, highlightTerms)}
            </div>
            <div>
              <a href={`tel:${booking.customerPhone}`} className="hover:text-red-600">
                {highlightText(booking.customerPhone, highlightTerms)}
              </a>
            </div>
            {booking.customerEmail && (
              <div>
                <a href={`mailto:${booking.customerEmail}`} className="hover:text-red-600">
                  {highlightText(booking.customerEmail, highlightTerms)}
                </a>
              </div>
            )}
          </div>
        );
      case 'notes':
        return (
          <p className="line-clamp-2">
            {highlightText(booking.notes || '—', highlightTerms)}
          </p>
        );
      case 'actions':
        return <div className="flex justify-end gap-2">{renderActionButtons(booking)}</div>;
      default:
        return null;
    }
  };

  if (!canView) {
    return <AccessDenied />;
  }

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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <button
            onClick={openCreateModal}
            disabled={!canEdit}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              canEdit
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'cursor-not-allowed bg-red-200 text-white/80'
            }`}
          >
            <Plus className="w-4 h-4" />
            Создать бронь
          </button>
        </div>
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
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  value={listDateFromInput}
                  onChange={(e) => handleListDateFromChange(e.target.value)}
                  onBlur={applyListDateFrom}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
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
                  value={listDateToInput}
                  onChange={(e) => handleListDateToChange(e.target.value)}
                  onBlur={applyListDateTo}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                  disabled={statusFilter === 'pending'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Поиск
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    hasUserEditedPreferences.current = true;
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Имя, телефон, квест, статус... или status:confirmed"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Операторы: status:, quest:"Название", phone:, email:, promo:, id:.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Показано: <span className="font-semibold">{filteredBookings.length}</span>
              </div>
              <button
                onClick={() => {
                  hasUserEditedPreferences.current = true;
                  setStatusFilter('all');
                  setQuestFilter('all');
                  setAggregatorFilter('all');
                  setPromoCodeFilter('all');
                  setSearchQuery('');
                  clearColumnFilters();
                }}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
            {showCustomFilters && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Пользовательские фильтры
                    </p>
                    <p className="text-xs text-gray-500">
                      Можно выбрать несколько значений в списке, удерживая Ctrl/⌘.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addColumnFilter}
                    className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    Добавить фильтр
                  </button>
                </div>
                {columnFilters.length === 0 ? (
                  <p className="text-xs text-gray-500 mt-3">
                    Добавьте фильтры по нужным колонкам — они сохранятся в профиле.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {columnFilters.map((filter) => {
                      const definition = columnFilterDefinitionMap.get(
                        filter.key as BookingColumnFilterKey
                      );
                      return (
                        <div
                          key={filter.id}
                          className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto] items-start"
                        >
                          <select
                            value={filter.key}
                            onChange={(e) => {
                              const nextKey = e.target.value as BookingColumnFilterKey;
                              updateColumnFilter(filter.id, {
                                key: nextKey,
                                value: '',
                                values: [],
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          >
                            {columnFilterDefinitions.map((item) => (
                              <option key={item.key} value={item.key}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          {definition?.kind === 'multi' ? (
                            <select
                              multiple
                              value={filter.values ?? []}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions).map(
                                  (option) => option.value
                                );
                                updateColumnFilter(filter.id, { values: selected });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none min-h-[42px]"
                            >
                              {definition.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={filter.value ?? ''}
                              onChange={(e) =>
                                updateColumnFilter(filter.id, { value: e.target.value })
                              }
                              placeholder="Содержит..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeColumnFilter(filter.id)}
                            className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                          >
                            Удалить
                          </button>
                        </div>
                      );
                    })}
                    <div>
                      <button
                        type="button"
                        onClick={clearColumnFilters}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Сбросить пользовательские фильтры
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {statusFilter === 'pending' && (
              <p className="text-xs text-gray-500 mt-3">
                Для ожидающих броней период не применяется — показываются все записи.
              </p>
            )}
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white rounded-lg shadow w-full max-w-full overflow-x-auto">
              <table
                className="text-sm table-fixed min-w-max"
                style={{
                  width: totalTableWidth ? `${totalTableWidth}px` : '100%',
                  minWidth: '100%',
                }}
              >
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    {visibleTableColumns.map((column) => {
                      const sortIndex = tableSorts.findIndex((sort) => sort.key === column.key);
                      const sort = sortIndex >= 0 ? tableSorts[sortIndex] : null;
                      const isSortable = sortableColumnKeys.has(column.key);
                      return (
                        <th
                          key={column.key}
                          className={`group relative px-4 py-3 font-semibold ${
                            column.key === 'actions' ? 'text-right' : 'text-left'
                          } ${column.locked ? 'cursor-default' : 'cursor-move'}`}
                          style={{ width: column.width }}
                          draggable={!column.locked}
                          onDragStart={handleColumnDragStart(column.key, column.locked)}
                          onDragOver={handleColumnDragOver(column.key, column.locked)}
                          onDrop={handleColumnDrop(column.key, column.locked)}
                          onDragEnd={handleColumnDragEnd}
                        >
                          <div className="flex items-center gap-2">
                            {!column.locked && <GripVertical className="h-4 w-4 text-gray-400" />}
                            <span>{column.label}</span>
                            {isSortable && (
                              <button
                                type="button"
                                aria-label={`Сортировать по колонке ${column.label}`}
                                title="Сортировка"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSortToggle(column.key, event.ctrlKey || event.metaKey);
                                }}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                              >
                                {sort ? (
                                  sort.direction === 'asc' ? (
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-3.5 w-3.5" />
                                )}
                                {sort && tableSorts.length > 1 && (
                                  <span className="text-[10px] text-gray-500">
                                    {sortIndex + 1}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label={`Изменить ширину колонки ${column.label}`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setResizeState({
                                key: column.key,
                                startX: event.clientX,
                                startWidth: column.width,
                              });
                            }}
                            className="absolute right-0 top-0 h-full w-2 cursor-col-resize opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </th>
                      );
                    })}
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
                <div
                  key={booking.id}
                  className="rounded-lg shadow p-4 border border-transparent"
                  style={getCardStyle(booking.status)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold border"
                          style={getStatusBadgeStyle(booking.status)}
                        >
                          {highlightText(getStatusText(booking.status), highlightTerms)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ID: {booking.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {highlightText(getQuestTitle(booking), highlightTerms)}
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
                      <span>{highlightText(booking.customerName, highlightTerms)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Телефон:</span>
                      <a href={`tel:${booking.customerPhone}`} className="hover:text-red-600">
                        {highlightText(booking.customerPhone, highlightTerms)}
                      </a>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Дата:</span>
                      <span>{highlightText(formatBookingDateTime(booking), highlightTerms)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Создано:</span>
                      <span>{highlightText(formatDateTime(booking.createdAt), highlightTerms)}</span>
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
                      <span>{highlightText(`${booking.totalPrice} ₽`, highlightTerms)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="font-semibold">Агрегатор:</span>
                      <span>{highlightText(getAggregatorLabel(booking), highlightTerms)}</span>
                    </div>
                    {booking.promoCode && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="font-semibold">Промокод:</span>
                        <span>{highlightText(booking.promoCode, highlightTerms)}</span>
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
                        {highlightText(booking.customerEmail, highlightTerms)}
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
                        <p className="text-xs mt-1">
                          {highlightText(booking.notes || '—', highlightTerms)}
                        </p>
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
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span>
                  Страница {safePage} из {totalPages}
                </span>
                <label className="flex items-center gap-2">
                  <span>Показывать по</span>
                  <select
                    value={listItemsPerPage}
                    onChange={(e) =>
                      setListItemsPerPage(Number(e.target.value) || defaultBookingPageSize)
                    }
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {bookingPageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Назад
                </button>
                {paginationItems.map((page, index) =>
                  page === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-3 py-2 text-sm font-semibold text-gray-500"
                    >
                      …
                    </span>
                  ) : (
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
                  )
                )}
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

      {editingBooking && bookingFormMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                  {bookingFormMode === 'create' ? 'Создать бронь' : 'Редактирование брони'}
                  <span
                    className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-white"
                    style={getStatusBadgeStyle(
                      bookingFormMode === 'create' ? 'created' : editingBooking.status
                    )}
                  >
                    {bookingFormMode === 'create'
                      ? 'Новая бронь'
                      : getStatusText(editingBooking.status)}
                  </span>
                </h3>
                {bookingFormMode === 'create' ? (
                  <p className="text-xs text-gray-500">Заполните данные и выберите время</p>
                ) : (
                  <p className="text-xs text-gray-500">ID: {editingBooking.id.slice(0, 8)}</p>
                )}
              </div>
              <button
                onClick={closeBookingForm}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto bg-gray-50/40">
              <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Квест
                    </label>
                    <select
                      value={editingBooking.questId || ''}
                      onChange={(e) => {
                        const questId = e.target.value || null;
                        const quest = quests.find((item) => item.id === questId);
                        const questMax =
                          quest != null
                            ? quest.standardPriceParticipantsMax || 4
                            : null;
                        const nextExtraParticipants =
                          questMax != null
                            ? Math.max(0, editingBooking.participantsCount - questMax)
                            : editingBooking.extraParticipantsCount;
                        const nextParticipantsCount =
                          questMax != null
                            ? Math.max(questMax, editingBooking.participantsCount)
                            : editingBooking.participantsCount;
                        setEditingBooking({
                          ...editingBooking,
                          questId,
                          questTitle: quest?.title ?? '',
                          questPrice: quest?.price ?? 0,
                          extraParticipantPrice: quest?.extraParticipantPrice ?? 0,
                          extraParticipantsCount: nextExtraParticipants,
                          participantsCount: nextParticipantsCount,
                          questScheduleId: null,
                          bookingTime: '',
                        });
                        setSelectedQuestExtraServiceIds([]);
                      }}
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
                      Дата создания
                    </label>
                    <input
                      type="text"
                      value={formatDateTime(editingBooking.createdAt)}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Дата брони
                    </label>
                    <input
                      type="date"
                      value={editingBooking.bookingDate}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          bookingDate: e.target.value,
                          questScheduleId: null,
                          bookingTime: '',
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Время брони
                    </label>
                    <select
                      value={editingBooking.questScheduleId || ''}
                      onChange={(e) => {
                        const slotId = e.target.value || null;
                        const slot = scheduleSlots.find((item) => item.id === slotId) || null;
                        setEditingBooking({
                          ...editingBooking,
                          questScheduleId: slotId,
                          bookingTime: slot ? slot.timeSlot.slice(0, 5) : '',
                          questPrice: slot ? slot.price : 0,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      disabled={!editingBooking.bookingDate}
                    >
                      <option value="">
                        {editingBooking.bookingDate
                          ? availableSlots.length
                            ? 'Выберите время'
                            : 'Нет свободного времени'
                          : 'Сначала выберите дату'}
                      </option>
                      {availableSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.timeSlot.slice(0, 5)} · {slot.price} ₽
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedSlot ? `Цена слота: ${selectedSlot.price} ₽` : 'Выберите время'}
                    </p>
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
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Количество участников
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingBooking.participantsCount}
                      onChange={(e) => {
                        const nextParticipants = parseInt(e.target.value) || 1;
                        const questMax = editingQuestStandardPriceParticipantsMax;
                        const nextExtraParticipants =
                          questMax != null
                            ? Math.max(0, nextParticipants - questMax)
                            : editingBooking.extraParticipantsCount;
                        setEditingBooking({
                          ...editingBooking,
                          participantsCount: nextParticipants,
                          extraParticipantsCount: nextExtraParticipants,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                    {editingQuestStandardPriceParticipantsMax != null && (
                      <p className="text-xs text-gray-500 mt-1">
                        Без доплаты до {editingQuestStandardPriceParticipantsMax} участников.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Цена доп. участника
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
                      Доп. участники
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingBooking.extraParticipantsCount}
                      onChange={(e) => {
                        const nextExtra = parseInt(e.target.value, 10) || 0;
                        const questMax = editingQuestStandardPriceParticipantsMax;
                        const nextParticipants =
                          questMax != null
                            ? questMax + nextExtra
                            : editingBooking.participantsCount;
                        setEditingBooking({
                          ...editingBooking,
                          extraParticipantsCount: nextExtra,
                          participantsCount: nextParticipants,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                    {editingQuestStandardPriceParticipantsMax != null && (
                      <p className="text-xs text-gray-500 mt-1">
                        Авторасчёт: {autoExtraParticipants} доп. участников при текущем количестве.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                      Применить
                    </label>
                    <button
                      type="button"
                      onClick={handleApplyPromoCode}
                      className="w-full px-3 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      Применить
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Тип скидки
                    </label>
                    <select
                      value={editingBooking.promoDiscountType}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          promoDiscountType: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="">—</option>
                      <option value="percent">Проценты</option>
                      <option value="amount">Рубли</option>
                    </select>
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
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                      Тип оплаты
                    </label>
                    <select
                      value={editingBooking.paymentType}
                      onChange={(e) =>
                        setEditingBooking({ ...editingBooking, paymentType: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="cash">Наличные</option>
                      <option value="certificate">Сертификат</option>
                      <option value="aggregator">Агрегатор</option>
                    </select>
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
                </div>

                <div>
                  {bookingFormMode === 'create' && availableQuestExtras.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Услуги квеста</p>
                      <div className="grid gap-2 md:grid-cols-3">
                        {availableQuestExtras.map((service) => {
                          const isMandatory = mandatoryQuestExtraServiceIds.includes(service.id);
                          return (
                          <label
                            key={service.id}
                            className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedQuestExtraServiceIds.includes(service.id)}
                              onChange={() => toggleQuestExtraService(service.id)}
                              disabled={isMandatory}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span>
                              {service.title} · {service.price} ₽
                            </span>
                          </label>
                          );
                        })}
                      </div>
                      {selectedQuestExtrasTotal > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Сумма услуг квеста: {selectedQuestExtrasTotal} ₽
                        </p>
                      )}
                    </div>
                  )}
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дополнительные услуги
                  </label>
                  <div className="space-y-3">
                    {editingBooking.extraServices.map((service, index) => {
                      const isMandatoryService = mandatoryBookingExtraServiceTitles.has(
                        normalizeServiceTitle(service.title)
                      );

                      return (
                      <div key={service.id} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={service.title}
                          onChange={(e) => updateExtraService(index, 'title', e.target.value)}
                          disabled={isMandatoryService}
                          className={`w-full px-3 py-2 border rounded-lg outline-none ${
                            isMandatoryService
                              ? 'border-gray-200 bg-gray-100 text-gray-600'
                              : 'border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                          }`}
                          placeholder="Название услуги"
                        />
                        <input
                          type="number"
                          min="0"
                          value={service.price}
                          onChange={(e) => updateExtraService(index, 'price', e.target.value)}
                          disabled={isMandatoryService}
                          className={`w-full px-3 py-2 border rounded-lg outline-none ${
                            isMandatoryService
                              ? 'border-gray-200 bg-gray-100 text-gray-600'
                              : 'border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                          }`}
                          placeholder="Цена"
                        />
                        <button
                          type="button"
                          onClick={() => removeExtraService(index)}
                          disabled={isMandatoryService}
                          className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                            isMandatoryService
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          {isMandatoryService ? 'Обязательно' : 'Удалить'}
                        </button>
                      </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addExtraService}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                    >
                      Добавить услугу
                    </button>
                  </div>
                </div>
                <div>
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
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Итоговая сумма
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <input
                        type="checkbox"
                        checked={isTotalPriceManual}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setIsTotalPriceManual(next);
                          if (!next && editingBooking) {
                            setEditingBooking({
                              ...editingBooking,
                              totalPrice: calculateTotalPrice(
                                editingBooking,
                                getSelectedQuestExtrasTotal()
                              ),
                            });
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      Ручной ввод
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={editingBooking.totalPrice}
                      onChange={(e) => {
                        setIsTotalPriceManual(true);
                        setEditingBooking({
                          ...editingBooking,
                          totalPrice: Number(e.target.value) || 0,
                        });
                      }}
                      readOnly={!isTotalPriceManual}
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${
                        isTotalPriceManual
                          ? 'border-gray-300 bg-white'
                          : 'border-gray-200 bg-gray-100 text-gray-600'
                      }`}
                    />
                    {isTotalPriceManual && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingBooking) {
                            return;
                          }
                          setIsTotalPriceManual(false);
                          setEditingBooking({
                            ...editingBooking,
                            totalPrice: calculateTotalPrice(
                              editingBooking,
                              getSelectedQuestExtrasTotal()
                            ),
                          });
                        }}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      >
                        Рассчитать
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Автосумма учитывает цену квеста, доп. участников, услуги и скидку по промокоду.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
              {bookingFormMode === 'create' && createResult && (
                <span className="mr-auto text-sm text-gray-600">{createResult}</span>
              )}
              <button
                onClick={bookingFormMode === 'create' ? handleCreateBooking : handleUpdateBooking}
                disabled={!canEdit}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-colors ${
                  canEdit
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'cursor-not-allowed bg-red-200 text-white/80'
                }`}
              >
                <Save className="w-4 h-4" />
                {bookingFormMode === 'create' ? 'Создать бронь' : 'Сохранить'}
              </button>
              <button
                onClick={closeBookingForm}
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
