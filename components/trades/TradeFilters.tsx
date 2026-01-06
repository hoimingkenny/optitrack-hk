'use client';

import { useState, useEffect } from 'react';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import { OptionFilters } from '@/db/schema';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface TradeFiltersProps {
  filters: OptionFilters;
  onFilterChange: (filters: OptionFilters) => void;
  stockSymbols: string[];
}

// Remove old constant definitions since they are now defined inside the component
// const STATUS_OPTIONS = ...
// const DIRECTION_OPTIONS = ...
// const OPTION_TYPE_OPTIONS = ...

export default function TradeFiltersComponent({ 
  filters, 
  onFilterChange, 
  stockSymbols 
}: TradeFiltersProps) {
  const { t } = useLanguage();

  const STATUS_OPTIONS = [
    { value: 'ALL', label: t('filters.all_status') },
    { value: 'Open', label: t('filters.status_open') },
    { value: 'Closed', label: t('filters.status_closed') },
    { value: 'Expired', label: t('filters.status_expired') },
    { value: 'Exercised', label: t('filters.status_exercised') },
    { value: 'Lapsed', label: t('filters.status_lapsed') },
  ];

  const DIRECTION_OPTIONS = [
    { value: 'ALL', label: t('filters.all_directions') },
    { value: 'Buy', label: t('filters.direction_buy') },
    { value: 'Sell', label: t('filters.direction_sell') },
  ];

  const OPTION_TYPE_OPTIONS = [
    { value: 'ALL', label: t('filters.all_types') },
    { value: 'Call', label: t('filters.type_call') },
    { value: 'Put', label: t('filters.type_put') },
  ];

  const symbolOptions = [
    { value: '', label: t('filters.all_stocks') },
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
          label={t('filters.stock')}
          options={symbolOptions}
          value={filters.stock_symbol || ''}
          onChange={(e) => handleChange('stock_symbol', e.target.value)}
        />
      </Box>
      
      <Box flex="1" minW="120px">
        <Select
          label={t('filters.status')}
          options={STATUS_OPTIONS}
          value={filters.status || 'ALL'}
          onChange={(e) => handleChange('status', e.target.value)}
        />
      </Box>
      
      <Box flex="1" minW="120px">
        <Select
          label={t('filters.direction')}
          options={DIRECTION_OPTIONS}
          value={filters.direction || 'ALL'}
          onChange={(e) => handleChange('direction', e.target.value)}
        />
      </Box>

      <Box flex="1" minW="120px">
        <Select
          label={t('filters.type')}
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
            {t('filters.clear')}
          </Button>
        </Box>
      )}
    </Flex>
  );
}
