'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { OptionWithSummary, OptionFilters } from '@/db/schema';
import { supabase } from '@/utils/supabase';
import DashboardNav from '@/components/layout/DashboardNav';
import OptionsTable from '@/components/options/OptionsTable';
import TradeFiltersComponent from '@/components/trades/TradeFilters';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Loader2 } from "lucide-react";

export default function AllTradesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Options state
  const [options, setOptions] = useState<OptionWithSummary[]>([]);
  const [filters, setFilters] = useState<OptionFilters>({});
  const [optionsLoading, setOptionsLoading] = useState(false);

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

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/');
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router]);

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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
      toast.info(t('auth.sign_out_success'));
    } catch {
      toast.error(t('auth.sign_out_fail'));
    }
  };

  // Get unique stock symbols for filter
  const stockSymbols = [...new Set(options.map(o => o.stock_symbol))].sort();
  
  // Apply filters to options
  const filteredOptions = options.filter(option => {
    if (filters.stock_symbol && option.stock_symbol !== filters.stock_symbol) return false;
    if (filters.status && filters.status !== 'ALL' && option.status !== filters.status) return false;
    if (filters.direction && filters.direction !== 'ALL' && option.direction !== filters.direction) return false;
    if (filters.start_date && option.expiry_date < filters.start_date) return false;
    if (filters.end_date && option.expiry_date > filters.end_date) return false;
    return true;
  });

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <DashboardNav onSignOut={handleSignOut} userEmail={user.email} />
      
      <main className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('trades.all_options_title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('trades.total_options').replace('{count}', options.length.toString())}
              </p>
            </div>
          </div>

          {/* Filters */}
          {options.length > 0 && (
            <div className="mb-6">
              <TradeFiltersComponent
                filters={filters}
                onFilterChange={setFilters}
                stockSymbols={stockSymbols}
              />
            </div>
          )}

          {/* Options List */}
          {optionsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('page.loading_options')}</p>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-card rounded-xl border border-border border-dashed gap-4">
              <p className="text-muted-foreground">
                {options.length === 0 
                  ? t('trades.no_options_dashboard')
                  : t('trades.no_matching_filters')}
              </p>
            </div>
          ) : (
            <OptionsTable options={filteredOptions} />
          )}
        </div>
      </main>
    </div>
  );
}
