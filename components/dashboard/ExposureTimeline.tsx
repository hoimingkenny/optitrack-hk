'use client';

import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import type { OptionWithSummary } from '@/db/schema';
import { formatHKD } from '@/utils/helpers/pnl-calculator';

interface ExposureTimelineProps {
  options: OptionWithSummary[];
}

export default function ExposureTimeline({ options }: ExposureTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const monthlyExposure = useMemo(() => {
    const months: Record<string, { puts: number, calls: number, monthName: string, date: Date }> = {};
    const now = new Date();
    
    // Create 12 months starting from now
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = {
        puts: 0,
        calls: 0,
        monthName: d.toLocaleDateString('en-HK', { month: 'short', year: '2-digit' }),
        date: d
      };
    }

    options.forEach(o => {
      if (o.status !== 'Open' || o.direction !== 'Sell' || o.net_contracts <= 0) return;
      
      const expiry = new Date(o.expiry_date);
      const key = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}`;
      
      if (months[key]) {
        const strikePrice = typeof o.strike_price === 'string' ? parseFloat(o.strike_price) : o.strike_price;
        const sharesPerContract = o.shares_per_contract || 500;
        const notional = o.net_contracts * sharesPerContract * strikePrice;
        
        if (o.option_type === 'Put') {
          months[key].puts += notional;
        } else {
          months[key].calls += notional;
        }
      }
    });

    return Object.values(months).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [options]);

  const maxExposure = Math.max(...monthlyExposure.map(m => m.puts + m.calls), 1);

  return (
    <Box 
      bg="bg.surface" 
      p={6} 
      borderRadius="xl" 
      borderWidth="1px" 
      borderColor="border.default"
      mt={6}
    >
      <VStack align="stretch" gap={6}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="md" color="fg.default">Monthly Exposure Distribution</Heading>
            <Text fontSize="sm" color="fg.muted">Total notional risk expiring each month</Text>
          </Box>
          <Flex gap={4}>
            <Flex align="center" gap={2}>
              <Box w={3} h={3} borderRadius="full" bg="red.400" />
              <Text fontSize="xs" color="fg.muted">Sell Puts</Text>
            </Flex>
            <Flex align="center" gap={2}>
              <Box w={3} h={3} borderRadius="full" bg="orange.400" />
              <Text fontSize="xs" color="fg.muted">Sell Calls</Text>
            </Flex>
          </Flex>
        </Flex>

        <Box h="240px" position="relative" mt={8} px={2}>
          <Flex h="full" align="flex-end" gap={{ base: 1, md: 3 }} justify="space-between">
            {monthlyExposure.map((m, i) => {
              const total = m.puts + m.calls;
              const putHeight = (m.puts / maxExposure) * 100;
              const callHeight = (m.calls / maxExposure) * 100;
              const isHovered = hoveredIndex === i;
              
              return (
                <VStack key={i} flex={1} gap={2} h="full" justify="flex-end" position="relative">
                  {isHovered && total > 0 && (
                    <Box 
                      position="absolute" 
                      bottom="100%" 
                      mb={2} 
                      bg="bg.panel" 
                      p={2} 
                      borderRadius="md" 
                      boxShadow="lg" 
                      borderWidth="1px" 
                      borderColor="border.default"
                      zIndex={10}
                      minW="120px"
                    >
                      <Text fontSize="xs" fontWeight="bold" mb={1}>{m.monthName}</Text>
                      {m.puts > 0 && <Text fontSize="2xs" color="red.400">Puts: {formatHKD(m.puts)}</Text>}
                      {m.calls > 0 && <Text fontSize="2xs" color="orange.400">Calls: {formatHKD(m.calls)}</Text>}
                      <Box borderTopWidth="1px" mt={1} pt={1}>
                        <Text fontSize="2xs" fontWeight="bold">Total: {formatHKD(total)}</Text>
                      </Box>
                    </Box>
                  )}
                  
                  <Box 
                    w="full" 
                    h="full" 
                    display="flex" 
                    flexDirection="column" 
                    justifyContent="flex-end"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    cursor="pointer"
                  >
                    {total > 0 ? (
                      <VStack gap={0} w="full">
                        <Box 
                          w="full" 
                          h={`${callHeight}%`} 
                          bg="orange.400" 
                          borderTopRadius={putHeight === 0 ? 'sm' : 'none'}
                          opacity={isHovered ? 0.8 : 1}
                          transition="all 0.2s"
                        />
                        <Box 
                          w="full" 
                          h={`${putHeight}%`} 
                          bg="red.400" 
                          borderTopRadius={callHeight === 0 ? 'sm' : 'none'}
                          borderBottomRadius="xs"
                          opacity={isHovered ? 0.8 : 1}
                          transition="all 0.2s"
                        />
                      </VStack>
                    ) : (
                      <Box w="full" h="2px" bg="bg.muted" opacity={0.3} />
                    )}
                  </Box>
                  
                  <Text fontSize="2xs" color="fg.muted" transform="rotate(-45deg)" whiteSpace="nowrap" mt={2}>
                    {m.monthName}
                  </Text>
                </VStack>
              );
            })}
          </Flex>
        </Box>
      </VStack>
    </Box>
  );
}
