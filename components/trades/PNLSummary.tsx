'use client';

import { Trade, TradeSummary, StockSummary } from '@/utils/types/trades';
import { getFinalPNL, formatHKD, formatPNL, getPNLColorClass, calculatePortfolioPNL } from '@/utils/helpers/pnl-calculator';
import { calculateHoldDays } from '@/utils/helpers/status-calculator';
import Card from '@/components/ui/Card';

interface PNLSummaryProps {
  trades: Trade[];
}

export default function PNLSummary({ trades }: PNLSummaryProps) {
  const summary = calculateTradeSummary(trades);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SummaryCard
        label="Total PNL"
        value={formatPNL(summary.totalPNL)}
        valueClass={getPNLColorClass(summary.totalPNL)}
      />
      <SummaryCard
        label="Win Rate"
        value={`${summary.winRate.toFixed(1)}%`}
        valueClass={summary.winRate >= 50 ? 'text-green-400' : 'text-orange-400'}
        subtitle={`${summary.closedTrades} closed trades`}
      />
      <SummaryCard
        label="Open Trades"
        value={String(summary.openTrades)}
        valueClass="text-blue-400"
      />
      <SummaryCard
        label="Avg Hold Days"
        value={summary.avgHoldDays.toFixed(0)}
        valueClass="text-gray-200"
        subtitle="days"
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  valueClass?: string;
  subtitle?: string;
}

function SummaryCard({ label, value, valueClass = 'text-gray-100', subtitle }: SummaryCardProps) {
  return (
    <Card padding="md">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </Card>
  );
}

// Calculate summary statistics
export function calculateTradeSummary(trades: Trade[]): TradeSummary {
  const totalPNL = calculatePortfolioPNL(trades);
  const openTrades = trades.filter(t => t.status === 'Open').length;
  const closedTrades = trades.filter(t => 
    t.status === 'Closed' || t.status === 'Lapsed' || t.status === 'Exercised'
  );
  
  const winningTrades = closedTrades.filter(t => {
    const pnl = getFinalPNL(t);
    return pnl.netPNL > 0;
  });

  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0;

  const avgHoldDays = closedTrades.length > 0
    ? closedTrades.reduce((sum, t) => sum + calculateHoldDays(t), 0) / closedTrades.length
    : 0;

  return {
    totalTrades: trades.length,
    openTrades,
    closedTrades: closedTrades.length,
    totalPNL,
    winRate,
    avgHoldDays,
  };
}

// Calculate per-stock summary
export function calculateStockSummary(symbol: string, trades: Trade[]): StockSummary {
  const stockTrades = trades.filter(t => t.stock_symbol === symbol);
  const totalPNL = calculatePortfolioPNL(stockTrades);
  
  const closedTrades = stockTrades.filter(t => 
    t.status === 'Closed' || t.status === 'Lapsed' || t.status === 'Exercised'
  );
  
  const winningTrades = closedTrades.filter(t => getFinalPNL(t).netPNL > 0);
  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0;

  const avgHoldDays = closedTrades.length > 0
    ? closedTrades.reduce((sum, t) => sum + calculateHoldDays(t), 0) / closedTrades.length
    : 0;

  return {
    stock_symbol: symbol,
    trades: stockTrades,
    totalPNL,
    winRate,
    avgHoldDays,
    openCount: stockTrades.filter(t => t.status === 'Open').length,
    closedCount: stockTrades.filter(t => t.status === 'Closed').length,
    expiredCount: stockTrades.filter(t => t.status === 'Expired').length,
    exercisedCount: stockTrades.filter(t => t.status === 'Exercised').length,
    lapsedCount: stockTrades.filter(t => t.status === 'Lapsed').length,
  };
}
