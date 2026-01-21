import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed left-4 bottom-6 md:left-8 md:bottom-8 z-50 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full p-3 shadow-lg hover:bg-white/20 transition-colors"
      aria-label="Прокрутить наверх"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
