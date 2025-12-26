'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Flex, Text, VStack, Center, Spinner } from '@chakra-ui/react';
import { User } from '@supabase/supabase-js';
import { Trade, TradeFilters, NewTradeInput, CloseTradeInput } from '@/utils/types/trades';
import { 
  supabase, 
  signIn, 
  signUp, 
  signOut, 
  getTrades, 
  createTrade, 
  closeTrade,
  deleteTrade,
  getOpenTrades,
  batchUpdateTradeStatuses
} from '@/utils/supabase';
import { checkAndUpdateExpiredTrades } from '@/utils/helpers/status-calculator';
import AuthForm from '@/components/auth/AuthForm';
import DashboardNav from '@/components/layout/DashboardNav';
import TradeForm from '@/components/trades/TradeForm';
import TradeCard from '@/components/trades/TradeCard';
import TradeFiltersComponent, { applyTradeFilters } from '@/components/trades/TradeFilters';
import CloseTradeModal from '@/components/trades/CloseTradeModal';
import PNLSummary from '@/components/trades/PNLSummary';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/Modal';

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Trade state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<TradeFilters>({});
  const [tradesLoading, setTradesLoading] = useState(false);
  const [showNewTradeForm, setShowNewTradeForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Modal state
  const [closeModalTrade, setCloseModalTrade] = useState<Trade | null>(null);
  const [closeModalLoading, setCloseModalLoading] = useState(false);
  const [deleteModalTrade, setDeleteModalTrade] = useState<Trade | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Load trades when user is authenticated
  const loadTrades = useCallback(async () => {
    if (!user) return;
    
    setTradesLoading(true);
    try {
      const data = await getTrades(user.id);
      setTrades(data);
    } catch (error) {
      console.error('Error loading trades:', error);
      toast.error('Failed to load trades');
    } finally {
      setTradesLoading(false);
    }
  }, [user]);

  // Check for expired trades on load
  const checkExpiredTrades = useCallback(async () => {
    if (!user) return;
    
    try {
      const openTrades = await getOpenTrades(user.id);
      const updates = checkAndUpdateExpiredTrades(openTrades);
      
      if (updates.length > 0) {
        await batchUpdateTradeStatuses(
          user.id, 
          updates.map(u => ({ id: u.trade.id, status: u.newStatus }))
        );
        toast.info(`${updates.length} trade(s) status updated`);
        await loadTrades();
      }
    } catch (error) {
      console.error('Error checking expired trades:', error);
    }
  }, [user, loadTrades]);

  useEffect(() => {
    if (user) {
      loadTrades();
      checkExpiredTrades();
    }
  }, [user, loadTrades, checkExpiredTrades]);

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
      setTrades([]);
      toast.info('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  // Trade handlers
  const handleCreateTrade = async (data: NewTradeInput) => {
    if (!user) return;
    
    setFormLoading(true);
    try {
      await createTrade(user.id, data);
      toast.success('Trade opened successfully!');
      setShowNewTradeForm(false);
      await loadTrades();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create trade';
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseTrade = async (data: CloseTradeInput) => {
    if (!user || !closeModalTrade) return;
    
    setCloseModalLoading(true);
    try {
      await closeTrade(closeModalTrade.id, user.id, data);
      toast.success('Position closed successfully!');
      setCloseModalTrade(null);
      await loadTrades();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to close trade';
      toast.error(errorMessage);
    } finally {
      setCloseModalLoading(false);
    }
  };

  const handleDeleteTrade = async () => {
    if (!user || !deleteModalTrade) return;
    
    setDeleteLoading(true);
    try {
      await deleteTrade(deleteModalTrade.id, user.id);
      toast.success('Trade deleted');
      setDeleteModalTrade(null);
      await loadTrades();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete trade';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Get unique stock symbols for filter
  const stockSymbols = [...new Set(trades.map(t => t.stock_symbol))].sort();
  const filteredTrades = applyTradeFilters(trades, filters);

  // Loading state
  if (initialLoading) {
    return (
      <Center minH="100vh">
        <VStack>
          <Spinner size="xl" color="blue.500" borderWidth="4px" />
          <Text color="gray.400">Loading...</Text>
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
            <Text fontSize="3xl" fontWeight="bold" color="gray.100">📈 OptiTrack HK</Text>
            <Text color="gray.400">Hong Kong Stock Options Tracker</Text>
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
    <Box minH="100vh">
      <DashboardNav onSignOut={handleSignOut} userEmail={user.email} />
      
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }} py={6}>
        {/* Header */}
        <Flex alignItems="center" justifyContent="space-between" mb={6}>
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color="gray.100">Dashboard</Text>
            <Text color="gray.400" fontSize="sm">
              {new Date().toLocaleDateString('en-HK', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </Box>
          <Button onClick={() => setShowNewTradeForm(true)}>
            + New Trade
          </Button>
        </Flex>

        {/* New Trade Form */}
        {showNewTradeForm && (
          <Box mb={6}>
            <TradeForm
              onSubmit={handleCreateTrade}
              onCancel={() => setShowNewTradeForm(false)}
              isLoading={formLoading}
            />
          </Box>
        )}

        {/* PNL Summary */}
        {trades.length > 0 && (
          <Box mb={6}>
            <PNLSummary trades={trades} />
          </Box>
        )}

        {/* Filters */}
        {trades.length > 0 && (
          <Box mb={6}>
            <TradeFiltersComponent
              filters={filters}
              onFilterChange={setFilters}
              stockSymbols={stockSymbols}
            />
          </Box>
        )}

        {/* Trade List */}
        {tradesLoading ? (
          <Center py={12}>
            <VStack gap={2}>
              <Spinner size="lg" color="blue.500" borderWidth="4px" />
              <Text color="gray.400">Loading trades...</Text>
            </VStack>
          </Center>
        ) : filteredTrades.length === 0 ? (
          <Center py={12} bg="gray.900" borderRadius="xl" borderWidth="1px" borderColor="gray.800">
            <VStack gap={4}>
              <Text color="gray.400" mb={0}>
                {trades.length === 0 
                  ? "No trades yet. Create your first trade to get started!" 
                  : "No trades match your filters."}
              </Text>
              {trades.length === 0 && (
                <Button onClick={() => setShowNewTradeForm(true)}>
                  Create First Trade
                </Button>
              )}
            </VStack>
          </Center>
        ) : (
          <VStack gap={4} align="stretch">
            {filteredTrades.map(trade => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onClose={(t) => setCloseModalTrade(t)}
                onDelete={(t) => setDeleteModalTrade(t)}
              />
            ))}
          </VStack>
        )}
      </Container>

      {/* Close Trade Modal */}
      {closeModalTrade && (
        <CloseTradeModal
          trade={closeModalTrade}
          isOpen={!!closeModalTrade}
          onClose={() => setCloseModalTrade(null)}
          onSubmit={handleCloseTrade}
          isLoading={closeModalLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModalTrade}
        onClose={() => setDeleteModalTrade(null)}
        onConfirm={handleDeleteTrade}
        title="Delete Trade"
        message={`Are you sure you want to delete the ${deleteModalTrade?.stock_symbol} trade? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteLoading}
      />
    </Box>
  );
}
