'use client';

import { Button } from '@/components/ui/Button';
import type { OptionWithSummary } from '@/db/schema';
import { useMemo, useState, useRef } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

function InfoIcon({ className }: { className?: string }) {
  return <Info className={className} />;
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
    const dateStr = date.toISOString().split('T')[0];
    
    // Find options expiring on this date
    const expiringOptions = options.filter((option: OptionWithSummary) => {
      const expiryDate = new Date(option.expiry_date);
      const expiryStr = expiryDate.toISOString().split('T')[0];
      return dateStr === expiryStr;
    });

    const count = expiringOptions.length;
    if (count === 0) return { color: 'var(--muted)', label: t('heatmap.no_options_expiring'), intensity: 0 };

    // Intensity levels (1-5) based on count
    const intensity = Math.min(count, 5);
    const index = intensity - 1;
    
    // Determine color based on direction and type
    const hasSellPut = expiringOptions.some(o => o.direction === 'Sell' && o.option_type === 'Put');
    const hasSellCall = expiringOptions.some(o => o.direction === 'Sell' && o.option_type === 'Call');
    const hasBuyCall = expiringOptions.some(o => o.direction === 'Buy' && o.option_type === 'Call');
    const hasBuyPut = expiringOptions.some(o => o.direction === 'Buy' && o.option_type === 'Put');

    if (hasSellPut) {
      return { color: colorMaps.sellPut[index], label: `${count} ${t('heatmap.options_expiring')} (${t('heatmap.sell_put')})`, intensity };
    } else if (hasSellCall) {
      return { color: colorMaps.sellCall[index], label: `${count} ${t('heatmap.options_expiring')} (${t('heatmap.sell_call')})`, intensity };
    } else if (hasBuyCall) {
      return { color: colorMaps.buyCall[index], label: `${count} ${t('heatmap.options_expiring')} (${t('heatmap.buy_call')})`, intensity };
    } else if (hasBuyPut) {
      return { color: colorMaps.buyPut[index], label: `${count} ${t('heatmap.options_expiring')} (${t('heatmap.buy_put')})`, intensity };
    }
    
    return { color: 'var(--muted)', label: t('heatmap.no_options_expiring'), intensity: 0 };
  };

  // Group dates by week for the grid
  const weeks = useMemo(() => {
    const weeksArray: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    // Calculate offset for the first week to align with Sunday/Monday
    const firstDate = calendarData[0];
    const dayOfWeek = firstDate.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Add placeholders for empty days in the first week
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push(null);
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
        currentWeek.push(null);
      }
      weeksArray.push(currentWeek);
    }

    return weeksArray;
  }, [calendarData]);

  return (
    <div 
      className="bg-card p-6 rounded-xl border border-border overflow-x-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 relative">
          <span className="text-lg font-semibold text-foreground">
            {t('heatmap.title')}
          </span>
          <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-default"
              aria-label={t('heatmap.show_legend')} 
              type="button"
            >
              <InfoIcon className="w-4 h-4" />
            </button>
            
            {isLegendOpen && (
              <div 
                className="absolute left-full top-0 ml-2 z-50 w-60 p-4 rounded-lg bg-card shadow-lg border border-border animate-in fade-in zoom-in duration-150"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex flex-col gap-4">
                  <p className="font-semibold text-sm text-foreground">{t('heatmap.legend')}</p>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-2.5 h-2.5 rounded-sm border border-foreground ring-1 ring-foreground"
                      />
                      <span className="text-foreground">{t('common.today')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 bg-muted rounded-sm" />
                      <span className="text-foreground">{t('heatmap.no_expiry')}</span>
                    </div>
                    
                    <div className="border-t border-border pt-2" />
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-medium text-foreground">{t('heatmap.sell_put')}</p>
                        <div className="flex gap-1">
                          {colorMaps.sellPut.map((color, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} title={t('heatmap.level').replace('{n}', (i + 1).toString())} />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-medium text-foreground">{t('heatmap.sell_call')}</p>
                        <div className="flex gap-1">
                          {colorMaps.sellCall.map((color, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} title={t('heatmap.level').replace('{n}', (i + 1).toString())} />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-medium text-foreground">{t('heatmap.buy_call')}</p>
                        <div className="flex gap-1">
                          {colorMaps.buyCall.map((color, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} title={t('heatmap.level').replace('{n}', (i + 1).toString())} />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-medium text-foreground">{t('heatmap.buy_put')}</p>
                        <div className="flex gap-1">
                          {colorMaps.buyPut.map((color, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} title={t('heatmap.level').replace('{n}', (i + 1).toString())} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground pt-1">
                    {t('heatmap.intensity_desc')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col flex-1 items-center">
          <div className="overflow-x-auto w-full flex justify-center pb-2">
            <div className="min-w-max flex">
              {/* Day Labels (Mon, Wed, Fri) */}
              <div className="flex flex-col gap-1 mt-[20px] mr-2" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                  <div key={dayIndex} className="h-3 flex items-center">
                    {/* Show label only for Mon (1), Wed (3), Fri (5) */}
                    {[1, 3, 5].includes(dayIndex) && (
                      <span className="text-[10px] text-muted-foreground leading-none">
                        {dayIndex === 1 ? t('heatmap.mon') : dayIndex === 3 ? t('heatmap.wed') : t('heatmap.fri')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div>
                {/* Month Labels */}
                <div className="flex gap-1 mb-1 h-[15px]">
                  {weeks.map((week, index) => {
                    const firstDayInWeek = week.find(d => d !== null);
                    if (!firstDayInWeek) return <div key={index} className="w-3" />;
                    // Find if the 1st of any month falls in this week
                    const monthStartingInWeek = week.find(d => d && d.getDate() === 1);
                    
                    // Show label if it's the first week of the year OR if a month starts in this week
                    const isFirstWeek = index === 0;
                    const showLabel = isFirstWeek || monthStartingInWeek;
                    
                    // Use the month of the 1st day if found, otherwise the first day of the week
                    const labelDate = monthStartingInWeek || firstDayInWeek;
                    
                    return (
                      <div key={index} className="w-3 overflow-visible relative">
                        {showLabel && (
                          <span 
                            className="absolute text-[10px] text-muted-foreground whitespace-nowrap -top-1"
                          >
                            {labelDate.toLocaleString(language === 'zh' ? 'zh-HK' : 'en-US', { month: 'short' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Heatmap Grid */}
                <div className="flex gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((date, dayIndex) => {
                        if (!date) {
                          return <div key={`empty-${dayIndex}`} className="w-3 h-3" />;
                        }

                        const activity = getActivityForDate(date);
                        const locale = language === 'zh' ? 'zh-HK' : 'en-HK';
                        const dateStr = date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              "w-3 h-3 rounded-sm transition-all duration-150 relative hover:cursor-pointer hover:scale-125 hover:ring-2 hover:ring-offset-1 z-0 hover:z-10",
                              isToday ? "border border-foreground ring-1 ring-foreground" : "border-none"
                            )}
                            style={{ 
                              backgroundColor: activity.color.startsWith('var') ? `hsl(${activity.color})` : activity.color,
                              '--tw-ring-color': activity.intensity === 0 ? 'hsl(var(--muted-foreground))' : activity.color.startsWith('var') ? `hsl(${activity.color})` : activity.color
                            } as React.CSSProperties}
                            title={`${dateStr}: ${activity.label}${isToday ? ` (${t('heatmap.today')})` : ''}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Year Selection Sidebar */}
        <div className="flex flex-col gap-2 min-w-[100px]">
          {availableYears.map(year => (
            <Button
              key={year}
              variant={selectedYear === year ? "default" : "ghost"}
              onClick={() => setSelectedYear(year)}
              className={cn(
                "h-8 justify-center rounded-md text-sm",
                selectedYear === year ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
