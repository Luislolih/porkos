import { X } from 'lucide-react';

export default function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  helperText,
  error,
  icon: Icon,
  onClear,
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  ...props
}) {
  const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

  return (
    <div className={`space-y-1.5 text-left ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-zinc-300 tracking-wide uppercase"
        >
          {label} {required && <span className="text-[var(--color-porkos-orange)]">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center justify-center">
            <Icon className="w-4 h-4 shrink-0" />
          </div>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            w-full bg-[#0D0D10] text-zinc-100 placeholder-zinc-500 font-medium
            border rounded-xl py-2.5 text-sm transition-all duration-120
            ${Icon ? 'pl-10' : 'pl-3.5'}
            ${onClear && value ? 'pr-9' : 'pr-3.5'}
            ${
              error
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40'
                : 'border-[var(--color-porkos-border)] hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] focus:ring-1 focus:ring-[var(--color-porkos-orange)]/30'
            }
            focus:outline-none disabled:opacity-50 disabled:bg-zinc-900/40 disabled:cursor-not-allowed
            ${inputClassName}
          `}
          {...props}
        />

        {onClear && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Borrar texto"
            aria-label="Borrar texto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error ? (
        <p className="text-[11px] font-semibold text-rose-400 leading-tight">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-zinc-400 leading-tight">{helperText}</p>
      ) : null}
    </div>
  );
}
