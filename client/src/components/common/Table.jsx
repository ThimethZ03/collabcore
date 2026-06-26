import { useState } from 'react';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { cn } from '../../utils/helpers';
import Spinner from './Spinner';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon: EmptyIcon,
  sortable = true,
  onRowClick,
  className,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    return sortConfig.direction === 'desc' ? -cmp : cmp;
  });

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey) return <Minus size={14} className="text-text-muted/50" />;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={14} className="text-primary dark:text-dark-primaryAccent" />
    ) : (
      <ChevronDown size={14} className="text-primary dark:text-dark-primaryAccent" />
    );
  };

  if (loading) {
    return (
      <div className={cn('rounded-xl border bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border', className)}>
        <div className="p-8 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border overflow-hidden bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border dark:border-dark-border bg-surface-input dark:bg-dark-elevated/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                    'text-text-secondary dark:text-text-muted',
                    col.sortable !== false && sortable && 'cursor-pointer select-none hover:text-text-primary dark:hover:text-text-inverted',
                    col.className
                  )}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable !== false && sortable && <SortIcon colKey={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {EmptyIcon && <EmptyIcon size={40} className="text-text-muted/50" />}
                    <p className="text-sm text-text-muted dark:text-text-muted">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr
                  key={row._id || row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-surface-border/50 dark:border-dark-border/50 last:border-0',
                    'hover:bg-surface-input dark:hover:bg-dark-elevated/30',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-text-primary dark:text-text-inverted',
                        col.cellClassName
                      )}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
