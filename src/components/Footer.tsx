import { Mail, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  setCurrentPage: (page: string) => void;
}

export default function Footer({ setCurrentPage }: FooterProps) {
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
              Сертификаты
            </Link>
            <Link to="/reviews" className="hover:text-white transition-colors">
              Отзывы
            </Link>
            <Link to="/promotions" className="hover:text-white transition-colors">
              Акции
            </Link>
          </nav>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap justify-between items-center gap-4 border-t border-white/20 pt-4 md:pt-6">
          <div className="text-white/80 text-xs md:text-sm space-y-1 text-center md:text-left">
            <div>г. Красноярск, ул. Кирова, д.43</div>
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
              <span>8 (391) 294-59-50</span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 md:w-4 md:h-4" />
                krsk@vlovushke24.ru
              </span>
            </div>
          </div>

          <div className="flex gap-3 md:gap-4">
            <a href="mailto:krsk@vlovushke24.ru" className="w-8 h-8 md:w-10 md:h-10 bg-red-600 hover:bg-red-700 rounded flex items-center justify-center transition-colors">
              <Mail className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </a>
            <a href="https://www.instagram.com/vlovushke_krsk/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-10 md:h-10 bg-red-600 hover:bg-red-700 rounded flex items-center justify-center transition-colors">
              <Instagram className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
