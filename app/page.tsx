'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { OptionWithSummary, CreateOptionWithTradeInput } from '@/db/schema';
import { 
  supabase, 
  signIn, 
  signUp, 
  signOut
} from '@/utils/supabase';
import AuthForm from '@/components/auth/AuthForm';
import DashboardNav from '@/components/layout/DashboardNav';
import TradeForm from '@/components/trades/TradeForm';
import OptionHeatmap from '@/components/dashboard/OptionHeatmap';
import SellPutExposure from '@/components/dashboard/SellPutExposure';
import SellCallExposure from '@/components/dashboard/SellCallExposure';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { formatHKD, formatPNL } from '@/utils/helpers/pnl-calculator';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { t, language } = useLanguage();
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Options state
  const [options, setOptions] = useState<OptionWithSummary[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [showNewTradeForm, setShowNewTradeForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [exposureTimeRange, setExposureTimeRange] = useState<string>('all');

  const TIME_RANGE_OPTIONS = useMemo(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const endOfNextNextMonth = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    
    const daysToMonthEnd = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysToNextMonthEnd = Math.ceil((endOfNextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysToNextNextMonthEnd = Math.ceil((endOfNextNextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysToYearEnd = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return [
      { value: 'all', label: t('page.time_all') },
      { value: 'end_of_month', label: `${t('page.time_end_month')} (${daysToMonthEnd}d)` },
      { value: 'end_of_next_month', label: `${t('page.time_end_next_month')} (${daysToNextMonthEnd}d)` },
      { value: 'end_of_next_next_month', label: `${t('page.time_end_next_next_month')} (${daysToNextNextMonthEnd}d)` },
      { value: 'end_of_year', label: `${t('page.time_end_year')} (${daysToYearEnd}d)` },
    ];
  }, [t]);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load options when user is authenticated
  const loadOptions = useCallback(async () => {
    if (!user) return;
    
    setOptionsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/options', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch options');
      const data = await response.json();
      setOptions(data.options);
    } catch (error) {
      console.error('Error loading options:', error);
      toast.error(t('common.error'));
    } finally {
      setOptionsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (user) {
      loadOptions();
    }
  }, [user, loadOptions]);

  // Auth handlers
  const handleAuth = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      if (authMode === 'login') {
        await signIn(email, password);
        toast.success(t('auth.welcome_back'));
      } else {
        await signUp(email, password);
        toast.success(t('auth.account_created'));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('page.auth_fail');
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setOptions([]);
      toast.info(t('auth.sign_out_success'));
    } catch {
      toast.error(t('auth.sign_out_fail'));
    }
  };

  // Trade handlers - Updated to create option with initial trade
  const handleCreateTrade = async (data: any) => {
    if (!user) return;
    
    setFormLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Transform old trade format to new option format
      const optionData: CreateOptionWithTradeInput = {
        option: {
          stock_symbol: data.stock_symbol,
          stock_name: data.stock_name,
          direction: data.direction,
          option_type: data.option_type,
          strike_price: data.strike_price,
          expiry_date: data.expiry_date,
          futu_code: data.futu_code,
        },
        trade: {
          contracts: data.contracts,
          premium: data.premium,
          fee: data.fee,
          stock_price: data.stock_price,
          hsi: data.hsi,
          trade_date: data.trade_date,
          shares_per_contract: data.shares_per_contract,
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
        throw new Error(error.error || t('page.create_option_fail'));
      }
      
      toast.success(t('page.option_opened_success'));
      setShowNewTradeForm(false);
      await loadOptions();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('page.create_option_fail');
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Calculate total PNL from all options
  const totalPNL = options.reduce((sum, option) => sum + option.total_pnl, 0);
  const openOptionsCount = options.filter(o => o.status === 'Open').length;

  // Calculate total covering cash for all open sell puts
  const totalCoveringCash = options.reduce((sum, option) => {
    if (option.status === 'Open' && option.option_type === 'Put' && option.direction === 'Sell') {
      const strikePrice = typeof option.strike_price === 'string' ? parseFloat(option.strike_price) : option.strike_price;
      const sharesPerContract = (option as any).shares_per_contract || 500;
      return sum + (option.net_contracts * sharesPerContract * strikePrice);
    }
    return sum;
  }, 0);

  // Loading state
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 space-y-2">
            <h1 className="text-3xl font-bold text-foreground">📈 OptiTrack HK</h1>
            <p className="text-muted-foreground">{t('page.hk_tracker_subtitle')}</p>
          </div>
          <AuthForm
            mode={authMode}
            onSubmit={handleAuth}
            onToggleMode={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}
            isLoading={authLoading}
            error={authError}
          />
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen w-full bg-background">
      <DashboardNav onSignOut={handleSignOut} userEmail={user.email} />
      
      <main className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('page.dashboard_title')}</h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString(language === 'zh' ? 'zh-HK' : 'en-HK', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <Button onClick={() => setShowNewTradeForm(true)}>
              {t('page.new_option_btn')}
            </Button>
          </div>

          {/* New Trade Modal */}
          <Modal
            isOpen={showNewTradeForm}
            onClose={() => setShowNewTradeForm(false)}
            title={t('page.new_option_modal')}
            size="xl"
          >
            <TradeForm
              onSubmit={handleCreateTrade}
              onCancel={() => setShowNewTradeForm(false)}
              isLoading={formLoading}
            />
          </Modal>

          {/* Summary Cards */}
          {optionsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('page.loading_options')}</p>
            </div>
          ) : options.length > 0 ? (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Open Positions */}
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">{t('dashboard.open_positions')}</p>
                  <p className="text-3xl font-bold text-blue-500">
                    {openOptionsCount}
                  </p>
                </div>

                {/* Total PNL */}
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">{t('dashboard.total_pnl')}</p>
                  <p 
                    className={cn(
                      "text-3xl font-bold",
                      totalPNL > 0 ? "text-green-500" : totalPNL < 0 ? "text-red-500" : "text-foreground"
                    )}
                  >
                    {formatPNL(totalPNL)}
                  </p>
                </div>

                {/* Total Covering Cash */}
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">{t('dashboard.total_covering_cash')}</p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatHKD(totalCoveringCash)}
                  </p>
                </div>
              </div>

              {/* Heatmap */}
              <OptionHeatmap options={options} />

              {/* Exposure Summaries */}
              <div className="mt-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-foreground">{t('page.exposure_analysis')}</h2>
                    <p className="text-xs text-muted-foreground">{t('page.concentrated_risk')}</p>
                  </div>
                  <div className="w-full sm:w-60">
                    <p className="text-xs font-medium text-muted-foreground mb-1 sm:text-right">
                      {t('page.risk_horizon')}
                    </p>
                    <Select
                      options={TIME_RANGE_OPTIONS}
                      value={exposureTimeRange}
                      onChange={(e) => setExposureTimeRange(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SellPutExposure options={options} timeRange={exposureTimeRange} />
                  <SellCallExposure options={options} timeRange={exposureTimeRange} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-card rounded-xl border border-border border-dashed gap-4">
              <p className="text-muted-foreground">
                {t('page.no_options_empty')}
              </p>
              <Button onClick={() => setShowNewTradeForm(true)}>
                {t('page.create_first_btn')}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
