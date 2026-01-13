'use client';

import { useState, useMemo, useEffect } from 'react';
import { Table, Box, HStack, Text, Flex } from '@chakra-ui/react';
import { OptionWithSummary } from '@/db/schema';
import { DirectionBadge, StatusBadge } from '@/components/ui/Badge';
import { formatPNL } from '@/utils/helpers/pnl-calculator';
import { formatDateToYYYYMMDD } from '@/utils/helpers/date-helpers';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/components/providers/LanguageProvider';

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
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
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
          const now = new Date();
          now.setHours(0, 0, 0, 0);
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
    <Box>
      <Box 
        overflowX="auto" 
        bg="bg.surface" 
        borderRadius="xl" 
        borderWidth="1px" 
        borderColor="border.default"
      >
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row height="2.75rem">
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
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paginatedOptions.map((option) => {
              const pnlColor = option.total_pnl > 0 ? 'green.400' : option.total_pnl < 0 ? 'red.400' : 'fg.muted';
              const strikePrice = typeof option.strike_price === 'string' ? parseFloat(option.strike_price) : option.strike_price;
              const optionName = `${option.stock_symbol} ${formatDateToYYYYMMDD(option.expiry_date)} ${strikePrice.toFixed(2)} ${option.option_type}`;
              
              // Calculate days to expiry
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const expiry = new Date(option.expiry_date);
              expiry.setHours(0, 0, 0, 0);
              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <Table.Row 
                  key={option.id}
                  height="2.75rem"
                  onClick={() => handleRowClick(option.id)}
                  cursor="pointer"
                  _hover={{ bg: 'bg.subtle' }}
                  transition="background 0.2s"
                >
                  <Table.Cell textAlign="left" px={4} fontWeight="medium" color="fg.default">
                    {optionName}
                  </Table.Cell>
                  <Table.Cell textAlign="center" px={4}>
                    <DirectionBadge direction={option.direction} />
                  </Table.Cell>
                  <Table.Cell textAlign="center" px={4} color="fg.muted">
                    {option.status === 'Open' ? `${daysLeft}d` : '-'}
                  </Table.Cell>
                  <Table.Cell textAlign="center" px={4} color="fg.default">
                    {option.net_contracts}
                  </Table.Cell>
                  <Table.Cell textAlign="center" px={4} fontWeight="medium" color={pnlColor}>
                    {formatPNL(option.total_pnl)}
                  </Table.Cell>
                  <Table.Cell textAlign="center" px={4}>
                    <StatusBadge status={option.status} />
                  </Table.Cell>
                </Table.Row>
              );
            })}
            {paginatedOptions.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={6} textAlign="center" py={4} color="fg.muted">
                  {t('table.no_options')}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Flex justifyContent="space-between" alignItems="center" mt={4} px={2}>
          <Text fontSize="sm" color="fg.muted">
            {t('table.showing_range')
              .replace('{start}', ((currentPage - 1) * PAGE_SIZE + 1).toString())
              .replace('{end}', Math.min(currentPage * PAGE_SIZE, sortedOptions.length).toString())
              .replace('{total}', sortedOptions.length.toString())}
          </Text>
          <HStack gap={2}>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {t('table.previous')}
            </Button>
            <Text fontSize="sm" fontWeight="medium">
              {t('table.page_info')
                .replace('{current}', currentPage.toString())
                .replace('{total}', totalPages.toString())}
            </Text>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t('table.next')}
            </Button>
          </HStack>
        </Flex>
      )}
    </Box>
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
    <Table.ColumnHeader 
      textAlign={align} 
      px={4} 
      cursor="pointer" 
      onClick={() => onSort(field)}
      _hover={{ bg: 'bg.muted' }}
    >
      <HStack gap={1} justifyContent={align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'}>
        <Text>{label}</Text>
        {currentSort === field && (
          sortOrder === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
        )}
      </HStack>
    </Table.ColumnHeader>
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
