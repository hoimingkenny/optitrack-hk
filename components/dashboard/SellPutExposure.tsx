'use client';

import { useMemo, useState } from 'react';
import type { OptionWithSummary } from '@/db/schema';
import { formatHKD } from '@/utils/helpers/pnl-calculator';
import { formatDateToYYYYMMDD } from '@/utils/helpers/date-helpers';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'name' | 'days' | 'net' | 'exposure';
type SortOrder = 'asc' | 'desc';

interface SellPutExposureProps {
  options: OptionWithSummary[];
  timeRange?: string;
}

export default function SellPutExposure({ options, timeRange = 'all' }: SellPutExposureProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [sortField, setSortField] = useState<SortField>('exposure');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredOptions = useMemo(() => {
    const now = new Date();
    let endDateStr: string | null = null;

    const toLocalISO = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = toLocalISO(now);

    if (timeRange === 'end_of_month') {
      const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDateStr = toLocalISO(date);
    } else if (timeRange === 'end_of_next_month') {
      const date = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      endDateStr = toLocalISO(date);
    } else if (timeRange === 'end_of_next_next_month') {
      const date = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      endDateStr = toLocalISO(date);
    } else if (timeRange === 'end_of_year') {
      endDateStr = `${now.getFullYear()}-12-31`;
    }

    return options.filter(o => {
      const expiryStr = typeof o.expiry_date === 'string' ? o.expiry_date.split('T')[0] : toLocalISO(o.expiry_date);
      if (endDateStr && (expiryStr > endDateStr || expiryStr < todayStr)) return false;
      return o.direction === 'Sell' && o.option_type === 'Put' && o.status === 'Open' && o.net_contracts > 0;
    });
  }, [options, timeRange]);

  const top5Items = useMemo(() => {
    const now = new Date();
    const mapped = filteredOptions.map(o => {
      const strikePrice = typeof o.strike_price === 'string' ? parseFloat(o.strike_price) : o.strike_price;
      const sharesPerContract = o.shares_per_contract || 500; 
      const coveringCash = o.net_contracts * sharesPerContract * strikePrice;
      const expiry = new Date(o.expiry_date);
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const optionName = `${o.stock_symbol} ${formatDateToYYYYMMDD(o.expiry_date)} ${strikePrice.toFixed(2)} ${t('exposure.put')}`;
      
      return {
        ...o,
        strikePrice,
        coveringCash,
        daysLeft,
        optionName
      };
    });

    const sortedByExposure = [...mapped].sort((a, b) => b.coveringCash - a.coveringCash);
    return sortedByExposure.slice(0, 5);
  }, [filteredOptions, t]);

  const topSellPuts = useMemo(() => {
    return [...top5Items].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'name':
            comparison = a.optionName.localeCompare(b.optionName);
            break;
          case 'days':
            comparison = a.daysLeft - b.daysLeft;
            break;
          case 'net':
            comparison = a.net_contracts - b.net_contracts;
            break;
          case 'exposure':
            comparison = a.coveringCash - b.coveringCash;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [top5Items, sortField, sortOrder]);

  return (
    <div className="bg-card p-6 rounded-xl border border-border">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        {t('exposure.top5_sell_put')}
      </h2>
      <div className="overflow-auto max-h-[320px]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-card z-10 border-b border-border">
            <tr className="h-11">
              <th 
                className="text-left px-4 cursor-pointer hover:bg-muted transition-colors font-medium text-muted-foreground" 
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  <span>{t('exposure.option_name')}</span>
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center px-4 cursor-pointer hover:bg-muted transition-colors font-medium text-muted-foreground" 
                onClick={() => handleSort('days')}
              >
                <div className="flex items-center gap-1 justify-center">
                  <span>{t('exposure.days')}</span>
                  {sortField === 'days' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center px-4 cursor-pointer hover:bg-muted transition-colors font-medium text-muted-foreground" 
                onClick={() => handleSort('net')}
              >
                <div className="flex items-center gap-1 justify-center">
                  <span>{t('exposure.net')}</span>
                  {sortField === 'net' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-right px-4 cursor-pointer hover:bg-muted transition-colors font-medium text-muted-foreground" 
                onClick={() => handleSort('exposure')}
              >
                <div className="flex items-center gap-1 justify-end">
                  <span>{t('exposure.covering_cash')}</span>
                  {sortField === 'exposure' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {topSellPuts.length > 0 ? (
              topSellPuts.map((option) => (
                <tr 
                  key={option.id}
                  className="h-11 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/option/${option.id}`)}
                >
                  <td className="text-left px-4 font-medium text-foreground">
                    {option.optionName}
                  </td>
                  <td className="text-center px-4 text-muted-foreground">
                    {option.daysLeft}{t('exposure.days_suffix')}
                  </td>
                  <td className="text-center px-4 text-foreground">
                    {option.net_contracts}
                  </td>
                  <td className="text-right px-4 font-medium text-[#D73535]">
                    {formatHKD(option.coveringCash)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="h-11">
                <td colSpan={4} className="text-center text-muted-foreground py-8">
                  {t('exposure.no_sell_puts')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {t('exposure.calculation_note')}
      </p>
    </div>
  );
}
