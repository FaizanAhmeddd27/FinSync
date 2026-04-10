import { useMemo, useState } from 'react';
import { format, subDays, parseISO, isSameDay, getDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Calendar as CalendarIcon, ArrowUpRight, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatCurrency, cn } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const DAYS_IN_HEATMAP = 365;

export default function HeatmapCalendar({ data, insights, loading, currency = 'USD' }) {
  const [tooltipData, setTooltipData] = useState(null);

  // Generate an array of the last 365 days
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    // Generate backwards to ensure we cover the full range
    for (let i = DAYS_IN_HEATMAP - 1; i >= 0; i--) {
      days.push(subDays(today, i));
    }
    return days;
  }, []);

  // Map dates to intensity
  const heatmapMap = useMemo(() => {
    if (!data) return new Map();
    const map = new Map();
    data.forEach(item => {
      // Create a normalized date key
      const d = typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date);
      const dateKey = format(d, 'yyyy-MM-dd');
      map.set(dateKey, item);
    });
    return map;
  }, [data]);

  const maxAmount = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.amount));
  }, [data]);

  const getColorClass = (amount) => {
    if (!amount || amount === 0) return 'bg-gray-100 dark:bg-gray-800/50';
    const ratio = amount / maxAmount;
    if (ratio >= 0.75) return 'bg-primary';
    if (ratio >= 0.5) return 'bg-primary/75';
    if (ratio >= 0.25) return 'bg-primary/50';
    return 'bg-primary/25';
  };

  // Group days into weeks (columns)
  const weeks = useMemo(() => {
    const weeksArray = [];
    let currentWeek = [];
    
    // Fill the first week with empty slots to align the days of week correctly (Sunday = 0)
    const firstDay = calendarDays[0];
    const emptyDaysPrepend = getDay(firstDay);
    for(let i = 0; i < emptyDaysPrepend; i++) {
        currentWeek.push(null);
    }
    
    calendarDays.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while(currentWeek.length < 7) { currentWeek.push(null); }
      weeksArray.push(currentWeek);
    }
    
    return weeksArray;
  }, [calendarDays]);

  const handleMouseEnter = (day, dataItem, e) => {
    if (!day) return;
    const rect = e.target.getBoundingClientRect();
    setTooltipData({
      date: day,
      amount: dataItem?.amount || 0,
      count: dataItem?.count || 0,
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 10
    });
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex justify-center items-center h-[300px]">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
             <CalendarIcon className="w-5 h-5 text-primary" />
             Daily Spending Heatmap
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Your activity over the last year</p>
        </div>
        {insights?.busiestDay?.date && (
            <div className="hidden sm:flex text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full items-center gap-1 font-medium border border-primary/20">
                ⭐ Busiest Day: {format(typeof insights.busiestDay.date === 'string' ? parseISO(insights.busiestDay.date) : new Date(insights.busiestDay.date), 'MMM do')}
            </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        
        {/* The Grid container */}
        <div className="flex flex-col mb-4 overflow-x-auto pb-4">
             <div className="flex gap-1.5 min-w-max">
                 {/* Day labels (Sun, Mon, Tue...) */}
                 <div className="flex flex-col justify-between text-[10px] text-muted-foreground pr-2 font-medium py-1">
                     <span>Sun</span>
                     <span>Mon</span>
                     <span>Tue</span>
                     <span>Wed</span>
                     <span>Thu</span>
                     <span>Fri</span>
                     <span>Sat</span>
                 </div>
                 
                 {/* Weeks */}
                 {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-1.5">
                        {week.map((day, dayIdx) => {
                            if (!day) return <div key={dayIdx} className="w-3.5 h-3.5 rounded-sm opacity-0" />;
                            
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dataItem = heatmapMap.get(dateKey);
                            
                            return (
                                <div 
                                   key={dateKey}
                                   onMouseEnter={(e) => handleMouseEnter(day, dataItem, e)}
                                   onMouseLeave={handleMouseLeave}
                                   className={cn(
                                       "w-3.5 h-3.5 rounded-[3px] transition-all duration-200 cursor-crosshair border border-black/5 dark:border-white/5",
                                       getColorClass(dataItem?.amount)
                                   )}
                                />
                            );
                        })}
                    </div>
                 ))}
             </div>
        </div>

        {/* Legend & Insights */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span>Less</span>
                <div className="flex gap-1">
                   <div className="w-3 h-3 rounded-[3px] bg-gray-100 dark:bg-gray-800/50" />
                   <div className="w-3 h-3 rounded-[3px] bg-primary/25" />
                   <div className="w-3 h-3 rounded-[3px] bg-primary/50" />
                   <div className="w-3 h-3 rounded-[3px] bg-primary/75" />
                   <div className="w-3 h-3 rounded-[3px] bg-primary" />
                </div>
                <span>More</span>
            </div>

            {insights && (
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-xs">
                        <div className="p-1 rounded bg-muted">
                            <TrendingDown className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground">Quietest Month: </span>
                        <span className="font-semibold">{insights.quietestMonth}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <div className="p-1 rounded bg-muted">
                            <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground">Weekend Spends: </span>
                        <span className="font-semibold">{insights.weekendVsWeekday?.weekend > insights.weekendVsWeekday?.weekday ? 'Higher' : 'Lower'}</span>
                    </div>
                </div>
            )}
        </div>

        {/* Floating Tooltip */}
        <AnimatePresence>
            {tooltipData && (
                <motion.div 
                   initial={{ opacity: 0, y: 5 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   transition={{ duration: 0.15 }}
                   className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full pb-3"
                   style={{ left: tooltipData.x, top: tooltipData.y }}
                >
                    <div className="bg-popover text-popover-foreground shadow-lg border rounded-lg px-3 py-2 text-xs w-48 relative">
                        <p className="font-semibold mb-1 text-sm">{format(tooltipData.date, 'MMM do, yyyy')}</p>
                        <div className="flex justify-between items-center text-muted-foreground mb-0.5">
                            <span>Amount:</span>
                            <span className="font-medium text-foreground">{formatCurrency(tooltipData.amount, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span>Transactions:</span>
                            <span className="font-medium text-foreground">{tooltipData.count}</span>
                        </div>
                        {/* Down arrow marker */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-popover border-b border-r rotate-45" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </CardContent>
    </Card>
  );
}
