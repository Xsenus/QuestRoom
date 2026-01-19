import { useState, useEffect } from 'react';
import { Star, User } from 'lucide-react';
import { api } from '../lib/api';
import { Review } from '../lib/types';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const data = await api.getReviews(true);
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
    setLoading(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`w-5 h-5 ${
              index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
            }`}
          />
        ))}
      </div>
    );
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
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-8">
            Отзывы наших клиентов
          </h1>
          <p className="text-base md:text-lg text-white/80">
            Мы ценим каждого гостя и стремимся создавать незабываемые впечатления
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-white truncate">
                    {review.customerName}
                  </h3>
                  <p className="text-xs md:text-sm text-pink-300 truncate">{review.questTitle}</p>
                </div>
                <div className="flex-shrink-0">{renderStars(review.rating)}</div>
              </div>

              <p className="text-sm md:text-base text-white/90 leading-relaxed mb-3 md:mb-4">
                {review.reviewText}
              </p>

              <div className="text-xs md:text-sm text-white/60">
                {new Date(review.reviewDate).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          ))}
        </div>

        {reviews.length === 0 && (
          <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-lg">
            <p className="text-white text-lg">Отзывов пока нет</p>
          </div>
        )}

        <div className="mt-8 md:mt-12 bg-gradient-to-r from-pink-600/20 to-purple-600/20 backdrop-blur-sm rounded-lg p-6 md:p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">
            Поделитесь своими впечатлениями!
          </h2>
          <p className="text-sm md:text-base text-white/80 mb-4 md:mb-6">
            Мы будем рады узнать ваше мнение о прохождении наших квестов
          </p>
          <a
            href="tel:+73912945950"
            className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg transition-all hover:scale-105 shadow-lg text-sm md:text-base"
          >
            Позвонить нам
          </a>
        </div>
      </div>
    </div>
  );
}
