import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Certificate } from '../lib/types';

export default function CertificatePage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    loadCertificates();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowThanks(true);
    setFormData({ name: '', phone: '', email: '' });
    setTimeout(() => setShowThanks(false), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 md:mb-8">
            Сертификаты и награды
          </h1>
        </div>

        {certificates.length > 0 && (
          <div className="space-y-6 mb-8">
            {certificates.map((cert) => (
              <div key={cert.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
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
              </div>
            ))}
          </div>
        )}

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
          Подарочные сертификаты
        </h2>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-8 mb-6 md:mb-8">
          <div className="text-white space-y-4 md:space-y-6">
            <p className="text-sm md:text-base lg:text-lg leading-relaxed">
              Вы можете приобрести как Подарочный сертификат в бумажном виде в нашем фирменном конверте так и Электронный подарочный сертификат на участие в реалити-квестах "Вловушке24". Сертификат распространяется на команду от 2 до 4 человек. Использовать сертификат можно в любой локации на выбор участников соответствующий максимальной цене квеста на сайте компании, по предварительной записи. Срок действия подарочных сертификатов - 3 месяца с даты приобретения. Для приобретения Подарочного сертификата позвоните по телефону: 294-59-50 или отправьте заявку на электронную почту - krsk@vlovushke24.ru.
            </p>

            <p className="text-base md:text-lg lg:text-xl leading-relaxed font-semibold">
              Стоимость подарочных сертификатов на квесты: "Ключ от всех дверей", "Звонок", "Школа магии Хогвартс", "Алиса в стране чудес" и "Шерлок" - <strong>3500</strong> руб. (60/75-минутные квесты) и "Идеальное ограбление" - <strong>4000</strong> руб. (90-минутный квест).
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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
                required
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 md:py-4 md:px-8 text-sm md:text-base rounded-lg transition-all hover:scale-105 shadow-lg"
            >
              Заказать
            </button>
          </form>
        </div>

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
