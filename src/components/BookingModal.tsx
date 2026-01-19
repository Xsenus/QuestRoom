import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase, Quest, QuestSchedule } from '../lib/supabase';

interface BookingModalProps {
  slot: QuestSchedule;
  quest: Quest;
  onClose: () => void;
  onBookingComplete: () => void;
}

export default function BookingModal({ slot, quest, onClose, onBookingComplete }: BookingModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    comments: '',
    paymentType: 'card',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            quest_id: quest.id,
            customer_name: formData.name,
            customer_phone: formData.phone,
            customer_email: formData.email || null,
            booking_date: slot.date,
            participants_count: quest.participants_min,
            status: 'pending',
            notes: formData.comments || null,
            quest_schedule_id: slot.id,
          },
        ])
        .select()
        .single();

      if (bookingError) throw bookingError;

      const { error: scheduleError } = await supabase
        .from('quest_schedule')
        .update({
          is_booked: true,
          booking_id: booking.id,
        })
        .eq('id', slot.id);

      if (scheduleError) throw scheduleError;

      alert('Бронирование успешно создано! Наш менеджер свяжется с вами для подтверждения.');
      onBookingComplete();
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Ошибка при создании брони. Попробуйте еще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-red-600 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Забронировать игру</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="ИМЯ"
                className="w-full px-4 py-3 bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50"
              />
            </div>

            <div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="ТЕЛЕФОН *"
                className="w-full px-4 py-3 bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50"
              />
            </div>

            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="E-MAIL"
                className="w-full px-4 py-3 bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50"
              />
            </div>

            <div>
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows={3}
                placeholder="КОММЕНТАРИЙ (НЕОБЯЗАТЕЛЬНО)"
                className="w-full px-4 py-3 bg-transparent border-b-2 border-white text-white placeholder-white/70 focus:outline-none focus:border-white/50 resize-none"
              />
            </div>

            <div className="bg-white/10 rounded-lg p-4 space-y-2 text-white text-sm">
              <div className="flex justify-between">
                <span>Дата:</span>
                <span className="font-bold">
                  {new Date(slot.date + 'T00:00:00').toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Время:</span>
                <span className="font-bold">{slot.time_slot.substring(0, 5)}</span>
              </div>
              <div className="flex justify-between">
                <span>Стоимость:</span>
                <span className="font-bold">{slot.price} ₽</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-white font-semibold text-sm">Оплата:</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="card"
                    checked={formData.paymentType === 'card'}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">НА МЕСТЕ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="certificate"
                    checked={formData.paymentType === 'certificate'}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">СЕРТИФИКАТ</span>
                </label>
              </div>
            </div>

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
    </div>
  );
}
