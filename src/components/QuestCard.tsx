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
    <div className="relative mb-4 md:mb-6 pt-3 md:pt-5">
      <div className="absolute -top-1 md:-top-4 -right-1 md:-right-4 z-30">
        <img
          src={durationBadgeUrl}
          alt={`${quest.duration} минут`}
          className="w-14 h-14 md:w-24 md:h-24 object-contain drop-shadow-2xl"
        />
      </div>
      {quest.isNew && (
        <div className="absolute top-5 md:top-8 -right-1 md:-right-2 z-20 w-36 h-36 md:w-60 md:h-60 overflow-hidden pointer-events-none">
          <div className="absolute top-10 -right-9 md:top-16 md:-right-14 w-44 md:w-72 bg-[#c51f2e] text-white text-center py-1.5 md:py-3 transform rotate-45 shadow-2xl">
            <span className="text-sm md:text-xl font-bold tracking-wider font-display">NEW</span>
          </div>
        </div>
      )}

      <div className="relative bg-white shadow-2xl overflow-hidden border-4 border-white grid grid-cols-[1.35fr_1fr] md:grid-cols-[2.2fr_1fr]">
        <div className="grid grid-cols-2 gap-0">
          <div
            className="relative min-h-[200px] md:min-h-[320px] bg-cover bg-center cursor-pointer"
            style={{ backgroundImage: `url(${mainImage})` }}
            onClick={handleBookingClick}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent"></div>
            <div className="relative z-10 p-3 md:p-5 flex flex-col justify-start pt-5 md:pt-8">
              <h2 className="text-lg md:text-3xl font-black text-white mb-2 md:mb-4 tracking-tight uppercase leading-tight font-display">
                {quest.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-4">
                <span className="inline-flex items-center gap-2 bg-[#c51f2e] text-white text-[10px] md:text-sm font-bold px-2 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-white" />
                  {quest.ageRating}
                </span>
                <span className="inline-flex items-center gap-2 bg-white/20 text-white text-[10px] md:text-sm font-semibold px-2 py-1 rounded-full">
                  {difficultyBadgeUrl ? (
                    <img
                      src={difficultyBadgeUrl}
                      alt={`Сложность ${difficultyValue}`}
                      className="w-4 h-4 object-contain"
                    />
                  ) : (
                    <span className="text-yellow-200">★</span>
                  )}
                  Сложность {difficultyValue}
                </span>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <button
                  onClick={handleBookingClick}
                  className="bg-[#c51f2e] hover:bg-[#a61b28] text-white font-bold py-2 px-4 md:py-2.5 md:px-6 transition-all hover:scale-[1.02] shadow-lg text-[10px] md:text-sm tracking-wider uppercase font-display"
                >
                  Записаться на квест
                </button>
                <div>
                  <button className="text-white/90 hover:text-white font-semibold text-[10px] md:text-sm tracking-wide transition-all underline">
                    Подарить игру
                  </button>
                </div>
                <button className="flex items-center gap-2 text-white/90 hover:text-white transition-all">
                  <span className="w-6 h-6 md:w-8 md:h-8 bg-[#c51f2e] rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px]">▶</span>
                  </span>
                  <span className="font-semibold text-[10px] md:text-sm tracking-wide uppercase font-display">Видео</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0">
            {additionalImages.map((img, index) => (
              <div
                key={index}
                onClick={handleBookingClick}
                className="h-[100px] md:h-[160px] bg-cover bg-center hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundImage: `url(${img})` }}
              ></div>
            ))}
          </div>
        </div>

        <div className="bg-[#f4f4f8] md:bg-white/95 text-gray-900 p-3 md:p-4 border-l border-white/90 flex flex-col gap-3 md:gap-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-[#c51f2e] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] md:text-xs">
                <div className="font-bold text-gray-900 mb-0.5 uppercase tracking-wide font-display">
                  Возраст
                </div>
                <div className="text-gray-700 leading-snug">{quest.ageRestriction}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Timer className="w-4 h-4 md:w-5 md:h-5 text-[#c51f2e] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] md:text-xs">
                <div className="font-bold text-gray-900 mb-0.5 uppercase tracking-wide font-display">
                  Время
                </div>
                <div className="text-gray-700">{quest.duration} минут</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-[#c51f2e] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] md:text-xs">
                <div className="font-bold text-gray-900 mb-0.5 uppercase tracking-wide font-display">
                  Участники
                </div>
                <div className="text-gray-700">
                  {quest.participantsMin}-{quest.participantsMax} чел.
                </div>
              </div>
            </div>
          </div>

          {quest.addresses && quest.addresses.length > 0 && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-[#c51f2e] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] md:text-xs text-gray-700 leading-snug">
                {quest.addresses.map((addr, idx) => (
                  <div key={idx}>{addr}</div>
                ))}
              </div>
            </div>
          )}

          {quest.phones && quest.phones.length > 0 && (
            <div className="flex items-start gap-2">
              <PhoneCall className="w-4 h-4 md:w-5 md:h-5 text-[#c51f2e] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] md:text-xs space-y-1">
                {quest.phones.map((phone, idx) => (
                  <div key={idx}>
                    <a
                      href={`tel:${phone}`}
                      className="text-gray-700 hover:text-[#c51f2e] transition-colors font-semibold"
                    >
                      {phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] md:text-xs text-gray-700 leading-snug max-h-20 md:max-h-28 overflow-hidden">
            {quest.description}
          </p>
        </div>
      </div>
    </div>
  );
}
