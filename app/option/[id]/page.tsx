'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Container, Center, Spinner, Text, VStack, Flex, Heading, Table, Checkbox, SimpleGrid } from '@chakra-ui/react';
import { User } from '@supabase/supabase-js';
import { OptionWithTrades, Trade } from '@/db/schema';
import { supabase } from '@/utils/supabase';
import DashboardNav from '@/components/layout/DashboardNav';
import { DirectionBadge, StatusBadge, OptionTypeBadge } from '@/components/ui/Badge';
import { formatHKD, formatPNL } from '@/utils/helpers/pnl-calculator';
import { isOpeningTrade } from '@/utils/helpers/option-calculator';
import { formatDateForDisplay, formatDateToYYYYMMDD, formatDateForInput } from '@/utils/helpers/date-helpers';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import AddTradeModal from '@/components/options/AddTradeModal';
import EditTradeModal from '@/components/options/EditTradeModal';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function OptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Option state
  const [optionData, setOptionData] = useState<OptionWithTrades | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [submittingTrade, setSubmittingTrade] = useState(false);
  
  // Edit/Delete state
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [isEditTradeModalOpen, setIsEditTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [displayDirectionForEdit, setDisplayDirectionForEdit] = useState('');
  const [isDeletingTrades, setIsDeletingTrades] = useState(false);
  const [isDeletingOption, setIsDeletingOption] = useState(false);
  
  // Live price state
    const [livePrice, setLivePrice] = useState<number | null>(null);
    const [stockPrice, setStockPrice] = useState<number | null>(null);
    const [greeks, setGreeks] = useState<{
    delta?: number;
    gamma?: number;
    vega?: number;
    theta?: number;
    rho?: number;
    iv?: number;
    oi?: number;
  } | null>(null);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Fetch live price
  useEffect(() => {
    if (!optionData || optionData.status !== 'Open') return;
    
    // Standardize symbol format to MARKET.CODE (e.g. HK.09988)
    const standardizeSymbol = (s: string | null | undefined, defaultMarket = 'HK') => {
        if (!s) return '';
        let val = s.toUpperCase().trim();
        const parts = val.split('.');
        
        if (parts.length === 2) {
            const marketPrefixes = ['HK', 'US', 'SH', 'SZ'];
            const [p1, p2] = parts;
            // If it's 09988.HK -> HK.09988
            if (marketPrefixes.includes(p2)) return `${p2}.${p1.padStart(p2 === 'HK' ? 5 : 0, '0')}`;
            // If it's HK.09988 -> HK.09988
            if (marketPrefixes.includes(p1)) return `${p1}.${p2.padStart(p1 === 'HK' ? 5 : 0, '0')}`;
        }
        
        // If no market prefix, add default
        if (/^\d+$/.test(val)) {
            return `${defaultMarket}.${val.padStart(5, '0')}`;
        }
        return val;
    };

    const optionSymbol = optionData.futu_code;
    const stockSymbol = standardizeSymbol(optionData.stock_symbol);

    const fetchPrices = async () => {
      try {
        const symbols = [];
        if (optionSymbol) symbols.push(optionSymbol);
        if (stockSymbol) symbols.push(stockSymbol);

        if (symbols.length === 0) return;

        const response = await fetch('/api/futu/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.snapshots && data.snapshots.length > 0) {
            // Map snapshots by standardized symbol
            const snapMap: Record<string, any> = {};
            data.snapshots.forEach((s: any) => {
                const code = s.basic.security.code;
                const market = s.basic.security.market;
                
                // Map by raw code (e.g. 00700 or HKB260226C127500)
                snapMap[code] = s;
                
                // Map by standardized code (e.g. HK.00700)
                const marketPrefix = market === 1 ? 'HK' : market === 2 ? 'US' : '';
                if (marketPrefix) {
                    snapMap[`${marketPrefix}.${code}`] = s;
                }
            });

            // Find option price
            const optSnap = optionSymbol ? snapMap[optionSymbol] : null;
            const oPrice = optSnap?.basic?.curPrice || optSnap?.basic?.lastPrice;
            if (oPrice) setLivePrice(oPrice);

            // Update Greeks if available
            if (optSnap?.optionExData) {
                setGreeks({
                    delta: optSnap.optionExData.delta,
                    gamma: optSnap.optionExData.gamma,
                    vega: optSnap.optionExData.vega,
                    theta: optSnap.optionExData.theta,
                    rho: optSnap.optionExData.rho,
                    iv: optSnap.optionExData.impliedVolatility,
                    oi: optSnap.optionExData.openInterest,
                });
            }

            // Find stock price
            const stSnap = stockSymbol ? snapMap[stockSymbol] : null;
            const sPrice = stSnap?.basic?.curPrice || stSnap?.basic?.lastPrice;
            if (sPrice) setStockPrice(sPrice);
          }
        }
      } catch (err) {
        console.error('Error fetching live prices:', err);
      }
    };

    fetchPrices();

    // Only set interval if it's before 16:00 HK time
    const now = new Date();
    const currentHour = now.getHours();

    let interval: NodeJS.Timeout | null = null;
    if (currentHour < 16) {
      // Poll every 30 seconds for real-time updates
      interval = setInterval(fetchPrices, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [optionData]);

  // Calculate live PNL
  const liveUnrealizedPNL = livePrice !== null && optionData ? (() => {
    const netContracts = optionData.summary.netContracts;
    if (netContracts === 0) return 0;
    
    const isSell = optionData.direction === 'Sell';
    const shares = optionData.trades[0]?.shares_per_contract || 500;
    const avgEntry = optionData.summary.avgEntryPremium;
    
    if (isSell) {
      return (avgEntry - livePrice) * netContracts * shares;
    } else {
      return (livePrice - avgEntry) * netContracts * shares;
    }
  })() : null;

  const displayUnrealizedPNL = liveUnrealizedPNL !== null ? liveUnrealizedPNL : (optionData?.summary.unrealizedPNL || 0);
  const displayNetPNL = liveUnrealizedPNL !== null && optionData
    ? (optionData.summary.realizedPNL || 0) + liveUnrealizedPNL - (optionData.summary.totalFees || 0)
    : (optionData?.summary.netPNL || 0);

  // Check auth
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

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/');
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Load option data
  const loadOption = async () => {
    if (!user || !resolvedParams?.id) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/options/${resolvedParams.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('detail.option_not_found'));
          router.push('/trades');
          return;
        }
        throw new Error('Failed to fetch option');
      }
      
      const data = await response.json();
      setOptionData(data);
    } catch (error) {
      console.error('Error loading option:', error);
      toast.error(t('detail.load_fail'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOption();
  }, [user, resolvedParams, router]);

  const handleAddTrade = async (tradeData: any) => {
    if (!user || !optionData || !resolvedParams?.id) return;

    setSubmittingTrade(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Calculate trade type based on modal direction and option direction
      let tradeType: any;
      
      if (tradeData.direction === optionData.direction) {
        // Same direction means increasing position (Opening/Adding)
        tradeType = optionData.direction === 'Sell' ? 'OPEN_SELL' : 'OPEN_BUY';
      } else {
        // Opposite direction means decreasing position (Closing/Reducing)
        // If Option is Sell (Short), we Buy to close -> CLOSE_BUY
        // If Option is Buy (Long), we Sell to close -> CLOSE_SELL
        tradeType = optionData.direction === 'Sell' ? 'CLOSE_BUY' : 'CLOSE_SELL';
      }

      const response = await fetch(`/api/options/${resolvedParams.id}/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...tradeData,
          trade_type: tradeType,
          // These are required by the API but might not be in the modal
          stock_price: optionData.strike_price, // Fallback or handle separately
          hsi: 20000, // Fallback
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add trade');
      }

      toast.success(t('detail.trade_added'));
      setIsAddTradeModalOpen(false);
      await loadOption(); // Refresh data
    } catch (error: any) {
      console.error('Error adding trade:', error);
      toast.error(error.message || 'Failed to add trade');
    } finally {
      setSubmittingTrade(false);
    }
  };

  const handleToggleTrade = (tradeId: string) => {
    const newSelected = new Set(selectedTradeIds);
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId);
    } else {
      newSelected.add(tradeId);
    }
    setSelectedTradeIds(newSelected);
  };

  const handleDeleteSelectedTrades = async () => {
    if (!user || !resolvedParams?.id || selectedTradeIds.size === 0) return;
    
    // Double check: ensure no first trade is selected (though UI should prevent it)
    if (optionData && optionData.trades.length > 0) {
      const firstTradeId = optionData.trades[0].id;
      if (selectedTradeIds.has(firstTradeId)) {
        toast.error(t('detail.delete_first_trade_error'));
        return;
      }
    }

    if (!confirm(t('detail.confirm_delete_trades').replace('{count}', selectedTradeIds.size.toString()))) return;

    setIsDeletingTrades(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const deletePromises = Array.from(selectedTradeIds).map(tradeId => 
        fetch(`/api/options/${resolvedParams.id}/trades/${tradeId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        })
      );

      await Promise.all(deletePromises);
      
      toast.success(t('detail.trades_deleted'));
      setSelectedTradeIds(new Set());
      await loadOption();
    } catch (error) {
      console.error('Error deleting trades:', error);
      toast.error('Failed to delete trades');
    } finally {
      setIsDeletingTrades(false);
    }
  };

  const handleDeleteOption = async () => {
    if (!user || !resolvedParams?.id) return;
    
    if (!confirm(t('detail.confirm_delete_option'))) {
      return;
    }

    setIsDeletingOption(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/options/${resolvedParams.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete option');
      }

      toast.success(t('detail.option_deleted'));
      router.push('/trades');
    } catch (error) {
      console.error('Error deleting option:', error);
      toast.error('Failed to delete option');
    } finally {
      setIsDeletingOption(false);
    }
  };

  const handleEditTradeClick = (trade: Trade, displayDirection: string) => {
    setEditingTrade(trade);
    setDisplayDirectionForEdit(displayDirection);
    setIsEditTradeModalOpen(true);
  };

  const handleUpdateTrade = async (tradeId: string, updates: any) => {
    if (!user || !resolvedParams?.id) return;

    setSubmittingTrade(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/options/${resolvedParams.id}/trades/${tradeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update trade');
      }

      toast.success(t('detail.trade_updated'));
      setIsEditTradeModalOpen(false);
      setEditingTrade(null);
      await loadOption();
    } catch (error: any) {
      console.error('Error updating trade:', error);
      toast.error(error.message || 'Failed to update trade');
    } finally {
      setSubmittingTrade(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
      toast.info(t('auth.sign_out_success'));
    } catch {
      toast.error(t('auth.sign_out_fail'));
    }
  };

  // New Calculations: Breakeven Cost and Annualized Return
  const { breakevenCost, annualizedReturn } = useMemo(() => {
    if (!optionData || !optionData.summary) return { breakevenCost: null, annualizedReturn: null };

    // 1. Breakeven Cost Calculation
    // formula: (strike * shares) - (netPremiumReceived - totalFees)
    const strike = typeof optionData.strike_price === 'string' ? parseFloat(optionData.strike_price) : optionData.strike_price;
    const netContracts = optionData.summary.netContracts;
    const sharesPerContract = optionData.trades[0]?.shares_per_contract || 500;
    const netPremiumReceived = optionData.summary.totalPremium || 0;
    const totalFees = optionData.summary.totalFees || 0;
    
    let bCost = null;
    if (netContracts > 0) {
      // Cost of buying shares minus net income (premium - fees)
      bCost = (strike * netContracts * sharesPerContract) - (netPremiumReceived - totalFees);
    }

    // 2. Annualized Return Calculation
    // formula: (Premium / Risk Capital) * (365 / Holding Days) * 100%
    let annReturn = null;
    if (optionData.direction === 'Sell' && netPremiumReceived > 0) {
      const firstTradeDate = new Date(optionData.trades[0].trade_date);
      const expiryDate = new Date(optionData.expiry_date);
      
      // Holding days from open to expiry (or today if expired)
      const totalDays = Math.max(1, Math.ceil((expiryDate.getTime() - firstTradeDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Risk Capital (Margin) - Default to cash secured (Strike * Shares) if not provided
      const marginPercent = optionData.trades[0]?.margin_percent ? parseFloat(optionData.trades[0].margin_percent) : null;
      let riskCapital = strike * netContracts * sharesPerContract; // Default: Cash secured
      
      if (marginPercent) {
        riskCapital = riskCapital * (marginPercent / 100);
      }
      
      if (riskCapital > 0) {
        annReturn = (netPremiumReceived / riskCapital) * (365 / totalDays) * 100;
      }
    }

    return { breakevenCost: bCost, annualizedReturn: annReturn };
  }, [optionData]);

  const handleBack = () => {
    router.push('/trades');
  };

  if (initialLoading || !resolvedParams) {
    return (
      <Center minH="100vh">
        <VStack>
          <Spinner size="xl" color="brand.500" borderWidth="4px" />
          <Text color="fg.muted">{t('common.loading')}</Text>
        </VStack>
      </Center>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Box minH="100vh" w="100%">
      <DashboardNav onSignOut={handleSignOut} userEmail={user.email} />
      
      <Box w="100%">
        <Container maxW="7xl" mx="auto" px={{ base: 4, sm: 6, lg: 8 }} py={6}>
          {loading ? (
            <Center py={12}>
              <VStack gap={2}>
                <Spinner size="lg" color="brand.500" borderWidth="4px" />
                <Text color="fg.muted">{t('detail.load_fail')}</Text>
              </VStack>
            </Center>
          ) : !optionData ? (
            <Center py={12}>
              <Text color="fg.muted">{t('detail.option_not_found')}</Text>
            </Center>
          ) : (
            <VStack gap={6} align="stretch">
              {/* Header */}
              <Box>
                <Box mb={4}>
                  <Button variant="ghost" onClick={handleBack}>
                    {t('detail.back_to_all')}
                  </Button>
                </Box>
                
                <Flex alignItems="center" justifyContent="space-between" mb={2}>
                  <Flex alignItems="center" gap={3}>
                    <Heading size="xl" color="fg.default">
                      {(() => {
                        const strikePrice = typeof optionData.strike_price === 'string' ? parseFloat(optionData.strike_price) : optionData.strike_price;
                        const optionName = `${optionData.stock_symbol} ${formatDateToYYYYMMDD(optionData.expiry_date)} ${strikePrice.toFixed(2)} ${optionData.option_type}`;
                        return optionName;
                      })()}
                    </Heading>
                    <DirectionBadge direction={optionData.direction} />
                    <StatusBadge status={optionData.status} />
                  </Flex>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={handleDeleteOption}
                    isLoading={isDeletingOption}
                  >
                    {t('detail.remove_option')}
                  </Button>
                </Flex>
              </Box>

              {/* Position Summary */}
              <Box 
                bg="bg.surface" 
                borderRadius="xl" 
                borderWidth="1px" 
                borderColor="border.default"
                p={6}
              >
                <Heading size="md" mb={4} color="fg.default">{t('detail.position_summary')}</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
                  {/* Row 1: Position Details */}
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>{t('detail.total_opened')}</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                      {optionData.summary.totalOpened}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>{t('detail.total_closed')}</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                      {optionData.summary.totalClosed}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>{t('detail.net_position')}</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                      {optionData.summary.netContracts}
                    </Text>
                  </Box>

                  {/* Row 2: Price & Valuation */}
                  {(optionData.status === 'Open' || (optionData.summary.marketValue !== undefined && optionData.summary.marketValue > 0)) && (
                    <>
                      {optionData.status === 'Open' ? (
                        <Box>
                          <Text fontSize="sm" color="fg.muted" mb={1}>{t('detail.last_premium')}</Text>
                          <Text fontSize="2xl" fontWeight="bold" color="blue.400">
                            {livePrice !== null 
                              ? formatHKD(livePrice) 
                              : (optionData as any).currentPrice !== undefined 
                                ? formatHKD((optionData as any).currentPrice) 
                                : '-'}
                          </Text>
                        </Box>
                      ) : (
                        /* Placeholder to maintain grid alignment if status is not Open but marketValue > 0 */
                        <Box display={{ base: 'none', md: 'block' }} />
                      )}
                      <Box>
                        <Text fontSize="sm" color="fg.muted" mb={1}>{t('detail.covering_shares_exercised')}</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                          {(() => {
                            const sharesPerContract = optionData.trades[0]?.shares_per_contract || 500;
                            const totalShares = optionData.summary.netContracts * sharesPerContract;
                            return totalShares.toLocaleString();
                          })()}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="fg.muted" mb={1}>
                          {optionData.direction === 'Sell' ? t('detail.est_cost_close') : t('detail.est_exit_value')}
                        </Text>
                        <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                          {(() => {
                            if (livePrice !== null) {
                              const sharesPerContract = optionData.trades[0]?.shares_per_contract || 500;
                              const mv = optionData.summary.netContracts * livePrice * sharesPerContract;
                              return formatHKD(mv);
                            }
                            return formatHKD(optionData.summary.marketValue || 0);
                          })()}
                        </Text>
                      </Box>
                    </>
                  )}

                  {/* Row 3: PNL */}
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>{t('detail.realized_pnl')}</Text>
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color={optionData.summary.realizedPNL > 0 ? 'green.400' : optionData.summary.realizedPNL < 0 ? 'red.400' : 'fg.default'}
                    >
                      {formatPNL(optionData.summary.realizedPNL)}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>{t('detail.unrealized_pnl')}</Text>
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color={displayUnrealizedPNL > 0 ? 'green.400' : displayUnrealizedPNL < 0 ? 'red.400' : 'fg.default'}
                    >
                      {formatPNL(displayUnrealizedPNL)}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb="1">{t('detail.net_pnl')}</Text>
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color={displayNetPNL > 0 ? 'green.400' : displayNetPNL < 0 ? 'red.400' : 'fg.default'}
                    >
                      {formatPNL(displayNetPNL)}
                    </Text>
                  </Box>

                  {/* Row 4: Metrics */}
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb="1">{t('detail.stock_price')}</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                      {stockPrice !== null ? formatHKD(stockPrice) : '-'}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb="1">{t('detail.breakeven_cost')}</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                      {breakevenCost !== null ? formatHKD(breakevenCost) : '-'}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb="1">{t('detail.annualized_return')}</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.400">
                      {annualizedReturn !== null ? `${annualizedReturn.toFixed(2)}%` : '-'}
                    </Text>
                  </Box>
                </SimpleGrid>
              </Box>

              {/* Option Details & Greeks */}
              {greeks && (
                <Box 
                  bg="bg.surface" 
                  borderRadius="xl" 
                  borderWidth="1px" 
                  borderColor="border.default"
                  p={6}
                >
                  <Heading size="md" mb={4} color="fg.default">{t('detail.option_greeks') || 'Option Greeks & Details'}</Heading>
                  <SimpleGrid columns={{ base: 2, md: 4, lg: 7 }} gap={4}>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1}>IV</Text>
                      <Text fontSize="md" fontWeight="bold" color="fg.default">
                        {greeks.iv ? `${greeks.iv.toFixed(2)}%` : '-'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1}>Delta</Text>
                      <Text fontSize="md" fontWeight="bold" color="fg.default">
                        {greeks.delta ? greeks.delta.toFixed(4) : '-'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1}>Gamma</Text>
                      <Text fontSize="md" fontWeight="bold" color="fg.default">
                        {greeks.gamma ? greeks.gamma.toFixed(4) : '-'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1}>Vega</Text>
                      <Text fontSize="md" fontWeight="bold" color="fg.default">
                        {greeks.vega ? greeks.vega.toFixed(4) : '-'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1}>Theta</Text>
                      <Text fontSize="md" fontWeight="bold" color="fg.default">
                        {greeks.theta ? greeks.theta.toFixed(4) : '-'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1}>Rho</Text>
                      <Text fontSize="md" fontWeight="bold" color="fg.default">
                        {greeks.rho ? greeks.rho.toFixed(4) : '-'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={1}>OI</Text>
                      <Text fontSize="md" fontWeight="bold" color="fg.default">
                        {greeks.oi ? greeks.oi.toLocaleString() : '-'}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Box>
              )}

              {/* Trades History */}
              <Box 
                bg="bg.surface" 
                borderRadius="xl" 
                borderWidth="1px" 
                borderColor="border.default"
                p={6}
              >
                <Heading size="md" mb={4} color="fg.default">
                  {t('detail.trades_history')} ({optionData.trades.length})
                </Heading>
                
                {optionData.trades.length === 0 ? (
                  <Text color="fg.muted">{t('detail.no_trades')}</Text>
                ) : (
                  <Box overflowX="auto">
                    <Table.Root size="sm" variant="outline">
                      <Table.Header>
                        <Table.Row height="2.75rem">
                          <Table.ColumnHeader width="40px"></Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.date')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.direction')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.premium')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.contract')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.total_premium')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.margin')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.fee')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.cash_flow')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">{t('detail.actions')}</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {optionData.trades.map((trade, index) => {
                          // Determine Buy/Sell based on trade type and option direction
                          // For a Sell Put/Call option: OPEN/ADD are Sell, REDUCE/CLOSE are Buy
                          // For a Buy Put/Call option: OPEN/ADD are Buy, REDUCE/CLOSE are Sell
                          const isInitialDirection = isOpeningTrade(trade.trade_type);
                          
                          // Logical direction for PnL and Edit Modal (Buy/Sell)
                          const logicalDirection = optionData.direction === 'Sell' 
                            ? (isInitialDirection ? 'Sell' : 'Buy')
                            : (isInitialDirection ? 'Buy' : 'Sell');

                          // Display Label for Table (OPEN_SELL, etc.)
                          let displayLabel = '';
                          // Use the actual trade type if it's one of the new types, otherwise derive it
                          if (['OPEN_SELL', 'CLOSE_BUY', 'OPEN_BUY', 'CLOSE_SELL'].includes(trade.trade_type)) {
                            displayLabel = trade.trade_type.replace('_', ' ');
                          } else {
                            // Fallback for legacy data
                            if (optionData.direction === 'Sell') {
                               displayLabel = isInitialDirection ? 'OPEN SELL' : 'CLOSE BUY';
                            } else {
                               displayLabel = isInitialDirection ? 'OPEN BUY' : 'CLOSE SELL';
                            }
                          }

                          const totalPremium = parseFloat(trade.premium) * trade.contracts * trade.shares_per_contract;
                          
                          // Calculate Margin Amount
                          const marginPercent = parseFloat((trade as any).margin_percent || '0');
                          const strikePrice = typeof optionData.strike_price === 'string' ? parseFloat(optionData.strike_price) : optionData.strike_price;
                          const marginAmount = marginPercent > 0 
                            ? (trade.contracts * trade.shares_per_contract * strikePrice * (marginPercent / 100))
                            : 0;

                          // Sell trades are cash inflows (+), Buy trades are cash outflows (-)
                          const isSellTrade = logicalDirection === 'Sell';
                          const tradeCashFlow = isSellTrade ? totalPremium : -totalPremium;
                          const netCashFlow = tradeCashFlow - parseFloat(trade.fee);
                          const cashFlowColor = netCashFlow > 0 ? 'green.400' : netCashFlow < 0 ? 'red.400' : 'fg.muted';

                          const isFirstTrade = index === 0;

                          return (
                            <Table.Row key={trade.id} height="2.75rem">
                              <Table.Cell>
                                {!isFirstTrade && (
                                  <input 
                                    type="checkbox"
                                    checked={selectedTradeIds.has(trade.id)} 
                                    onChange={() => handleToggleTrade(trade.id)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                  />
                                )}
                              </Table.Cell>
                              <Table.Cell textAlign="center" color="fg.muted">
                                {formatDateForDisplay(trade.trade_date)}
                              </Table.Cell>
                              <Table.Cell textAlign="center" fontWeight="bold">
                                {displayLabel}
                              </Table.Cell>
                              <Table.Cell textAlign="center">
                                {formatHKD(trade.premium)}
                              </Table.Cell>
                              <Table.Cell textAlign="center">
                                {trade.contracts}
                              </Table.Cell>
                              <Table.Cell textAlign="center">
                                {formatHKD(totalPremium)}
                              </Table.Cell>
                              <Table.Cell textAlign="center">
                                {marginAmount > 0 ? formatHKD(marginAmount) : '-'}
                              </Table.Cell>
                              <Table.Cell textAlign="center">
                                {formatHKD(trade.fee)}
                              </Table.Cell>
                              <Table.Cell textAlign="center" fontWeight="medium" color={cashFlowColor}>
                                {formatPNL(netCashFlow)}
                              </Table.Cell>
                              <Table.Cell textAlign="center">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleEditTradeClick(trade, logicalDirection)}
                                >
                                  {t('detail.edit')}
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                )}
              </Box>

              {/* Action Buttons */}
              {(optionData.status === 'Open' || (optionData.status === 'Expired' && optionData.summary.netContracts > 0)) && (
                <Flex gap={3}>
                  <Button onClick={() => setIsAddTradeModalOpen(true)}>
                    {t('detail.add_trade')}
                  </Button>
                  {selectedTradeIds.size > 0 && (
                    <Button 
                      variant="danger" 
                      onClick={handleDeleteSelectedTrades}
                      isLoading={isDeletingTrades}
                    >
                      {t('detail.delete_selected')} ({selectedTradeIds.size})
                    </Button>
                  )}
                </Flex>
              )}
            </VStack>
          )}
        </Container>
      </Box>

      {optionData && (
        <>
          <AddTradeModal
            isOpen={isAddTradeModalOpen}
            onClose={() => setIsAddTradeModalOpen(false)}
            onSubmit={handleAddTrade}
            optionName={`${optionData.stock_symbol} ${formatDateToYYYYMMDD(optionData.expiry_date)} ${(typeof optionData.strike_price === 'string' ? parseFloat(optionData.strike_price) : optionData.strike_price).toFixed(2)} ${optionData.option_type}`}
            sharesPerContract={optionData.trades[0]?.shares_per_contract || 500}
            optionDirection={optionData.direction}
            minDate={optionData.trades.length > 0 ? formatDateForInput(optionData.trades[0].trade_date) : undefined}
            isLoading={submittingTrade}
          />

          <EditTradeModal
            isOpen={isEditTradeModalOpen}
            onClose={() => {
              setIsEditTradeModalOpen(false);
              setEditingTrade(null);
            }}
            onSubmit={handleUpdateTrade}
            initialData={editingTrade}
            optionName={`${optionData.stock_symbol} ${formatDateToYYYYMMDD(optionData.expiry_date)} ${(typeof optionData.strike_price === 'string' ? parseFloat(optionData.strike_price) : optionData.strike_price).toFixed(2)} ${optionData.option_type}`}
            sharesPerContract={editingTrade?.shares_per_contract || 500}
            minDate={optionData.trades.length > 0 ? formatDateForInput(optionData.trades[0].trade_date) : undefined}
            isLoading={submittingTrade}
            displayDirection={displayDirectionForEdit}
          />
        </>
      )}
    </Box>
  );
}
