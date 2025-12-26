'use client';

import { useState, FormEvent } from 'react';
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
        <CardContent className="space-y-4">
          {/* Row 1: Symbol and Direction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Row 2: Strike and Expiry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Row 3: Premium, Contracts, Shares per Contract */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {/* Total Premium Preview */}
          {totalPremium > 0 && (
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Premium:</span>
                <span className="text-lg font-semibold text-green-400">
                  HKD {totalPremium.toLocaleString('en-HK', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {premium} × {contracts} contracts × {sharesPerContract} shares
              </p>
            </div>
          )}

          {/* Row 4: Fee, Stock Price, HSI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isLoading}>
            Open Trade
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
