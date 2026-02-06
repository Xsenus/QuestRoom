import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Quest, QuestUpsert, DurationBadge, StandardExtraService } from '../../lib/types';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X, Upload, Star } from 'lucide-react';
import QuestScheduleEditor from '../../components/admin/QuestScheduleEditor';
import ImageLibraryPanel from '../../components/admin/ImageLibraryPanel';
import NotificationModal from '../../components/NotificationModal';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

type ActionModalState = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'info' | 'danger';
  onConfirm: () => Promise<void> | void;
};

export default function QuestsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('quests.view');
  const canEdit = hasPermission('quests.edit');
  const canDelete = hasPermission('quests.delete');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [durationBadges, setDurationBadges] = useState<DurationBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [standardExtraServices, setStandardExtraServices] = useState<StandardExtraService[]>([]);
  const [editingQuest, setEditingQuest] = useState<(QuestUpsert & { id?: string }) | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'schedule'>('details');
  const [questFilter, setQuestFilter] = useState<'all' | 'adult' | 'child'>('all');
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    tone: 'success' | 'error' | 'info';
  }>({ isOpen: false, title: '', message: '', tone: 'info' });
  const ensureMainImageInList = (images: string[] = [], mainImage: string | null) => {
    if (mainImage && !images.includes(mainImage)) {
      return [mainImage, ...images];
    }
    return images;
  };
  const normalizeServiceTitle = (title?: string | null) =>
    (title ?? '').trim().toLowerCase();
  const getMandatoryChildServices = () =>
    standardExtraServices.filter((service) => service.mandatoryForChildQuests);
  const isMandatoryChildServiceTitle = (title?: string | null) => {
    const normalizedTitle = normalizeServiceTitle(title);
    if (!normalizedTitle) return false;
    return getMandatoryChildServices().some(
      (service) => normalizeServiceTitle(service.title) === normalizedTitle
    );
  };
  const ensureMandatoryChildServices = (
    services: QuestUpsert['extraServices'] = [],
    mandatoryServices: StandardExtraService[] = []
  ) => {
    if (mandatoryServices.length === 0) return services;
    const normalizedExisting = new Set(
      services.map((service) => normalizeServiceTitle(service.title))
    );
    const toAdd = mandatoryServices.filter(
      (service) => !normalizedExisting.has(normalizeServiceTitle(service.title))
    );
    if (toAdd.length === 0) return services;
    return [
      ...services,
      ...toAdd.map((service) => ({
        title: service.title.trim(),
        price: service.price,
      })),
    ];
  };

  const normalizeOptional = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };
  const formatAgeRating = (value?: string | null) => {
    const trimmed = value?.trim() ?? '';
    const match = trimmed.match(/^(\d+)\s*\+$/);
    return match ? `${match[1]} +` : trimmed;
  };
  const extractAgeRatingNumber = (value?: string | null) => {
    const trimmed = value?.trim() ?? '';
    const match = trimmed.match(/^(\d+)/);
    return match ? match[1] : '';
  };
  useEffect(() => {
    loadQuests();
    loadDurationBadges();
    loadStandardExtraServices();
  }, []);

  if (!canView) {
    return <AccessDenied />;
  }

  const loadDurationBadges = async () => {
    try {
      const data = await api.getDurationBadges();
      setDurationBadges(data || []);
    } catch (error) {
      console.error('Error loading duration badges:', error);
    }
  };

  const loadQuests = async () => {
    try {
      const data = await api.getQuests();
      setQuests(data || []);
    } catch (error) {
      console.error('Error loading quests:', error);
    }
    setLoading(false);
  };

  const loadStandardExtraServices = async () => {
    try {
      const data = await api.getStandardExtraServices();
      setStandardExtraServices(data || []);
    } catch (error) {
      console.error('Error loading standard extra services:', error);
    }
  };

  const handleCreate = () => {
    if (!canEdit) return;
    setEditingQuest({
      title: '',
      description: '',
      slug: '',
      parentQuestId: null,
      addresses: [],
      phones: [],
      participantsMin: 2,
      participantsMax: 6,
      standardPriceParticipantsMax: 4,
      extraParticipantsMax: 0,
      extraParticipantPrice: 0,
      ageRestriction: '',
      ageRating: '18 +',
      price: 0,
      duration: 60,
      difficulty: 2,
      difficultyMax: 5,
      isNew: false,
      isVisible: true,
      mainImage: null,
      images: [],
      giftGameLabel: 'Подарить игру',
      giftGameUrl: '/certificate',
      videoUrl: '',
      sortOrder: quests.length,
      extraServices: [],
    });
    setIsCreating(true);
    setActiveTab('details');
  };

  const applyParentQuest = (parent: Quest) => {
    setEditingQuest((prev) => {
      if (!prev) return prev;
      const parentExtras = (parent.extraServices || []).map((service) => ({
        title: service.title,
        price: service.price,
      }));
      const mandatoryServices = getMandatoryChildServices();
      const baseSlug = parent.slug?.trim();
      const childSlug = baseSlug ? `${baseSlug}_kids` : '';
      return {
        ...prev,
        parentQuestId: parent.id,
        title: parent.title,
        description: parent.description,
        slug: childSlug,
        addresses: parent.addresses || [],
        phones: parent.phones || [],
        participantsMin: isCreating ? 2 : parent.participantsMin,
        participantsMax: isCreating ? 6 : parent.participantsMax,
        standardPriceParticipantsMax: isCreating
          ? 4
          : parent.standardPriceParticipantsMax || 4,
        extraParticipantsMax: parent.extraParticipantsMax,
        extraParticipantPrice: parent.extraParticipantPrice,
        ageRestriction: parent.ageRestriction,
        ageRating: parent.ageRating,
        price: parent.price,
        duration: parent.duration,
        difficulty: parent.difficulty,
        difficultyMax: parent.difficultyMax,
        isNew: parent.isNew,
        isVisible: parent.isVisible,
        mainImage: parent.mainImage,
        images: ensureMainImageInList(parent.images || [], parent.mainImage),
        giftGameLabel: parent.giftGameLabel || 'Подарить игру',
        giftGameUrl: parent.giftGameUrl || '/certificate',
        videoUrl: parent.videoUrl || '',
        sortOrder: parent.sortOrder,
        extraServices: ensureMandatoryChildServices(parentExtras, mandatoryServices),
      };
    });
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (!editingQuest) return;

    const { id, ...payload } = editingQuest;
    const parentQuest = payload.parentQuestId
      ? quests.find((quest) => quest.id === payload.parentQuestId)
      : null;
    const normalizedPayload: QuestUpsert = {
      ...payload,
      slug: normalizeOptional(payload.slug),
      giftGameLabel: normalizeOptional(payload.giftGameLabel) || 'Подарить игру',
      giftGameUrl: normalizeOptional(payload.giftGameUrl) || '/certificate',
      videoUrl: normalizeOptional(payload.videoUrl),
      parentQuestId: normalizeOptional(payload.parentQuestId),
    };
    const mandatoryServices = getMandatoryChildServices();
    const finalPayload: QuestUpsert = parentQuest
      ? {
          ...normalizedPayload,
          extraServices: ensureMandatoryChildServices(
            normalizedPayload.extraServices,
            mandatoryServices
          ),
          extraParticipantsMax: parentQuest.extraParticipantsMax,
          extraParticipantPrice: parentQuest.extraParticipantPrice,
          price: parentQuest.price,
          duration: parentQuest.duration,
        }
      : normalizedPayload;

    try {
      if (isCreating) {
        await api.createQuest(finalPayload);
      } else if (id) {
        await api.updateQuest(id, finalPayload);
      }
    } catch (error) {
      alert('Ошибка при сохранении квеста: ' + (error as Error).message);
      return;
    }

    setEditingQuest(null);
    setIsCreating(false);
    loadQuests();
  };

  const handleCancel = () => {
    setEditingQuest(null);
    setIsCreating(false);
    setActiveTab('details');
  };

  const handleToggleVisibility = async (quest: Quest) => {
    if (!canEdit) return;
    try {
      const payload: QuestUpsert = {
        title: quest.title,
        description: quest.description,
        slug: quest.slug,
        parentQuestId: quest.parentQuestId,
        addresses: quest.addresses || [],
        phones: quest.phones || [],
        participantsMin: quest.participantsMin,
        participantsMax: quest.participantsMax,
        standardPriceParticipantsMax:
          quest.standardPriceParticipantsMax || 4,
        extraParticipantsMax: quest.extraParticipantsMax,
        extraParticipantPrice: quest.extraParticipantPrice,
        ageRestriction: quest.ageRestriction,
        ageRating: quest.ageRating,
        price: quest.price,
        duration: quest.duration,
        difficulty: quest.difficulty || 1,
        difficultyMax: quest.difficultyMax || 5,
        isNew: quest.isNew,
        isVisible: !quest.isVisible,
        mainImage: quest.mainImage,
        images: quest.images || [],
        giftGameLabel: quest.giftGameLabel,
        giftGameUrl: quest.giftGameUrl,
        videoUrl: quest.videoUrl,
        sortOrder: quest.sortOrder,
        extraServices: quest.extraServices || [],
      };
      await api.updateQuest(quest.id, payload);
      loadQuests();
    } catch (error) {
      alert('Ошибка при изменении видимости: ' + (error as Error).message);
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
        title: 'Не удалось удалить квест',
        message: (error as Error).message,
        tone: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (quest: Quest) => {
    if (!canDelete) return;
    openActionModal({
      title: 'Удалить квест?',
      message: `Удалить квест «${quest.title}»? Это действие необратимо.`,
      confirmLabel: 'Удалить',
      tone: 'danger',
      onConfirm: async () => {
        await api.deleteQuest(quest.id);
        loadQuests();
      },
    });
  };

  const addExtraService = () => {
    if (!canEdit) return;
    if (!editingQuest) return;
    const extraServices = editingQuest.extraServices || [];
    setEditingQuest({
      ...editingQuest,
      extraServices: [...extraServices, { title: '', price: 0 }],
    });
  };

  const updateExtraService = (index: number, field: 'title' | 'price', value: string) => {
    if (!canEdit) return;
    if (!editingQuest) return;
    const extraServices = [...(editingQuest.extraServices || [])];
    if (
      editingQuest.parentQuestId &&
      isMandatoryChildServiceTitle(extraServices[index]?.title)
    ) {
      return;
    }
    extraServices[index] = {
      ...extraServices[index],
      [field]: field === 'price' ? Number(value) : value,
    };
    setEditingQuest({ ...editingQuest, extraServices });
  };

  const removeExtraService = (index: number) => {
    if (!editingQuest) return;
    const extraServices = [...(editingQuest.extraServices || [])];
    const service = extraServices[index];
    if (editingQuest.parentQuestId && isMandatoryChildServiceTitle(service?.title)) {
      return;
    }
    openActionModal({
      title: 'Удалить услугу?',
      message: `Удалить услугу «${service?.title || 'Без названия'}»?`,
      confirmLabel: 'Удалить',
      tone: 'danger',
      onConfirm: () => {
        const nextServices = [...(editingQuest.extraServices || [])];
        nextServices.splice(index, 1);
        setEditingQuest({ ...editingQuest, extraServices: nextServices });
      },
    });
  };

  const addStandardExtraService = (service: StandardExtraService) => {
    const normalizedTitle = service.title.trim();
    if (!normalizedTitle) return;
    if (editingQuest?.parentQuestId && isMandatoryChildServiceTitle(normalizedTitle)) {
      return;
    }

    setEditingQuest((prev) => {
      if (!prev) return prev;
      const extraServices = prev.extraServices || [];
      const alreadyExists = extraServices.some(
        (existing) =>
          existing.title?.trim().toLowerCase() === normalizedTitle.toLowerCase() &&
          Number(existing.price || 0) === service.price
      );
      if (alreadyExists) {
        return prev;
      }
      return {
        ...prev,
        extraServices: [
          ...extraServices,
          {
            title: normalizedTitle,
            price: service.price,
          },
        ],
      };
    });
  };

  const addAllStandardExtras = () => {
    setEditingQuest((prev) => {
      if (!prev) return prev;
      const isChildMode = Boolean(prev.parentQuestId);
      const extraServices = prev.extraServices || [];
      const normalizedExisting = extraServices.map((service) => ({
        title: service.title?.trim().toLowerCase() || '',
        price: Number(service.price || 0),
      }));
      const toAdd = standardExtraServices
        .filter((service) => service.isActive)
        .filter((service) => !isChildMode || !service.mandatoryForChildQuests)
        .filter((service) => {
          const normalizedTitle = service.title.trim().toLowerCase();
          return !normalizedExisting.some(
            (existing) => existing.title === normalizedTitle && existing.price === service.price
          );
        })
        .map((service) => ({
          title: service.title.trim(),
          price: service.price,
        }));
      if (toAdd.length === 0) {
        return prev;
      }
      return {
        ...prev,
        extraServices: [...extraServices, ...toAdd],
      };
    });
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  const filteredQuests = quests.filter((quest) => {
    if (questFilter === 'adult') {
      return !quest.parentQuestId;
    }
    if (questFilter === 'child') {
      return Boolean(quest.parentQuestId);
    }
    return true;
  });

  const addPhone = () => {
    if (!editingQuest) return;
    const phones = editingQuest?.phones || [];
    setEditingQuest({ ...editingQuest, phones: [...phones, ''] });
  };

  const updatePhone = (index: number, value: string) => {
    if (!editingQuest) return;
    const phones = [...(editingQuest?.phones || [])];
    phones[index] = value;
    setEditingQuest({ ...editingQuest, phones });
  };

  const removePhone = (index: number) => {
    if (!editingQuest) return;
    const phones = [...(editingQuest?.phones || [])];
    phones.splice(index, 1);
    setEditingQuest({ ...editingQuest, phones });
  };

  const addAddress = () => {
    if (!editingQuest) return;
    const addresses = editingQuest?.addresses || [];
    setEditingQuest({ ...editingQuest, addresses: [...addresses, ''] });
  };

  const updateAddress = (index: number, value: string) => {
    if (!editingQuest) return;
    const addresses = [...(editingQuest?.addresses || [])];
    addresses[index] = value;
    setEditingQuest({ ...editingQuest, addresses });
  };

  const removeAddress = (index: number) => {
    if (!editingQuest) return;
    const addresses = [...(editingQuest?.addresses || [])];
    addresses.splice(index, 1);
    setEditingQuest({ ...editingQuest, addresses });
  };

  const addImage = (url: string) => {
    if (!editingQuest) return;
    const images = editingQuest?.images || [];
    setEditingQuest({ ...editingQuest, images: [...images, url] });
  };

  const setMainImage = (url: string) => {
    if (!editingQuest) return;
    setEditingQuest({ ...editingQuest, mainImage: url });
  };

  const removeImage = (index: number) => {
    if (!editingQuest) return;
    const images = [...(editingQuest?.images || [])];
    const removedUrl = images[index];
    images.splice(index, 1);

    if (editingQuest?.mainImage === removedUrl) {
      setEditingQuest({ ...editingQuest, images, mainImage: images[0] || null });
    } else {
      setEditingQuest({ ...editingQuest, images });
    }
  };

  const handleImageUpload = async (file?: File) => {
    if (!canEdit) return;
    if (!file || !editingQuest) return;

    try {
      const image = await api.uploadImage(file);
      const images = [...(editingQuest.images || []), image.url];
      setEditingQuest({
        ...editingQuest,
        images,
        mainImage: editingQuest.mainImage || image.url,
      });
    } catch (error) {
      alert('Ошибка загрузки изображения: ' + (error as Error).message);
    }
  };

  const handleSelectLibraryImage = (url: string) => {
    if (!canEdit) return;
    if (!editingQuest) return;
    const images = [...(editingQuest.images || []), url];
    setEditingQuest({
      ...editingQuest,
      images,
      mainImage: editingQuest.mainImage || url,
    });
  };

  const handleEditQuest = (quest: Quest) => {
    const mandatoryServices = getMandatoryChildServices();
    const nextExtras = quest.parentQuestId
      ? ensureMandatoryChildServices(quest.extraServices || [], mandatoryServices)
      : quest.extraServices || [];
    setEditingQuest({
      ...quest,
      images: ensureMainImageInList(quest.images || [], quest.mainImage),
      giftGameLabel: quest.giftGameLabel || 'Подарить игру',
      giftGameUrl: quest.giftGameUrl || '/certificate',
      videoUrl: quest.videoUrl || '',
      extraServices: nextExtras,
    });
    setIsCreating(false);
    setActiveTab('details');
  };

  if (editingQuest) {
    const isChildMode = Boolean(editingQuest.parentQuestId);
    const parentQuestName = quests.find((quest) => quest.id === editingQuest.parentQuestId)?.title;
    const scheduleTabDisabled = isCreating || !editingQuest.id || isChildMode;
    const scheduleTabHint = isChildMode
      ? 'Расписание и цены наследуются от родительского квеста.'
      : 'Сначала сохраните квест';
    const childInputClass = isChildMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '';
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Создание квеста' : 'Редактирование квеста'}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                activeTab === 'details'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              Основные данные
            </button>
            <button
              type="button"
              onClick={() => !scheduleTabDisabled && setActiveTab('schedule')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              } ${scheduleTabDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={scheduleTabDisabled ? scheduleTabHint : undefined}
            >
              Время и цены
            </button>
          </div>

          {activeTab === 'details' ? (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-800">Основная информация</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Название квеста
              </label>
              <input
                type="text"
                value={editingQuest.title || ''}
                onChange={(e) =>
                  setEditingQuest({ ...editingQuest, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="ШЕРЛОК"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Slug (URL-идентификатор)
              </label>
              <input
                type="text"
                value={editingQuest.slug || ''}
                onChange={(e) =>
                  setEditingQuest({ ...editingQuest, slug: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="sherlock"
              />
              <p className="mt-2 text-xs text-gray-500">
                Используется в ссылке: /quest/{editingQuest.slug || 'sherlock'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Родительский квест (детский режим)
              </label>
              <select
                value={editingQuest.parentQuestId || ''}
                onChange={(e) => {
                  const nextParentId = e.target.value || null;
                  if (!nextParentId) {
                    setEditingQuest({ ...editingQuest, parentQuestId: null });
                    return;
                  }
                  const parent = quests.find((quest) => quest.id === nextParentId);
                  if (parent) {
                    applyParentQuest(parent);
                  } else {
                    setEditingQuest({ ...editingQuest, parentQuestId: nextParentId });
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="">Нет</option>
                {quests
                  .filter((quest) => quest.id !== editingQuest.id)
                  .map((quest) => (
                    <option key={quest.id} value={quest.id}>
                      {quest.title}
                    </option>
                  ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Если выбран родитель, расписание и цены наследуются от него, а вкладка
                «Время и цены» будет заблокирована.
              </p>
              {isChildMode && parentQuestName && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  Детский режим для квеста: {parentQuestName}.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                value={editingQuest.description || ''}
                onChange={(e) =>
                  setEditingQuest({ ...editingQuest, description: e.target.value })
                }
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Подробное описание квеста..."
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Медиа и ссылки</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Изображения квеста
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Загрузить файл
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0])}
                    />
                  </label>
                  <span className="text-sm text-gray-500">
                    Можно загрузить изображение в базу или вставить URL вручную.
                  </span>
                </div>
                <ImageLibraryPanel
                  onSelect={(url) => handleSelectLibraryImage(url)}
                  toggleLabelClosed="Открыть библиотеку"
                  toggleLabelOpen="Скрыть библиотеку"
                  title="Загруженные изображения"
                />
                {(editingQuest.images || []).map((img, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={img}
                      onChange={(e) => {
                        const newImages = [...(editingQuest.images || [])];
                        newImages[index] = e.target.value;
                        setEditingQuest({ ...editingQuest, images: newImages });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="URL изображения"
                    />
                    {editingQuest.mainImage === img && (
                      <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                        Основное
                      </span>
                    )}
                    <button
                      onClick={() => setMainImage(img)}
                      className={`p-2 rounded-lg transition-colors ${
                        editingQuest.mainImage === img
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title="Сделать основным"
                    >
                      <Star
                        className="w-5 h-5"
                        fill={editingQuest.mainImage === img ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      onClick={() => removeImage(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addImage('')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить изображение
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Текст кнопки «Подарить игру»
                </label>
                <input
                  type="text"
                  value={editingQuest.giftGameLabel || ''}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, giftGameLabel: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Подарить игру"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ссылка для «Подарить игру»
                </label>
                <input
                  type="text"
                  value={editingQuest.giftGameUrl || ''}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, giftGameUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="/certificate"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ссылка на видео (YouTube)
                </label>
                <input
                  type="text"
                  value={editingQuest.videoUrl || ''}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, videoUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Контакты</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Адреса
              </label>
              <div className="space-y-3">
                {(editingQuest.addresses || []).map((addr, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={addr}
                      onChange={(e) => updateAddress(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="ул. Диксона, д. 1, стр. 4"
                    />
                    <button
                      onClick={() => removeAddress(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addAddress}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить адрес
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Телефоны
              </label>
              <div className="space-y-3">
                {(editingQuest.phones || []).map((phone, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => updatePhone(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="8 (391) 294-59-50"
                    />
                    <button
                      onClick={() => removePhone(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addPhone}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить телефон
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Параметры квеста</h3>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Длительность
                </label>
                <select
                  value={editingQuest.duration || 60}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, duration: parseInt(e.target.value) })
                  }
                  disabled={isChildMode}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${childInputClass}`}
                >
                  {durationBadges.map(badge => (
                    <option key={badge.duration} value={badge.duration}>
                      {badge.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Мин. участников
                </label>
                <input
                  type="number"
                  value={editingQuest.participantsMin || 2}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      participantsMin: parseInt(e.target.value) || 2,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Макс. участников
                </label>
                <input
                  type="number"
                  value={editingQuest.participantsMax || 6}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                  participantsMax: parseInt(e.target.value) || 6,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Сложность
            </label>
            <input
              type="number"
              value={editingQuest.difficulty ?? 1}
              onChange={(e) =>
                setEditingQuest({
                  ...editingQuest,
                  difficulty: parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Максимум сложности
            </label>
            <input
              type="number"
              value={editingQuest.difficultyMax ?? 5}
              onChange={(e) =>
                setEditingQuest({
                  ...editingQuest,
                  difficultyMax: parseInt(e.target.value, 10) || 5,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              min="1"
            />
          </div>
        </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Доплаты и услуги</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Макс. участников по стандартной цене
                </label>
                <input
                  type="number"
                  value={editingQuest.standardPriceParticipantsMax || 4}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      standardPriceParticipantsMax: parseInt(e.target.value) || 4,
                    })
                  }
                  disabled={isChildMode}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${childInputClass}`}
                  min="1"
                />
                <p className="mt-2 text-xs text-gray-500">
                  После этого числа применяется доплата за участника.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Доп. участников (максимум)
                </label>
                <input
                  type="number"
                  value={editingQuest.extraParticipantsMax || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      extraParticipantsMax: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={isChildMode}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${childInputClass}`}
                  min="0"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Сколько игроков можно добавить сверх максимума.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Доплата за доп. участника (₽)
                </label>
                <input
                  type="number"
                  value={editingQuest.extraParticipantPrice || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      extraParticipantPrice: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={isChildMode}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${childInputClass}`}
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Дополнительные услуги
              </label>
              {standardExtraServices
                .filter((service) => !isChildMode || !service.mandatoryForChildQuests)
                .some((service) => service.isActive) && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">
                        Стандартные доп. услуги
                      </h4>
                      <p className="text-xs text-gray-500">
                        Выберите из стандартного списка или добавьте все сразу.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addAllStandardExtras}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
                    >
                      <Plus className="h-4 w-4" />
                      Добавить все
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {standardExtraServices
                      .filter((service) => service.isActive)
                      .filter((service) => !isChildMode || !service.mandatoryForChildQuests)
                      .map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">{service.title}</div>
                          <div className="text-xs text-gray-500">{service.price} ₽</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addStandardExtraService(service)}
                          className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                          <Plus className="h-3 w-3" />
                          Добавить
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {(editingQuest.extraServices || []).map((service, index) => {
                  const isMandatoryChildService =
                    isChildMode && isMandatoryChildServiceTitle(service.title);
                  return (
                    <div
                      key={service.id ?? index}
                      className="grid md:grid-cols-[2fr_1fr_auto] gap-3 items-start"
                    >
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={service.title || ''}
                          onChange={(e) => updateExtraService(index, 'title', e.target.value)}
                          readOnly={isMandatoryChildService}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${
                            isMandatoryChildService ? 'bg-gray-100 text-gray-600' : ''
                          }`}
                          placeholder="Название услуги"
                        />
                        {isMandatoryChildService && (
                          <p className="text-xs text-gray-500">
                            Обязательная услуга для детских квестов.
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        value={service.price || 0}
                        onChange={(e) => updateExtraService(index, 'price', e.target.value)}
                        readOnly={isMandatoryChildService}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${
                          isMandatoryChildService ? 'bg-gray-100 text-gray-600' : ''
                        }`}
                        placeholder="Цена"
                        min="0"
                      />
                      <button
                        onClick={() => removeExtraService(index)}
                        disabled={isMandatoryChildService}
                        className={`p-2 rounded-lg transition-colors ${
                          isMandatoryChildService
                            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                            : 'bg-red-100 hover:bg-red-200 text-red-600'
                        }`}
                        title={
                          isMandatoryChildService
                            ? 'Эта услуга обязательна для детских квестов'
                            : 'Удалить услугу'
                        }
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={addExtraService}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить услугу
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Возраст и стоимость</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Возрастное ограничение
                </label>
                <input
                  type="text"
                  value={editingQuest.ageRestriction || ''}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      ageRestriction: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="С 6 лет родителями или с 14 лет самостоятельно"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Возрастной рейтинг
                </label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={extractAgeRatingNumber(editingQuest.ageRating)}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      ageRating: formatAgeRating(`${e.target.value} +`),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="12"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  value={editingQuest.price || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={isChildMode}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${childInputClass}`}
                  placeholder="2500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={editingQuest.sortOrder || 0}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800">Отображение</h3>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingQuest.isNew || false}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, isNew: e.target.checked })
                  }
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Показывать бейдж "NEW"
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingQuest.isVisible !== false}
                  onChange={(e) =>
                    setEditingQuest({ ...editingQuest, isVisible: e.target.checked })
                  }
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Показывать на главной странице
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                disabled={!canEdit}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  canEdit
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'cursor-not-allowed bg-red-200 text-white/80'
                }`}
              >
                <Save className="w-5 h-5" />
                Сохранить
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <X className="w-5 h-5" />
                Отмена
              </button>
            </div>
          </div>
          ) : scheduleTabDisabled ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              {isChildMode ? (
                <>
                  <p className="font-semibold text-gray-800">
                    Расписание и цены наследуются от родителя.
                  </p>
                  <p className="mt-2">
                    Для детского режима нельзя менять слоты отдельно — редактируйте расписание у родительского
                    квеста.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-800">Сначала сохраните квест.</p>
                  <p className="mt-2">
                    Чтобы настроить расписание, нужно сохранить карточку квеста и перейти во
                    вкладку «Время и цены».
                  </p>
                </>
              )}
            </div>
          ) : (
            <QuestScheduleEditor questId={editingQuest.id!} canEdit={canEdit} />
          )}
        </div>
        <NotificationModal
          isOpen={notification.isOpen}
          title={notification.title}
          message={notification.message}
          tone={notification.tone}
          onClose={() => setNotification({ ...notification, isOpen: false })}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление квестами</h2>
        <button
          onClick={handleCreate}
          disabled={!canEdit}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
            canEdit
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'cursor-not-allowed bg-red-200 text-white/80'
          }`}
        >
          <Plus className="w-5 h-5" />
          Создать квест
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all' as const, label: 'Все' },
          { key: 'adult' as const, label: 'Взрослые' },
          { key: 'child' as const, label: 'Детские' },
        ].map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setQuestFilter(filter.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              questFilter === filter.key
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredQuests.map((quest) => (
          <div
            key={quest.id}
            className={`bg-white rounded-lg shadow-lg p-6 ${
              !quest.isVisible ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{quest.title}</h3>
                  {quest.isNew && (
                    <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      NEW
                    </span>
                  )}
                  {quest.parentQuestId && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      ДЕТСКИЙ РЕЖИМ
                    </span>
                  )}
                  {!quest.isVisible && (
                    <span className="bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                      СКРЫТ
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4 line-clamp-2">{quest.description}</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Адреса:</span>{' '}
                    {quest.addresses?.join(', ') || 'Не указаны'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Телефоны:</span>{' '}
                    {quest.phones?.join(', ') || 'Не указаны'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Участники:</span>{' '}
                    от {quest.participantsMin} до {quest.participantsMax} чел.
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Длительность:</span>{' '}
                    {quest.duration} минут
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Сложность:</span>{' '}
                    {quest.difficulty}/{quest.difficultyMax || 5}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Цена:</span> {quest.price} ₽
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Изображения:</span>{' '}
                    {quest.images?.length || 0} шт.
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEditQuest(quest)}
                  disabled={!canEdit}
                  className={`p-2 rounded-lg transition-colors ${
                    canEdit
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      : 'cursor-not-allowed bg-blue-50 text-blue-200'
                  }`}
                  title="Редактировать"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleToggleVisibility(quest)}
                  disabled={!canEdit}
                  className={`p-2 rounded-lg transition-colors ${
                    canEdit
                      ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                      : 'cursor-not-allowed bg-yellow-50 text-yellow-200'
                  }`}
                  title={quest.isVisible ? 'Скрыть' : 'Показать'}
                >
                  {quest.isVisible ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(quest)}
                  disabled={!canDelete}
                  className={`p-2 rounded-lg transition-colors ${
                    canDelete
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'cursor-not-allowed bg-red-50 text-red-200'
                  }`}
                  title="Удалить"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredQuests.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">Квесты не найдены</p>
            <p className="text-gray-500 mt-2">
              Попробуйте изменить фильтр или создайте новый квест.
            </p>
          </div>
        )}
      </div>
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
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        tone={notification.tone}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
  );
}
