export default function Skeleton({
  variant = 'text', // 'text' | 'circle' | 'rect' | 'card'
  width,
  height,
  className = '',
}) {
  const variantClasses = {
    text: 'h-4 w-full rounded-md',
    circle: 'rounded-full shrink-0',
    rect: 'rounded-xl',
    card: 'h-36 w-full rounded-2xl',
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      style={style}
      className={`
        bg-zinc-800/60 animate-pulse-subtle border border-zinc-800/40
        ${variantClasses[variant] || variantClasses.rect}
        ${className}
      `}
    />
  );
}
