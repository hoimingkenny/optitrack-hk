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

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  optionName: string;
  sharesPerContract: number;
  minDate?: string;
  isLoading?: boolean;
}

const DIRECTION_OPTIONS = [
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

export default function AddTradeModal({
  isOpen,
  onClose,
  onSubmit,
  optionName,
  sharesPerContract,
  minDate,
  isLoading = false,
}: AddTradeModalProps) {
  const [formData, setFormData] = useState({
    trade_date: getTodayString(),
    direction: 'Buy' as TradeDirection,
    premium: '',
    contracts: '',
    fee: '0',
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
    if (!formData.trade_date) newErrors.trade_date = 'Date is required';
    if (minDate && new Date(formData.trade_date) < new Date(minDate)) {
      newErrors.trade_date = `Date cannot be before ${minDate}`;
    }
    if (!formData.premium || premium <= 0) newErrors.premium = 'Invalid premium';
    if (!formData.contracts || contracts <= 0) newErrors.contracts = 'Invalid contracts';

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
      totalPremium,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Trade"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            Add Trade
          </Button>
        </>
      }
    >
      <VStack gap={4}>
        <Input
          label="Option Name"
          value={optionName}
          disabled
          readOnly
        />
        
        <SimpleGrid columns={2} gap={4} w="full">
          <Input
            label="Date"
            type="date"
            value={formData.trade_date}
            onChange={(e) => handleChange('trade_date', e.target.value)}
            error={errors.trade_date}
            min={minDate}
            required
          />
          <Select
            label="Direction"
            options={DIRECTION_OPTIONS}
            value={formData.direction}
            onChange={(e) => handleChange('direction', e.target.value as TradeDirection)}
            required
          />
        </SimpleGrid>

        <SimpleGrid columns={2} gap={4} w="full">
          <Input
            label="Premium (HKD/share)"
            type="number"
            step="0.0001"
            value={formData.premium}
            onChange={(e) => handleChange('premium', e.target.value)}
            error={errors.premium}
            required
          />
          <Input
            label="Contracts"
            type="number"
            value={formData.contracts}
            onChange={(e) => handleChange('contracts', e.target.value)}
            error={errors.contracts}
            required
          />
        </SimpleGrid>

        <SimpleGrid columns={2} gap={4} w="full">
          <Input
            label="Total Premium"
            value={formatHKD(totalPremium)}
            disabled
            readOnly
          />
          <Input
            label="Fee (HKD)"
            type="number"
            step="0.01"
            value={formData.fee}
            onChange={(e) => handleChange('fee', e.target.value)}
            error={errors.fee}
          />
        </SimpleGrid>
      </VStack>
    </Modal>
  );
}
