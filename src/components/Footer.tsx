import { useEffect, useMemo, useState } from 'react';
import { Instagram, Link2, Mail, Phone, Send, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Settings } from '../lib/types';

interface FooterProps {
  setCurrentPage: (page: string) => void;
}

export default function Footer({ setCurrentPage }: FooterProps) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const socials = useMemo(
    () =>
      [
        {
          key: 'vk',
          url: settings?.vkUrl,
          label: 'VK',
          icon: Link2,
          iconUrl: settings?.vkIconUrl,
          iconColor: settings?.vkIconColor,
          background: settings?.vkIconBackground,
        },
        {
          key: 'youtube',
          url: settings?.youtubeUrl,
          label: 'YouTube',
          icon: Youtube,
          iconUrl: settings?.youtubeIconUrl,
          iconColor: settings?.youtubeIconColor,
          background: settings?.youtubeIconBackground,
        },
        {
          key: 'instagram',
          url: settings?.instagramUrl,
          label: 'Instagram',
          icon: Instagram,
          iconUrl: settings?.instagramIconUrl,
          iconColor: settings?.instagramIconColor,
          background: settings?.instagramIconBackground,
        },
        {
          key: 'telegram',
          url: settings?.telegramUrl,
          label: 'Telegram',
          icon: Send,
          iconUrl: settings?.telegramIconUrl,
          iconColor: settings?.telegramIconColor,
          background: settings?.telegramIconBackground,
        },
      ].filter((item) => item.url),
    [settings]
  );

  const address = settings?.address?.trim();
  const phone = settings?.phone?.trim();
  const email = settings?.email?.trim();

  return (
    <footer className="bg-black/30 backdrop-blur-sm mt-12 md:mt-20 py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap justify-center md:justify-between items-center mb-4 md:mb-6">
          <nav className="flex flex-wrap justify-center gap-3 md:gap-6 text-white/80 text-xs md:text-sm">
            <Link to="/about" className="hover:text-white transition-colors">
              О проекте
            </Link>
            <Link to="/rules" className="hover:text-white transition-colors">
              Правила игры
            </Link>
            <Link to="/certificate" className="hover:text-white transition-colors">
              Подарочные сертификаты
            </Link>
            <Link to="/reviews" className="hover:text-white transition-colors">
              Отзывы
            </Link>
            <Link to="/promotions" className="hover:text-white transition-colors">
              Акции
            </Link>
            <Link to="/tea-zones" className="hover:text-white transition-colors">
              Зоны для чаепития
            </Link>
          </nav>
        </div>

        <div className="border-t border-white/20 pt-4 md:pt-6 space-y-4">
          <div className="grid gap-3 text-white/80 text-xs md:text-sm md:grid-cols-3 items-center">
            <div className="text-center md:text-left">
              {address && <div>{address}</div>}
            </div>
            <div className="flex justify-center">
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="w-3 h-3 md:w-4 md:h-4" />
                  {email}
                </a>
              )}
            </div>
            <div className="flex justify-center md:justify-end">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Phone className="w-3 h-3 md:w-4 md:h-4" />
                  {phone}
                </a>
              )}
            </div>
          </div>

          {socials.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {socials.map((social) => {
                const Icon = social.icon;
                const backgroundStyle = social.background ? { backgroundColor: social.background } : undefined;
                const iconColorStyle = social.iconColor ? { color: social.iconColor } : undefined;
                return (
                  <a
                    key={social.key}
                    href={social.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-8 h-8 md:w-10 md:h-10 bg-red-600 hover:bg-red-700 rounded flex items-center justify-center transition-colors"
                    style={backgroundStyle}
                  >
                    {social.iconUrl ? (
                      <img
                        src={social.iconUrl}
                        alt={social.label}
                        className="w-4 h-4 md:w-5 md:h-5 object-contain"
                      />
                    ) : (
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" style={iconColorStyle} />
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
