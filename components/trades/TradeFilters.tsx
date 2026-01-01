'use client';

import { useState, useEffect } from 'react';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import { OptionFilters } from '@/db/schema';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '@/components/ui/Button';

interface TradeFiltersProps {
  filters: OptionFilters;
  onFilterChange: (filters: OptionFilters) => void;
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
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

const OPTION_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'Call', label: 'Call' },
  { value: 'Put', label: 'Put' },
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

  const handleChange = (key: keyof OptionFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value === 'ALL' || value === '' ? undefined : value,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = filters.stock_symbol || filters.status || filters.direction || filters.option_type;

  return (
    <Flex
      flexWrap="wrap"
      alignItems="flex-end"
      gap={3}
      p={4}
      bg="bg.surface"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.default"
    >
      <Box flex="1" minW="150px">
        <Select
          label="Stock"
          options={symbolOptions}
          value={filters.stock_symbol || ''}
          onChange={(e) => handleChange('stock_symbol', e.target.value)}
        />
      </Box>
      
      <Box flex="1" minW="120px">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={filters.status || 'ALL'}
          onChange={(e) => handleChange('status', e.target.value)}
        />
      </Box>
      
      <Box flex="1" minW="120px">
        <Select
          label="Direction"
          options={DIRECTION_OPTIONS}
          value={filters.direction || 'ALL'}
          onChange={(e) => handleChange('direction', e.target.value)}
        />
      </Box>

      <Box flex="1" minW="120px">
        <Select
          label="Type"
          options={OPTION_TYPE_OPTIONS}
          value={filters.option_type || 'ALL'}
          onChange={(e) => handleChange('option_type', e.target.value)}
        />
      </Box>

      {hasActiveFilters && (
        <Box mb={0.5}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters}
          >
            Clear Filters
          </Button>
        </Box>
      )}
    </Flex>
  );
}
