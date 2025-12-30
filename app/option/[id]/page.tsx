'use client';

import { useState, useEffect } from 'react';
import { Box, Container, Center, Spinner, Text, VStack, Flex, Button, Heading } from '@chakra-ui/react';
import { User } from '@supabase/supabase-js';
import { OptionWithTrades } from '@/db/schema';
import { supabase } from '@/utils/supabase';
import DashboardNav from '@/components/layout/DashboardNav';
import { DirectionBadge, StatusBadge } from '@/components/ui/Badge';
import { formatHKD } from '@/utils/helpers/pnl-calculator';
import { formatDateForDisplay } from '@/utils/helpers/date-helpers';
import { toast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

export default function OptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Option state
  const [optionData, setOptionData] = useState<OptionWithTrades | null>(null);
  const [loading, setLoading] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

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
  useEffect(() => {
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

    loadOption();
  }, [user, resolvedParams, router]);

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
                <Button variant="ghost" onClick={handleBack} mb={4}>
                  ← Back to All Options
                </Button>
                
                <Flex alignItems="center" gap={3} mb={2}>
                  <Heading size="xl" color="fg.default">
                    {optionData.stock_symbol}
                  </Heading>
                  <DirectionBadge direction={optionData.direction} />
                  <StatusBadge status={optionData.status} />
                </Flex>
                
                <Flex gap={4} flexWrap="wrap" color="fg.muted">
                  <Text>Strike: {formatHKD(optionData.strike_price)}</Text>
                  <Text>•</Text>
                  <Text>Expiry: {formatDateForDisplay(optionData.expiry_date)}</Text>
                  <Text>•</Text>
                  <Text>Net Contracts: {optionData.summary.netContracts}</Text>
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
                <Flex gap={8} flexWrap="wrap">
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
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>Net PNL</Text>
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color={optionData.summary.netPNL > 0 ? 'green.400' : optionData.summary.netPNL < 0 ? 'red.400' : 'fg.default'}
                    >
                      {formatHKD(optionData.summary.netPNL)}
                    </Text>
                  </Box>
                </Flex>
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
                  <VStack gap={3} align="stretch">
                    {optionData.trades.map((trade) => (
                      <Box 
                        key={trade.id}
                        p={4}
                        bg="bg.muted"
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor="border.subtle"
                      >
                        <Flex justifyContent="space-between" alignItems="start">
                          <Box>
                            <Flex gap={2} alignItems="center" mb={2}>
                              <Text fontWeight="bold" color="fg.default">
                                {trade.trade_type}
                              </Text>
                              <Text color="fg.muted" fontSize="sm">
                                {formatDateForDisplay(trade.trade_date)}
                              </Text>
                            </Flex>
                            <Flex gap={4} fontSize="sm" color="fg.muted">
                              <Text>Contracts: {trade.contracts}</Text>
                              <Text>•</Text>
                              <Text>Premium: {formatHKD(trade.premium)}</Text>
                              <Text>•</Text>
                              <Text>Fee: {formatHKD(trade.fee)}</Text>
                            </Flex>
                            {trade.notes && (
                              <Text fontSize="sm" color="fg.muted" mt={2}>
                                {trade.notes}
                              </Text>
                            )}
                          </Box>
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                )}
              </Box>

              {/* Action Buttons */}
              {optionData.status === 'Open' && (
                <Flex gap={3}>
                  <Button colorScheme="blue">Add to Position</Button>
                  <Button colorScheme="orange">Reduce Position</Button>
                  <Button colorScheme="red">Close Position</Button>
                </Flex>
              )}
            </VStack>
          )}
        </Container>
      </Box>
    </Box>
  );
}
