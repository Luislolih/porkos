export default function DataTable({
  columns = [],
  data = [],
  renderRow,
  keyExtractor,
  emptyState,
  className = '',
}) {
  if (data.length === 0 && emptyState) {
    return emptyState;
  }

  return (
    <div
      className={`
        w-full overflow-hidden rounded-2xl border border-[var(--color-porkos-border)]
        bg-[var(--color-porkos-surface)] shadow-lg ${className}
      `}
    >
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#15151A] text-zinc-400 font-bold uppercase tracking-wider text-[11px] border-b border-[var(--color-porkos-border)]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-3 sm:px-4 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-porkos-border)]/60">
            {data.map((item, index) => {
              if (renderRow) {
                return renderRow(item, index);
              }
              const rowKey = keyExtractor ? keyExtractor(item, index) : item.id || index;
              return (
                <tr
                  key={rowKey}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      className={`px-3 sm:px-4 py-3 text-zinc-200 ${col.align === 'right' ? 'text-right font-medium' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(item, index) : item[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
