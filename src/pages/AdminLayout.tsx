import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  Calendar,
  Settings,
  ListChecks,
  FileText,
  Info,
  Award,
  MessageSquare,
  Tag,
  CalendarClock,
  Menu,
  X,
  ClipboardList,
  TicketPercent,
  CalendarDays,
} from 'lucide-react';

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/adm/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-6 py-3 transition-all font-semibold ${
      isActive
        ? 'bg-red-600 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;
  const navSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-6 py-2 text-sm transition-all font-semibold ${
      isActive
        ? 'bg-red-50 text-red-600'
        : 'text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md border-b-4 border-red-600">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:h-16 md:py-0">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Админ-панель <span className="text-red-600">Quest Room</span>
              </h1>
              <button
                onClick={() => setIsMenuOpen((open) => !open)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-100 md:hidden"
                aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
                type="button"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="break-all">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-300"
              >
                <LogOut className="w-4 h-4" />
                Выход
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <div
          className={`fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden ${
            isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`fixed left-0 top-0 z-40 h-full w-64 bg-white shadow-lg transition-transform md:static md:z-auto md:min-h-[calc(100vh-4rem)] md:translate-x-0 ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="py-6">
            <NavLink to="/adm/quests" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <ListChecks className="w-5 h-5" />
              Квесты
            </NavLink>
            <NavLink to="/adm/bookings" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <Calendar className="w-5 h-5" />
              Бронь
            </NavLink>
            <NavLink to="/adm/pricing" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <CalendarClock className="w-5 h-5" />
              Календарь и цены
            </NavLink>
            <NavLink to="/adm/production-calendar" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <CalendarDays className="w-5 h-5" />
              Производственный календарь
            </NavLink>
            <NavLink to="/adm/rules" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <FileText className="w-5 h-5" />
              Правила игры
            </NavLink>
            <NavLink to="/adm/about" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <Info className="w-5 h-5" />
              О проекте
            </NavLink>
            <NavLink to="/adm/certificates" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <Award className="w-5 h-5" />
              Сертификаты
            </NavLink>
            <div className="ml-6 border-l border-gray-200">
              <NavLink
                to="/adm/certificate-orders"
                className={navSubLinkClass}
                onClick={() => setIsMenuOpen(false)}
              >
                <ClipboardList className="w-4 h-4 text-gray-500" />
                Заявки
              </NavLink>
            </div>
            <NavLink to="/adm/reviews" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <MessageSquare className="w-5 h-5" />
              Отзывы
            </NavLink>
            <NavLink to="/adm/promotions" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <Tag className="w-5 h-5" />
              Акции
            </NavLink>
            <NavLink to="/adm/promo-codes" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <TicketPercent className="w-5 h-5" />
              Промокоды
            </NavLink>
            <NavLink to="/adm/settings" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
              <Settings className="w-5 h-5" />
              Настройки
            </NavLink>
          </nav>
        </aside>

        <main className="flex-1 p-4 pt-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
