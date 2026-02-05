import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { Quest, QuestExtraService, QuestSchedule, StandardExtraService } from '../lib/types';
import NotificationModal from './NotificationModal';

interface BookingModalProps {
  slot: QuestSchedule;
  quest: Quest;
  onClose: () => void;
  onBookingCreated?: (slotId: string) => void;
  onBookingComplete: () => void;
}

export default function BookingModal({
  slot,
  quest,
  onClose,
  onBookingCreated,
  onBookingComplete,
}: BookingModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    comments: '',
    paymentType: 'cash',
    promoCode: '',
  });
  const [standardExtraServices, setStandardExtraServices] = useState<StandardExtraService[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(quest.participantsMin);
  const [questExtraServices, setQuestExtraServices] = useState<QuestExtraService[]>(
    quest.extraServices || []
  );
  const normalizeServiceTitle = (title?: string | null) =>
    (title ?? '').trim().toLowerCase();
  const mandatoryChildServices = useMemo(
    () => standardExtraServices.filter((service) => service.mandatoryForChildQuests),
    [standardExtraServices]
  );
  const mandatoryQuestServices = useMemo(() => {
    if (!quest.parentQuestId || mandatoryChildServices.length === 0) {
      return [];
    }
    const mandatoryTitles = new Set(
      mandatoryChildServices.map((service) => normalizeServiceTitle(service.title))
    );
    return questExtraServices.filter((service) =>
      mandatoryTitles.has(normalizeServiceTitle(service.title))
    );
  }, [quest.parentQuestId, questExtraServices, mandatoryChildServices]);
  const missingMandatoryChildServices = useMemo(() => {
    if (!quest.parentQuestId || mandatoryChildServices.length === 0) {
      return [];
    }

    const existingTitles = new Set(
      questExtraServices.map((service) => normalizeServiceTitle(service.title))
    );

    return mandatoryChildServices
      .filter((service) => !existingTitles.has(normalizeServiceTitle(service.title)))
      .map((service) => ({
        id: `mandatory-standard-${service.id}`,
        title: service.title,
        price: service.price,
      }));
  }, [quest.parentQuestId, questExtraServices, mandatoryChildServices]);
  const mandatoryQuestServiceIds = useMemo(
    () => mandatoryQuestServices.map((service) => service.id),
    [mandatoryQuestServices]
  );
  const displayMandatoryServices = useMemo(
    () => [...mandatoryQuestServices, ...missingMandatoryChildServices],
    [mandatoryQuestServices, missingMandatoryChildServices]
  );
  const [selectedExtraServices, setSelectedExtraServices] = useState<string[]>([]);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: ReactNode;
    tone: 'success' | 'error' | 'info';
    action?: 'success' | 'conflict' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
    action: undefined,
  });

  const optionalExtraServices = mandatoryQuestServiceIds.length
    ? questExtraServices.filter((service) => !mandatoryQuestServiceIds.includes(service.id))
    : questExtraServices;
  const maxParticipants = quest.participantsMax + Math.max(0, quest.extraParticipantsMax || 0);
  const extraParticipantsCount = Math.max(0, participantsCount - quest.participantsMax);
  const extraParticipantsTotal = extraParticipantsCount * Math.max(0, quest.extraParticipantPrice || 0);
  const selectedQuestExtraServicesTotal = questExtraServices
    .filter((service) => selectedExtraServices.includes(service.id))
    .reduce((sum, service) => sum + service.price, 0);
  const missingMandatoryServicesTotal = missingMandatoryChildServices.reduce(
    (sum, service) => sum + service.price,
    0
  );
  const extraServicesTotal = selectedQuestExtraServicesTotal + missingMandatoryServicesTotal;
  const totalPrice =
    formData.paymentType === 'certificate'
      ? extraServicesTotal
      : slot.price + extraParticipantsTotal + extraServicesTotal;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleExtraService = (serviceId: string) => {
    if (mandatoryQuestServiceIds.includes(serviceId)) return;
    setSelectedExtraServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  useEffect(() => {
    const loadStandardExtraServices = async () => {
      try {
        const data = await api.getStandardExtraServices();
        setStandardExtraServices(data || []);
      } catch (error) {
        console.error('Error loading standard extra services:', error);
      }
    };
    loadStandardExtraServices();
  }, []);

  useEffect(() => {
    setQuestExtraServices(quest.extraServices || []);

    const loadFreshQuest = async () => {
      try {
        const freshQuest = await api.getQuest(quest.id);
        setQuestExtraServices(freshQuest.extraServices || []);
      } catch (error) {
        console.error('Error loading fresh quest data for booking modal:', error);
      }
    };

    loadFreshQuest();
  }, [quest.id, quest.extraServices]);

  useEffect(() => {
    if (!mandatoryQuestServiceIds.length) return;
    setSelectedExtraServices((prev) => {
      const next = new Set(prev);
      mandatoryQuestServiceIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  }, [mandatoryQuestServiceIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const createdBooking = await api.createBooking({
        questId: quest.id,
        questScheduleId: slot.id,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email || null,
        bookingDate: slot.date,
        participantsCount,
        notes: formData.comments || null,
        extraServiceIds: selectedExtraServices,
        extraServices: missingMandatoryChildServices.map((service) => ({
          title: service.title,
          price: service.price,
        })),
        paymentType: formData.paymentType,
        promoCode: formData.promoCode || null,
      });

      const formattedDate = new Date(`${slot.date}T00:00:00`).toLocaleDateString('ru-RU');
      const formattedTime = slot.timeSlot.substring(0, 5);
      const emailLabel = formData.email ? formData.email : 'указанный адрес';
      const selectedExtras = [
        ...questExtraServices.filter((service) => selectedExtraServices.includes(service.id)),
        ...missingMandatoryChildServices,
      ];
      const discountAmount = createdBooking.promoDiscountAmount ?? 0;
      const totalLabel = `${createdBooking.totalPrice} ₽`;

      onBookingCreated?.(slot.id);

      setNotification({
        isOpen: true,
        title: 'Бронирование принято',
        tone: 'success',
        action: 'success',
        message: (
          <div className="space-y-3">
            <p className="text-base font-semibold text-gray-900">
              Большое спасибо за бронирование!
            </p>
            <p>
              Вы забронировали квест <strong>{quest.title}</strong> на{' '}
              <strong>{formattedDate}</strong> в <strong>{formattedTime}</strong>.
            </p>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Итоговая стоимость:</span>
                <strong className="text-gray-900">{totalLabel}</strong>
              </div>
              {formData.promoCode && (
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Промокод: {formData.promoCode}</span>
                  {discountAmount > 0 && <span>Скидка: −{discountAmount} ₽</span>}
                </div>
              )}
              {selectedExtras.length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  <div className="font-semibold text-gray-700">Дополнительные услуги:</div>
                  <ul className="mt-1 space-y-1">
                    {selectedExtras.map((service) => (
                      <li key={service.id}>
                        {service.title} — {service.price} ₽
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p>
              Письмо с деталями отправлено на <strong>{emailLabel}</strong>. Мы свяжемся с
              вами в ближайшее время для подтверждения.
            </p>
          </div>
        ),
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      const errorMessage = (error as Error).message || '';
      const isSlotBooked = errorMessage.toLowerCase().includes('уже забронировано');

      setNotification({
        isOpen: true,
        title: isSlotBooked ? 'Это время уже занято' : 'Не удалось создать бронь',
        tone: isSlotBooked ? 'info' : 'error',
        action: isSlotBooked ? 'conflict' : 'error',
        message: isSlotBooked
          ? 'Похоже, другой пользователь уже забронировал выбранное время. Пожалуйста, выберите другой слот.'
          : 'Произошла ошибка при создании брони. Пожалуйста, попробуйте ещё раз.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-red-600 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto modal-scrollbar">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Забронировать игру</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="ИМЯ"
                className="w-full px-3 py-2 text-sm bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50"
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="ТЕЛЕФОН *"
                className="w-full px-3 py-2 text-sm bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="E-MAIL"
                className="w-full px-3 py-2 text-sm bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50 sm:col-span-2"
              />
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows={2}
                placeholder="КОММЕНТАРИЙ (НЕОБЯЗАТЕЛЬНО)"
                className="w-full px-3 py-2 text-sm bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50 resize-none sm:col-span-2"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-white/10 rounded-lg p-3 text-white text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <span className="text-white/80">Квест:</span>
                  <span className="font-semibold text-right">{quest.title}</span>
                  <span className="text-white/80">Игроков:</span>
                  <span className="font-semibold text-right">{participantsCount}</span>
                  <span className="text-white/80">Дата:</span>
                  <span className="font-semibold text-right">
                    {new Date(`${slot.date}T00:00:00`).toLocaleDateString('ru-RU')}
                  </span>
                  <span className="text-white/80">Время:</span>
                  <span className="font-semibold text-right">{slot.timeSlot.substring(0, 5)}</span>
                  <span className="text-white/80">Стоимость:</span>
                  <span className="font-semibold text-right">
                    {totalPrice} ₽
                  </span>
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-3 space-y-3 text-white text-sm">
                <div className="space-y-2">
                  <p className="text-white font-semibold text-sm">Оплата:</p>
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        value="cash"
                        checked={formData.paymentType === 'cash'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span
                        className={`px-2.5 py-1 border text-xs font-semibold transition-colors ${
                          formData.paymentType === 'cash'
                            ? 'bg-white text-red-600 border-white'
                            : 'border-white text-white hover:bg-white/20'
                        }`}
                      >
                        НАЛИЧНЫЕ
                      </span>
                    </label>
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        value="certificate"
                        checked={formData.paymentType === 'certificate'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span
                        className={`px-2.5 py-1 border text-xs font-semibold transition-colors ${
                          formData.paymentType === 'certificate'
                            ? 'bg-white text-red-600 border-white'
                            : 'border-white text-white hover:bg-white/20'
                        }`}
                      >
                        СЕРТИФИКАТ
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-white font-semibold text-sm">Промокод (если есть):</p>
                  <input
                    type="text"
                    name="promoCode"
                    value={formData.promoCode}
                    onChange={handleChange}
                    placeholder="Введите промокод"
                    className="w-full px-3 py-2 bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 text-white">
              <p className="font-semibold text-sm">Количество игроков:</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setParticipantsCount((prev) => Math.max(quest.participantsMin, prev - 1))
                  }
                  className="h-10 w-10 rounded-full border border-white/60 text-lg font-semibold hover:bg-white/20"
                >
                  −
                </button>
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold">{participantsCount}</div>
                  {quest.extraParticipantPrice > 0 && extraParticipantsCount > 0 && (
                    <div className="text-xs text-white/80">
                      Доплата за доп. участников: {extraParticipantsTotal} ₽
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setParticipantsCount((prev) => Math.min(maxParticipants, prev + 1))
                  }
                  className="h-10 w-10 rounded-full border border-white/60 text-lg font-semibold hover:bg-white/20"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min={quest.participantsMin}
                max={maxParticipants}
                value={participantsCount}
                onChange={(e) => setParticipantsCount(Number(e.target.value))}
                className="w-full accent-white"
              />
              {quest.extraParticipantPrice > 0 && quest.extraParticipantsMax > 0 && (
                <p className="text-xs text-white/80">
                  Доплата за каждого доп. участника: {quest.extraParticipantPrice} ₽
                </p>
              )}
            </div>

            {(questExtraServices.length > 0 || missingMandatoryChildServices.length > 0) && (
              <div className="space-y-3 text-white text-xs">
                <p className="font-semibold text-sm">Дополнительные услуги:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {displayMandatoryServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-start gap-3 rounded-lg border border-white/30 bg-white/15 px-3 py-3 text-left text-white/95"
                    >
                      <input
                        type="checkbox"
                        checked
                        disabled
                        className="mt-1 h-4 w-4 rounded border-white/40 bg-white/10 text-red-600"
                      />
                      <span className="flex-1">
                        <span className="block font-semibold">{service.title}</span>
                        <span className="block text-white/80">{service.price} ₽</span>
                        <span className="mt-1 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                          Обязательная
                        </span>
                      </span>
                    </label>
                  ))}
                  {optionalExtraServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-start gap-3 rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-left text-white/90 cursor-pointer hover:bg-white/10"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExtraServices.includes(service.id)}
                        onChange={() => toggleExtraService(service.id)}
                        className="mt-1 h-4 w-4 text-red-600 rounded border-white/40 bg-white/10"
                      />
                      <span className="flex-1">
                        <span className="block font-semibold">{service.title}</span>
                        <span className="block text-white/80">{service.price} ₽</span>
                      </span>
                    </label>
                  ))}
                </div>
                {extraServicesTotal > 0 && (
                  <p className="text-xs text-white/80">
                    Дополнительные услуги: {extraServicesTotal} ₽
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white hover:bg-gray-100 text-red-600 font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'ОТПРАВКА...' : 'ПОДТВЕРДИТЬ ЗАЯВКУ'}
            </button>

            <p className="text-white/80 text-xs text-center">
              Нажимая на кнопку, вы даете согласие на обработку персональных данных
            </p>
          </form>
        </div>
      </div>
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        tone={notification.tone}
        showToneLabel={false}
        onClose={() => {
          setNotification({ ...notification, isOpen: false });
          if (notification.action === 'success') {
            onBookingComplete();
            return;
          }
          if (notification.action === 'conflict') {
            onBookingComplete();
          }
        }}
      />
    </div>
  );
}
