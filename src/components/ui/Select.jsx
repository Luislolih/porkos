import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  id,
  value,
  onChange,
  options = [],
  placeholder,
  helperText,
  error,
  required = false,
  disabled = false,
  className = '',
  selectClassName = '',
  ...props
}) {
  const selectId = id || (label ? `select_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

  return (
    <div className={`space-y-1.5 text-left ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold text-zinc-300 tracking-wide uppercase"
        >
          {label} {required && <span className="text-[var(--color-porkos-orange)]">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`
            w-full bg-[#0D0D10] text-zinc-100 font-medium
            border rounded-xl py-2.5 pl-3.5 pr-10 text-sm transition-all duration-120
            appearance-none cursor-pointer
            ${
              error
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40'
                : 'border-[var(--color-porkos-border)] hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] focus:ring-1 focus:ring-[var(--color-porkos-orange)]/30'
            }
            focus:outline-none disabled:opacity-50 disabled:bg-zinc-900/40 disabled:cursor-not-allowed
            ${selectClassName}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-[#121215] text-zinc-500">
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const val = isObj ? opt.value ?? opt.id : opt;
            const text = isObj ? opt.label ?? opt.name ?? opt.id : opt;
            const optDisabled = isObj ? Boolean(opt.disabled) : false;

            return (
              <option
                key={String(val)}
                value={val}
                disabled={optDisabled}
                className="bg-[#121215] text-zinc-100 py-1"
              >
                {text}
              </option>
            );
          })}
        </select>

        <div className="absolute right-3 text-zinc-400 pointer-events-none flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="text-[11px] font-semibold text-rose-400 leading-tight">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-zinc-400 leading-tight">{helperText}</p>
      ) : null}
    </div>
  );
}
