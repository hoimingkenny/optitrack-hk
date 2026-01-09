'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Container, Flex, Text, VStack, Center, Spinner, SimpleGrid, Heading } from '@chakra-ui/react';
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
  const [hsiData, setHsiData] = useState<{ price: number; lastClosePrice: number; changePct: number } | null>(null);

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
      fetchHsi();
    }
  }, [user, loadOptions]);

  const fetchHsi = async () => {
    try {
      const response = await fetch('/api/futu/quote?symbol=HK.800000');
      if (response.ok) {
        const data = await response.json();
        setHsiData({
          price: data.price,
          lastClosePrice: data.lastClosePrice,
          changePct: data.changePct
        });
      }
    } catch (error) {
      console.error('Error fetching HSI:', error);
    }
  };

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
      <Center minH="100vh">
        <VStack>
          <Spinner size="xl" color="brand.500" borderWidth="4px" />
          <Text color="fg.muted">{t('common.loading')}</Text>
        </VStack>
      </Center>
    );
  }

  // Auth screen
  if (!user) {
    return (
      <Center minH="100vh" p={4}>
        <Box w="full" maxW="md">
          <VStack textAlign="center" mb={8}>
            <Text fontSize="3xl" fontWeight="bold" color="fg.default">📈 OptiTrack HK</Text>
            <Text color="fg.muted">{t('page.hk_tracker_subtitle')}</Text>
          </VStack>
          <AuthForm
            mode={authMode}
            onSubmit={handleAuth}
            onToggleMode={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}
            isLoading={authLoading}
            error={authError}
          />
        </Box>
      </Center>
    );
  }

  // Dashboard
  return (
    <Box minH="100vh" w="100%">
      <DashboardNav onSignOut={handleSignOut} userEmail={user.email} />
      
      <Box w="100%">
        <Container maxW="7xl" mx="auto" px={{ base: 4, sm: 6, lg: 8 }} py={6}>
          {/* Header */}
          <Flex alignItems="center" justifyContent="space-between" mb={6}>
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color="fg.default">{t('page.dashboard_title')}</Text>
              <Text color="fg.muted" fontSize="sm">
                {new Date().toLocaleDateString(language === 'zh' ? 'zh-HK' : 'en-HK', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </Box>
            <Button onClick={() => setShowNewTradeForm(true)}>
              {t('page.new_option_btn')}
            </Button>
          </Flex>

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
            <Center py={12}>
              <VStack gap={2}>
                <Spinner size="lg" color="brand.500" borderWidth="4px" />
                <Text color="fg.muted">{t('page.loading_options')}</Text>
              </VStack>
            </Center>
          ) : options.length > 0 ? (
            <Box mb={6}>
              <Flex gap={4} flexWrap="wrap" mb={6}>
                {/* HSI Index */}
                <Box 
                  flex="1" 
                  minW="240px"
                  bg="bg.surface" 
                  p={6} 
                  borderRadius="xl" 
                  borderWidth="1px" 
                  borderColor="border.default"
                >
                  <Flex justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Text fontSize="sm" color="fg.muted">恆生指數 (HSI)</Text>
                    {hsiData && (
                      <Text 
                        fontSize="xs" 
                        fontWeight="bold" 
                        px={2} 
                        py={0.5} 
                        borderRadius="full"
                        bg={hsiData.changePct >= 0 ? "green.500/10" : "red.500/10"}
                        color={hsiData.changePct >= 0 ? "green.500" : "red.500"}
                      >
                        {hsiData.changePct >= 0 ? "+" : ""}{hsiData.changePct.toFixed(2)}%
                      </Text>
                    )}
                  </Flex>
                  {hsiData ? (
                    <VStack align="start" gap={0}>
                      <Text fontSize="3xl" fontWeight="bold" color="fg.default">
                        {hsiData.price.toLocaleString('en-HK', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        昨收: {hsiData.lastClosePrice.toLocaleString('en-HK', { minimumFractionDigits: 2 })}
                      </Text>
                    </VStack>
                  ) : (
                    <Spinner size="sm" />
                  )}
                </Box>

                {/* Open Positions */}
                <Box 
                  flex="1" 
                  minW="200px"
                  bg="bg.surface" 
                  p={6} 
                  borderRadius="xl" 
                  borderWidth="1px" 
                  borderColor="border.default"
                >
                  <Text fontSize="sm" color="fg.muted" mb={2}>{t('dashboard.open_positions')}</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="blue.400">
                    {openOptionsCount}
                  </Text>
                </Box>

                {/* Total PNL */}
                <Box 
                  flex="1" 
                  minW="200px"
                  bg="bg.surface" 
                  p={6} 
                  borderRadius="xl" 
                  borderWidth="1px" 
                  borderColor="border.default"
                >
                  <Text fontSize="sm" color="fg.muted" mb={2}>{t('dashboard.total_pnl')}</Text>
                  <Text 
                    fontSize="3xl" 
                    fontWeight="bold" 
                    color={totalPNL > 0 ? 'green.400' : totalPNL < 0 ? 'red.400' : 'fg.default'}
                  >
                    {formatPNL(totalPNL)}
                  </Text>
                </Box>

                {/* Total Covering Cash */}
                <Box 
                  flex="1" 
                  minW="200px"
                  bg="bg.surface" 
                  p={6} 
                  borderRadius="xl" 
                  borderWidth="1px" 
                  borderColor="border.default"
                >
                  <Text fontSize="sm" color="fg.muted" mb={2}>{t('dashboard.total_covering_cash')}</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="#D73535">
                    {formatHKD(totalCoveringCash)}
                  </Text>
                </Box>
              </Flex>

              {/* Heatmap */}
              <OptionHeatmap options={options} />

              {/* Exposure Summaries */}
              <Box mt={8}>
                <Flex justifyContent="space-between" alignItems="flex-end" mb={4}>
                  <VStack align="start" gap={1}>
                    <Heading size="md" color="fg.default">{t('page.exposure_analysis')}</Heading>
                    <Text fontSize="xs" color="fg.muted">{t('page.concentrated_risk')}</Text>
                  </VStack>
                  <Box w="240px">
                    <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1} textAlign="right">
                      {t('page.risk_horizon')}
                    </Text>
                    <Select
                      options={TIME_RANGE_OPTIONS}
                      value={exposureTimeRange}
                      onChange={(e) => setExposureTimeRange(e.target.value)}
                    />
                  </Box>
                </Flex>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
                  <SellPutExposure options={options} timeRange={exposureTimeRange} />
                  <SellCallExposure options={options} timeRange={exposureTimeRange} />
                </SimpleGrid>
              </Box>
            </Box>
          ) : (
            <Center py={12} bg="bg.surface" borderRadius="xl" borderWidth="1px" borderColor="border.default">
              <VStack gap={4}>
                <Text color="fg.muted" mb={0}>
                  {t('page.no_options_empty')}
                </Text>
                <Button onClick={() => setShowNewTradeForm(true)}>
                  {t('page.create_first_btn')}
                </Button>
              </VStack>
            </Center>
          )}
        </Container>
      </Box>
    </Box>
  );
}
