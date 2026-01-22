import { useNavigate } from 'react-router-dom';
import { MapPin, Users, ShieldAlert, PhoneCall, Timer, Star } from 'lucide-react';
import { Quest } from '../lib/types';

interface QuestCardProps {
  quest: Quest;
}

export default function QuestCard({ quest }: QuestCardProps) {
  const navigate = useNavigate();
  const mainImage = quest.mainImage || quest.images?.[0] || '/images/logo.png';
  const additionalImages = quest.images?.slice(0, 4) || [];
  const durationBadgeUrl = `/images/other/${quest.duration}min.png`;
  const difficultyValue = quest.difficulty || 1;
  const difficultyBadgeUrl =
    difficultyValue >= 3
      ? '/images/difficulty/star3.png'
      : difficultyValue >= 2
      ? '/images/difficulty/star2.png'
      : null;

  while (additionalImages.length < 4) {
    additionalImages.push(mainImage);
  }

  const handleBookingClick = () => {
    navigate(`/quest/${quest.slug || quest.id}`);
  };

  return (
    <div className="relative mb-6 md:mb-10 pt-5 md:pt-8">
      <div className="absolute -top-1 md:-top-4 -right-1 md:-right-4 z-30">
        <img
          src={durationBadgeUrl}
          alt={`${quest.duration} минут`}
          className="w-16 h-16 md:w-28 md:h-28 object-contain drop-shadow-2xl"
        />
      </div>
      {quest.isNew && (
        <div className="absolute top-5 md:top-8 -right-1 md:-right-2 z-20 w-36 h-36 md:w-60 md:h-60 overflow-hidden pointer-events-none">
          <div className="absolute top-10 -right-9 md:top-16 md:-right-14 w-44 md:w-72 bg-red-600 text-white text-center py-1.5 md:py-3 transform rotate-45 shadow-2xl">
            <span className="text-sm md:text-xl font-bold tracking-wider">NEW</span>
          </div>
        </div>
      )}

      <div className="relative bg-white shadow-2xl overflow-hidden border-4 border-white">

        <div className="grid md:grid-cols-2 gap-0">
          <div
            className="relative min-h-[220px] md:min-h-[450px] bg-cover bg-center cursor-pointer"
            style={{ backgroundImage: `url(${mainImage})` }}
            onClick={handleBookingClick}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-transparent"></div>
            <div className="relative z-10 p-4 md:p-8 flex flex-col justify-start pt-6 md:pt-10">
              <h2 className="text-2xl md:text-5xl font-black text-white mb-3 md:mb-6 tracking-tight uppercase leading-tight">
                {quest.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mb-3 md:mb-6">
                <span className="inline-flex items-center gap-2 bg-red-600/90 text-white text-xs md:text-base font-bold px-2.5 py-1 rounded-full">
                  <Star className="w-4 h-4 fill-white" />
                  {quest.ageRating}
                </span>
                <span className="inline-flex items-center gap-2 bg-white/20 text-white text-xs md:text-base font-semibold px-2.5 py-1 rounded-full">
                  {difficultyBadgeUrl ? (
                    <img
                      src={difficultyBadgeUrl}
                      alt={`Сложность ${difficultyValue}`}
                      className="w-5 h-5 object-contain"
                    />
                  ) : (
                    <span className="text-yellow-200">★</span>
                  )}
                  Сложность {difficultyValue}
                </span>
              </div>
              <div className="space-y-2 md:space-y-3">
                <button
                  onClick={handleBookingClick}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 md:py-3.5 md:px-9 transition-all hover:scale-105 shadow-lg text-xs md:text-base tracking-wider uppercase"
                >
                  ЗАПИСАТЬСЯ НА КВЕСТ
                </button>
                <div>
                  <button className="text-white hover:text-white/80 font-semibold text-xs md:text-base tracking-wide transition-all underline">
                    ПОДАРИТЬ ИГРУ
                  </button>
                </div>
                <button className="flex items-center gap-2 text-white hover:text-white/80 transition-all">
                  <span className="w-7 h-7 md:w-9 md:h-9 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">▶</span>
                  </span>
                  <span className="font-semibold text-xs md:text-base tracking-wide uppercase">ВИДЕО</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0">
            {additionalImages.map((img, index) => (
              <div
                key={index}
                onClick={handleBookingClick}
                className="h-[120px] md:h-[225px] bg-cover bg-center hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundImage: `url(${img})` }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-2xl p-5 md:p-8 border-4 border-white border-t-0">
        <div className="grid md:grid-cols-12 gap-5 md:gap-6">
          <div className="md:col-span-4 space-y-3 md:space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="text-sm md:text-base">
                <div className="font-bold text-gray-900 mb-1">Возрастное ограничение</div>
                <div className="text-gray-700 leading-relaxed">{quest.ageRestriction}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Timer className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="text-sm md:text-base">
                <div className="font-bold text-gray-900 mb-1">Длительность</div>
                <div className="text-gray-700">{quest.duration} минут</div>
              </div>
            </div>
            {quest.addresses && quest.addresses.length > 0 && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="text-sm md:text-base">
                  {quest.addresses.map((addr, idx) => (
                    <div key={idx} className="text-gray-700">{addr}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-3 space-y-3 md:space-y-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="text-sm md:text-base">
                <div className="font-bold text-gray-900 mb-1">Количество участников</div>
                <div className="text-gray-700">
                  от {quest.participantsMin} до {quest.participantsMax} человек
                </div>
              </div>
            </div>
            {quest.phones && quest.phones.length > 0 && (
              <div className="flex items-start gap-3">
                <PhoneCall className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="text-sm md:text-base space-y-1">
                  {quest.phones.map((phone, idx) => (
                    <div key={idx}>
                      <a href={`tel:${phone}`} className="text-gray-700 hover:text-red-600 transition-colors font-semibold">
                        {phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-5">
            <p className="text-gray-700 leading-relaxed text-sm md:text-base">
              {quest.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
