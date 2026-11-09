import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { pageStackClass } from '@/components/layout/mobileLayout';
import {
  DATE_RANGE_PRESET_OPTIONS,
  DateRangePresetId,
  getDateRangeForPreset,
} from '@/utils/dateRangePresets';

interface TicketFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  severityFilter: string;
  setSeverityFilter: (severity: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  cityFilter: string;
  setCityFilter: (city: string) => void;
  resourceIdFilter?: string[];
  setResourceIdFilter?: (resourceIds: string[]) => void;
  dateRange?: DateRange | undefined;
  setDateRange?: (range: DateRange | undefined) => void;
  lastStatusFilter?: string;
  setLastStatusFilter?: (status: string) => void;
  lastCommentByInvigilator?: boolean;
  setLastCommentByInvigilator?: (enabled: boolean) => void;
  advancedLastCommentFilter?: boolean;
  lastCommentMode?: 'any' | 'by' | 'not_by';
  setLastCommentMode?: (mode: 'any' | 'by' | 'not_by') => void;
  lastCommentAuthor?: string;
  setLastCommentAuthor?: (author: string) => void;
  uniqueCommentAuthors?: string[];
  recentlySentForApproval?: boolean;
  setRecentlySentForApproval?: (enabled: boolean) => void;
  recentlySentRange?: DateRange | undefined;
  setRecentlySentRange?: (range: DateRange | undefined) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  uniqueCities?: string[];
  uniqueResourceIds?: { value: string; label: string }[];
  uniqueSeverities?: string[];
  uniqueCategories?: string[];
  onExportTickets?: () => void;
  isExporting?: boolean;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  severityFilter,
  setSeverityFilter,
  categoryFilter,
  setCategoryFilter,
  cityFilter,
  setCityFilter,
  resourceIdFilter = [],
  setResourceIdFilter,
  dateRange,
  setDateRange,
  lastStatusFilter = 'all',
  setLastStatusFilter,
  lastCommentByInvigilator = false,
  setLastCommentByInvigilator,
  advancedLastCommentFilter = false,
  lastCommentMode = 'any',
  setLastCommentMode,
  lastCommentAuthor = '',
  setLastCommentAuthor,
  uniqueCommentAuthors = [],
  recentlySentForApproval = false,
  setRecentlySentForApproval,
  recentlySentRange,
  setRecentlySentRange,
  onClearFilters,
  activeFiltersCount,
  uniqueCities = [],
  uniqueResourceIds = [],
  uniqueSeverities = [],
  uniqueCategories = [],
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DateRangePresetId>('all');

  useEffect(() => {
    if (!dateRange?.from) {
      setDatePreset('all');
    }
  }, [dateRange]);

  const handleCreatedPresetChange = (value: string) => {
    if (!setDateRange) return;
    const nextPreset = value as DateRangePresetId;
    setDatePreset(nextPreset);
    if (nextPreset === 'custom') return;
    setDateRange(getDateRangeForPreset(nextPreset));
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} active</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 md:hidden"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="ticket-filters-body"
            >
              {filtersOpen ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent
        id="ticket-filters-body"
        className={cn(
          pageStackClass,
          'p-3 pt-0 md:space-y-4 md:p-4',
          filtersOpen ? 'block' : 'hidden md:block'
        )}
      >
        {/* Row 1: Search, Resource ID, Ticket created (+ custom range as 4th when selected) */}
        <div
          className={cn(
            'grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4',
            setDateRange && datePreset === 'custom' && 'lg:grid-cols-4'
          )}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ticket #, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
          </div>

          {setResourceIdFilter ? (
            <div>
              <label className="mb-2 block text-sm font-medium">Resource ID</label>
              <Select
                value={resourceIdFilter.length > 0 ? resourceIdFilter[0] : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setResourceIdFilter([]);
                  } else {
                    setResourceIdFilter([value]);
                  }
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="All Resource IDs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resource IDs</SelectItem>
                  {uniqueResourceIds.map((resourceId) => (
                    <SelectItem key={resourceId.value} value={resourceId.value}>
                      {resourceId.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}

          {setDateRange ? (
            <div>
              <label className="mb-2 block text-sm font-medium">Ticket created</label>
              <Select value={datePreset} onValueChange={handleCreatedPresetChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_PRESET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {datePreset !== 'custom' && datePreset !== 'all' && dateRange?.from && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(dateRange.from, 'MMM dd, yyyy')}
                  {dateRange.to ? ` – ${format(dateRange.to, 'MMM dd, yyyy')}` : ''}
                </p>
              )}
            </div>
          ) : (
            <div className="hidden md:block" />
          )}

          {setDateRange && datePreset === 'custom' && (
            <div>
              <label className="mb-2 block text-sm font-medium">Custom range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-11 w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        'Pick a custom range'
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDatePreset('custom');
                      setDateRange(range);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Row 2: Status, Severity, Category, City */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">OPEN</SelectItem>
                <SelectItem value="in_progress">PENDING ON CX</SelectItem>
                <SelectItem value="ops_input_required">OPS DEPENDENCY</SelectItem>
                <SelectItem value="user_dependency">USER DEPENDENCY</SelectItem>
                <SelectItem value="ops_user_dependency">OPS + USER DEPENDENCY</SelectItem>
                <SelectItem value="send_for_approval">SEND FOR APPROVAL</SelectItem>
                <SelectItem value="approved">APPROVED</SelectItem>
                <SelectItem value="resolved">CLOSED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {uniqueSeverities.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity === 'sev1'
                      ? 'SEV1 - Critical'
                      : severity === 'sev2'
                        ? 'SEV2 - High'
                        : severity === 'sev3'
                          ? 'SEV3 - Medium'
                          : severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'payment_delay'
                      ? 'Payment Delay'
                      : category === 'partial_payment'
                        ? 'Partial Payment'
                        : category === 'behavioral_complaint'
                          ? 'Behavioral Complaint'
                          : category === 'improvement_request'
                            ? 'Improvement Request'
                            : category === 'facility_issue'
                              ? 'Facility Issue'
                              : category === 'penalty_issue'
                                ? 'Penalty Issue'
                                : category === 'app_issue'
                                  ? 'App Issue'
                                  : category === 'noc'
                                    ? 'NOC'
                                    : category === 'posh'
                                      ? 'POSH'
                                      : category === 'workplace_misconduct'
                                        ? 'Workplace Misconduct'
                                        : category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">City</label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Advanced filters */}
        {(setLastStatusFilter ||
          setLastCommentByInvigilator ||
          advancedLastCommentFilter ||
          setRecentlySentForApproval) && (
          <div className="grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2 sm:gap-4 sm:pt-4 lg:grid-cols-4">
            {setLastStatusFilter ? (
              <div>
                <label className="mb-2 block text-sm font-medium">Last status</label>
                <Select value={lastStatusFilter} onValueChange={setLastStatusFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Last Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Last Status</SelectItem>
                    <SelectItem value="open">OPEN</SelectItem>
                    <SelectItem value="in_progress">PENDING ON CX</SelectItem>
                    <SelectItem value="ops_input_required">OPS DEPENDENCY</SelectItem>
                    <SelectItem value="user_dependency">USER DEPENDENCY</SelectItem>
                    <SelectItem value="ops_user_dependency">OPS + USER DEPENDENCY</SelectItem>
                    <SelectItem value="send_for_approval">SEND FOR APPROVAL</SelectItem>
                    <SelectItem value="approved">APPROVED</SelectItem>
                    <SelectItem value="resolved">CLOSED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {advancedLastCommentFilter && setLastCommentMode && setLastCommentAuthor ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Last comment</label>
                  <Select
                    value={lastCommentMode}
                    onValueChange={(v) => setLastCommentMode(v as 'any' | 'by' | 'not_by')}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="by">By</SelectItem>
                      <SelectItem value="not_by">Not by</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Author</label>
                  <Select
                    value={lastCommentAuthor}
                    onValueChange={(v) => setLastCommentAuthor(v)}
                    disabled={lastCommentMode === 'any'}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select author" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invigilator">Invigilator</SelectItem>
                      {uniqueCommentAuthors.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : setLastCommentByInvigilator ? (
              <div className="flex h-11 items-center space-x-2 self-end">
                <Switch
                  id="last-comment-invigilator"
                  checked={lastCommentByInvigilator}
                  onCheckedChange={setLastCommentByInvigilator}
                />
                <label htmlFor="last-comment-invigilator" className="text-sm font-medium">
                  Last comment by Invigilator
                </label>
              </div>
            ) : null}

            {setRecentlySentForApproval ? (
              <div className="flex h-11 items-center space-x-2 self-end">
                <Switch
                  id="recently-sent-for-approval"
                  checked={recentlySentForApproval}
                  onCheckedChange={setRecentlySentForApproval}
                />
                <label htmlFor="recently-sent-for-approval" className="text-sm font-medium">
                  Recently sent for approval
                </label>
              </div>
            ) : null}

            {recentlySentForApproval && setRecentlySentRange ? (
              <div>
                <label className="mb-2 block text-sm font-medium">Sent for approval</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'h-11 w-full justify-start text-left font-normal',
                        !recentlySentRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recentlySentRange?.from ? (
                        recentlySentRange.to ? (
                          <>
                            {format(recentlySentRange.from, 'LLL dd, y')} -{' '}
                            {format(recentlySentRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(recentlySentRange.from, 'LLL dd, y')
                        )
                      ) : (
                        'Pick a date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={recentlySentRange?.from}
                      selected={recentlySentRange}
                      onSelect={setRecentlySentRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
