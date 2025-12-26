'use client';

import { Trade } from '@/utils/types/trades';
import { getFinalPNL, formatHKD, formatPNL, getPNLColorClass } from '@/utils/helpers/pnl-calculator';
import { formatDateForDisplay, getRelativeTimeString } from '@/utils/helpers/date-helpers';
import { getDaysToExpiry, calculateHoldDays } from '@/utils/helpers/status-calculator';
import Card from '@/components/ui/Card';
import { StatusBadge, DirectionBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface TradeCardProps {
  trade: Trade;
  onClose?: (trade: Trade) => void;
  onView?: (trade: Trade) => void;
  onDelete?: (trade: Trade) => void;
}

export default function TradeCard({ trade, onClose, onView, onDelete }: TradeCardProps) {
  const pnl = getFinalPNL(trade);
  const daysToExpiry = getDaysToExpiry(trade.expiry_date);
  const holdDays = calculateHoldDays(trade);
  const isOpen = trade.status === 'Open';

  return (
    <Card className="hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-100">{trade.stock_symbol}</span>
          <DirectionBadge direction={trade.direction} />
          <StatusBadge status={trade.status} />
        </div>
        {trade.status !== 'Open' && pnl.netPNL !== 0 && (
          <span className={`text-lg font-bold ${getPNLColorClass(pnl.netPNL)}`}>
            {formatPNL(pnl.netPNL)}
          </span>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
        <div>
          <span className="text-gray-500 block">Strike</span>
          <span className="text-gray-200">{formatHKD(trade.strike_price)}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Expiry</span>
          <span className="text-gray-200">{formatDateForDisplay(trade.expiry_date)}</span>
          {isOpen && (
            <span className={`text-xs block ${daysToExpiry <= 7 ? 'text-orange-400' : 'text-gray-500'}`}>
              {getRelativeTimeString(trade.expiry_date)}
            </span>
          )}
        </div>
        <div>
          <span className="text-gray-500 block">Premium</span>
          <span className="text-gray-200">{formatHKD(trade.premium)}/share</span>
        </div>
        <div>
          <span className="text-gray-500 block">Total</span>
          <span className="text-green-400">{formatHKD(trade.total_premium)}</span>
        </div>
      </div>

      {/* Secondary Info */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>{trade.contracts} contract{trade.contracts > 1 ? 's' : ''}</span>
        <span>×</span>
        <span>{trade.shares_per_contract} shares</span>
        {holdDays > 0 && (
          <>
            <span>•</span>
            <span>{holdDays} days held</span>
          </>
        )}
        {trade.fee > 0 && (
          <>
            <span>•</span>
            <span>Fee: {formatHKD(trade.fee)}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
        {onView && (
          <Button size="sm" variant="ghost" onClick={() => onView(trade)}>
            View
          </Button>
        )}
        {isOpen && onClose && (
          <Button size="sm" variant="secondary" onClick={() => onClose(trade)}>
            Close Position
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="ghost" onClick={() => onDelete(trade)}>
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        )}
      </div>
    </Card>
  );
}
