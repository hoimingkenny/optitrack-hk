'use client';

import { Box, Flex, Text, Button, Popover, IconButton, Tooltip as ChakraTooltip } from '@chakra-ui/react';
import type { OptionWithSummary } from '@/db/schema';
import { useMemo, useState, useRef } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

interface OptionHeatmapProps {
  options: OptionWithSummary[];
}

export default function OptionHeatmap({ options }: OptionHeatmapProps) {
  const { t, language } = useLanguage();
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsLegendOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsLegendOpen(false);
    }, 150);
  };

  // Get available years from options data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    options.forEach(option => {
      // Add year from creation date
      const startYear = new Date(option.created_at).getFullYear();
      years.add(startYear);
      
      // Add year from update date (if closed/expired)
      if (option.status !== 'Open') {
        const endYear = new Date(option.updated_at).getFullYear();
        years.add(endYear);
      }

      // Add year from expiry date (important for the Expiration Heatmap)
      const expiryYear = new Date(option.expiry_date).getFullYear();
      years.add(expiryYear);
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [options]);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Generate dates for the selected year
  const calendarData = useMemo(() => {
    const dates = [];
    const startDate = new Date(selectedYear, 0, 1); // Jan 1st
    const endDate = new Date(selectedYear, 11, 31); // Dec 31st
    
    // If it's the current year, we only show up to today? 
    // Actually, GitHub shows the whole year if you select a past year, 
    // and "last 365 days" or "current year" for the present.
    // Let's show the full year for the selected year.
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }, [selectedYear]);

  // Color maps for different intensities (1-5)
  const colorMaps = {
    sellPut: ['#FBDADA', '#F7B5B5', '#EE7A7A', '#E44D4D', '#D73535'],
    sellCall: ['#FEE2DF', '#FDC5C0', '#FBA8A1', '#FA8B81', '#F96E5B'],
    buyCall: ['#DCF2E5', '#BEE3D0', '#9AE1B5', '#68D391', '#48BB78'], // green.500 shades
    buyPut: ['#E1EFFE', '#BEE3F8', '#90CDF4', '#63B3ED', '#4299E1'], // blue.500 shades
  };

  // Process option expiration for each date
  const getActivityForDate = (date: Date) => {
    // Use local date string YYYY-MM-DD for comparison to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Find options expiring on this date
    const expiringOptions = options.filter((option: OptionWithSummary) => {
      let expiryStr = '';
      if (typeof option.expiry_date === 'string') {
        expiryStr = option.expiry_date.split('T')[0];
      } else {
        const d = option.expiry_date as Date;
        const ey = d.getFullYear();
        const em = String(d.getMonth() + 1).padStart(2, '0');
        const ed = String(d.getDate()).padStart(2, '0');
        expiryStr = `${ey}-${em}-${ed}`;
      }
      return dateStr === expiryStr;
    });

    const count = expiringOptions.length;
    if (count === 0) return { color: 'bg.muted', label: t('heatmap.no_options_expiring'), intensity: 0, names: [] };

    // Format the names: HK.00005 260330 115.00 認沽
    const names = Array.from(new Set(expiringOptions.map(o => {
      const expiry = new Date(o.expiry_date);
      const yy = expiry.getFullYear().toString().slice(-2);
      const mm = String(expiry.getMonth() + 1).padStart(2, '0');
      const dd = String(expiry.getDate()).padStart(2, '0');
      const datePart = `${yy}${mm}${dd}`;
      const typeStr = o.option_type === 'Put' ? t('exposure.put') : t('exposure.call');
      const strikePrice = typeof o.strike_price === 'string' ? parseFloat(o.strike_price) : (o.strike_price as unknown as number);
      const strike = strikePrice.toFixed(2);
      return `${o.stock_symbol} ${datePart} ${strike} ${typeStr}`;
    })));

    // Intensity levels (1-5) based on count
    // If we have many options, we might want to scale this differently, 
    // but for now 1-5+ is a good start
    const intensity = Math.min(count, 5);
    const index = intensity - 1;
    
    // Determine color based on direction and type
    const hasSellPut = expiringOptions.some(o => o.direction === 'Sell' && o.option_type === 'Put');
    const hasSellCall = expiringOptions.some(o => o.direction === 'Sell' && o.option_type === 'Call');
    const hasBuyCall = expiringOptions.some(o => o.direction === 'Buy' && o.option_type === 'Call');
    const hasBuyPut = expiringOptions.some(o => o.direction === 'Buy' && o.option_type === 'Put');

    if (hasSellPut) {
      return { color: colorMaps.sellPut[index], label: `${count} ${t('heatmap.options_expiring')} (${t('heatmap.sell_put')})`, intensity, names };
    } else if (hasSellCall) {
      return { color: colorMaps.sellCall[index], label: `${count} ${t('heatmap.options_expiring')} (${t('heatmap.sell_call')})`, intensity, names };
    } else if (hasBuyCall) {
      return { color: colorMaps.buyCall[index], label: `${count} ${t('heatmap.options_expiring')} (${t('heatmap.buy_call')})`, intensity, names };
    } else if (hasBuyPut) {
      return { color: colorMaps.buyPut[index], label: `${count} ${t('heatmap.options_expiring')} (${t('heatmap.buy_put')})`, intensity, names };
    }
    
    return { color: 'bg.muted', label: t('heatmap.no_options_expiring'), intensity: 0, names };
  };

  // Group dates by week for the grid
  const weeks = useMemo(() => {
    const weeksArray: Date[][] = [];
    let currentWeek: Date[] = [];

    // Calculate offset for the first week to align with Sunday/Monday
    const firstDate = calendarData[0];
    const dayOfWeek = firstDate.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Add placeholders for empty days in the first week
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push(null as any);
    }

    calendarData.forEach((date) => {
      currentWeek.push(date);
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      // Fill the rest of the last week with nulls to maintain alignment
      while (currentWeek.length < 7) {
        currentWeek.push(null as any);
      }
      weeksArray.push(currentWeek);
    }

    return weeksArray;
  }, [calendarData]);

  return (
    <Box 
      bg="bg.surface" 
      p={6} 
      borderRadius="xl" 
      borderWidth="1px" 
      borderColor="border.default"
      overflowX="auto"
    >
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Flex alignItems="center" gap={2}>
          <Text fontSize="lg" fontWeight="semibold" color="fg.default">
            {t('heatmap.title')}
          </Text>
          <Popover.Root 
            open={isLegendOpen} 
            onOpenChange={(details) => setIsLegendOpen(details.open)}
            positioning={{ placement: 'right-start' }}
          >
            <Popover.Trigger asChild>
              <IconButton 
                variant="ghost" 
                size="xs" 
                aria-label={t('heatmap.show_legend')} 
                color="fg.muted"
                bg="transparent"
                _hover={{ bg: "transparent", color: "fg.muted" }}
                _active={{ bg: "transparent" }}
                _focus={{ bg: "transparent" }}
                cursor="default"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <InfoIcon className="w-4 h-4" />
              </IconButton>
            </Popover.Trigger>
            <Popover.Positioner zIndex="popover">
              <Popover.Content 
                width="240px" 
                p={4} 
                borderRadius="lg" 
                bg="bg.surface" 
                boxShadow="lg" 
                border="1px solid" 
                borderColor="border.default"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Popover.Arrow />
                <Popover.Body>
                  <Flex direction="column" gap={4}>
                    <Text fontWeight="semibold" fontSize="sm" color="fg.default">{t('heatmap.legend')}</Text>
                    
                    <Flex direction="column" gap={3}>
                      <Flex alignItems="center" gap={2} fontSize="xs">
                        <Box 
                          w="10px" 
                          h="10px" 
                          borderRadius="sm" 
                          border="1px solid" 
                          borderColor="fg.default" 
                          boxShadow="0 0 0 1px var(--chakra-colors-fg-default)"
                        />
                        <Text color="fg.default">{t('common.today')}</Text>
                      </Flex>
                      <Flex alignItems="center" gap={2} fontSize="xs">
                        <Box w="10px" h="10px" bg="bg.muted" borderRadius="sm" />
                        <Text color="fg.default">{t('heatmap.no_expiry')}</Text>
                      </Flex>
                      
                      <Box borderTop="1px solid" borderColor="border.subtle" pt={2} />
                      <Flex direction="column" gap={2}>
                        <Flex direction="column" gap={1}>
                          <Text fontSize="11px" fontWeight="medium" color="fg.default">{t('heatmap.sell_put')}</Text>
                          <Flex gap={1}>
                            {colorMaps.sellPut.map((color, i) => (
                              <Box key={i} w="12px" h="12px" bg={color} borderRadius="sm" title={t('heatmap.level').replace('{n}', (i + 1).toString())} />
                            ))}
                          </Flex>
                        </Flex>
                        <Flex direction="column" gap={1}>
                          <Text fontSize="11px" fontWeight="medium" color="fg.default">{t('heatmap.sell_call')}</Text>
                          <Flex gap={1}>
                            {colorMaps.sellCall.map((color, i) => (
                              <Box key={i} w="12px" h="12px" bg={color} borderRadius="sm" title={t('heatmap.level').replace('{n}', (i + 1).toString())} />
                            ))}
                          </Flex>
                        </Flex>
                        <Flex direction="column" gap={1}>
                          <Text fontSize="11px" fontWeight="medium" color="fg.default">{t('heatmap.buy_call')}</Text>
                          <Flex gap={1}>
                            {colorMaps.buyCall.map((color, i) => (
                              <Box key={i} w="12px" h="12px" bg={color} borderRadius="sm" title={t('heatmap.level').replace('{n}', (i + 1).toString())} />
                            ))}
                          </Flex>
                        </Flex>
                        <Flex direction="column" gap={1}>
                          <Text fontSize="11px" fontWeight="medium" color="fg.default">{t('heatmap.buy_put')}</Text>
                          <Flex gap={1}>
                            {colorMaps.buyPut.map((color, i) => (
                              <Box key={i} w="12px" h="12px" bg={color} borderRadius="sm" title={t('heatmap.level').replace('{n}', (i + 1).toString())} />
                            ))}
                          </Flex>
                        </Flex>
                      </Flex>
                    </Flex>
                    
                    <Text fontSize="10px" color="fg.muted" pt={1}>
                      {t('heatmap.intensity_desc')}
                    </Text>
                  </Flex>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Popover.Root>
        </Flex>
      </Flex>
      
      <Flex direction={{ base: "column", lg: "row" }} gap={6}>
        <Flex direction="column" flex="1" alignItems="center">
          <Flex overflowX="auto" w="full" justifyContent="center" pb={2}>
            <Flex minW="max-content">
              {/* Day Labels (Mon, Wed, Fri) */}
              <Flex direction="column" gap={1} mt="20px" mr={2} aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                  <Box key={dayIndex} h="12px" display="flex" alignItems="center">
                    {/* Show label only for Mon (1), Wed (3), Fri (5) */}
                    {[1, 3, 5].includes(dayIndex) && (
                      <Text fontSize="xs" color="fg.muted" lineHeight="1">
                        {dayIndex === 1 ? t('heatmap.mon') : dayIndex === 3 ? t('heatmap.wed') : t('heatmap.fri')}
                      </Text>
                    )}
                  </Box>
                ))}
              </Flex>
              <Box>
                {/* Month Labels */}
                <Flex gap={1} mb={1} h="15px">
                  {weeks.map((week, index) => {
                    const firstDayInWeek = week.find(d => d !== null);
                    if (!firstDayInWeek) return <Box key={index} w="12px" />;
                    // Find if the 1st of any month falls in this week
                    const monthStartingInWeek = week.find(d => d && d.getDate() === 1);
                    
                    // Show label if it's the first week of the year OR if a month starts in this week
                    const isFirstWeek = index === 0;
                    const showLabel = isFirstWeek || monthStartingInWeek;
                    
                    // Use the month of the 1st day if found, otherwise the first day of the week
                    const labelDate = monthStartingInWeek || firstDayInWeek;
                    
                    return (
                      <Box key={index} w="12px" overflow="visible" position="relative">
                        {showLabel && (
                          <Text 
                            position="absolute" 
                            fontSize="xs" 
                            color="fg.muted" 
                            whiteSpace="nowrap"
                            top="-4px"
                          >
                            {labelDate.toLocaleString(language === 'zh' ? 'zh-HK' : 'en-US', { month: 'short' })}
                          </Text>
                        )}
                      </Box>
                    );
                  })}
                </Flex>

                {/* Heatmap Grid */}
                <Flex gap={1}>
                  {weeks.map((week, weekIndex) => (
                    <Flex key={weekIndex} direction="column" gap={1}>
                      {week.map((date, dayIndex) => {
                        if (!date) {
                          return <Box key={`empty-${dayIndex}`} w="12px" h="12px" />;
                        }

                        const activity = getActivityForDate(date);
                        const locale = language === 'zh' ? 'zh-HK' : 'en-HK';
                        const dateStr = date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
                        const isToday = date.toDateString() === new Date().toDateString();

                          return (
                            <ChakraTooltip.Root key={date.toISOString()} openDelay={5} closeDelay={0}>
                              <ChakraTooltip.Trigger asChild>
                                <Box
                                  w="12px"
                                  h="12px"
                                  borderRadius="sm"
                                  bg={activity.color}
                                  _hover={{ 
                                    cursor: 'pointer', 
                                    transform: 'scale(1.3)',
                                    outline: '2px solid',
                                    outlineColor: activity.color === 'bg.muted' ? 'gray.400' : activity.color,
                                    outlineOffset: '1px',
                                    zIndex: 10,
                                    opacity: 1
                                  }}
                                  transition="all 0.1s ease-in-out"
                                  position="relative"
                                  border={isToday ? "1px solid" : "none"}
                                  borderColor={isToday ? "fg.default" : "transparent"}
                                  boxShadow={isToday ? "0 0 0 1px var(--chakra-colors-fg-default)" : "none"}
                                />
                              </ChakraTooltip.Trigger>
                              <ChakraTooltip.Positioner zIndex="tooltip">
                                <ChakraTooltip.Content
                                  bg="gray.800"
                                  color="white"
                                  fontSize="xs"
                                  p={2}
                                  borderRadius="md"
                                  whiteSpace="pre-wrap"
                                >
                                  <ChakraTooltip.Arrow />
                                  {activity.names.length > 0 
                                    ? `${dateStr}:\n${activity.names.join('\n')}${isToday ? `\n(${t('heatmap.today')})` : ''}`
                                    : `${dateStr}: ${activity.label}${isToday ? ` (${t('heatmap.today')})` : ''}`}
                                </ChakraTooltip.Content>
                              </ChakraTooltip.Positioner>
                            </ChakraTooltip.Root>
                          );
                      })}
                    </Flex>
                  ))}
                </Flex>
              </Box>
            </Flex>
          </Flex>
        </Flex>

        {/* Year Selection Sidebar */}
        <Flex direction="column" gap={2} minW="100px">
          {availableYears.map(year => (
            <Button
              key={year}
              size="sm"
              variant={selectedYear === year ? "solid" : "ghost"}
              colorScheme={selectedYear === year ? "blue" : "gray"}
              onClick={() => setSelectedYear(year)}
              justifyContent="center"
              borderRadius="md"
              bg={selectedYear === year ? "blue.500" : "transparent"}
              color={selectedYear === year ? "white" : "fg.muted"}
              _hover={{ bg: selectedYear === year ? "blue.600" : "bg.muted" }}
            >
              {year}
            </Button>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}
