import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Flecha flotante elegante para volver al inicio cuando las listas son largas
 */
export default function ScrollToTopButton({ threshold = 320 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Volver al inicio"
      title="Subir al inicio"
      className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 p-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-[var(--color-porkos-orange)] border border-zinc-700/80 shadow-2xl backdrop-blur-md active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
    >
      <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
