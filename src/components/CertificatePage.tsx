import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { Certificate, Settings } from '../lib/types';

export default function CertificatePage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    deliveryType: 'paper',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    loadCertificates();
    loadSettings();
  }, []);

  const loadCertificates = async () => {
    try {
      const data = await api.getCertificates(true);
      setCertificates(data || []);
    } catch (error) {
      console.error('Error loading certificates:', error);
    }
    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const submitOrder = async (certificate: Certificate) => {
    setSubmitting(true);

    try {
      await api.createCertificateOrder({
        certificateId: certificate.id,
        certificateTitle: certificate.title,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email || null,
        notes: formData.notes || null,
        deliveryType: formData.deliveryType,
      });

      setShowThanks(true);
      setSelectedCertificate(null);
      setSelectedCertificateId('');
      setFormData({ name: '', phone: '', email: '', notes: '', deliveryType: 'paper' });
      setTimeout(() => setShowThanks(false), 5000);
    } catch (error) {
      console.error('Error creating certificate order:', error);
      alert('Ошибка при создании заказа. Попробуйте еще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCertificate) {
      return;
    }

    await submitOrder(selectedCertificate);
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const certificate = certificates.find((item) => item.id === selectedCertificateId);
    if (!certificate) {
      alert('Выберите сертификат.');
      return;
    }

    await submitOrder(certificate);
  };

  const openOrderModal = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
  };

  const closeOrderModal = () => {
    if (!submitting) {
      setSelectedCertificate(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 md:mb-8">
            Подарочные сертификаты
          </h1>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
          {settings?.certificatePageTitle || 'Подарочные сертификаты'}
        </h2>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-8 mb-6 md:mb-8">
          <div className="text-white space-y-4 md:space-y-6">
            <p className="text-sm md:text-base lg:text-lg leading-relaxed">
              {settings?.certificatePageDescription ||
                'Вы можете приобрести как Подарочный сертификат в бумажном виде в нашем фирменном конверте так и Электронный подарочный сертификат на участие в реалити-квестах "Вловушке24". Сертификат распространяется на команду от 2 до 4 человек. Использовать сертификат можно в любой локации на выбор участников соответствующий максимальной цене квеста на сайте компании, по предварительной записи. Срок действия подарочных сертификатов - 3 месяца с даты приобретения. Для приобретения Подарочного сертификата позвоните по телефону: 294-59-50 или отправьте заявку на электронную почту - krsk@vlovushke24.ru.'}
            </p>

            <p className="text-base md:text-lg lg:text-xl leading-relaxed font-semibold">
              {settings?.certificatePagePricing ||
                'Стоимость подарочных сертификатов на квесты: "Ключ от всех дверей", "Звонок", "Школа магии Хогвартс", "Алиса в стране чудес" и "Шерлок" - 3500 руб. (60/75-минутные квесты) и "Идеальное ограбление" - 4000 руб. (90-минутный квест).'}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:p-8 mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
            Оформить подарочный сертификат
          </h2>
          <form onSubmit={handleInlineSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={selectedCertificateId}
                onChange={(e) => setSelectedCertificateId(e.target.value)}
                required
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              >
                <option value="">Выберите сертификат</option>
                {certificates.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.title}
                  </option>
                ))}
              </select>
              <select
                name="deliveryType"
                value={formData.deliveryType}
                onChange={handleChange}
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              >
                <option value="paper">Бумажный</option>
                <option value="digital">Электронный</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Имя"
                required
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Телефон"
                required
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="E-mail"
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              />
              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Комментарий"
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 md:py-4 md:px-8 text-sm md:text-base rounded-lg transition-all hover:scale-[1.01] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? 'Отправка...' : 'Заказать'}
            </button>
          </form>
        </div>

        {certificates.length > 0 && (
          <div className="space-y-6 mb-8">
            {certificates.map((cert) => (
              <button
                key={cert.id}
                type="button"
                onClick={() => openOrderModal(cert)}
                className="w-full text-left bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/15 transition-all"
                aria-label={`Заказать сертификат: ${cert.title}`}
              >
                {cert.imageUrl ? (
                  <img
                    src={cert.imageUrl}
                    alt={cert.title}
                    className="w-full max-h-[520px] object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-white/80 text-center py-10">
                    Изображение сертификата не задано
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedCertificate && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-6 md:p-8 max-w-lg w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Заказ сертификата
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedCertificate.title}</p>
                </div>
                <button
                  type="button"
                  onClick={closeOrderModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <select
                    name="deliveryType"
                    value={formData.deliveryType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
                  >
                    <option value="paper">Бумажный</option>
                    <option value="digital">Электронный</option>
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Имя"
                    required
                    className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Телефон"
                    required
                    className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="E-mail"
                    className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>

                <div>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Комментарий"
                    className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 md:py-4 md:px-8 text-sm md:text-base rounded-lg transition-all hover:scale-[1.01] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Отправка...' : 'Заказать'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Нажимая на кнопку, вы даете согласие на обработку персональных данных.
                </p>
              </form>
            </div>
          </div>
        )}

        {showThanks && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-6 md:p-8 max-w-md w-full text-center shadow-2xl animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Спасибо</h2>
              <p className="text-base md:text-lg text-gray-700 mb-4 md:mb-6">
                Ваша заявка принята. Ожидайте звонка от нашего менеджера в ближайшее время
              </p>
              <button
                onClick={() => setShowThanks(false)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 text-sm md:text-base rounded transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
