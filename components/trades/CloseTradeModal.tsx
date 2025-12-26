'use client';

import { useState, FormEvent } from 'react';
import { Box, SimpleGrid, VStack, Flex, Text } from '@chakra-ui/react';
import { Trade, CloseTradeInput } from '@/utils/types/trades';
import { validateCloseTradeInput, parseNumberInput } from '@/utils/helpers/validators';
import { calculateTotalPremium, formatHKD } from '@/utils/helpers/pnl-calculator';
import { formatDateForDisplay } from '@/utils/helpers/date-helpers';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { DirectionBadge } from '@/components/ui/Badge';

interface CloseTradeModalProps {
  trade: Trade;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CloseTradeInput) => Promise<void>;
  isLoading?: boolean;
}

export default function CloseTradeModal({ 
  trade, 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false 
}: CloseTradeModalProps) {
  const [formData, setFormData] = useState({
    close_premium: '',
    close_fee: '',
    close_stock_price: '',
    close_hsi: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate preview
  const closePremium = parseNumberInput(formData.close_premium) || 0;
  const closeTotalPremium = calculateTotalPremium(closePremium, trade.contracts, trade.shares_per_contract);
  const closeFee = parseNumberInput(formData.close_fee) || 0;
  const totalFees = (trade.fee || 0) + closeFee;

  // PNL preview
  const isSellDirection = trade.direction === 'Sell Put' || trade.direction === 'Sell Call';
  const grossPNL = isSellDirection 
    ? trade.total_premium - closeTotalPremium 
    : closeTotalPremium - trade.total_premium;
  const netPNL = grossPNL - totalFees;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const input = {
      close_premium: parseNumberInput(formData.close_premium),
      close_fee: parseNumberInput(formData.close_fee),
      close_stock_price: parseNumberInput(formData.close_stock_price),
      close_hsi: parseNumberInput(formData.close_hsi),
    };

    const validationErrors = validateCloseTradeInput(input);
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    await onSubmit(input as CloseTradeInput);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Close Trade Position"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <VStack gap={4}>
          {/* Trade Summary */}
          <Box w="full" p={4} bg="gray.800" borderRadius="lg" borderWidth="1px" borderColor="gray.700">
            <Flex alignItems="center" gap={2} mb={3}>
              <Text fontSize="lg" fontWeight="semibold" color="gray.100">{trade.stock_symbol}</Text>
              <DirectionBadge direction={trade.direction} />
            </Flex>
            
            <SimpleGrid columns={2} gap={4} fontSize="sm">
              <Box>
                <Text as="span" color="gray.400">Strike:</Text>
                <Text as="span" ml={2} color="gray.100">{formatHKD(trade.strike_price)}</Text>
              </Box>
              <Box>
                <Text as="span" color="gray.400">Expiry:</Text>
                <Text as="span" ml={2} color="gray.100">{formatDateForDisplay(trade.expiry_date)}</Text>
              </Box>
              <Box>
                <Text as="span" color="gray.400">Open Premium:</Text>
                <Text as="span" ml={2} color="gray.100">{formatHKD(trade.premium)}/share</Text>
              </Box>
              <Box>
                <Text as="span" color="gray.400">Total Premium:</Text>
                <Text as="span" ml={2} color="green.400">{formatHKD(trade.total_premium)}</Text>
              </Box>
            </SimpleGrid>
          </Box>

          {/* Close Details */}
          <SimpleGrid columns={2} gap={4} w="full">
            <Input
              label="Close Premium (HKD/share)"
              type="number"
              step="0.0001"
              min="0"
              placeholder="e.g., 1.50"
              value={formData.close_premium}
              onChange={(e) => handleChange('close_premium', e.target.value)}
              error={errors.close_premium}
              required
            />
            <Input
              label="Close Fee (HKD)"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 50.00"
              value={formData.close_fee}
              onChange={(e) => handleChange('close_fee', e.target.value)}
              error={errors.close_fee}
            />
          </SimpleGrid>

          <SimpleGrid columns={2} gap={4} w="full">
            <Input
              label="Stock Price (HKD)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Current price"
              value={formData.close_stock_price}
              onChange={(e) => handleChange('close_stock_price', e.target.value)}
            />
            <Input
              label="HSI"
              type="number"
              step="0.01"
              min="0"
              placeholder="Hang Seng Index"
              value={formData.close_hsi}
              onChange={(e) => handleChange('close_hsi', e.target.value)}
            />
          </SimpleGrid>

          {/* PNL Preview */}
          {closePremium > 0 && (
            <Box w="full" p={4} bg="gray.800" borderRadius="lg" borderWidth="1px" borderColor="gray.700">
              <Text fontSize="sm" fontWeight="medium" color="gray.400" mb={3}>PNL Preview</Text>
              <VStack gap={2} fontSize="sm" align="stretch">
                <Flex justifyContent="space-between">
                  <Text color="gray.400">Close Total Premium:</Text>
                  <Text color="red.400">-{formatHKD(closeTotalPremium)}</Text>
                </Flex>
                <Flex justifyContent="space-between">
                  <Text color="gray.400">Gross PNL:</Text>
                  <Text color={grossPNL >= 0 ? 'green.400' : 'red.400'}>
                    {grossPNL >= 0 ? '+' : ''}{formatHKD(grossPNL)}
                  </Text>
                </Flex>
                <Flex justifyContent="space-between">
                  <Text color="gray.400">Total Fees:</Text>
                  <Text color="gray.300">-{formatHKD(totalFees)}</Text>
                </Flex>
                <Flex justifyContent="space-between" pt={2} borderTopWidth="1px" borderColor="gray.700">
                  <Text fontWeight="medium" color="gray.200">Net PNL:</Text>
                  <Text fontSize="lg" fontWeight="bold" color={netPNL >= 0 ? 'green.400' : 'red.400'}>
                    {netPNL >= 0 ? '+' : ''}{formatHKD(netPNL)}
                  </Text>
                </Flex>
              </VStack>
            </Box>
          )}

          {/* Actions */}
          <Flex justifyContent="flex-end" gap={3} w="full" pt={4}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Close Position
            </Button>
          </Flex>
        </VStack>
      </form>
    </Modal>
  );
}
