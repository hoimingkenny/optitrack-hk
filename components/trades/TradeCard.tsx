'use client';

import { Box, Flex, SimpleGrid, HStack, Text } from '@chakra-ui/react';
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
    <Card>
      {/* Header */}
      <Flex alignItems="flex-start" justifyContent="space-between" mb={3}>
        <HStack gap={2}>
          <Text fontSize="lg" fontWeight="semibold" color="fg.default">{trade.stock_symbol}</Text>
          <DirectionBadge direction={trade.direction} />
          <StatusBadge status={trade.status} />
        </HStack>
        {trade.status !== 'Open' && pnl.netPNL !== 0 && (
          <Text fontSize="lg" fontWeight="bold" className={getPNLColorClass(pnl.netPNL)}>
            {formatPNL(pnl.netPNL)}
          </Text>
        )}
      </Flex>

      {/* Details Grid */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} fontSize="sm" mb={4}>
        <Box>
          <Text color="fg.muted">Strike</Text>
          <Text color="fg.default">{formatHKD(trade.strike_price)}</Text>
        </Box>
        <Box>
          <Text color="fg.muted">Expiry</Text>
          <Text color="fg.default">{formatDateForDisplay(trade.expiry_date)}</Text>
          {isOpen && (
            <Text fontSize="xs" color={daysToExpiry <= 7 ? 'orange.400' : 'fg.subtle'}>
              {getRelativeTimeString(trade.expiry_date)}
            </Text>
          )}
        </Box>
        <Box>
          <Text color="fg.muted">Premium</Text>
          <Text color="fg.default">{formatHKD(trade.premium)}/share</Text>
        </Box>
        <Box>
          <Text color="fg.muted">Total</Text>
          <Text color="green.400">{formatHKD(trade.total_premium)}</Text>
        </Box>
      </SimpleGrid>

      {/* Secondary Info */}
      <HStack gap={4} fontSize="xs" color="fg.subtle" mb={4}>
        <Text>{trade.contracts} contract{trade.contracts > 1 ? 's' : ''}</Text>
        <Text>×</Text>
        <Text>{trade.shares_per_contract} shares</Text>
        {holdDays > 0 && (
          <>
            <Text>•</Text>
            <Text>{holdDays} days held</Text>
          </>
        )}
        {trade.fee > 0 && (
          <>
            <Text>•</Text>
            <Text>Fee: {formatHKD(trade.fee)}</Text>
          </>
        )}
      </HStack>

      {/* Actions */}
      <Flex alignItems="center" justifyContent="flex-end" gap={2} pt={3} borderTopWidth="1px" borderColor="border.default">
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
      </Flex>
    </Card>
  );
}
