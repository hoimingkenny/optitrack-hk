'use client';

import { useState, FormEvent, useEffect } from 'react';
import { Box, SimpleGrid, VStack, Text, Flex } from '@chakra-ui/react';
import { TradeDirection, OptionType } from '@/db/schema';
import { validateTradeInput, sanitizeStockSymbol, parseNumberInput } from '@/utils/helpers/validators';
import { calculateTotalPremium, DEFAULT_SHARES_PER_CONTRACT } from '@/utils/helpers/pnl-calculator';
import { formatDateForInput, isWeekend } from '@/utils/helpers/date-helpers';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StockSelect from '@/components/ui/StockSelect';
import { Switch } from '@/components/ui/Switch';
import { OptionChainItem } from '@/utils/futu/client';

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
  trade_date?: string;
  futu_code?: string;
  margin_percent?: string;
}

interface TradeFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<TradeFormData>;
}

const DIRECTION_OPTIONS = [
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

const OPTION_TYPE_OPTIONS = [
  { value: 'Call', label: 'Call' },
  { value: 'Put', label: 'Put' },
];

export default function TradeForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData
}: TradeFormProps) {
  const [formData, setFormData] = useState<TradeFormData>({
    stock_symbol: initialData?.stock_symbol || '',
    shares_per_contract: initialData?.shares_per_contract || DEFAULT_SHARES_PER_CONTRACT,
    direction: initialData?.direction || '',
    option_type: initialData?.option_type || '',
    strike_price: initialData?.strike_price || '',
    expiry_date: initialData?.expiry_date || '',
    premium: initialData?.premium || '',
    contracts: initialData?.contracts || '',
    fee: initialData?.fee || '',
    trade_date: initialData?.trade_date || formatDateForInput(new Date()),
    futu_code: initialData?.futu_code || '',
    margin_percent: initialData?.margin_percent || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExpired, setIsExpired] = useState(false);
  const [expirationDates, setExpirationDates] = useState<any[]>([]);
  const [optionList, setOptionList] = useState<OptionChainItem[]>([]);
  const [loadingExpiries, setLoadingExpiries] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [stockName, setStockName] = useState('');

  // Fetch expiration dates when stock changes
  useEffect(() => {
    const fetchExpiries = async () => {
      if (!formData.stock_symbol) {
        setExpirationDates([]);
        return;
      }
      setLoadingExpiries(true);
      try {
        const res = await fetch(`/api/futu/option-expiration?symbol=${formData.stock_symbol}`);
        if (!res.ok) throw new Error('Failed to fetch expiries');
        const data = await res.json();
        setExpirationDates(data);
      } catch (err) {
        console.error('Failed to fetch expiration dates', err);
        setExpirationDates([]);
      } finally {
        setLoadingExpiries(false);
      }
    };
    
    fetchExpiries();
  }, [formData.stock_symbol]);

  // Fetch option chain when expiry date or type changes
  useEffect(() => {
    const fetchOptions = async () => {
      if (!formData.stock_symbol || !formData.expiry_date || !formData.option_type) {
        setOptionList([]);
        return;
      }
      setLoadingOptions(true);
      try {
        const typeMap = { 'Call': 1, 'Put': 2 };
        const chainRes = await fetch(
          `/api/futu/option-chain?symbol=${formData.stock_symbol}&start=${formData.expiry_date}&end=${formData.expiry_date}&optionType=${typeMap[formData.option_type as 'Call' | 'Put']}&skipSnapshots=true`
        );
        if (chainRes.ok) {
          const chainData = await chainRes.json();
          setOptionList(chainData);
        } else {
          setOptionList([]);
        }
      } catch (err) {
        console.error('Failed to fetch options', err);
        setOptionList([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, [formData.stock_symbol, formData.expiry_date, formData.option_type]);

  // Fetch premium when option code changes (if selected from list)
  useEffect(() => {
    const fetchPremium = async () => {
      if (!formData.futu_code) return;
      
      // If premium is already set (manually or from previous), maybe don't overwrite unless it's a new selection?
      // But we want to auto-fill "Current Premium".
      // We can check if it's a "fresh" selection.
      // For now, just fetch.
      try {
        const res = await fetch(`/api/futu/quote?symbol=${formData.futu_code}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.price) {
            setFormData(prev => ({
              ...prev,
              premium: data.price.toString()
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch premium', err);
      }
    };

    if (formData.futu_code) {
      fetchPremium();
    }
  }, [formData.futu_code]);

  // Calculate total premium preview
  const premium = parseNumberInput(formData.premium) || 0;
  const contracts = parseNumberInput(formData.contracts) || 0;
  const totalPremium = calculateTotalPremium(premium, contracts, formData.shares_per_contract);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'option_type') {
        newData.expiry_date = '';
        newData.futu_code = '';
        newData.strike_price = '';
      } else if (field === 'expiry_date') {
        newData.futu_code = '';
        newData.strike_price = '';
      }
      
      return newData;
    });
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
      futu_code: formData.futu_code,
      stock_name: stockName,
      status: isExpired ? 'Expired' : 'Open',
      premium: parseNumberInput(formData.premium),
      contracts: parseNumberInput(formData.contracts),
      fee: parseNumberInput(formData.fee || '0'),
      margin_percent: parseNumberInput(formData.margin_percent || '0'),
      stock_price: 0, // Auto-fill later
      hsi: 0, // Auto-fill later
      trade_date: formData.trade_date,
    };

    const validationErrors = validateTradeInput(input);
    
    // Additional validations for Expired Option
    if (isExpired) {
      if (!input.expiry_date) {
        validationErrors.push({ field: 'expiry_date', message: 'Expiration date is required' });
      } else if (isWeekend(input.expiry_date)) {
        validationErrors.push({ field: 'expiry_date', message: 'Cannot select weekends (Sat/Sun)' });
      }

      if (!input.strike_price) {
        validationErrors.push({ field: 'strike_price', message: 'Strike price is required' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(input.trade_date!) >= today) {
        validationErrors.push({ field: 'trade_date', message: 'Trade date must be before today for expired options' });
      }
    }

    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors);
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    console.log('Submitting trade:', input);
    try {
      await onSubmit(input);
    } catch (err) {
      console.error('Submission error:', err);
      // Errors should be handled by the parent via toast, 
      // but we log it here for debugging.
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {/* Toggle for Expired Option */}
        <Box mb={2}>
          <Switch 
            label="Expired Option" 
            checked={isExpired}
            onCheckedChange={(details) => {
              setIsExpired(details.checked);
              // Reset some fields when toggling
              setFormData(prev => ({
                ...prev,
                expiry_date: '',
                strike_price: '',
                futu_code: '',
              }));
              setErrors({});
            }}
          />
        </Box>

        {/* Row 1: Stock Symbol, Option Type */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
          <StockSelect
            label="Stock Symbol"
            value={formData.stock_symbol}
            onSelect={(stock) => {
              setFormData(prev => ({ 
                ...prev, 
                stock_symbol: stock.symbol,
                shares_per_contract: stock.shares_per_contract,
                expiry_date: '',
                futu_code: '',
                strike_price: ''
              }));
              setStockName(stock.short_name || stock.symbol);
              if (errors.stock_symbol) {
                setErrors(prev => ({ ...prev, stock_symbol: '' }));
              }
            }}
            error={errors.stock_symbol}
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

        {/* Row 2: Options of the stock (Date and Strike) */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
          {isExpired ? (
            <Input
              label="Expiration Date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => {
                const date = e.target.value;
                if (isWeekend(date)) {
                  setErrors(prev => ({ ...prev, expiry_date: 'Cannot select weekends (Sat/Sun)' }));
                } else {
                  setErrors(prev => ({ ...prev, expiry_date: '' }));
                }
                handleChange('expiry_date', date);
              }}
              error={errors.expiry_date}
              required
            />
          ) : (
            <Select
              label="Expiration Date"
              options={expirationDates.map(d => ({ value: d.strikeTime, label: d.strikeTime }))}
              value={formData.expiry_date}
              onChange={(e) => handleChange('expiry_date', e.target.value)}
              placeholder={loadingExpiries ? 'Loading...' : 'Select expiry'}
              error={errors.expiry_date}
              required
              disabled={!formData.stock_symbol || loadingExpiries}
            />
          )}

          {isExpired ? (
            <Input
              label="Strike Price"
              type="number"
              step="0.01"
              value={formData.strike_price}
              onChange={(e) => handleChange('strike_price', e.target.value)}
              placeholder="e.g., 150.00"
              error={errors.strike_price}
              required
            />
          ) : (
            <Select
              label="Strike Price"
              options={optionList
                .filter(item => {
                  const typeNum = formData.option_type === 'Call' ? 1 : 2;
                  return item.optionType === typeNum;
                })
                .map(item => ({
                  value: item.code,
                  label: `${item.strikePrice.toFixed(2)} (${item.code})`
                }))}
              value={formData.futu_code || ''}
              onChange={(e) => {
                const code = e.target.value;
                const selected = optionList.find(o => o.code === code);
                if (selected) {
                  setFormData(prev => ({
                    ...prev,
                    futu_code: code,
                    strike_price: selected.strikePrice.toString(),
                    shares_per_contract: selected.lotSize || prev.shares_per_contract,
                  }));
                  if (errors.futu_code) setErrors(prev => ({ ...prev, futu_code: '' }));
                }
              }}
              placeholder={loadingOptions ? 'Loading options...' : 'Select strike'}
              error={errors.futu_code || errors.strike_price}
              required
              disabled={!formData.expiry_date || !formData.option_type || loadingOptions}
            />
          )}
        </SimpleGrid>

        {/* Row 3: Direction, Trade Date */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
          <Select
            label="Direction"
            options={DIRECTION_OPTIONS}
            value={formData.direction}
            onChange={(e) => handleChange('direction', e.target.value)}
            placeholder="Select direction"
            error={errors.direction}
            required
          />
          <Input
            label="Trade Date"
            type="date"
            value={formData.trade_date}
            onChange={(e) => {
              const date = e.target.value;
              if (isExpired) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (new Date(date) >= today) {
                  setErrors(prev => ({ ...prev, trade_date: 'Trade date must be before today for expired options' }));
                } else {
                  setErrors(prev => ({ ...prev, trade_date: '' }));
                }
              }
              handleChange('trade_date', date);
            }}
            error={errors.trade_date}
            required
          />
        </SimpleGrid>

        {/* Row 4: Premium, Contract */}
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

        {/* Row 5: Fee and Margin */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
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
            label="Margin %"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="e.g., 20"
            value={formData.margin_percent}
            onChange={(e) => handleChange('margin_percent', e.target.value)}
            error={errors.margin_percent}
          />
        </SimpleGrid>

        <Flex justifyContent="flex-end" gap={3} mt={4}>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isLoading}>
            Open Trade
          </Button>
        </Flex>
      </VStack>
    </form>
  );
}
