'use client';

import { Box, Heading, Table, Text, HStack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import type { OptionWithSummary } from '@/db/schema';
import { formatHKD } from '@/utils/helpers/pnl-calculator';
import { formatDateToYYYYMMDD } from '@/utils/helpers/date-helpers';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';

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

  // 1. First, always calculate the Top 5 items based on Exposure (Covering Cash)
  // This memo only updates when the filteredOptions change, NOT when sorting changes.
  const top5Items = useMemo(() => {
    const now = new Date();
    const mapped = filteredOptions.map(o => {
      const strikePrice = typeof o.strike_price === 'string' ? parseFloat(o.strike_price) : o.strike_price;
      const sharesPerContract = o.shares_per_contract || 500; 
      
      // Covering Cash should be Breakeven Cost
      // formula: (strike * contracts * shares) - (totalPremium - totalFees)
      // Note: OptionWithSummary has total_pnl, net_contracts, etc. but not raw totalPremium/fees
      // However, we know: netPNL = realizedPNL + unrealizedPNL - fees
      // and totalPremium is approximately the entry value.
      // For accurate calculation, we should use the same logic as the detail page if possible.
      // Since OptionWithSummary doesn't have all summary fields, we'll use what's available.
      // If o.total_pnl is net, then realized income is roughly (total_pnl + unrealized_pnl + fees)
      
      // Let's check if we can get totalPremium from the option object if it was extended
      const opt = o as any;
      const totalPremium = opt.summary?.totalPremium || 0;
      const totalFees = opt.summary?.totalFees || 0;
      
      let coveringCash = o.net_contracts * sharesPerContract * strikePrice;
      if (opt.summary) {
        coveringCash = (strikePrice * o.net_contracts * sharesPerContract) - (totalPremium - totalFees);
      }
      
      const expiry = new Date(o.expiry_date);
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const optionName = `${o.stock_symbol} ${formatDateToYYYYMMDD(o.expiry_date)} ${strikePrice.toFixed(2)}`;
      
      return {
        ...o,
        strikePrice,
        coveringCash,
        daysLeft,
        optionName
      };
    });

    // Sort descending by coveringCash and take top 5
    // Explicitly create a new array and sort it
    const sortedByExposure = [...mapped].sort((a, b) => b.coveringCash - a.coveringCash);
    
    // Log for debugging (will appear in browser console)
    console.log('SellPutExposure: Recalculated Top 5. Top value:', sortedByExposure[0]?.coveringCash);
    
    return sortedByExposure.slice(0, 5);
  }, [filteredOptions]);

  // 2. Then, sort these fixed Top 5 items based on user selection
  const topSellPuts = useMemo(() => {
    // If top5Items is already sliced to 5, this will only sort those 5 items.
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
    <Box 
      bg="bg.surface" 
      p={6} 
      borderRadius="xl" 
      borderWidth="1px" 
      borderColor="border.default"
    >
      <Heading size="md" mb={4} color="fg.default">
        {t('exposure.top5_sell_put')}
      </Heading>
      <Box overflow="auto" maxH="320px">
        <Table.Root size="sm" variant="outline" stickyHeader>
          <Table.Header>
            <Table.Row height="2.75rem">
              <Table.ColumnHeader 
                textAlign="left" 
                px={4} 
                cursor="pointer" 
                onClick={() => handleSort('name')}
                _hover={{ bg: 'bg.muted' }}
              >
                <HStack gap={1}>
                  <Text>{t('exposure.option_name')}</Text>
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                  )}
                </HStack>
              </Table.ColumnHeader>
              <Table.ColumnHeader 
                textAlign="center" 
                px={4} 
                cursor="pointer" 
                onClick={() => handleSort('days')}
                _hover={{ bg: 'bg.muted' }}
              >
                <HStack gap={1} justifyContent="center">
                  <Text>{t('exposure.days')}</Text>
                  {sortField === 'days' && (
                    sortOrder === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                  )}
                </HStack>
              </Table.ColumnHeader>
              <Table.ColumnHeader 
                textAlign="center" 
                px={4} 
                cursor="pointer" 
                onClick={() => handleSort('net')}
                _hover={{ bg: 'bg.muted' }}
              >
                <HStack gap={1} justifyContent="center">
                  <Text>{t('exposure.net')}</Text>
                  {sortField === 'net' && (
                    sortOrder === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                  )}
                </HStack>
              </Table.ColumnHeader>
              <Table.ColumnHeader 
                textAlign="right" 
                px={4} 
                cursor="pointer" 
                onClick={() => handleSort('exposure')}
                _hover={{ bg: 'bg.muted' }}
              >
                <HStack gap={1} justifyContent="flex-end">
                  <Text>{t('exposure.covering_cash')}</Text>
                  {sortField === 'exposure' && (
                    sortOrder === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                  )}
                </HStack>
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {topSellPuts.length > 0 ? (
              topSellPuts.map((option) => {
                return (
                  <Table.Row 
                    key={option.id}
                    height="2.75rem"
                    onClick={() => router.push(`/option/${option.id}`)}
                    cursor="pointer"
                    _hover={{ bg: 'bg.subtle' }}
                    transition="background 0.2s"
                  >
                    <Table.Cell textAlign="left" px={4} fontWeight="medium" color="fg.default">
                      {option.optionName}
                    </Table.Cell>
                    <Table.Cell textAlign="center" px={4} color="fg.muted">
                      {option.daysLeft}
                    </Table.Cell>
                    <Table.Cell textAlign="center" px={4} color="fg.default">
                      {option.net_contracts}
                    </Table.Cell>
                    <Table.Cell textAlign="right" px={4} fontWeight="medium" color="#D73535">
                      {formatHKD(option.coveringCash).replace('HK$', '')}
                    </Table.Cell>
                  </Table.Row>
                );
              })
            ) : (
              <Table.Row height="2.75rem">
                <Table.Cell colSpan={4} textAlign="center" color="fg.muted" py={4}>
                  {t('exposure.no_sell_puts')}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>
      <Text fontSize="xs" color="fg.muted" mt={3}>
        {t('exposure.calculation_note')}
      </Text>
    </Box>
  );
}

// Icons
function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
