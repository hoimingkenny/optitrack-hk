'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  Input,
  Button,
  Table,
  VStack,
  HStack,
  Text,
  Spinner,
  Badge,
  Center,
} from '@chakra-ui/react';
import { OptionExpirationDate, OptionChainItem } from '@/utils/futu/client';
import { toaster } from '@/components/providers/ChakraProvider';
import Card from '@/components/ui/Card';
import DashboardNav from '@/components/layout/DashboardNav';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import Modal from '@/components/ui/Modal';
import TradeForm from '@/components/trades/TradeForm';
import { CreateOptionWithTradeInput } from '@/db/schema';

export default function FutuOptionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

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

    if (mounted) {
      checkAuth();
    }
  }, [router, mounted]);

  // Listen for auth changes
  useEffect(() => {
    if (!mounted) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push('/');
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router, mounted]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
      toaster.create({
        title: 'Signed out successfully',
        type: 'info'
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toaster.create({
        title: 'Failed to sign out',
        type: 'error'
      });
    }
  };

  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OptionExpirationDate[]>([]);
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null);
  
  // New state for option chain
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainData, setChainData] = useState<OptionChainItem[]>([]); // Always holds ALL data (Call+Put, All Strikes)

  // Filters
  const [filterType, setFilterType] = useState<number>(1); // 1: CALL, 2: PUT
  const [filterMoneyness, setFilterMoneyness] = useState<number>(0); // 0: ALL, 1: ITM, 2: OTM

  // Search Suggestions
  const [suggestions, setSuggestions] = useState<{ market: number, code: string, name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedOptionForLog, setSelectedOptionForLog] = useState<any>(null);
  const [logLoading, setLogLoading] = useState(false);

  const handleLogTrade = (item: OptionChainItem) => {
    setSelectedOptionForLog({
      stock_symbol: symbol.toUpperCase(),
      option_type: item.optionType === 1 ? 'Call' : 'Put',
      strike_price: item.strikePrice.toString(),
      expiry_date: selectedDate,
      premium: item.premium?.toString() || '',
      contracts: '1',
      stock_price: underlyingPrice?.toString() || '',
      hsi: '20000', // Default fallback
      futu_code: item.code,
    });
    setShowLogModal(true);
  };

  const onSubmitLog = async (data: any) => {
    if (!user) return;
    
    setLogLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const optionData: CreateOptionWithTradeInput = {
        option: {
          stock_symbol: data.stock_symbol,
          direction: data.direction,
          option_type: data.option_type,
          strike_price: data.strike_price,
          expiry_date: data.expiry_date,
          futu_code: data.futu_code,
          status: data.status,
        },
        trade: {
          contracts: data.contracts,
          premium: data.premium,
          fee: data.fee,
          stock_price: data.stock_price,
          hsi: data.hsi,
          trade_date: data.trade_date,
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
      
      toaster.create({
        title: 'Option logged successfully!',
        type: 'success'
      });
      setShowLogModal(false);
    } catch (error: any) {
      toaster.create({
        title: error.message || 'Failed to create option',
        type: 'error'
      });
    } finally {
      setLogLoading(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSymbol(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length > 0) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/futu/search?q=${encodeURIComponent(value)}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error('Search failed', err);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item: { market: number, code: string, name: string }) => {
    setSymbol(item.code);
    setShowSuggestions(false);
    handleSearch(item.code);
  };

  const handleSearch = async (overrideSymbol?: string) => {
    const searchSymbol = typeof overrideSymbol === 'string' ? overrideSymbol : symbol;
    if (!searchSymbol) {
      toaster.create({
        title: 'Please enter a stock symbol',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setData([]);
    setSelectedDate(null);
    setChainData([]);
    setUnderlyingPrice(null);

    try {
      // 1. Fetch Quote for Underlying Price
      try {
        const quoteRes = await fetch(`/api/futu/quote?symbol=${encodeURIComponent(searchSymbol)}`);
        const quoteData = await quoteRes.json();
        
        if (quoteRes.ok && quoteData.price !== undefined && quoteData.price !== null) {
          setUnderlyingPrice(quoteData.price);
        } else {
          const errMsg = quoteData.error || 'Price not available';
          console.error('Quote fetch failed:', errMsg);
          toaster.create({
            title: `Quote fetch failed: ${errMsg}`,
            type: 'warning'
          });
        }
      } catch (e: any) {
        console.error('Failed to fetch quote', e);
        toaster.create({
          title: `Failed to fetch quote: ${e.message}`,
          type: 'error'
        });
      }

      // 2. Fetch Expiration Dates
      const response = await fetch(`/api/futu/option-expiration?symbol=${encodeURIComponent(searchSymbol)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result);
      if (result.length > 0) {
        // Automatically fetch the first date
        handleFetchChain(result[0].strikeTime, searchSymbol);
      } else {
        toaster.create({
          title: 'No option expiration dates found for this symbol.',
          type: 'info'
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch expiration dates', error);
      toaster.create({
        title: error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch ALL option chain data for client-side filtering
  const handleFetchChain = async (date: string, symbolOverride?: string) => {
    const searchSymbol = symbolOverride || symbol;
    setSelectedDate(date);
    setChainLoading(true);
    setChainData([]);

    try {
        // Always fetch ALL data (type=0, cond=0)
        let url = `/api/futu/option-chain?symbol=${encodeURIComponent(searchSymbol)}&start=${date}&end=${date}&optionType=0&optionCondType=0`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch option chain');
        }
        
        setChainData(result);
        if (result.length === 0) {
            toaster.create({
                title: `No option chain data found for ${date}`,
                type: 'info'
            });
        }
    } catch (error: any) {
        toaster.create({
            title: error.message,
            type: 'error'
        });
    } finally {
        setChainLoading(false);
    }
  };

  // Client-side filtering logic
  const getFilteredAndSortedChain = () => {
    let filtered = [...chainData];

    // 1. Filter by Type
    if (filterType !== 0) {
      filtered = filtered.filter(item => item.optionType === filterType);
    }

    // 2. Filter by Moneyness (ITM/OTM)
    if (filterMoneyness !== 0 && underlyingPrice !== null) {
      filtered = filtered.filter(item => {
        const isCall = item.optionType === 1;
        const isITM = isCall 
          ? item.strikePrice < underlyingPrice 
          : item.strikePrice > underlyingPrice;
        
        return filterMoneyness === 1 ? isITM : !isITM;
      });
    }

    // 3. Sort by Strike then Type
    filtered.sort((a, b) => {
      if (a.strikePrice !== b.strikePrice) {
        return a.strikePrice - b.strikePrice;
      }
      return a.optionType - b.optionType;
    });

    // 4. Inject "Current Price" Row
    if (underlyingPrice !== null) {
      const displayRows: (OptionChainItem | { isPriceRow: true, price: number })[] = [];
      let priceRowInserted = false;

      // Special case: if filtered is empty, still show the price row
      if (filtered.length === 0) {
        return [{ isPriceRow: true, price: underlyingPrice }];
      }

      for (const item of filtered) {
        if (!priceRowInserted && item.strikePrice > underlyingPrice) {
          displayRows.push({ isPriceRow: true, price: underlyingPrice });
          priceRowInserted = true;
        }
        displayRows.push(item);
      }
      
      // If price is higher than all strikes (or if we still haven't inserted it)
      if (!priceRowInserted) {
        displayRows.push({ isPriceRow: true, price: underlyingPrice });
      }
      
      return displayRows;
    }

    return filtered;
  };

  const displayRows = getFilteredAndSortedChain();

  if (!mounted || initialLoading) {
    return (
      <Box h="100vh" w="100vw">
        <Center h="full">
          <VStack gap={4}>
            <Spinner size="xl" color="brand.500" />
            <Text color="fg.muted" fontWeight="medium">Loading your dashboard...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="bg.canvas">
      <DashboardNav onSignOut={handleSignOut} userEmail={user?.email} />
      
      <Container maxW="7xl" mx="auto" px={{ base: 4, sm: 6, lg: 8 }} py={8}>
        <VStack gap={8} align="stretch">
          <Card padding="none">
            <Box p={4} borderBottomWidth="1px" borderColor="border.default">
              <VStack align="stretch" gap={4} mb={4}>
                <HStack gap={4} wrap="wrap" justify="space-between" align="center">
                  <HStack gap={2}>
                    <Box position="relative" width="200px" onClick={(e) => e.stopPropagation()}>
                      <Input
                        placeholder="e.g. 00700"
                        value={symbol}
                        onChange={handleInputChange}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        size="sm"
                        autoComplete="off"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <Box
                          position="absolute"
                          top="100%"
                          left={0}
                          right={0}
                          zIndex={1000}
                          bg="bg.panel"
                          border="1px solid"
                          borderColor="border.default"
                          borderRadius="md"
                          mt={1}
                          shadow="lg"
                          maxH="300px"
                          overflowY="auto"
                        >
                          {suggestions.map((item) => (
                            <Box
                              key={item.code}
                              p={2}
                              cursor="pointer"
                              _hover={{ bg: 'bg.muted' }}
                              onClick={() => handleSelectSuggestion(item)}
                            >
                              <HStack justify="space-between">
                                <Text fontWeight="bold" fontSize="sm">{item.code}</Text>
                                <Text flex={1} px={2} truncate fontSize="sm">{item.name}</Text>
                                <Text fontSize="xs" color="fg.muted">HK</Text>
                              </HStack>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Button 
                      onClick={() => handleSearch()} 
                      loading={loading}
                      size="sm"
                      colorPalette="blue"
                    >
                      Search
                    </Button>
                  </HStack>

                  <HStack gap={6}>
                    <HStack gap={3}>
                      <HStack gap={0} border="1px solid" borderColor="border.default" borderRadius="md" overflow="hidden" bg="bg.muted">
                        <Button
                          size="sm"
                          variant={filterType === 1 ? 'solid' : 'ghost'}
                          colorPalette="blue"
                          fontWeight={filterType === 1 ? 'bold' : 'normal'}
                          onClick={() => setFilterType(1)}
                          borderRadius={0}
                          px={4}
                        >
                          Call
                        </Button>
                        <Button
                          size="sm"
                          variant={filterType === 2 ? 'solid' : 'ghost'}
                          colorPalette="blue"
                          fontWeight={filterType === 2 ? 'bold' : 'normal'}
                          onClick={() => setFilterType(2)}
                          borderRadius={0}
                          px={4}
                          borderLeft="1px solid"
                          borderColor="border.default"
                        >
                          Put
                        </Button>
                      </HStack>
                    </HStack>

                    <HStack gap={3}>
                      <HStack gap={0} border="1px solid" borderColor="border.default" borderRadius="md" overflow="hidden" bg="bg.muted">
                        <Button
                          size="sm"
                          variant={filterMoneyness === 0 ? 'solid' : 'ghost'}
                          colorPalette="blue"
                          fontWeight={filterMoneyness === 0 ? 'bold' : 'normal'}
                          onClick={() => setFilterMoneyness(0)}
                          borderRadius={0}
                          px={4}
                        >
                          All
                        </Button>
                        <Button
                          size="sm"
                          variant={filterMoneyness === 1 ? 'solid' : 'ghost'}
                          colorPalette="blue"
                          fontWeight={filterMoneyness === 1 ? 'bold' : 'normal'}
                          onClick={() => setFilterMoneyness(1)}
                          borderRadius={0}
                          px={4}
                          borderLeft="1px solid"
                          borderColor="border.default"
                        >
                          ITM
                        </Button>
                        <Button
                          size="sm"
                          variant={filterMoneyness === 2 ? 'solid' : 'ghost'}
                          colorPalette="blue"
                          fontWeight={filterMoneyness === 2 ? 'bold' : 'normal'}
                          onClick={() => setFilterMoneyness(2)}
                          borderRadius={0}
                          px={4}
                          borderLeft="1px solid"
                          borderColor="border.default"
                        >
                          OTM
                        </Button>
                      </HStack>
                    </HStack>
                  </HStack>
                </HStack>
              </VStack>

              <VStack align="stretch" gap={4}>


                {/* Expiration Date Tabs - Integrated into Header */}
                {data.length > 0 && (
                  <Box borderBottomWidth="1px" borderColor="border.default" pb={2}>
                    <HStack 
                      gap={2} 
                      overflowX="auto" 
                      css={{
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                      }}
                    >
                      {data.map((item) => {
                        const isActive = selectedDate === item.strikeTime;
                        const dateParts = item.strikeTime.split('-');
                        const displayDate = `${dateParts[1]}/${dateParts[2]}`;
                        return (
                          <Button
                            key={item.strikeTime}
                            size="sm"
                            variant={isActive ? 'solid' : 'subtle'}
                            colorPalette={isActive ? 'blue' : 'gray'}
                            fontWeight={isActive ? 'bold' : 'normal'}
                            onClick={() => handleFetchChain(item.strikeTime)}
                            px={6}
                            minW="max-content"
                            borderRadius="full"
                            boxShadow={isActive ? 'md' : 'none'}
                            _hover={{
                              bg: isActive ? 'blue.600' : 'gray.200',
                            }}
                          >
                            {displayDate}
                            {item.expirationCycle === 1 && (
                              <Text as="span" fontSize="2xs" ml={1} verticalAlign="super">W</Text>
                            )}
                          </Button>
                        );
                      })}
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Box>

            <Box>
              {loading || chainLoading ? (
                <Box display="flex" justifyContent="center" py={20}>
                  <Spinner size="xl" color="blue.500" />
                </Box>
              ) : chainData.length > 0 ? (
                <Box overflowX="auto">
                  <Table.Root size="sm" variant="outline" stickyHeader striped>
                    <Table.Header>
                      <Table.Row bg="bg.muted">
                        <Table.ColumnHeader width="120px" bg="bg.muted" fontWeight="bold">Strike (行權價)</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right" bg="bg.muted">Last Premium</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right" bg="bg.muted">Bid</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right" bg="bg.muted">Ask</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right" bg="bg.muted">Vol</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right" bg="bg.muted">OI</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right" bg="bg.muted">Delta</Table.ColumnHeader>
                        <Table.ColumnHeader bg="bg.muted">Type</Table.ColumnHeader>
                        <Table.ColumnHeader bg="bg.muted">Code</Table.ColumnHeader>
                        <Table.ColumnHeader bg="bg.muted" width="80px">Action</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {displayRows.map((row, index) => {
                        if ('isPriceRow' in row) {
                          const price = row.price;
                          return (
                            <Table.Row key={`price-${index}`} bg="blue.50">
                              <Table.Cell colSpan={10} textAlign="center" fontWeight="bold" color="blue.600">
                                Current Price: {typeof price === 'number' ? price.toFixed(3) : price}
                              </Table.Cell>
                            </Table.Row>
                          );
                        }
                        
                        const item = row as OptionChainItem;
                        const isCall = item.optionType === 1;
                        const isITM = underlyingPrice !== null && (
                          (isCall && item.strikePrice < underlyingPrice) || 
                          (!isCall && item.strikePrice > underlyingPrice)
                        );

                        return (
                          <Table.Row key={item.code} _hover={{ bg: 'blue.subtle' }} bg={isITM ? "rgba(49, 130, 206, 0.05)" : undefined}>
                            <Table.Cell fontWeight="bold" fontSize="md" bg={isITM ? "blue.50" : "bg.muted/30"} color={isITM ? "blue.700" : "inherit"}>
                              {item.strikePrice.toFixed(2)}
                              {isITM && (
                                <Badge size="xs" colorPalette="blue" ml={2} variant="subtle">ITM</Badge>
                              )}
                            </Table.Cell>
                            <Table.Cell textAlign="right" color="green.600" fontWeight="bold">
                              {item.premium !== undefined ? item.premium.toFixed(3) : '-'}
                            </Table.Cell>
                            <Table.Cell textAlign="right" color="green.600">
                              {item.bidPrice !== undefined ? item.bidPrice.toFixed(3) : '-'}
                            </Table.Cell>
                            <Table.Cell textAlign="right" color="green.600">
                              {item.askPrice !== undefined ? item.askPrice.toFixed(3) : '-'}
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                              {item.volume !== undefined ? item.volume : '-'}
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                              {item.openInterest !== undefined ? item.openInterest : '-'}
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                              {item.delta !== undefined ? item.delta.toFixed(3) : '-'}
                            </Table.Cell>
                            <Table.Cell>
                              <Badge colorPalette={item.optionType === 1 ? 'green' : 'red'} size="xs" variant="solid">
                                {item.optionType === 1 ? 'CALL' : 'PUT'}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell fontFamily="mono" fontSize="2xs" color="fg.muted">{item.code}</Table.Cell>
                            <Table.Cell>
                              <Button 
                                size="xs" 
                                colorPalette="blue" 
                                variant="outline"
                                onClick={() => handleLogTrade(item)}
                              >
                                Log
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                </Box>
              ) : selectedDate ? (
                <Box py={20} textAlign="center" color="fg.muted">
                  No option chain data available for this date.
                </Box>
              ) : (
                <Box py={20} textAlign="center" color="fg.muted">
                  Enter a symbol and click search to view the option chain.
                </Box>
              )}
            </Box>
          </Card>
      </VStack>
    </Container>

    {/* Log Trade Modal */}
    <Modal
      isOpen={showLogModal}
      onClose={() => setShowLogModal(false)}
      title="Log Option Trade"
      size="xl"
    >
      <Box p={4}>
        {selectedOptionForLog && (
          <TradeForm
            initialData={selectedOptionForLog}
            onSubmit={onSubmitLog}
            onCancel={() => setShowLogModal(false)}
            isLoading={logLoading}
          />
        )}
      </Box>
    </Modal>
  </Box>
  );
}
