import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Buscar...',
  mobilePlaceholder,
  className = '',
  size = 'md',
  autoFocus = false,
  disabled = false,
  ...props
}) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activePlaceholder = isMobile && mobilePlaceholder ? mobilePlaceholder : placeholder;
  const sizeClasses = {
    sm: 'py-1.5 pl-8 pr-7 text-xs min-h-[36px]',
    md: 'py-2.5 pl-9 pr-8 text-sm min-h-[42px]',
    lg: 'py-3 pl-10 pr-9 text-base min-h-[48px]',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5 left-2.5',
    md: 'w-4 h-4 left-3',
    lg: 'w-4 h-4 left-3.5',
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search
        className={`absolute ${iconSizes[size] || iconSizes.md} text-zinc-400 pointer-events-none`}
      />

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={activePlaceholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={`
          w-full bg-[#0D0D10] text-zinc-100 placeholder-zinc-500 font-medium
          border border-[var(--color-porkos-border)] hover:border-zinc-700
          focus:border-[var(--color-porkos-orange)] focus:ring-1 focus:ring-[var(--color-porkos-orange)]/30
          rounded-xl transition-all duration-120 focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size] || sizeClasses.md}
        `}
        {...props}
      />

      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Borrar búsqueda"
          aria-label="Borrar búsqueda"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
