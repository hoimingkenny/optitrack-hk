'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Flex, Text, VStack, Center, Spinner } from '@chakra-ui/react';
import { User } from '@supabase/supabase-js';
import { Trade, NewTradeInput } from '@/db/schema';
import { 
  supabase, 
  signIn, 
  signUp, 
  signOut
} from '@/utils/supabase';
import AuthForm from '@/components/auth/AuthForm';
import DashboardNav from '@/components/layout/DashboardNav';
import TradeForm from '@/components/trades/TradeForm';
import PNLSummary from '@/components/trades/PNLSummary';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Trade state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [showNewTradeForm, setShowNewTradeForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create trade');
      }
      
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
          {tradesLoading ? (
            <Center py={12}>
              <VStack gap={2}>
                <Spinner size="lg" color="brand.500" borderWidth="4px" />
                <Text color="fg.muted">Loading trades...</Text>
              </VStack>
            </Center>
          ) : trades.length > 0 ? (
            <Box mb={6}>
              <PNLSummary trades={trades} />
            </Box>
          ) : (
            <Center py={12} bg="bg.surface" borderRadius="xl" borderWidth="1px" borderColor="border.default">
              <VStack gap={4}>
                <Text color="fg.muted" mb={0}>
                  No trades yet. Create your first trade to get started!
                </Text>
                <Button onClick={() => setShowNewTradeForm(true)}>
                  Create First Trade
                </Button>
              </VStack>
            </Center>
          )}
        </Container>
      </Box>
    </Box>
  );
}
