'use client';

import { Table, Box } from '@chakra-ui/react';
import { OptionWithSummary } from '@/db/schema';
import { DirectionBadge, StatusBadge, OptionTypeBadge } from '@/components/ui/Badge';
import { formatHKD, formatPNL } from '@/utils/helpers/pnl-calculator';
import { formatDateForDisplay, formatDateToYYYYMMDD } from '@/utils/helpers/date-helpers';
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
          <Table.Row height="2.75rem">
            <Table.ColumnHeader textAlign="center">Option Name</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Direction</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Net contract</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Net PnL</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Status</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {options.map((option) => {
            const pnlColor = option.total_pnl > 0 ? 'green.400' : option.total_pnl < 0 ? 'red.400' : 'fg.muted';
            const strikePrice = typeof option.strike_price === 'string' ? parseFloat(option.strike_price) : option.strike_price;
            const optionName = `${option.stock_symbol} ${formatDateToYYYYMMDD(option.expiry_date)} ${strikePrice.toFixed(2)} ${option.option_type}`;
            
            return (
              <Table.Row 
                key={option.id}
                height="2.75rem"
                onClick={() => handleRowClick(option.id)}
                cursor="pointer"
                _hover={{ bg: 'bg.subtle' }}
                transition="background 0.2s"
              >
                <Table.Cell textAlign="center" fontWeight="medium" color="fg.default">
                  {optionName}
                </Table.Cell>
                <Table.Cell textAlign="center">
                  <DirectionBadge direction={option.direction} />
                </Table.Cell>
                <Table.Cell textAlign="center" color="fg.default">
                  {option.net_contracts}
                </Table.Cell>
                <Table.Cell textAlign="center" fontWeight="medium" color={pnlColor}>
                  {formatPNL(option.total_pnl)}
                </Table.Cell>
                <Table.Cell textAlign="center">
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
