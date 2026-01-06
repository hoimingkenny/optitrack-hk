'use client';

import { useState, useEffect } from 'react';
import { SimpleGrid, VStack, Text } from '@chakra-ui/react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { TradeDirection, TradeType } from '@/db/schema';
import { formatHKD, calculateTotalPremium } from '@/utils/helpers/pnl-calculator';
import { formatDateForInput, getTodayString } from '@/utils/helpers/date-helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  optionName: string;
  sharesPerContract: number;
  optionDirection: TradeDirection;
  minDate?: string;
  isLoading?: boolean;
}

export default function AddTradeModal({
  isOpen,
  onClose,
  onSubmit,
  optionName,
  sharesPerContract,
  optionDirection,
  minDate,
  isLoading = false,
}: AddTradeModalProps) {
  const { t } = useLanguage();

  const DIRECTION_OPTIONS = [
    { value: 'Buy', label: t('filters.direction_buy') },
    { value: 'Sell', label: t('filters.direction_sell') },
  ];

  const [formData, setFormData] = useState({
    trade_date: getTodayString(),
    direction: 'Buy' as TradeDirection,
    premium: '',
    contracts: '',
    fee: '0',
    margin_percent: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        trade_date: getTodayString(),
        direction: 'Buy' as TradeDirection,
        premium: '',
        contracts: '',
        fee: '0',
        margin_percent: '',
      });
      setErrors({});
    }
  }, [isOpen]);

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

    // Determine trade_type based on some logic or just pass ADD for now
    // Actually, the user input doesn't specify trade_type, but usually it's ADD/REDUCE/CLOSE.
    // We'll let the parent handle the trade_type logic or default to ADD.
    await onSubmit({
      ...formData,
      premium,
      contracts,
      fee: parseFloat(formData.fee) || 0,
      margin_percent: formData.margin_percent ? parseFloat(formData.margin_percent) : undefined,
      totalPremium,
    });
  };

  const isClosing = formData.direction !== optionDirection;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('trade.add_trade')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {t('trade.add_trade')}
          </Button>
        </>
      }
    >
      <VStack gap={4}>
        <Input
          label={t('exposure.option_name')}
          value={optionName}
          disabled
          readOnly
        />
        
        <SimpleGrid columns={2} gap={4} w="full">
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
          />
        </SimpleGrid>

        <SimpleGrid columns={2} gap={4} w="full">
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
        </SimpleGrid>

        <SimpleGrid columns={2} gap={4} w="full">
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
          {!isClosing && (
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
          )}
        </SimpleGrid>
      </VStack>
    </Modal>
  );
}
