'use client';

import { useState, useMemo, useEffect } from 'react';
import { OptionWithSummary } from '@/db/schema';
import { DirectionBadge, StatusBadge } from '@/components/ui/Badge';
import { formatPNL } from '@/utils/helpers/pnl-calculator';
import { formatDateToYYYYMMDD } from '@/utils/helpers/date-helpers';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionsTableProps {
  options: OptionWithSummary[];
}

type SortField = 'name' | 'direction' | 'days' | 'net_contracts' | 'total_pnl' | 'status';
type SortOrder = 'asc' | 'desc';

export default function OptionsTable({ options }: OptionsTableProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Reset to first page when options change (e.g. filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [options.length]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const sortedOptions = useMemo(() => {
    const sorted = [...options].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          // Sort by stock symbol, then expiry, then strike, then type
          comparison = a.stock_symbol.localeCompare(b.stock_symbol);
          if (comparison === 0) {
            comparison = new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
            if (comparison === 0) {
              const strikeA = typeof a.strike_price === 'string' ? parseFloat(a.strike_price) : a.strike_price;
              const strikeB = typeof b.strike_price === 'string' ? parseFloat(b.strike_price) : b.strike_price;
              comparison = strikeA - strikeB;
              if (comparison === 0) {
                comparison = a.option_type.localeCompare(b.option_type);
              }
            }
          }
          break;
        case 'direction':
          comparison = a.direction.localeCompare(b.direction);
          break;
        case 'days':
          const expiryA = new Date(a.expiry_date);
          const expiryB = new Date(b.expiry_date);
          comparison = expiryA.getTime() - expiryB.getTime();
          break;
        case 'net_contracts':
          comparison = a.net_contracts - b.net_contracts;
          break;
        case 'total_pnl':
          comparison = a.total_pnl - b.total_pnl;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return comparison;
    });

    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [options, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedOptions.length / PAGE_SIZE);
  const paginatedOptions = sortedOptions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleRowClick = (optionId: string) => {
    router.push(`/option/${optionId}`);
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto bg-card rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="h-11 bg-muted/50 border-b border-border">
              <SortableHeader 
                label={t('table.option_name')}
                field="name" 
                currentSort={sortField} 
                sortOrder={sortOrder} 
                onSort={handleSort} 
                align="left"
              />
              <SortableHeader 
                label={t('table.direction')}
                field="direction" 
                currentSort={sortField} 
                sortOrder={sortOrder} 
                onSort={handleSort} 
                align="center"
              />
              <SortableHeader 
                label={t('table.days_left')}
                field="days" 
                currentSort={sortField} 
                sortOrder={sortOrder} 
                onSort={handleSort} 
                align="center"
              />
              <SortableHeader 
                label={t('table.net_contract')}
                field="net_contracts" 
                currentSort={sortField} 
                sortOrder={sortOrder} 
                onSort={handleSort} 
                align="center"
              />
              <SortableHeader 
                label={t('table.net_pnl')}
                field="total_pnl" 
                currentSort={sortField} 
                sortOrder={sortOrder} 
                onSort={handleSort} 
                align="center"
              />
              <SortableHeader 
                label={t('table.status')}
                field="status" 
                currentSort={sortField} 
                sortOrder={sortOrder} 
                onSort={handleSort} 
                align="center"
              />
            </tr>
          </thead>
          <tbody>
            {paginatedOptions.map((option) => {
              const pnlColor = option.total_pnl > 0 ? 'text-green-500' : option.total_pnl < 0 ? 'text-red-500' : 'text-muted-foreground';
              const strikePrice = typeof option.strike_price === 'string' ? parseFloat(option.strike_price) : option.strike_price;
              const optionName = `${option.stock_symbol} ${formatDateToYYYYMMDD(option.expiry_date)} ${strikePrice.toFixed(2)} ${option.option_type}`;
              
              // Calculate days to expiry
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const expiry = new Date(option.expiry_date);
              expiry.setHours(0, 0, 0, 0);
              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <tr 
                  key={option.id}
                  className="h-11 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(option.id)}
                >
                  <td className="px-4 text-left font-medium text-foreground">
                    {optionName}
                  </td>
                  <td className="px-4 text-center">
                    <DirectionBadge direction={option.direction} />
                  </td>
                  <td className="px-4 text-center text-muted-foreground">
                    {option.status === 'Open' ? `${daysLeft}d` : '-'}
                  </td>
                  <td className="px-4 text-center text-foreground">
                    {option.net_contracts}
                  </td>
                  <td className={cn("px-4 text-center font-medium", pnlColor)}>
                    {formatPNL(option.total_pnl)}
                  </td>
                  <td className="px-4 text-center">
                    <StatusBadge status={option.status} />
                  </td>
                </tr>
              );
            })}
            {paginatedOptions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t('table.no_options')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
          <p className="text-sm text-muted-foreground">
            {t('table.showing_range')
              .replace('{start}', ((currentPage - 1) * PAGE_SIZE + 1).toString())
              .replace('{end}', Math.min(currentPage * PAGE_SIZE, sortedOptions.length).toString())
              .replace('{total}', sortedOptions.length.toString())}
          </p>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {t('table.previous')}
            </Button>
            <p className="text-sm font-medium">
              {t('table.page_info')
                .replace('{current}', currentPage.toString())
                .replace('{total}', totalPages.toString())}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t('table.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentSort: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  align?: 'left' | 'center' | 'right';
}

function SortableHeader({ label, field, currentSort, sortOrder, onSort, align = 'left' }: SortableHeaderProps) {
  return (
    <th 
      className={cn(
        "px-4 font-semibold text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors",
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => onSort(field)}
    >
      <div className={cn(
        "flex items-center gap-1",
        align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
      )}>
        <span>{label}</span>
        {currentSort === field && (
          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );
}
