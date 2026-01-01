'use client';

import { useState, FormEvent } from 'react';
import { Box, SimpleGrid, VStack, Text, Flex } from '@chakra-ui/react';
import { TradeDirection, OptionType } from '@/db/schema';
import { validateTradeInput, sanitizeStockSymbol, parseNumberInput } from '@/utils/helpers/validators';
import { calculateTotalPremium, DEFAULT_SHARES_PER_CONTRACT } from '@/utils/helpers/pnl-calculator';
import { formatDateForInput } from '@/utils/helpers/date-helpers';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StockSelect from '@/components/ui/StockSelect';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';

interface TradeFormData {
  stock_symbol: string;
  shares_per_contract: number;
  direction: TradeDirection | '';
  option_type: OptionType | '';
  strike_price: string;
  expiry_date: string;
  premium: string;
  contracts: string;
  fee?: string;
  stock_price: string;
  hsi: string;
  trade_date?: string;
}

interface TradeFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const DIRECTION_OPTIONS = [
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

const OPTION_TYPE_OPTIONS = [
  { value: 'Call', label: 'Call' },
  { value: 'Put', label: 'Put' },
];

export default function TradeForm({ onSubmit, onCancel, isLoading = false }: TradeFormProps) {
  const [formData, setFormData] = useState<TradeFormData>({
    stock_symbol: '',
    shares_per_contract: DEFAULT_SHARES_PER_CONTRACT,
    direction: '',
    option_type: '',
    strike_price: '',
    expiry_date: '',
    premium: '',
    contracts: '',
    fee: '',
    stock_price: '',
    hsi: '',
    trade_date: formatDateForInput(new Date()),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate total premium preview
  const premium = parseNumberInput(formData.premium) || 0;
  const contracts = parseNumberInput(formData.contracts) || 0;
  const totalPremium = calculateTotalPremium(premium, contracts, formData.shares_per_contract);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const input = {
      stock_symbol: sanitizeStockSymbol(formData.stock_symbol),
      shares_per_contract: formData.shares_per_contract,
      direction: formData.direction as TradeDirection,
      option_type: formData.option_type as OptionType,
      strike_price: parseNumberInput(formData.strike_price),
      expiry_date: formData.expiry_date,
      premium: parseNumberInput(formData.premium),
      contracts: parseNumberInput(formData.contracts),
      fee: parseNumberInput(formData.fee || '0'),
      stock_price: parseNumberInput(formData.stock_price),
      hsi: parseNumberInput(formData.hsi),
      trade_date: formData.trade_date,
    };

    const validationErrors = validateTradeInput(input);
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    await onSubmit(input);
  };

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Open New Trade</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent>
          <VStack gap={4}>
            {/* Row 1: Symbol, Direction, and Option Type */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} w="full">
              <StockSelect
                label="Stock Symbol"
                value={formData.stock_symbol}
                onSelect={(stock) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    stock_symbol: stock.symbol,
                    shares_per_contract: stock.shares_per_contract 
                  }));
                  if (errors.stock_symbol) {
                    setErrors(prev => ({ ...prev, stock_symbol: '' }));
                  }
                }}
                error={errors.stock_symbol}
                required
              />
              <Select
                label="Direction"
                options={DIRECTION_OPTIONS}
                value={formData.direction}
                onChange={(e) => handleChange('direction', e.target.value)}
                placeholder="Select direction"
                error={errors.direction}
                required
              />
              <Select
                label="Option Type"
                options={OPTION_TYPE_OPTIONS}
                value={formData.option_type}
                onChange={(e) => handleChange('option_type', e.target.value)}
                placeholder="Select type"
                error={errors.option_type}
                required
              />
            </SimpleGrid>

            {/* Row 2: Strike, Expiry, and Trade Date */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} w="full">
              <Input
                label="Strike Price (HKD)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 150.00"
                value={formData.strike_price}
                onChange={(e) => handleChange('strike_price', e.target.value)}
                error={errors.strike_price}
                required
              />
              <Input
                label="Expiry Date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleChange('expiry_date', e.target.value)}
                error={errors.expiry_date}
                required
              />
              <Input
                label="Trade Date"
                type="date"
                value={formData.trade_date}
                onChange={(e) => handleChange('trade_date', e.target.value)}
                error={errors.trade_date}
                required
              />
            </SimpleGrid>

            {/* Row 3: Premium and Contracts */}
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
              <Input
                label="Premium (HKD/share)"
                type="number"
                step="0.0001"
                min="0"
                placeholder="e.g., 2.50"
                value={formData.premium}
                onChange={(e) => handleChange('premium', e.target.value)}
                error={errors.premium}
                required
              />
              <Input
                label="Contracts"
                type="number"
                min="1"
                step="1"
                placeholder="e.g., 10"
                value={formData.contracts}
                onChange={(e) => handleChange('contracts', e.target.value)}
                error={errors.contracts}
                required
              />
            </SimpleGrid>

            {/* Total Premium Preview */}
            {totalPremium > 0 && (
              <Box w="full" p={3} bg="bg.muted" borderRadius="lg" borderWidth="1px" borderColor="border.default">
                <Flex justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="fg.muted">Total Premium:</Text>
                  <Text fontSize="lg" fontWeight="semibold" color="green.400">
                    HKD {totalPremium.toLocaleString('en-HK', { minimumFractionDigits: 2 })}
                  </Text>
                </Flex>
                <Text fontSize="xs" color="fg.subtle" mt={1}>
                  {premium} × {contracts} contracts × {formData.shares_per_contract} shares
                </Text>
              </Box>
            )}

            {/* Row 4: Fee, Stock Price, HSI */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} w="full">
              <Input
                label="Fee (HKD)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50.00"
                value={formData.fee}
                onChange={(e) => handleChange('fee', e.target.value)}
                error={errors.fee}
              />
              <Input
                label="Stock Price (HKD)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Current price"
                value={formData.stock_price}
                onChange={(e) => handleChange('stock_price', e.target.value)}
                error={errors.stock_price}
                helperText="For ITM/OTM check"
                required
              />
              <Input
                label="HSI"
                type="number"
                step="0.01"
                min="0"
                placeholder="Hang Seng Index"
                value={formData.hsi}
                onChange={(e) => handleChange('hsi', e.target.value)}
                error={errors.hsi}
                required
              />
            </SimpleGrid>
          </VStack>
        </CardContent>

        <CardFooter>
          <Flex justifyContent="flex-end" gap={3}>
            {onCancel && (
              <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" isLoading={isLoading}>
              Open Trade
            </Button>
          </Flex>
        </CardFooter>
      </form>
    </Card>
  );
}
