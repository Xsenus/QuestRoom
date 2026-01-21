import { Home, Info, ScrollText, Award, BadgePercent, MessageSquareText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export default function Header({ currentPage, setCurrentPage }: HeaderProps) {
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Домашняя', icon: Home, path: '/' },
    { id: 'about', label: 'О проекте', icon: Info, path: '/about' },
    { id: 'rules', label: 'Правила игры', icon: ScrollText, path: '/rules' },
    { id: 'certificate', label: 'Сертификаты', icon: Award, path: '/certificate' },
    { id: 'reviews', label: 'Отзывы', icon: MessageSquareText, path: '/reviews' },
    { id: 'promotions', label: 'Акции', icon: BadgePercent, path: '/promotions' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-gradient-to-b from-slate-900/80 to-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center space-y-6">
          <Link
            to="/"
            className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer"
          >
            <img
              src="/images/image.png"
              alt="Вловушке24"
              className="h-24 md:h-32 w-auto object-contain"
            />
          </Link>

          <nav className="w-full bg-slate-900/60 backdrop-blur-sm py-4">
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 px-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`flex flex-1 basis-[120px] flex-col items-center space-y-2 px-3 py-3 rounded-lg transition-all hover:scale-[1.02] ${
                      isActive(item.path)
                        ? 'text-white bg-slate-800/80'
                        : 'text-white/80 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-6 h-6 md:w-7 md:h-7" />
                    <span className="text-xs md:text-sm whitespace-nowrap text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
