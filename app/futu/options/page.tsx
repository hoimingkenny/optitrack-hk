'use client';

import { useState, useEffect, useRef } from 'react';
import { OptionExpirationDate, OptionChainItem } from '@/utils/futu/client';
import { toast } from '@/components/ui/Toast';
import { Card, CardContent } from '@/components/ui/Card';
import DashboardNav from '@/components/layout/DashboardNav';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import Modal from '@/components/ui/Modal';
import TradeForm from '@/components/trades/TradeForm';
import { CreateOptionWithTradeInput } from '@/db/schema';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FutuOptionsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/');
          return;
        }
        setUser(session.user);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/');
      } finally {
        setInitialLoading(false);
      }
    };

    if (mounted) {
      checkAuth();
    }
  }, [router, mounted]);

  // Listen for auth changes
  useEffect(() => {
    if (!mounted) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/');
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router, mounted]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
      toast.info(t('auth.sign_out_success'));
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error(t('auth.sign_out_fail'));
    }
  };

  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OptionExpirationDate[]>([]);
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null);
  
  // New state for option chain
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainData, setChainData] = useState<OptionChainItem[]>([]); // Always holds ALL data (Call+Put, All Strikes)

  // Filters
  const [filterType, setFilterType] = useState<number>(1); // 1: CALL, 2: PUT
  const [filterMoneyness, setFilterMoneyness] = useState<number>(0); // 0: ALL, 1: ITM, 2: OTM

  // Search Suggestions
  const [suggestions, setSuggestions] = useState<{ market: number, code: string, name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedOptionForLog, setSelectedOptionForLog] = useState<any>(null);
  const [logLoading, setLogLoading] = useState(false);

  const handleLogTrade = (item: OptionChainItem) => {
    setSelectedOptionForLog({
      stock_symbol: symbol.toUpperCase(),
      option_type: item.optionType === 1 ? 'Call' : 'Put',
      strike_price: item.strikePrice.toString(),
      expiry_date: selectedDate,
      premium: item.premium?.toString() || '',
      contracts: '1',
      stock_price: underlyingPrice?.toString() || '',
      hsi: '20000', // Default fallback
      futu_code: item.code,
    });
    setShowLogModal(true);
  };

  const onSubmitLog = async (data: any) => {
    if (!user) return;
    
    setLogLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const optionData: CreateOptionWithTradeInput = {
        option: {
          stock_symbol: data.stock_symbol,
          direction: data.direction,
          option_type: data.option_type,
          strike_price: data.strike_price,
          expiry_date: data.expiry_date,
          futu_code: data.futu_code,
          status: data.status,
        },
        trade: {
          contracts: data.contracts,
          premium: data.premium,
          fee: data.fee,
          stock_price: data.stock_price,
          hsi: data.hsi,
          trade_date: data.trade_date,
          margin_percent: data.margin_percent,
        },
      };
      
      const response = await fetch('/api/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(optionData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create option');
      }
      
      toast.success(t('futu.option_logged_success'));
      setShowLogModal(false);
    } catch (error: any) {
      toast.error(error.message || t('page.create_option_fail'));
    } finally {
      setLogLoading(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSymbol(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length > 0) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/futu/search?q=${encodeURIComponent(value)}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error('Search failed', err);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item: { market: number, code: string, name: string }) => {
    setSymbol(item.code);
    setShowSuggestions(false);
    handleSearch(item.code);
  };

  const handleSearch = async (overrideSymbol?: string) => {
    const searchSymbol = typeof overrideSymbol === 'string' ? overrideSymbol : symbol;
    if (!searchSymbol) {
      toast.error(t('futu.enter_symbol_error'));
      return;
    }

    setLoading(true);
    setData([]);
    setSelectedDate(null);
    setChainData([]);
    setUnderlyingPrice(null);

    try {
      // 1. Fetch Quote for Underlying Price
      try {
        const quoteRes = await fetch(`/api/futu/quote?symbol=${encodeURIComponent(searchSymbol)}`);
        const quoteData = await quoteRes.json();
        
        if (quoteRes.ok && quoteData.price !== undefined && quoteData.price !== null) {
          setUnderlyingPrice(quoteData.price);
        } else {
          const errMsg = quoteData.error || 'Price not available';
          console.error('Quote fetch failed:', errMsg);
          toast.warning(t('futu.quote_fetch_fail').replace('{error}', errMsg));
        }
      } catch (e: any) {
        console.error('Failed to fetch quote', e);
        toast.error(t('futu.quote_fetch_fail').replace('{error}', e.message));
      }

      // 2. Fetch Expiration Dates
      const response = await fetch(`/api/futu/option-expiration?symbol=${encodeURIComponent(searchSymbol)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('common.error'));
      }

      setData(result);
      if (result.length > 0) {
        // Automatically fetch the first date
        handleFetchChain(result[0].strikeTime, searchSymbol);
      } else {
        toast.info(t('futu.no_expirations'));
      }
    } catch (error: any) {
      console.error('Failed to fetch expiration dates', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch ALL option chain data for client-side filtering
  const handleFetchChain = async (date: string, symbolOverride?: string) => {
    const searchSymbol = symbolOverride || symbol;
    setSelectedDate(date);
    setChainLoading(true);
    setChainData([]);

    try {
        // Always fetch ALL data (type=0, cond=0)
        let url = `/api/futu/option-chain?symbol=${encodeURIComponent(searchSymbol)}&start=${date}&end=${date}&optionType=0&optionCondType=0`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || t('common.error'));
        }
        
        setChainData(result);
        if (result.length === 0) {
            toast.info(t('futu.no_chain_data').replace('{date}', date));
        }
    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setChainLoading(false);
    }
  };

  // Client-side filtering logic
  const getFilteredAndSortedChain = () => {
    let filtered = [...chainData];

    // 1. Filter by Type
    if (filterType !== 0) {
      filtered = filtered.filter(item => item.optionType === filterType);
    }

    // 2. Filter by Moneyness (ITM/OTM)
    if (filterMoneyness !== 0 && underlyingPrice !== null) {
      filtered = filtered.filter(item => {
        const isCall = item.optionType === 1;
        const isITM = isCall 
          ? item.strikePrice < underlyingPrice 
          : item.strikePrice > underlyingPrice;
        
        return filterMoneyness === 1 ? isITM : !isITM;
      });
    }

    // 3. Sort by Strike then Type
    filtered.sort((a, b) => {
      if (a.strikePrice !== b.strikePrice) {
        return a.strikePrice - b.strikePrice;
      }
      return a.optionType - b.optionType;
    });

    // 4. Inject "Current Price" Row
    if (underlyingPrice !== null) {
      const displayRows: (OptionChainItem | { isPriceRow: true, price: number })[] = [];
      let priceRowInserted = false;

      // Special case: if filtered is empty, still show the price row
      if (filtered.length === 0) {
        return [{ isPriceRow: true, price: underlyingPrice }];
      }

      for (const item of filtered) {
        if (!priceRowInserted && item.strikePrice > underlyingPrice) {
          displayRows.push({ isPriceRow: true, price: underlyingPrice });
          priceRowInserted = true;
        }
        displayRows.push(item);
      }
      
      // If price is higher than all strikes (or if we still haven't inserted it)
      if (!priceRowInserted) {
        displayRows.push({ isPriceRow: true, price: underlyingPrice });
      }
      
      return displayRows;
    }

    return filtered;
  };

  const displayRows = getFilteredAndSortedChain();

  if (!mounted || initialLoading) {
    return (
      <div className="h-screen w-screen">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-muted-foreground font-medium">{t('futu.loading_dashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav onSignOut={handleSignOut} userEmail={user?.email} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-8">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="relative w-52" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('futu.search_placeholder')}
                          value={symbol}
                          onChange={handleInputChange}
                          onFocus={() => {
                            if (suggestions.length > 0) setShowSuggestions(true);
                          }}
                          className="pl-9 h-9"
                          autoComplete="off"
                        />
                      </div>
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-[1000] bg-popover border border-border rounded-md mt-1 shadow-lg max-h-[300px] overflow-y-auto">
                          {suggestions.map((item) => (
                            <div
                              key={item.code}
                              className="p-2 cursor-pointer hover:bg-muted transition-colors"
                              onClick={() => handleSelectSuggestion(item)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm">{item.code}</span>
                                <span className="flex-1 px-2 truncate text-sm">{item.name}</span>
                                <span className="text-xs text-muted-foreground">HK</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleSearch()} 
                      disabled={loading}
                      size="sm"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('futu.search_btn')}
                    </Button>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-border rounded-md overflow-hidden bg-muted p-0.5">
                        <Button
                          size="sm"
                          variant={filterType === 1 ? 'default' : 'ghost'}
                          className={cn(
                            "h-8 rounded-sm px-4",
                            filterType === 1 ? "shadow-sm" : "hover:bg-transparent"
                          )}
                          onClick={() => setFilterType(1)}
                        >
                          {t('futu.call')}
                        </Button>
                        <Button
                          size="sm"
                          variant={filterType === 2 ? 'default' : 'ghost'}
                          className={cn(
                            "h-8 rounded-sm px-4",
                            filterType === 2 ? "shadow-sm" : "hover:bg-transparent"
                          )}
                          onClick={() => setFilterType(2)}
                        >
                          {t('futu.put')}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-border rounded-md overflow-hidden bg-muted p-0.5">
                        <Button
                          size="sm"
                          variant={filterMoneyness === 0 ? 'default' : 'ghost'}
                          className={cn(
                            "h-8 rounded-sm px-4",
                            filterMoneyness === 0 ? "shadow-sm" : "hover:bg-transparent"
                          )}
                          onClick={() => setFilterMoneyness(0)}
                        >
                          {t('futu.all')}
                        </Button>
                        <Button
                          size="sm"
                          variant={filterMoneyness === 1 ? 'default' : 'ghost'}
                          className={cn(
                            "h-8 rounded-sm px-4",
                            filterMoneyness === 1 ? "shadow-sm" : "hover:bg-transparent"
                          )}
                          onClick={() => setFilterMoneyness(1)}
                        >
                          {t('futu.itm')}
                        </Button>
                        <Button
                          size="sm"
                          variant={filterMoneyness === 2 ? 'default' : 'ghost'}
                          className={cn(
                            "h-8 rounded-sm px-4",
                            filterMoneyness === 2 ? "shadow-sm" : "hover:bg-transparent"
                          )}
                          onClick={() => setFilterMoneyness(2)}
                        >
                          {t('futu.otm')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Expiration Date Tabs - Integrated into Header */}
                {data.length > 0 && (
                  <div className="border-b border-border pb-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {data.map((item) => {
                        const isActive = selectedDate === item.strikeTime;
                        const dateParts = item.strikeTime.split('-');
                        const displayDate = `${dateParts[1]}/${dateParts[2]}`;
                        return (
                          <Button
                            key={item.strikeTime}
                            size="sm"
                            variant={isActive ? 'default' : 'secondary'}
                            className={cn(
                              "px-6 min-w-max rounded-full transition-all",
                              isActive ? "shadow-md" : "hover:bg-secondary/80"
                            )}
                            onClick={() => handleFetchChain(item.strikeTime)}
                          >
                            {displayDate}
                            {item.expirationCycle === 1 && (
                              <span className="text-[10px] ml-1 align-super">W</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              {loading || chainLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                </div>
              ) : chainData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted text-muted-foreground border-b border-border">
                        <th className="px-4 py-3 text-left font-bold w-[120px]">{t('futu.strike')}</th>
                        <th className="px-4 py-3 text-right">{t('futu.last_premium')}</th>
                        <th className="px-4 py-3 text-right">{t('futu.bid')}</th>
                        <th className="px-4 py-3 text-right">{t('futu.ask')}</th>
                        <th className="px-4 py-3 text-right">{t('futu.vol')}</th>
                        <th className="px-4 py-3 text-right">{t('futu.oi')}</th>
                        <th className="px-4 py-3 text-right">{t('futu.delta')}</th>
                        <th className="px-4 py-3 text-left">{t('futu.type')}</th>
                        <th className="px-4 py-3 text-left">{t('futu.code')}</th>
                        <th className="px-4 py-3 text-left w-[80px]">{t('futu.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, index) => {
                        if ('isPriceRow' in row) {
                          const price = row.price;
                          return (
                            <tr key={`price-${index}`} className="bg-blue-50/50">
                              <td colSpan={10} className="px-4 py-2 text-center font-bold text-blue-600 border-y border-blue-100">
                                {t('futu.current_price').replace('{price}', typeof price === 'number' ? price.toFixed(3) : price)}
                              </td>
                            </tr>
                          );
                        }
                        
                        const item = row as OptionChainItem;
                        const isCall = item.optionType === 1;
                        const isITM = underlyingPrice !== null && (
                          (isCall && item.strikePrice < underlyingPrice) || 
                          (!isCall && item.strikePrice > underlyingPrice)
                        );

                        return (
                          <tr 
                            key={item.code} 
                            className={cn(
                              "border-b border-border transition-colors hover:bg-blue-50/30",
                              isITM && "bg-blue-50/10"
                            )}
                          >
                            <td className={cn(
                              "px-4 py-3 font-bold text-base",
                              isITM ? "bg-blue-50 text-blue-700" : "bg-muted/10"
                            )}>
                              {item.strikePrice.toFixed(2)}
                              {isITM && (
                                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-none">ITM</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600 font-bold">
                              {item.premium !== undefined ? item.premium.toFixed(3) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600">
                              {item.bidPrice !== undefined ? item.bidPrice.toFixed(3) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600">
                              {item.askPrice !== undefined ? item.askPrice.toFixed(3) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.volume !== undefined ? item.volume : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.openInterest !== undefined ? item.openInterest : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.delta !== undefined ? item.delta.toFixed(3) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge 
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-4 border-none",
                                  item.optionType === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}
                              >
                                {item.optionType === 1 ? 'CALL' : 'PUT'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{item.code}</td>
                            <td className="px-4 py-3">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 text-[10px] border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                onClick={() => handleLogTrade(item)}
                              >
                                {t('futu.log_btn')}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : selectedDate ? (
                <div className="py-20 text-center text-muted-foreground">
                  {t('futu.no_data_date')}
                </div>
              ) : (
                <div className="py-20 text-center text-muted-foreground">
                  {t('futu.enter_symbol_hint')}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Log Trade Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title={t('futu.log_trade_modal')}
      >
        <div className="p-4">
          {selectedOptionForLog && (
            <TradeForm
              initialData={selectedOptionForLog}
              onSubmit={onSubmitLog}
              onCancel={() => setShowLogModal(false)}
              isLoading={logLoading}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
