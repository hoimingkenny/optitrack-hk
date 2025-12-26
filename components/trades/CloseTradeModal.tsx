'use client';

import { useState, FormEvent } from 'react';
import { Trade, CloseTradeInput } from '@/utils/types/trades';
import { validateCloseTradeInput, parseNumberInput } from '@/utils/helpers/validators';
import { calculateTotalPremium, formatHKD } from '@/utils/helpers/pnl-calculator';
import { formatDateForDisplay, formatDateForInput } from '@/utils/helpers/date-helpers';
import { getDirectionLabel } from '@/utils/helpers/status-calculator';
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Trade Summary */}
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-semibold text-gray-100">{trade.stock_symbol}</span>
            <DirectionBadge direction={trade.direction} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Strike:</span>
              <span className="ml-2 text-gray-100">{formatHKD(trade.strike_price)}</span>
            </div>
            <div>
              <span className="text-gray-400">Expiry:</span>
              <span className="ml-2 text-gray-100">{formatDateForDisplay(trade.expiry_date)}</span>
            </div>
            <div>
              <span className="text-gray-400">Open Premium:</span>
              <span className="ml-2 text-gray-100">{formatHKD(trade.premium)}/share</span>
            </div>
            <div>
              <span className="text-gray-400">Total Premium:</span>
              <span className="ml-2 text-green-400">{formatHKD(trade.total_premium)}</span>
            </div>
          </div>
        </div>

        {/* Close Details */}
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* PNL Preview */}
        {closePremium > 0 && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="text-sm font-medium text-gray-400 mb-3">PNL Preview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Close Total Premium:</span>
                <span className="text-red-400">-{formatHKD(closeTotalPremium)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gross PNL:</span>
                <span className={grossPNL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {grossPNL >= 0 ? '+' : ''}{formatHKD(grossPNL)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Fees:</span>
                <span className="text-gray-300">-{formatHKD(totalFees)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-700">
                <span className="font-medium text-gray-200">Net PNL:</span>
                <span className={`text-lg font-bold ${netPNL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {netPNL >= 0 ? '+' : ''}{formatHKD(netPNL)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Close Position
          </Button>
        </div>
      </form>
    </Modal>
  );
}
