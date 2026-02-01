import { Home, Info, FileText, Gift, KeyRound, Flag, Coffee } from 'lucide-react';
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
    { id: 'rules', label: 'Правила игры', icon: FileText, path: '/rules' },
    { id: 'certificate', label: 'Подарочные сертификаты', icon: Gift, path: '/certificate' },
    { id: 'reviews', label: 'Отзывы', icon: KeyRound, path: '/reviews' },
    { id: 'promotions', label: 'Акции', icon: Flag, path: '/promotions' },
    { id: 'tea-zones', label: 'Зоны для чаепития', icon: Coffee, path: '/tea-zones' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-gradient-to-b from-[#0b0f2a]/85 to-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-5">
        <div className="flex flex-col items-center space-y-3 md:space-y-4">
          <Link
            to="/"
            className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer"
          >
            <img
              src="/images/logo.png"
              alt="Вловушке24"
              className="h-14 md:h-28 w-auto object-contain"
            />
          </Link>

          <nav className="w-full bg-[#1c1438]/70 backdrop-blur-sm py-2 md:py-3">
            <div className="grid grid-cols-3 gap-2 md:gap-3 lg:grid-cols-7 px-2 md:px-4">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isLastItem = index === navItems.length - 1;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`flex flex-col items-center gap-1 px-1 py-2 md:space-y-2 md:px-3 md:py-3 md:rounded-lg transition-all md:hover:scale-[1.02] ${
                      isActive(item.path)
                        ? 'text-white md:bg-slate-800/80'
                        : 'text-white/80 md:hover:text-white md:hover:bg-slate-800/40'
                    } ${isLastItem ? 'col-span-3 md:col-span-1' : ''}`}
                  >
                    <Icon className="w-5 h-5 md:w-7 md:h-7" />
                    <span className="text-[11px] md:text-sm whitespace-nowrap text-center leading-tight font-display">
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
