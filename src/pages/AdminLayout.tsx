import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Calendar, Settings, ListChecks, FileText, Info, Award, MessageSquare, Tag } from 'lucide-react';

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md border-b-4 border-red-600">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              Админ-панель <span className="text-red-600">Quest Room</span>
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Выход
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-4rem)]">
          <nav className="py-6">
            <NavLink to="/adm/quests" className={navLinkClass}>
              <ListChecks className="w-5 h-5" />
              Квесты
            </NavLink>
            <NavLink to="/adm/bookings" className={navLinkClass}>
              <Calendar className="w-5 h-5" />
              Бронь
            </NavLink>
            <NavLink to="/adm/rules" className={navLinkClass}>
              <FileText className="w-5 h-5" />
              Правила игры
            </NavLink>
            <NavLink to="/adm/about" className={navLinkClass}>
              <Info className="w-5 h-5" />
              О проекте
            </NavLink>
            <NavLink to="/adm/certificates" className={navLinkClass}>
              <Award className="w-5 h-5" />
              Сертификаты
            </NavLink>
            <NavLink to="/adm/reviews" className={navLinkClass}>
              <MessageSquare className="w-5 h-5" />
              Отзывы
            </NavLink>
            <NavLink to="/adm/promotions" className={navLinkClass}>
              <Tag className="w-5 h-5" />
              Акции
            </NavLink>
            <NavLink to="/adm/settings" className={navLinkClass}>
              <Settings className="w-5 h-5" />
              Настройки
            </NavLink>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
