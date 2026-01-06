'use client';

import { useState, FormEvent, useEffect } from 'react';
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
import { useLanguage } from '@/components/providers/LanguageProvider';

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

export default function TradeForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData
}: TradeFormProps) {
  const { t } = useLanguage();

  const DIRECTION_OPTIONS = [
    { value: 'Buy', label: t('filters.direction_buy') },
    { value: 'Sell', label: t('filters.direction_sell') },
  ];

  const OPTION_TYPE_OPTIONS = [
    { value: 'Call', label: t('filters.type_call') },
    { value: 'Put', label: t('filters.type_put') },
  ];

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
        validationErrors.push({ field: 'expiry_date', message: t('trade.validation_error') });
      } else if (isWeekend(input.expiry_date)) {
        validationErrors.push({ field: 'expiry_date', message: t('trade.weekend_error') });
      }

      if (!input.strike_price) {
        validationErrors.push({ field: 'strike_price', message: t('trade.validation_error') });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(input.trade_date!) >= today) {
        validationErrors.push({ field: 'trade_date', message: t('trade.date_error_expired') });
      }
    }

    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors);
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        // Use localized generic error message for basic validations
        errorMap[err.field] = t('trade.validation_error');
      });
      setErrors(errorMap);
      return;
    }

    console.log('Submitting trade:', input);
    try {
      await onSubmit(input);
    } catch (err) {
      console.error('Submission error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 items-stretch">
        {/* Toggle for Expired Option */}
        <div className="mb-2">
          <Switch 
            label={t('trade.expired_option')} 
            checked={isExpired}
            onCheckedChange={(checked) => {
              setIsExpired(checked);
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
        </div>

        {/* Row 1: Stock Symbol, Option Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <StockSelect
            label={t('trade.stock_symbol')}
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
            label={t('trade.option_type')}
            options={OPTION_TYPE_OPTIONS}
            value={formData.option_type}
            onChange={(e) => handleChange('option_type', e.target.value)}
            placeholder={t('trade.select_type')}
            error={errors.option_type}
            required
          />
        </div>

        {/* Row 2: Options of the stock (Date and Strike) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {isExpired ? (
            <Input
              label={t('trade.expiration_date')}
              type="date"
              value={formData.expiry_date}
              onChange={(e) => {
                const date = e.target.value;
                if (isWeekend(date)) {
                  setErrors(prev => ({ ...prev, expiry_date: t('trade.weekend_error') }));
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
              label={t('trade.expiration_date')}
              options={expirationDates.map(d => ({ value: d.strikeTime, label: d.strikeTime }))}
              value={formData.expiry_date}
              onChange={(e) => handleChange('expiry_date', e.target.value)}
              placeholder={loadingExpiries ? t('common.loading') : t('trade.select_expiry')}
              error={errors.expiry_date}
              required
              disabled={!formData.stock_symbol || loadingExpiries}
            />
          )}

          {isExpired ? (
            <Input
              label={t('trade.strike_price')}
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
              label={t('trade.strike_price')}
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
              placeholder={loadingOptions ? t('trade.loading_options') : t('trade.select_strike')}
              error={errors.futu_code || errors.strike_price}
              required
              disabled={!formData.expiry_date || !formData.option_type || loadingOptions}
            />
          )}
        </div>

        {/* Row 3: Direction, Trade Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Select
            label={t('trade.direction')}
            options={DIRECTION_OPTIONS}
            value={formData.direction}
            onChange={(e) => handleChange('direction', e.target.value)}
            placeholder={t('trade.select_direction')}
            error={errors.direction}
            required
          />
          <Input
            label={t('trade.trade_date')}
            type="date"
            value={formData.trade_date}
            onChange={(e) => {
              const date = e.target.value;
              if (isExpired) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (new Date(date) >= today) {
                  setErrors(prev => ({ ...prev, trade_date: t('trade.date_error_expired') }));
                } else {
                  setErrors(prev => ({ ...prev, trade_date: '' }));
                }
              }
              handleChange('trade_date', date);
            }}
            error={errors.trade_date}
            required
          />
        </div>

        {/* Row 4: Premium, Contract */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Input
            label={t('trade.premium_label')}
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
            label={t('trade.contracts_label')}
            type="number"
            min="1"
            step="1"
            placeholder="e.g., 10"
            value={formData.contracts}
            onChange={(e) => handleChange('contracts', e.target.value)}
            error={errors.contracts}
            required
          />
        </div>

        {/* Total Premium Preview */}
        {totalPremium > 0 && (
          <div className="w-full p-3 bg-muted rounded-lg border border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('trade.total_premium')}</span>
              <span className="text-lg font-semibold text-green-500">
                HKD {totalPremium.toLocaleString('en-HK', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {premium} × {contracts} {t('trade.contracts_label').toLowerCase()} × {formData.shares_per_contract} {t('exposure.shares_unit').toLowerCase()}
            </p>
          </div>
        )}

        {/* Row 5: Fee and Margin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Input
            label={t('trade.fee_label')}
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 50.00"
            value={formData.fee}
            onChange={(e) => handleChange('fee', e.target.value)}
            error={errors.fee}
          />
          <Input
            label={t('trade.margin_label')}
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="e.g., 20"
            value={formData.margin_percent}
            onChange={(e) => handleChange('margin_percent', e.target.value)}
            error={errors.margin_percent}
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" isLoading={isLoading}>
            {initialData ? t('trade.save_changes') : t('trade.open_trade')}
          </Button>
        </div>
      </div>
    </form>
  );
}
