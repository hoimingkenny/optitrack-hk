'use client';

import { useState, useEffect, useRef } from 'react';
import { Stock } from '@/db/schema';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple hook to detect clicks outside
function useOutsideClick({ ref, handler }: { ref: React.RefObject<HTMLElement | null>, handler: () => void }) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

interface StockSelectProps {
  label?: string;
  error?: string;
  value: string; // symbol
  onSelect: (stock: Stock) => void;
  required?: boolean;
}

export default function StockSelect({ label, error, value, onSelect, required }: StockSelectProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [results, setResults] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useOutsideClick({
    ref: containerRef,
    handler: () => setIsOpen(false),
  });

  // Fetch stocks when search changes
  useEffect(() => {
    const fetchStocks = async () => {
      if (!search || search.length < 1) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      try {
        const response = await fetch(`/api/futu/search?q=${encodeURIComponent(search)}`);
        if (response.ok) {
          const data = await response.json();
          // Map Futu results to Stock interface
          const mappedStocks: Stock[] = data.map((item: any) => ({
            id: item.code,
            symbol: item.code,
            short_name: item.name,
            market: item.market === 1 ? 'HK' : 'US',
            status: 'active',
            shares_per_contract: item.market === 1 ? 500 : 100,
            created_at: new Date(),
            updated_at: new Date()
          }));
          setResults(mappedStocks);
          // Only auto-open if the search text is different from the confirmed value
          if (isFocused && search !== value) setIsOpen(true);
        } else {
          setHasError(true);
          if (isFocused && search !== value) setIsOpen(true);
        }
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
        setHasError(true);
        if (isFocused && search !== value) setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchStocks, 300);
    return () => clearTimeout(timer);
  }, [search, isFocused]);

  // Sync search with value prop
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const handleSelect = (stock: Stock) => {
    onSelect(stock);
    setSearch(stock.symbol);
    setIsOpen(false);
    setIsFocused(false);
  };

  const inputId = label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-muted-foreground mb-1.5"
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      
      <div className="relative w-full">
        <input
          ref={inputRef}
          id={inputId}
          placeholder={t('trade.search_placeholder')}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (search.length > 0) setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {isOpen && search.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-[250px] overflow-y-auto">
          <div className="flex flex-col p-1 gap-0">
            {results.map((stock) => (
              <div
                key={stock.id}
                className="px-3 py-2 cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e: React.MouseEvent) => {
                  e.preventDefault();
                  handleSelect(stock);
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{stock.symbol}</span>
                    <span className="text-xs text-muted-foreground">{stock.short_name}</span>
                  </div>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    {stock.market}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && results.length === 0 && (
              <div className="px-3 py-2">
                <p className="text-sm text-muted-foreground">{t('trade.searching')}</p>
              </div>
            )}

            {!isLoading && !hasError && results.length === 0 && search.length > 0 && (
              <div className="px-3 py-2">
                <p className="text-sm text-muted-foreground">{t('trade.no_results')}</p>
              </div>
            )}

            {!isLoading && hasError && (
              <div className="px-3 py-2">
                <p className="text-sm text-destructive">{t('trade.fetch_failed')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
