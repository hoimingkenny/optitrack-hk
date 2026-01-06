'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { OptionWithTrades, Trade } from '@/db/schema';
import { supabase } from '@/utils/supabase';
import DashboardNav from '@/components/layout/DashboardNav';
import { DirectionBadge, StatusBadge } from '@/components/ui/Badge';
import { formatHKD, formatPNL } from '@/utils/helpers/pnl-calculator';
import { isOpeningTrade } from '@/utils/helpers/option-calculator';
import { formatDateForDisplay, formatDateToYYYYMMDD, formatDateForInput } from '@/utils/helpers/date-helpers';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import AddTradeModal from '@/components/options/AddTradeModal';
import EditTradeModal from '@/components/options/EditTradeModal';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

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

  const handleBack = () => {
    router.push('/trades');
  };

  if (initialLoading || !resolvedParams) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <DashboardNav onSignOut={handleSignOut} userEmail={user.email} />
      
      <main className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('detail.load_fail')}</p>
            </div>
          ) : !optionData ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{t('detail.option_not_found')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <div className="mb-4">
                  <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    {t('detail.back_to_all')}
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                      {(() => {
                        const strikePrice = typeof optionData.strike_price === 'string' ? parseFloat(optionData.strike_price) : optionData.strike_price;
                        const optionName = `${optionData.stock_symbol} ${formatDateToYYYYMMDD(optionData.expiry_date)} ${strikePrice.toFixed(2)} ${optionData.option_type}`;
                        return optionName;
                      })()}
                    </h1>
                    <DirectionBadge direction={optionData.direction} />
                    <StatusBadge status={optionData.status} />
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDeleteOption}
                    isLoading={isDeletingOption}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('detail.remove_option')}
                  </Button>
                </div>
              </div>

              {/* Position Summary */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4 text-foreground">{t('detail.position_summary')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {/* Row 1: Position Details */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('detail.total_opened')}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {optionData.summary.totalOpened}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('detail.total_closed')}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {optionData.summary.totalClosed}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('detail.net_position')}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {optionData.summary.netContracts}
                    </p>
                  </div>

                  {/* Row 2: Price & Valuation */}
                  {(optionData.status === 'Open' || (optionData.summary.marketValue !== undefined && optionData.summary.marketValue > 0)) && (
                    <>
                      {optionData.status === 'Open' ? (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{t('detail.last_premium')}</p>
                          <p className="text-2xl font-bold text-blue-500">
                            {livePrice !== null 
                              ? formatHKD(livePrice) 
                              : (optionData as any).currentPrice !== undefined 
                                ? formatHKD((optionData as any).currentPrice) 
                                : '-'}
                          </p>
                        </div>
                      ) : (
                        <div className="hidden md:block" />
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t('detail.covering_shares_exercised')}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {(() => {
                            const sharesPerContract = optionData.trades[0]?.shares_per_contract || 500;
                            const totalShares = optionData.summary.netContracts * sharesPerContract;
                            return totalShares.toLocaleString();
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {optionData.direction === 'Sell' ? t('detail.est_cost_close') : t('detail.est_exit_value')}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {(() => {
                            if (livePrice !== null) {
                              const sharesPerContract = optionData.trades[0]?.shares_per_contract || 500;
                              const mv = optionData.summary.netContracts * livePrice * sharesPerContract;
                              return formatHKD(mv);
                            }
                            return formatHKD(optionData.summary.marketValue || 0);
                          })()}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Row 3: PNL */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('detail.realized_pnl')}</p>
                    <p 
                      className={cn(
                        "text-2xl font-bold",
                        optionData.summary.realizedPNL > 0 ? "text-green-500" : optionData.summary.realizedPNL < 0 ? "text-red-500" : "text-foreground"
                      )}
                    >
                      {formatPNL(optionData.summary.realizedPNL)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('detail.unrealized_pnl')}</p>
                    <p 
                      className={cn(
                        "text-2xl font-bold",
                        displayUnrealizedPNL > 0 ? "text-green-500" : displayUnrealizedPNL < 0 ? "text-red-500" : "text-foreground"
                      )}
                    >
                      {formatPNL(displayUnrealizedPNL)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('detail.net_pnl')}</p>
                    <p 
                      className={cn(
                        "text-2xl font-bold",
                        displayNetPNL > 0 ? "text-green-500" : displayNetPNL < 0 ? "text-red-500" : "text-foreground"
                      )}
                    >
                      {formatPNL(displayNetPNL)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trades History */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">
                    {t('detail.trades_history')} ({optionData.trades.length})
                  </h2>
                </div>
                
                {optionData.trades.length === 0 ? (
                  <p className="text-muted-foreground">{t('detail.no_trades')}</p>
                ) : (
                  <div className="overflow-x-auto -mx-6">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-y border-border">
                        <tr>
                          <th className="px-6 py-3 w-10"></th>
                          <th className="px-6 py-3">{t('detail.date')}</th>
                          <th className="px-6 py-3">{t('detail.direction')}</th>
                          <th className="px-6 py-3 text-right">{t('detail.premium')}</th>
                          <th className="px-6 py-3 text-right">{t('detail.contract')}</th>
                          <th className="px-6 py-3 text-right">{t('detail.total_premium')}</th>
                          <th className="px-6 py-3 text-right">{t('detail.margin')}</th>
                          <th className="px-6 py-3 text-right">{t('detail.fee')}</th>
                          <th className="px-6 py-3 text-right">{t('detail.cash_flow')}</th>
                          <th className="px-6 py-3 text-center">{t('detail.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {optionData.trades.map((trade, index) => {
                          const isInitialDirection = isOpeningTrade(trade.trade_type);
                          const logicalDirection = optionData.direction === 'Sell' 
                            ? (isInitialDirection ? 'Sell' : 'Buy')
                            : (isInitialDirection ? 'Buy' : 'Sell');

                          let displayLabel = '';
                          if (['OPEN_SELL', 'CLOSE_BUY', 'OPEN_BUY', 'CLOSE_SELL'].includes(trade.trade_type)) {
                            displayLabel = trade.trade_type.replace('_', ' ');
                          } else {
                            if (optionData.direction === 'Sell') {
                               displayLabel = isInitialDirection ? 'OPEN SELL' : 'CLOSE BUY';
                            } else {
                               displayLabel = isInitialDirection ? 'OPEN BUY' : 'CLOSE SELL';
                            }
                          }

                          const totalPremium = parseFloat(trade.premium) * trade.contracts * trade.shares_per_contract;
                          const marginPercent = parseFloat((trade as any).margin_percent || '0');
                          const strikePrice = typeof optionData.strike_price === 'string' ? parseFloat(optionData.strike_price) : optionData.strike_price;
                          const marginAmount = marginPercent > 0 
                            ? (trade.contracts * trade.shares_per_contract * strikePrice * (marginPercent / 100))
                            : 0;

                          const isSellTrade = logicalDirection === 'Sell';
                          const tradeCashFlow = isSellTrade ? totalPremium : -totalPremium;
                          const netCashFlow = tradeCashFlow - parseFloat(trade.fee);
                          const isFirstTrade = index === 0;

                          return (
                            <tr key={trade.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4">
                                {!isFirstTrade && (
                                  <Checkbox 
                                    checked={selectedTradeIds.has(trade.id)}
                                    onCheckedChange={() => handleToggleTrade(trade.id)}
                                  />
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                                {formatDateForDisplay(trade.trade_date)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-bold">{displayLabel}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {formatHKD(trade.premium)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {trade.contracts}
                              </td>
                              <td className="px-6 py-4 text-right font-medium">
                                {formatHKD(totalPremium)}
                              </td>
                              <td className="px-6 py-4 text-right text-muted-foreground">
                                {marginAmount > 0 ? formatHKD(marginAmount) : '-'}
                              </td>
                              <td className="px-6 py-4 text-right text-muted-foreground">
                                {formatHKD(trade.fee)}
                              </td>
                              <td className={cn(
                                "px-6 py-4 text-right font-medium",
                                netCashFlow > 0 ? "text-green-500" : netCashFlow < 0 ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {formatPNL(netCashFlow)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEditTradeClick(trade, logicalDirection)}
                                >
                                  {t('detail.edit')}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {(optionData.status === 'Open' || (optionData.status === 'Expired' && optionData.summary.netContracts > 0)) && (
                <div className="flex gap-3">
                  <Button onClick={() => setIsAddTradeModalOpen(true)}>
                    {t('detail.add_trade')}
                  </Button>
                  {selectedTradeIds.size > 0 && (
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteSelectedTrades}
                      isLoading={isDeletingTrades}
                    >
                      {t('detail.delete_selected')} ({selectedTradeIds.size})
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
}
