'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import { Box, Spinner, Center, Text, Flex, Button } from '@chakra-ui/react';
import { Trade } from '@/db/schema';
import { formatDateToYYYYMMDD } from '@/utils/helpers/date-helpers';
import { isOpeningTrade } from '@/utils/helpers/option-calculator';

interface OptionChartProps {
  symbol: string;
  trades: Trade[];
  optionDirection: 'Buy' | 'Sell'; // 'Buy' (Long) or 'Sell' (Short) for the Option Strategy
}

export default function OptionChart({ symbol, trades, optionDirection }: OptionChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ time: string; open: number; high: number; low: number; close: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/futu/kl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            symbol,
            klType: 2, // Day
            limit: 200
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }

        const result = await response.json();
        
        if (result.data && Array.isArray(result.data)) {
          // Format data for Lightweight Charts
          // Futu returns: time (string), open, close, high, low
          // LC expects: time (string | number), open, high, low, close
          const formattedData = result.data.map((item: any) => {
            // Futu time might be "2023-10-27 00:00:00" or similar
            // We just need YYYY-MM-DD for daily candles
            const dateStr = item.time.split(' ')[0];
            return {
              time: dateStr,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
            };
          }).sort((a: any, b: any) => (new Date(a.time).getTime() - new Date(b.time).getTime()));
          
          setData(formattedData);
        }
      } catch (err: any) {
        console.error('Chart data fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    const getChartDimensions = () => {
      const container = chartContainerRef.current;
      if (!container) return { width: 0, height: 0 };
      const rect = container.getBoundingClientRect();
      return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
    };

    const { width, height } = getChartDimensions();

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF', // fg.muted
      },
      grid: {
        vertLines: { color: '#E5E7EB' }, // border.subtle
        horzLines: { color: '#E5E7EB' },
      },
      width,
      height: height > 0 ? height : 320,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#E5E7EB',
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981', // green.500
      downColor: '#EF4444', // red.500
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    candlestickSeries.setData(data);
    seriesRef.current = candlestickSeries;
    chartRef.current = chart;

    // Add Trade Markers
    const markers: any[] = [];
    const availableTimes = new Set(data.map(d => d.time));

    const resolveMarkerTime = (tradeDate: string) => {
      if (availableTimes.has(tradeDate)) return tradeDate;

      const target = new Date(tradeDate).getTime();
      if (!Number.isFinite(target)) return null;

      if (data.length === 0) return null;

      const firstTime = new Date(data[0].time).getTime();
      const lastTime = new Date(data[data.length - 1].time).getTime();
      if (target <= firstTime) return data[0].time;
      if (target >= lastTime) return data[data.length - 1].time;

      let lo = 0;
      let hi = data.length - 1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midTime = new Date(data[mid].time).getTime();
        if (midTime === target) return data[mid].time;
        if (midTime < target) lo = mid + 1;
        else hi = mid - 1;
      }

      if (hi >= 0) return data[hi].time;
      return data[0].time;
    };
    
    trades.forEach(trade => {
      const tradeDate = formatDateToYYYYMMDD(trade.trade_date);
      const markerTime = resolveMarkerTime(tradeDate);
      if (markerTime) {
        // Determine action: Buy or Sell
        // Logic from page.tsx:
        const isInitialDirection = isOpeningTrade(trade.trade_type);
        
        // Logical direction (Buy/Sell)
        // If Option Strategy is Sell (Short): OPEN=Sell, CLOSE=Buy
        // If Option Strategy is Buy (Long): OPEN=Buy, CLOSE=Sell
        
        // However, for markers, we want to know if we Bought or Sold the contract
        let action = '';
        if (['OPEN_SELL', 'CLOSE_SELL'].includes(trade.trade_type)) {
          action = 'Sell';
        } else if (['OPEN_BUY', 'CLOSE_BUY'].includes(trade.trade_type)) {
          action = 'Buy';
        } else {
          // Fallback logic
          if (optionDirection === 'Sell') {
             action = isInitialDirection ? 'Sell' : 'Buy';
          } else {
             action = isInitialDirection ? 'Buy' : 'Sell';
          }
        }

        const isBuy = action === 'Buy';
        
        markers.push({
          time: markerTime,
          position: isBuy ? 'belowBar' : 'aboveBar',
          color: isBuy ? '#10B981' : '#EF4444',
          shape: isBuy ? 'arrowUp' : 'arrowDown',
          text: action,
          size: 2,
        });
      }
    });

    markers.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const seriesMarkers = createSeriesMarkers(candlestickSeries);
    seriesMarkers.setMarkers(markers);
    
    const endStr = data[data.length - 1]?.time;
    const endDate = endStr ? new Date(`${endStr}T00:00:00Z`) : null;
    const startDate = endDate ? new Date(endDate) : null;
    if (startDate) startDate.setUTCMonth(startDate.getUTCMonth() - 3);

    const startStr = startDate ? `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}-${String(startDate.getUTCDate()).padStart(2, '0')}` : null;
    const from = startStr ? (resolveMarkerTime(startStr) ?? startStr) : null;
    const to = endStr ?? null;

    if (from && to) {
      (chart.timeScale() as any).setVisibleRange({ from, to });
    } else {
      chart.timeScale().fitContent();
    }

    const resizeObserver = new ResizeObserver(() => {
      const { width: nextWidth, height: nextHeight } = getChartDimensions();
      if (!chartRef.current || nextWidth <= 0 || nextHeight <= 0) return;
      chartRef.current.applyOptions({ width: nextWidth, height: nextHeight });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      seriesMarkers.detach();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, trades, optionDirection]);

  if (loading && data.length === 0) {
    return (
      <Center h="400px" bg="bg.surface" borderRadius="xl" borderWidth="1px" borderColor="border.default">
        <Spinner color="brand.500" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="400px" bg="bg.surface" borderRadius="xl" borderWidth="1px" borderColor="border.default">
        <Flex direction="column" align="center" gap={2}>
          <Text color="fg.error">Failed to load chart</Text>
          <Text fontSize="sm" color="fg.muted">{error}</Text>
          <Button size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </Flex>
      </Center>
    );
  }

  return (
    <Box 
      h="400px" 
      w="100%" 
      bg="bg.surface" 
      borderRadius="xl" 
      borderWidth="1px" 
      borderColor="border.default" 
      p={4}
      position="relative"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      <Text fontWeight="bold" mb={2} color="fg.default">{symbol} Chart</Text>
      <Box flex="1" minH={0} w="100%">
        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
      </Box>
    </Box>
  );
}
