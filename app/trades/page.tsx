'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Flex, Text, VStack, Center, Spinner } from '@chakra-ui/react';
import { User } from '@supabase/supabase-js';
import { Trade, CloseTradeInput, TradeFilters } from '@/db/schema';
import { supabase } from '@/utils/supabase';
import DashboardNav from '@/components/layout/DashboardNav';
import TradeCard from '@/components/trades/TradeCard';
import TradeFiltersComponent, { applyTradeFilters } from '@/components/trades/TradeFilters';
import CloseTradeModal from '@/components/trades/CloseTradeModal';
import { toast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

export default function AllTradesPage() {
  const router = useRouter();
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Trade state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<TradeFilters>({});
  const [tradesLoading, setTradesLoading] = useState(false);

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

  // Load trades when user is authenticated
  const loadTrades = useCallback(async () => {
    if (!user) return;
    
    setTradesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/trades', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch trades');
      const data = await response.json();
      setTrades(data.trades);
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/trades/check-expired', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to check expired trades');
      const data = await response.json();
      
      if (data.updatedCount > 0) {
        toast.info(`${data.updatedCount} trade(s) status updated`);
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
      toast.info('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const handleCloseTrade = async (data: CloseTradeInput) => {
    if (!user || !closeModalTrade) return;
    
    setCloseModalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/trades/${closeModalTrade.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to close trade');
      }
      
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/trades/${deleteModalTrade.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete trade');
      }
      
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
          {/* Header */}
          <Flex alignItems="center" justifyContent="space-between" mb={6}>
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color="fg.default">All Trades</Text>
              <Text color="fg.muted" fontSize="sm">
                {trades.length} total trade{trades.length !== 1 ? 's' : ''}
              </Text>
            </Box>
          </Flex>

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
                <Spinner size="lg" color="brand.500" borderWidth="4px" />
                <Text color="fg.muted">Loading trades...</Text>
              </VStack>
            </Center>
          ) : filteredTrades.length === 0 ? (
            <Center py={12} bg="bg.surface" borderRadius="xl" borderWidth="1px" borderColor="border.default">
              <VStack gap={4}>
                <Text color="fg.muted" mb={0}>
                  {trades.length === 0 
                    ? "No trades yet. Create your first trade from the Dashboard!" 
                    : "No trades match your filters."}
                </Text>
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
      </Box>

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
