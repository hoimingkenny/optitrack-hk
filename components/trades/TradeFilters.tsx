'use client';

import { Trade, TradeStatus, TradeDirection, TradeFilters } from '@/utils/types/trades';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface TradeFiltersProps {
  filters: TradeFilters;
  onFilterChange: (filters: TradeFilters) => void;
  stockSymbols: string[];
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'Open', label: 'Open' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Exercised', label: 'Exercised' },
  { value: 'Lapsed', label: 'Lapsed' },
];

const DIRECTION_OPTIONS = [
  { value: 'ALL', label: 'All Directions' },
  { value: 'Sell Put', label: 'Sell Put' },
  { value: 'Sell Call', label: 'Sell Call' },
  { value: 'Buy Put', label: 'Buy Put' },
  { value: 'Buy Call', label: 'Buy Call' },
];

export default function TradeFiltersComponent({ 
  filters, 
  onFilterChange, 
  stockSymbols 
}: TradeFiltersProps) {
  const symbolOptions = [
    { value: '', label: 'All Stocks' },
    ...stockSymbols.map(s => ({ value: s, label: s })),
  ];

  const handleChange = (key: keyof TradeFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value === 'ALL' || value === '' ? undefined : value,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = filters.stock_symbol || filters.status || filters.direction;

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex-1 min-w-[150px]">
        <Select
          label="Stock"
          options={symbolOptions}
          value={filters.stock_symbol || ''}
          onChange={(e) => handleChange('stock_symbol', e.target.value)}
        />
      </div>
      
      <div className="flex-1 min-w-[150px]">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={filters.status || 'ALL'}
          onChange={(e) => handleChange('status', e.target.value)}
        />
      </div>
      
      <div className="flex-1 min-w-[150px]">
        <Select
          label="Direction"
          options={DIRECTION_OPTIONS}
          value={filters.direction || 'ALL'}
          onChange={(e) => handleChange('direction', e.target.value)}
        />
      </div>

      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearFilters}
          className="mb-0.5"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}

// Helper to apply filters to trades
export function applyTradeFilters(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter(trade => {
    if (filters.stock_symbol && trade.stock_symbol !== filters.stock_symbol) {
      return false;
    }
    if (filters.status && filters.status !== 'ALL' && trade.status !== filters.status) {
      return false;
    }
    if (filters.direction && filters.direction !== 'ALL' && trade.direction !== filters.direction) {
      return false;
    }
    return true;
  });
}
