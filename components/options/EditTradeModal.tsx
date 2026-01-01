'use client';

import { useState, useEffect } from 'react';
import { SimpleGrid, VStack } from '@chakra-ui/react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { TradeDirection, Trade } from '@/db/schema';
import { formatHKD, calculateTotalPremium } from '@/utils/helpers/pnl-calculator';
import { formatDateForInput } from '@/utils/helpers/date-helpers';

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

const DIRECTION_OPTIONS = [
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

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
  const [formData, setFormData] = useState({
    trade_date: '',
    direction: 'Buy' as TradeDirection,
    premium: '',
    contracts: '',
    fee: '0',
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

    await onSubmit(initialData.id, {
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
      title="Edit Trade"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            Save Changes
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
            disabled // Editing direction is not allowed
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
