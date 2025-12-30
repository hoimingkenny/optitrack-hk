'use client';

import { Table, Box } from '@chakra-ui/react';
import { OptionWithSummary } from '@/db/schema';
import { DirectionBadge, StatusBadge } from '@/components/ui/Badge';
import { formatHKD, formatPNL } from '@/utils/helpers/pnl-calculator';
import { formatDateForDisplay } from '@/utils/helpers/date-helpers';
import { useRouter } from 'next/navigation';

interface OptionsTableProps {
  options: OptionWithSummary[];
}

export default function OptionsTable({ options }: OptionsTableProps) {
  const router = useRouter();

  const handleRowClick = (optionId: string) => {
    router.push(`/option/${optionId}`);
  };

  return (
    <Box 
      overflowX="auto" 
      bg="bg.surface" 
      borderRadius="xl" 
      borderWidth="1px" 
      borderColor="border.default"
    >
      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Symbol</Table.ColumnHeader>
            <Table.ColumnHeader>Direction</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Strike Price</Table.ColumnHeader>
            <Table.ColumnHeader>Expiry</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Contracts</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Total PNL</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {options.map((option) => {
            const pnlColor = option.total_pnl > 0 ? 'green.400' : option.total_pnl < 0 ? 'red.400' : 'fg.muted';
            
            return (
              <Table.Row 
                key={option.id}
                onClick={() => handleRowClick(option.id)}
                cursor="pointer"
                _hover={{ bg: 'bg.subtle' }}
                transition="background 0.2s"
              >
                <Table.Cell fontWeight="medium" color="fg.default">
                  {option.stock_symbol}
                </Table.Cell>
                <Table.Cell>
                  <DirectionBadge direction={option.direction} />
                </Table.Cell>
                <Table.Cell textAlign="right" color="fg.default">
                  {formatHKD(option.strike_price)}
                </Table.Cell>
                <Table.Cell color="fg.muted">
                  {formatDateForDisplay(option.expiry_date)}
                </Table.Cell>
                <Table.Cell textAlign="right" color="fg.default">
                  {option.net_contracts}
                </Table.Cell>
                <Table.Cell textAlign="right" fontWeight="medium" color={pnlColor}>
                  {formatPNL(option.total_pnl)}
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge status={option.status} />
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
