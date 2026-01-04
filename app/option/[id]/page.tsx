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

export default function OptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
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

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Fetch live price
  useEffect(() => {
    if (!optionData || optionData.status !== 'Open') return;
    
    let symbol = optionData.futu_code;
    
    // If no futu_code, we can't fetch snapshot easily. 
    // We rely on it being saved during creation.
    if (!symbol) return;
    
    // Ensure market prefix if missing (e.g. "TCH..." -> "HK.TCH...")
    if (!symbol.includes('.')) {
         // Heuristic: check stock symbol
         if (optionData.stock_symbol.includes('HK') || /^\d+$/.test(optionData.stock_symbol)) {
             symbol = `HK.${symbol}`;
         } else if (optionData.stock_symbol.includes('US')) {
             symbol = `US.${symbol}`;
         }
    }

    const fetchPrice = async () => {
      try {
        const response = await fetch('/api/futu/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: [symbol] })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.snapshots && data.snapshots.length > 0) {
            const snap = data.snapshots[0];
            // Futu snapshot structure: basic.curPrice or basic.lastPrice
            // We use cleanFutuObject in API so it should be number
            const price = snap.basic?.curPrice || snap.basic?.lastPrice;
            if (price) setLivePrice(price);
          }
        }
      } catch (err) {
        console.error('Error fetching live price:', err);
      }
    };

    fetchPrice();
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
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
          toast.error('Option not found');
          router.push('/trades');
          return;
        }
        throw new Error('Failed to fetch option');
      }
      
      const data = await response.json();
      setOptionData(data);
    } catch (error) {
      console.error('Error loading option:', error);
      toast.error('Failed to load option details');
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

      toast.success('Trade added successfully');
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
        toast.error("Cannot delete the first trade");
        return;
      }
    }

    if (!confirm(`Are you sure you want to delete ${selectedTradeIds.size} trade(s)?`)) return;

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
      
      toast.success('Trades deleted successfully');
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
    
    if (!confirm('Are you sure you want to delete this entire option and all its trades? This action cannot be undone.')) {
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

      toast.success('Option deleted successfully');
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

      toast.success('Trade updated successfully');
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
      toast.info('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const handleBack = () => {
    router.push('/trades');
  };

  if (initialLoading || !resolvedParams) {
    return (
      <Center minH="100vh">
        <VStack>
          <Spinner size="xl" color="brand.500" borderWidth="4px" />
          <Text color="fg.muted">Loading...</Text>
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
                <Text color="fg.muted">Loading option details...</Text>
              </VStack>
            </Center>
          ) : !optionData ? (
            <Center py={12}>
              <Text color="fg.muted">Option not found</Text>
            </Center>
          ) : (
            <VStack gap={6} align="stretch">
              {/* Header */}
              <Box>
                <Box mb={4}>
                  <Button variant="ghost" onClick={handleBack}>
                    ← Back to All Options
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
                    Remove Option
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
                <Heading size="md" mb={4} color="fg.default">Position Summary</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
                  {/* Row 1: Position Details */}
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>Total Opened</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                      {optionData.summary.totalOpened}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>Total Closed</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                      {optionData.summary.totalClosed}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>Net Position</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="fg.default">
                      {optionData.summary.netContracts}
                    </Text>
                  </Box>

                  {/* Row 2: Price & Valuation */}
                  {(optionData.status === 'Open' || (optionData.summary.marketValue !== undefined && optionData.summary.marketValue > 0)) && (
                    <>
                      {optionData.status === 'Open' ? (
                        <Box>
                          <Text fontSize="sm" color="fg.muted" mb={1}>Last Premium</Text>
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
                        <Text fontSize="sm" color="fg.muted" mb={1}>Covering shares if exercised</Text>
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
                          {optionData.direction === 'Sell' ? 'Est. Cost to Close' : 'Est. Exit Value'}
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
                    <Text fontSize="sm" color="fg.muted" mb={1}>Realized PNL</Text>
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color={optionData.summary.realizedPNL > 0 ? 'green.400' : optionData.summary.realizedPNL < 0 ? 'red.400' : 'fg.default'}
                    >
                      {formatPNL(optionData.summary.realizedPNL)}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>Unrealized PNL</Text>
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color={displayUnrealizedPNL > 0 ? 'green.400' : displayUnrealizedPNL < 0 ? 'red.400' : 'fg.default'}
                    >
                      {formatPNL(displayUnrealizedPNL)}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>Net PNL</Text>
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color={displayNetPNL > 0 ? 'green.400' : displayNetPNL < 0 ? 'red.400' : 'fg.default'}
                    >
                      {formatPNL(displayNetPNL)}
                    </Text>
                  </Box>
                </SimpleGrid>
              </Box>

              {/* Trades History */}
              <Box 
                bg="bg.surface" 
                borderRadius="xl" 
                borderWidth="1px" 
                borderColor="border.default"
                p={6}
              >
                <Heading size="md" mb={4} color="fg.default">
                  Trades History ({optionData.trades.length})
                </Heading>
                
                {optionData.trades.length === 0 ? (
                  <Text color="fg.muted">No trades yet</Text>
                ) : (
                  <Box overflowX="auto">
                    <Table.Root size="sm" variant="outline">
                      <Table.Header>
                        <Table.Row height="2.75rem">
                          <Table.ColumnHeader width="40px"></Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Date</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Direction</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Premium</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Contract</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Total Premium</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Margin</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Fee</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Cash Flow</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="center">Actions</Table.ColumnHeader>
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
                                  Edit
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
                    Add Trade
                  </Button>
                  {selectedTradeIds.size > 0 && (
                    <Button 
                      variant="danger" 
                      onClick={handleDeleteSelectedTrades}
                      isLoading={isDeletingTrades}
                    >
                      Delete Selected ({selectedTradeIds.size})
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
