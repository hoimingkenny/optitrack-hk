'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Flex, Text, VStack, Center, Spinner } from '@chakra-ui/react';
import { User } from '@supabase/supabase-js';
import { OptionWithSummary, OptionFilters } from '@/db/schema';
import { supabase } from '@/utils/supabase';
import DashboardNav from '@/components/layout/DashboardNav';
import OptionsTable from '@/components/options/OptionsTable';
import TradeFiltersComponent from '@/components/trades/TradeFilters';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';

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
          {/* Header */}
          <Flex alignItems="center" justifyContent="space-between" mb={6}>
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color="fg.default">{t('trades.all_options_title')}</Text>
              <Text color="fg.muted" fontSize="sm">
                {t('trades.total_options').replace('{count}', options.length.toString())}
              </Text>
            </Box>
          </Flex>

          {/* Filters */}
          {options.length > 0 && (
            <Box mb={6}>
              <TradeFiltersComponent
                filters={filters}
                onFilterChange={setFilters}
                stockSymbols={stockSymbols}
              />
            </Box>
          )}

          {/* Options List */}
          {optionsLoading ? (
            <Center py={12}>
              <VStack gap={2}>
                <Spinner size="lg" color="brand.500" borderWidth="4px" />
                <Text color="fg.muted">{t('page.loading_options')}</Text>
              </VStack>
            </Center>
          ) : filteredOptions.length === 0 ? (
            <Center py={12} bg="bg.surface" borderRadius="xl" borderWidth="1px" borderColor="border.default">
              <VStack gap={4}>
                <Text color="fg.muted" mb={0}>
                  {options.length === 0 
                    ? t('trades.no_options_dashboard')
                    : t('trades.no_matching_filters')}
                </Text>
              </VStack>
            </Center>
          ) : (
            <OptionsTable options={filteredOptions} />
          )}
        </Container>
      </Box>
    </Box>
  );
}
