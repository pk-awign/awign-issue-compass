import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Filter, X, Calendar as CalendarIcon, Download } from 'lucide-react';
import { Issue } from '@/types/issue';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  onClearFilters,
  activeFiltersCount,
  uniqueCities = [],
  uniqueResourceIds = [],
  uniqueSeverities = [],
  uniqueCategories = [],
  onExportTickets,
  isExporting = false
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            {onExportTickets && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportTickets}
                disabled={isExporting}
                className="h-8"
              >
                <Download className="h-3 w-3 mr-1" />
                {isExporting ? 'Exporting...' : 'Export Tickets'}
              </Button>
            )}
            {activeFiltersCount > 0 && (
              <>
                <Badge variant="secondary">
                  {activeFiltersCount} active
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilters}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* First row: Search, Resource ID, Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
          <label className="text-sm font-medium mb-1 block">Search</label>
            <Search className="absolute left-3 top-11 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets by number (comma-separated), description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Resource ID */}
          {setResourceIdFilter ? (
            <div>
              <label className="text-sm font-medium mb-1 block">Resource ID</label>
              <Select value={resourceIdFilter.length > 0 ? resourceIdFilter[0] : 'all'} onValueChange={(value) => {
                if (value === 'all') {
                  setResourceIdFilter([]);
                } else {
                  setResourceIdFilter([value]);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Resource IDs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resource IDs</SelectItem>
                  {uniqueResourceIds.map(resourceId => (
                    <SelectItem key={resourceId.value} value={resourceId.value}>{resourceId.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}

          {/* Date Range */}
          {setDateRange ? (
            <div>
              <label className="text-sm font-medium mb-1 block">Ticket Created Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
        </div>

        {/* Second row: Status, Severity, Category, City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
            <label className="text-sm font-medium mb-1 block">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {uniqueSeverities.map(severity => (
                  <SelectItem key={severity} value={severity}>
                    {severity === 'sev1' ? 'SEV1 - Critical' :
                     severity === 'sev2' ? 'SEV2 - High' :
                     severity === 'sev3' ? 'SEV3 - Medium' :
                     severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'payment_delay' ? 'Payment Delay' :
                     category === 'partial_payment' ? 'Partial Payment' :
                     category === 'behavioral_complaint' ? 'Behavioral Complaint' :
                     category === 'improvement_request' ? 'Improvement Request' :
                     category === 'facility_issue' ? 'Facility Issue' :
                     category === 'penalty_issue' ? 'Penalty Issue' :
                     category === 'app_issue' ? 'App Issue' :
                     category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">City</label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Third row: Last Status, Last Comment by Invigilator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Last Status Filter */}
          {setLastStatusFilter ? (
            <div>
              <label className="text-sm font-medium mb-1 block">Last Status</label>
              <Select value={lastStatusFilter} onValueChange={setLastStatusFilter}>
                <SelectTrigger>
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
          ) : (
            <div className="hidden sm:block" />
          )}

          {/* Last Comment by Invigilator Toggle */}
          {setLastCommentByInvigilator ? (
            <div className="flex items-center space-x-2">
              <Switch
                id="last-comment-invigilator"
                checked={lastCommentByInvigilator}
                onCheckedChange={setLastCommentByInvigilator}
              />
              <label htmlFor="last-comment-invigilator" className="text-sm font-medium">
                Last comment by Invigilator
              </label>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
