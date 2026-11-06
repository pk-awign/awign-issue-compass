import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DATE_RANGE_PRESET_OPTIONS,
  DateRangePresetId,
  getDateRangeForPreset,
} from '@/utils/dateRangePresets';

interface AnalyticsDateFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  preset: DateRangePresetId;
  onPresetChange: (preset: DateRangePresetId) => void;
  includeArchived: boolean;
  onIncludeArchivedChange: (checked: boolean) => void;
  idPrefix?: string;
}

export const AnalyticsDateFilter: React.FC<AnalyticsDateFilterProps> = ({
  dateRange,
  onDateRangeChange,
  preset,
  onPresetChange,
  includeArchived,
  onIncludeArchivedChange,
  idPrefix = 'analytics',
}) => {
  const handlePresetChange = (value: string) => {
    const nextPreset = value as DateRangePresetId;
    onPresetChange(nextPreset);
    if (nextPreset === 'custom') {
      return;
    }
    onDateRangeChange(getDateRangeForPreset(nextPreset));
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    onPresetChange('custom');
    onDateRangeChange(range);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <div>
              <label className="text-sm font-medium mb-2 block">Date range</label>
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_PRESET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {preset === 'custom' ? 'Custom range' : 'Selected dates'}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      'All dates'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleCustomRangeSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-2 pb-1">
            <Switch
              id={`${idPrefix}-include-archived`}
              checked={includeArchived}
              onCheckedChange={onIncludeArchivedChange}
            />
            <label htmlFor={`${idPrefix}-include-archived`} className="text-sm font-medium">
              Include Archived Tickets
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
