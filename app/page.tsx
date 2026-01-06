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

export default function Home() {
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
      { value: 'all', label: 'All Time' },
      { value: 'end_of_month', label: `End of Current Month (${daysToMonthEnd}d)` },
      { value: 'end_of_next_month', label: `End of Next Month (${daysToNextMonthEnd}d)` },
      { value: 'end_of_next_next_month', label: `End of Next Next Month (${daysToNextNextMonthEnd}d)` },
      { value: 'end_of_year', label: `End of Current Year (${daysToYearEnd}d)` },
    ];
  }, []);

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
      toast.error('Failed to load options');
    } finally {
      setOptionsLoading(false);
    }
  }, [user]);

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
        toast.success('Welcome back!');
      } else {
        await signUp(email, password);
        toast.success('Account created! Please check your email to verify.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setOptions([]);
      toast.info('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
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
        throw new Error(error.error || 'Failed to create option');
      }
      
      toast.success('Option opened successfully!');
      setShowNewTradeForm(false);
      await loadOptions();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create option';
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
          <Text color="fg.muted">Loading...</Text>
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
            <Text color="fg.muted">Hong Kong Stock Options Tracker</Text>
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
              <Text fontSize="2xl" fontWeight="bold" color="fg.default">Dashboard</Text>
              <Text color="fg.muted" fontSize="sm">
                {new Date().toLocaleDateString('en-HK', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </Box>
            <Button onClick={() => setShowNewTradeForm(true)}>
              + New Option
            </Button>
          </Flex>

          {/* New Trade Modal */}
          <Modal
            isOpen={showNewTradeForm}
            onClose={() => setShowNewTradeForm(false)}
            title="New Option"
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
                <Text color="fg.muted">Loading options...</Text>
              </VStack>
            </Center>
          ) : options.length > 0 ? (
            <Box mb={6}>
              <Flex gap={4} flexWrap="wrap" mb={6}>
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
                  <Text fontSize="sm" color="fg.muted" mb={2}>Open Positions</Text>
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
                  <Text fontSize="sm" color="fg.muted" mb={2}>Total PNL</Text>
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
                  <Text fontSize="sm" color="fg.muted" mb={2}>Total Covering Cash</Text>
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
                    <Heading size="md" color="fg.default">Exposure Analysis</Heading>
                    <Text fontSize="xs" color="fg.muted">Concentrated risk by expiry milestone</Text>
                  </VStack>
                  <Box w="240px">
                    <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1} textAlign="right">
                      Risk Horizon
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
                  No options yet. Create your first option to get started!
                </Text>
                <Button onClick={() => setShowNewTradeForm(true)}>
                  Create First Option
                </Button>
              </VStack>
            </Center>
          )}
        </Container>
      </Box>
    </Box>
  );
}
