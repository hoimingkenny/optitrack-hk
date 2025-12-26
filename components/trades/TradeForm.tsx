'use client';

import { useState, FormEvent } from 'react';
import { Box, SimpleGrid, VStack, Text, Flex } from '@chakra-ui/react';
import { NewTradeInput, TradeDirection } from '@/utils/types/trades';
import { validateTradeInput, sanitizeStockSymbol, parseNumberInput } from '@/utils/helpers/validators';
import { calculateTotalPremium, DEFAULT_SHARES_PER_CONTRACT } from '@/utils/helpers/pnl-calculator';
import { formatDateForInput } from '@/utils/helpers/date-helpers';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';

interface TradeFormProps {
  onSubmit: (data: NewTradeInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const DIRECTION_OPTIONS = [
  { value: 'Sell Put', label: 'Sell Put' },
  { value: 'Sell Call', label: 'Sell Call' },
  { value: 'Buy Put', label: 'Buy Put' },
  { value: 'Buy Call', label: 'Buy Call' },
];

export default function TradeForm({ onSubmit, onCancel, isLoading = false }: TradeFormProps) {
  const [formData, setFormData] = useState({
    stock_symbol: '',
    direction: '' as TradeDirection | '',
    strike_price: '',
    expiry_date: '',
    premium: '',
    contracts: '',
    shares_per_contract: String(DEFAULT_SHARES_PER_CONTRACT),
    fee: '',
    stock_price: '',
    hsi: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate total premium preview
  const premium = parseNumberInput(formData.premium) || 0;
  const contracts = parseNumberInput(formData.contracts) || 0;
  const sharesPerContract = parseNumberInput(formData.shares_per_contract) || DEFAULT_SHARES_PER_CONTRACT;
  const totalPremium = calculateTotalPremium(premium, contracts, sharesPerContract);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const input: Partial<NewTradeInput> = {
      stock_symbol: sanitizeStockSymbol(formData.stock_symbol),
      direction: formData.direction as TradeDirection,
      strike_price: parseNumberInput(formData.strike_price),
      expiry_date: formData.expiry_date,
      premium: parseNumberInput(formData.premium),
      contracts: parseNumberInput(formData.contracts),
      shares_per_contract: parseNumberInput(formData.shares_per_contract) || DEFAULT_SHARES_PER_CONTRACT,
      fee: parseNumberInput(formData.fee),
      stock_price: parseNumberInput(formData.stock_price),
      hsi: parseNumberInput(formData.hsi),
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

    await onSubmit(input as NewTradeInput);
  };

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Open New Trade</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent>
          <VStack gap={4}>
            {/* Row 1: Symbol and Direction */}
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
              <Input
                label="Stock Symbol"
                placeholder="e.g., 03690.HK"
                value={formData.stock_symbol}
                onChange={(e) => handleChange('stock_symbol', e.target.value)}
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
            </SimpleGrid>

            {/* Row 2: Strike and Expiry */}
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
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
                min={formatDateForInput(new Date())}
                value={formData.expiry_date}
                onChange={(e) => handleChange('expiry_date', e.target.value)}
                error={errors.expiry_date}
                required
              />
            </SimpleGrid>

            {/* Row 3: Premium, Contracts, Shares per Contract */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} w="full">
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
              <Input
                label="Shares/Contract"
                type="number"
                min="1"
                step="1"
                value={formData.shares_per_contract}
                onChange={(e) => handleChange('shares_per_contract', e.target.value)}
                error={errors.shares_per_contract}
                helperText="Default: 500"
              />
            </SimpleGrid>

            {/* Total Premium Preview */}
            {totalPremium > 0 && (
              <Box w="full" p={3} bg="gray.800" borderRadius="lg" borderWidth="1px" borderColor="gray.700">
                <Flex justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="gray.400">Total Premium:</Text>
                  <Text fontSize="lg" fontWeight="semibold" color="green.400">
                    HKD {totalPremium.toLocaleString('en-HK', { minimumFractionDigits: 2 })}
                  </Text>
                </Flex>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {premium} × {contracts} contracts × {sharesPerContract} shares
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
