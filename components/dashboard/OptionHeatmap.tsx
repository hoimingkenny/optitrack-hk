'use client';

import { Box, Flex, Text, Button } from '@chakra-ui/react';
import type { OptionWithSummary } from '@/db/schema';
import { useMemo, useState } from 'react';

interface OptionHeatmapProps {
  options: OptionWithSummary[];
}

export default function OptionHeatmap({ options }: OptionHeatmapProps) {
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

  // Process option expiration for each date
  const getActivityForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Find options expiring on this date
    const expiringOptions = options.filter((option: OptionWithSummary) => {
      const expiryDate = new Date(option.expiry_date);
      const expiryStr = expiryDate.toISOString().split('T')[0];
      return dateStr === expiryStr;
    });

    const count = expiringOptions.length;
    if (count === 0) return { color: 'bg.muted', label: 'No options expiring', intensity: 0 };

    // Intensity levels (1-5) based on count
    const intensity = Math.min(count, 5);
    
    // Determine color based on direction
    const hasSell = expiringOptions.some(o => o.direction === 'Sell');
    const hasBuy = expiringOptions.some(o => o.direction === 'Buy');

    if (hasSell) {
      const redScales = ['red.100', 'red.300', 'red.500', 'red.700', 'red.900'];
      return { 
        color: redScales[intensity - 1], 
        label: `${count} option(s) expiring (Sell)`, 
        intensity 
      };
    } else if (hasBuy) {
      const greenScales = ['green.100', 'green.300', 'green.500', 'green.700', 'green.900'];
      return { 
        color: greenScales[intensity - 1], 
        label: `${count} option(s) expiring (Buy)`, 
        intensity 
      };
    }
    
    return { color: 'bg.muted', label: 'No options expiring', intensity: 0 };
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
        <Text fontSize="lg" fontWeight="semibold" color="fg.default">
          Option Expiration Heatmap ({selectedYear})
        </Text>
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
                        {dayIndex === 1 ? 'Mon' : dayIndex === 3 ? 'Wed' : 'Fri'}
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
                            {labelDate.toLocaleString('default', { month: 'short' })}
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
                        const dateStr = date.toLocaleDateString('en-HK', { month: 'short', day: 'numeric', year: 'numeric' });

                        return (
                          <Box
                            key={date.toISOString()}
                            w="12px"
                            h="12px"
                            borderRadius="sm"
                            bg={activity.color}
                            title={`${dateStr}: ${activity.label}`}
                            _hover={{ opacity: 0.8, cursor: 'pointer', transform: 'scale(1.2)' }}
                            transition="all 0.1s"
                          />
                        );
                      })}
                    </Flex>
                  ))}
                </Flex>
              </Box>
            </Flex>
          </Flex>
          
          {/* Legend */}
          <Flex gap={6} mt={6} fontSize="xs" color="fg.muted" alignItems="center" flexWrap="wrap" justifyContent="center">
            <Flex alignItems="center" gap={2}>
              <Text>Less</Text>
              <Flex gap={1}>
                <Box w="10px" h="10px" bg="bg.muted" borderRadius="sm" title="0 options expiring" />
                <Box w="10px" h="10px" bg="green.100" borderRadius="sm" title="1 option expiring" />
                <Box w="10px" h="10px" bg="green.300" borderRadius="sm" title="2 options expiring" />
                <Box w="10px" h="10px" bg="green.500" borderRadius="sm" title="3 options expiring" />
                <Box w="10px" h="10px" bg="green.700" borderRadius="sm" title="4 options expiring" />
                <Box w="10px" h="10px" bg="green.900" borderRadius="sm" title="5+ options expiring" />
              </Flex>
              <Text>More (Buy)</Text>
            </Flex>

            <Flex alignItems="center" gap={2}>
              <Text>Less</Text>
              <Flex gap={1}>
                <Box w="10px" h="10px" bg="bg.muted" borderRadius="sm" title="0 options expiring" />
                <Box w="10px" h="10px" bg="red.100" borderRadius="sm" title="1 option expiring" />
                <Box w="10px" h="10px" bg="red.300" borderRadius="sm" title="2 options expiring" />
                <Box w="10px" h="10px" bg="red.500" borderRadius="sm" title="3 options expiring" />
                <Box w="10px" h="10px" bg="red.700" borderRadius="sm" title="4 options expiring" />
                <Box w="10px" h="10px" bg="red.900" borderRadius="sm" title="5+ options expiring" />
              </Flex>
              <Text>More (Sell)</Text>
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
