'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { TradeDirection, Trade } from '@/db/schema';
import { formatHKD, calculateTotalPremium } from '@/utils/helpers/pnl-calculator';
import { formatDateForInput } from '@/utils/helpers/date-helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface EditTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tradeId: string, data: any) => Promise<void>;
  initialData: Trade | null;
  optionName: string;
  sharesPerContract: number;
  minDate?: string;
  isLoading?: boolean;
  displayDirection?: string;
}

export default function EditTradeModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  optionName,
  sharesPerContract,
  minDate,
  isLoading = false,
  displayDirection,
}: EditTradeModalProps) {
  const { t } = useLanguage();

  const DIRECTION_OPTIONS = [
    { value: 'Buy', label: t('filters.direction_buy') },
    { value: 'Sell', label: t('filters.direction_sell') },
  ];

  const [formData, setFormData] = useState({
    trade_date: '',
    direction: 'Buy' as TradeDirection,
    premium: '',
    contracts: '',
    fee: '0',
    margin_percent: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        trade_date: formatDateForInput(initialData.trade_date),
        direction: (displayDirection as TradeDirection) || 'Buy', // Use display direction for UI
        premium: initialData.premium.toString(),
        contracts: initialData.contracts.toString(),
        fee: initialData.fee.toString(),
        margin_percent: initialData.margin_percent?.toString() || '',
      });
      setErrors({});
    }
  }, [isOpen, initialData, displayDirection]);

  const premium = parseFloat(formData.premium) || 0;
  const contracts = parseInt(formData.contracts) || 0;
  const totalPremium = calculateTotalPremium(premium, contracts, sharesPerContract);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!initialData) return;

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.trade_date) newErrors.trade_date = t('trade.validation_error');
    if (minDate && new Date(formData.trade_date) < new Date(minDate)) {
      newErrors.trade_date = t('trade.date_error_min').replace('{date}', minDate);
    }
    if (!formData.premium || premium <= 0) newErrors.premium = t('trade.validation_error');
    if (!formData.contracts || contracts <= 0) newErrors.contracts = t('trade.validation_error');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(initialData.id, {
      ...formData,
      premium,
      contracts,
      fee: parseFloat(formData.fee) || 0,
      margin_percent: formData.margin_percent ? parseFloat(formData.margin_percent) : undefined,
      totalPremium,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('trade.edit_trade')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {t('trade.save_changes')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label={t('exposure.option_name')}
          value={optionName}
          disabled
          readOnly
        />
        
        <div className="grid grid-cols-2 gap-4 w-full">
          <Input
            label={t('trade.trade_date')}
            type="date"
            value={formData.trade_date}
            onChange={(e) => handleChange('trade_date', e.target.value)}
            error={errors.trade_date}
            min={minDate}
            required
          />
          <Select
            label={t('trade.direction')}
            options={DIRECTION_OPTIONS}
            value={formData.direction}
            onChange={(e) => handleChange('direction', e.target.value as TradeDirection)}
            required
            disabled // Editing direction is not allowed
          />
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <Input
            label={t('trade.premium_label')}
            type="number"
            step="0.0001"
            value={formData.premium}
            onChange={(e) => handleChange('premium', e.target.value)}
            error={errors.premium}
            required
          />
          <Input
            label={t('trade.contracts_label')}
            type="number"
            value={formData.contracts}
            onChange={(e) => handleChange('contracts', e.target.value)}
            error={errors.contracts}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <Input
            label={t('trade.total_premium')}
            value={formatHKD(totalPremium)}
            disabled
            readOnly
          />
          <Input
            label={t('trade.fee_label')}
            type="number"
            step="0.01"
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
            placeholder={t('trade.margin_label').includes('%') ? 'e.g., 20' : 'e.g., 20%'}
            value={formData.margin_percent}
            onChange={(e) => handleChange('margin_percent', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
