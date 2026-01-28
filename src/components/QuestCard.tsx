import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, ShieldAlert, PhoneCall, Timer, Star, Key, Youtube } from 'lucide-react';
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
  const difficultyMax = Math.max(1, quest.difficultyMax || 5);
  const filledKeys = Math.min(difficultyValue, difficultyMax);
  const giftLabel = quest.giftGameLabel || 'Подарить игру';
  const giftUrl = quest.giftGameUrl || '/certificate';
  const formatAgeRating = (value?: string | null) => {
    const trimmed = value?.trim() ?? '';
    const match = trimmed.match(/^(\d+)\s*\+$/);
    return match ? `${match[1]} +` : trimmed;
  };

  while (additionalImages.length < 4) {
    additionalImages.push(mainImage);
  }

  const handleBookingClick = () => {
    navigate(`/quest/${quest.slug || quest.id}`);
  };

  const handleNavigate = (targetUrl: string) => {
    if (targetUrl.startsWith('http')) {
      window.location.href = targetUrl;
    } else {
      navigate(targetUrl);
    }
  };

  const handleActionClick = (event: MouseEvent, targetUrl: string) => {
    event.preventDefault();
    event.stopPropagation();
    handleNavigate(targetUrl);
  };

  return (
    <div className="relative mb-4 md:mb-6 pt-3 md:pt-5">
      <div className="relative bg-white shadow-2xl overflow-visible border-4 border-white">
        <div className="relative">
          <div className="grid grid-cols-[1.4fr_1fr] md:grid-cols-[1.6fr_1fr] bg-black">
            <div className="flex flex-col">
              <div
                className="relative min-h-[180px] md:min-h-[320px] bg-cover bg-center cursor-pointer"
                style={{ backgroundImage: `url(${mainImage})` }}
                onClick={handleBookingClick}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent"></div>
                <div className="relative z-10 p-3 md:p-5 flex flex-col justify-start pt-5 md:pt-8">
                  <h2 className="text-lg md:text-3xl font-black text-white mb-2 md:mb-4 tracking-tight uppercase leading-tight font-display">
                    {quest.title}
                  </h2>
                  <div className="hidden md:flex flex-wrap items-center gap-2 mb-2 md:mb-4 justify-start">
                    <span className="inline-flex items-center gap-2 bg-[#c51f2e] text-white text-[10px] md:text-sm font-bold px-2 py-1 rounded-full">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      {formatAgeRating(quest.ageRating)}
                    </span>
                    <span className="inline-flex items-center gap-2 bg-white/20 text-white text-[10px] md:text-sm font-semibold px-2 py-1 rounded-full">
                      <span className="flex items-center gap-1">
                        {Array.from({ length: difficultyMax }).map((_, index) => (
                          <Key
                            key={index}
                            className={`w-4 h-4 ${
                              index < filledKeys ? 'text-yellow-300' : 'text-white/40'
                            }`}
                          />
                        ))}
                      </span>
                      {difficultyValue}/{difficultyMax}
                    </span>
                  </div>
                  <div className="hidden md:flex md:flex-col md:items-start space-y-1.5 md:space-y-2">
                    <button
                      onClick={handleBookingClick}
                      className="bg-[#c51f2e] hover:bg-[#a61b28] text-white font-bold py-2 px-4 md:py-2.5 md:px-6 transition-all hover:scale-[1.02] shadow-lg text-[10px] md:text-sm tracking-wider uppercase font-display md:w-auto"
                    >
                      Записаться на квест
                    </button>
                    <div>
                      <button
                        className="text-white/90 hover:text-white font-semibold text-[10px] md:text-sm tracking-wide transition-all underline decoration-dashed underline-offset-4"
                        onClick={(event) => handleActionClick(event, giftUrl)}
                      >
                        {giftLabel}
                      </button>
                    </div>
                    {quest.videoUrl && (
                      <button
                        className="flex items-center gap-2 text-white/90 hover:text-white transition-all"
                        onClick={(event) => handleActionClick(event, quest.videoUrl)}
                      >
                        <span className="w-6 h-6 md:w-8 md:h-8 bg-[#c51f2e] rounded-full flex items-center justify-center">
                          <Youtube className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </span>
                        <span className="font-semibold text-[10px] md:text-sm tracking-wide uppercase font-display">
                          Видео
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-0 bg-black">
              {additionalImages.map((img, index) => (
                <div
                  key={index}
                  onClick={handleBookingClick}
                  className="h-[90px] md:h-[160px] bg-black bg-cover bg-center hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ backgroundImage: `url(${img})` }}
                ></div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 bg-black p-3 md:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 bg-[#c51f2e] text-white text-[10px] font-bold px-2 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 fill-white" />
                {formatAgeRating(quest.ageRating)}
              </span>
              <span className="inline-flex items-center gap-2 bg-white/20 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                <span className="flex items-center gap-1">
                  {Array.from({ length: difficultyMax }).map((_, index) => (
                    <Key
                      key={index}
                      className={`w-4 h-4 ${
                        index < filledKeys ? 'text-yellow-300' : 'text-white/40'
                      }`}
                    />
                  ))}
                </span>
                {difficultyValue}/{difficultyMax}
              </span>
            </div>
            <button
              onClick={handleBookingClick}
              className="bg-[#c51f2e] hover:bg-[#a61b28] text-white font-bold py-2 px-4 transition-all shadow-lg text-[10px] tracking-wider uppercase font-display w-full"
            >
              Записаться на квест
            </button>
            <button
              className="text-white/90 hover:text-white font-semibold text-[10px] tracking-wide transition-all underline decoration-dashed underline-offset-4 text-left"
              onClick={(event) => handleActionClick(event, giftUrl)}
            >
              {giftLabel}
            </button>
            {quest.videoUrl && (
              <button
                className="flex items-center gap-2 text-white/90 hover:text-white transition-all"
                onClick={(event) => handleActionClick(event, quest.videoUrl)}
              >
                <span className="w-6 h-6 bg-[#c51f2e] rounded-full flex items-center justify-center">
                  <Youtube className="w-4 h-4 text-white" />
                </span>
                <span className="font-semibold text-[10px] tracking-wide uppercase font-display">
                  Видео
                </span>
              </button>
            )}
          </div>

          <div className="absolute -top-3 -right-3 md:-top-6 md:-right-6 z-30">
            <img
              src={durationBadgeUrl}
              alt={`${quest.duration} минут`}
              className="w-12 h-12 md:w-24 md:h-24 object-contain drop-shadow-2xl"
            />
          </div>

          {quest.isNew && (
            <div className="absolute top-0 right-0 z-20 w-36 h-36 md:w-60 md:h-60 overflow-hidden pointer-events-none">
              <div className="absolute top-6 right-[-56px] md:top-16 md:right-[-96px] w-56 md:w-[420px] bg-[#c51f2e] text-white text-center py-1.5 md:py-3 transform rotate-45 shadow-2xl">
                <span className="text-[10px] md:text-xl font-bold tracking-wider font-display">NEW</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/95 text-gray-900 p-3 md:p-4 border-t border-white/90">
          <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1.2fr_2fr] gap-2 md:gap-6">
            <div className="grid gap-2 md:rounded-lg md:border md:border-gray-200/80 md:bg-white md:px-3 md:py-2 md:shadow-sm">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-[#c51f2e] flex-shrink-0 mt-0.5" />
                <div className="text-[11px] md:text-xs">
                  <div className="font-bold text-gray-900 mb-0.5 uppercase tracking-wide font-display">
                    Возраст
                  </div>
                  <div className="text-gray-700 leading-snug">{quest.ageRestriction}</div>
                </div>
              </div>
              <div className="hidden md:block h-px bg-gray-200/70"></div>
              <div className="flex items-start gap-2">
                <Timer className="w-4 h-4 md:w-5 md:h-5 text-[#c51f2e] flex-shrink-0 mt-0.5" />
                <div className="text-[11px] md:text-xs">
                  <div className="font-bold text-gray-900 mb-0.5 uppercase tracking-wide font-display">
                    Время
                  </div>
                  <div className="text-gray-700">{quest.duration} минут</div>
                </div>
              </div>
              <div className="hidden md:block h-px bg-gray-200/70"></div>
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

            <div className="grid gap-2 md:rounded-lg md:border md:border-gray-200/80 md:bg-white md:px-3 md:py-2 md:shadow-sm">
              {quest.addresses && quest.addresses.length > 0 && (
                <>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-[#c51f2e] flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] md:text-xs text-gray-700 leading-snug">
                      {quest.addresses.map((addr, idx) => (
                        <div key={idx}>{addr}</div>
                      ))}
                    </div>
                  </div>
                  {quest.phones && quest.phones.length > 0 && (
                    <div className="hidden md:block h-px bg-gray-200/70"></div>
                  )}
                </>
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
            </div>

            <div className="md:rounded-lg md:border md:border-gray-200/80 md:bg-white md:px-3 md:py-2 md:shadow-sm">
              <p className="text-[11px] md:text-sm text-gray-700 leading-relaxed md:max-h-40 md:overflow-hidden">
                {quest.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
