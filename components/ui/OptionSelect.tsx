'use client';

import { useState, useEffect, useRef } from 'react';
import { OptionChainItem } from '@/utils/futu/client';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Badge } from '@/components/ui/Badge';
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionSelectProps {
  label?: string;
  error?: string;
  symbol: string;
  expiryDate: string;
  optionType: string;
  value: string; // futu_code
  onSelect: (item: OptionChainItem) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function OptionSelect({ 
  label, 
  error, 
  symbol, 
  expiryDate, 
  optionType,
  value, 
  onSelect, 
  required,
  disabled
}: OptionSelectProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<OptionChainItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch options when criteria change
  useEffect(() => {
    const fetchOptions = async () => {
      if (!symbol || !expiryDate || !optionType) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      try {
        const response = await fetch(`/api/futu/option-chain?symbol=${symbol}&date=${expiryDate}`);
        if (response.ok) {
          const data = await response.json();
          // Filter by option type (1 = Call, 2 = Put)
          const typeNum = optionType === 'Call' ? 1 : 2;
          const filtered = data.filter((item: OptionChainItem) => item.optionType === typeNum);
          setResults(filtered);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error('Failed to fetch options:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, [symbol, expiryDate, optionType]);

  const handleSelect = (item: OptionChainItem) => {
    onSelect(item);
    setIsOpen(false);
  };

  const selectedItem = results.find(r => r.code === value);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-muted-foreground block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <div className="relative" ref={containerRef}>
        <div
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive",
            !disabled && "cursor-pointer"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {selectedItem ? (
            <div className="flex items-center justify-between w-full">
              <span className="font-bold">{selectedItem.strikePrice}</span>
              <span className="text-xs text-muted-foreground">{selectedItem.code}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{t('trade.select_strike')}</span>
          )}
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
        </div>

        {isOpen && !disabled && (
          <div
            className="absolute left-0 right-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length > 0 ? (
              <div className="py-1">
                {results.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border-b border-border/50 last:border-0"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">
                        {t('trade.strike_label').replace('{price}', item.strikePrice.toString())}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t('trade.last_price').replace('{price}', (item.premium || '-').toString())}
                      </span>
                    </div>
                    <Badge variant={item.optionType === 1 ? 'cyan' : 'purple'} className="text-[10px] h-5">
                      {item.optionType === 1 ? 'CALL' : 'PUT'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {symbol && expiryDate ? t('trade.no_options_found') : t('trade.select_stock_expiry')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
