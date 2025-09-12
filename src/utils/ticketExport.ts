import { Issue } from '@/types/issue';

export const exportTicketsAsCSV = (tickets: Issue[], filename: string = 'tickets.csv') => {
  if (!tickets.length) {
    throw new Error('No tickets to export');
  }

  const headers = [
    'Ticket Number',
    'Centre Code', 
    'City',
    'Resource ID',
    'Issue Category',
    'Description',
    'Severity',
    'Status',
    'Submitted By',
    'Submitted At',
    'Issue Date',
    'Comments Count',
    'Attachments Count',
    'Resolution Notes'
  ];

  const rows = tickets.map(ticket => [
    ticket.ticketNumber,
    ticket.centreCode,
    ticket.city,
    ticket.resourceId,
    ticket.issueCategory,
    ticket.issueDescription,
    ticket.severity,
    ticket.status,
    ticket.submittedBy || '',
    ticket.submittedAt ? new Date(ticket.submittedAt).toISOString() : '',
    formatIssueDateForCSV(ticket.issueDate),
    ticket.comments?.length || 0,
    ticket.attachments?.length || 0,
    ticket.resolutionNotes || ''
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateExportFilename = (
  baseName: string, 
  filters: {
    statusFilter?: string;
    severityFilter?: string;
    categoryFilter?: string;
    cityFilter?: string;
    searchTerm?: string;
  }
): string => {
  const date = new Date().toISOString().split('T')[0];
  const filterParts: string[] = [];
  
  if (filters.statusFilter && filters.statusFilter !== 'all') {
    filterParts.push(`status-${filters.statusFilter}`);
  }
  if (filters.severityFilter && filters.severityFilter !== 'all') {
    filterParts.push(`severity-${filters.severityFilter}`);
  }
  if (filters.categoryFilter && filters.categoryFilter !== 'all') {
    filterParts.push(`category-${filters.categoryFilter}`);
  }
  if (filters.cityFilter && filters.cityFilter !== 'all') {
    filterParts.push(`city-${filters.cityFilter}`);
  }
  if (filters.searchTerm && filters.searchTerm.trim()) {
    filterParts.push('search');
  }
  
  const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('-')}` : '';
  return `${baseName}_${date}${filterSuffix}.csv`;
};

const formatIssueDateForCSV = (issueDate: Issue['issueDate']): string => {
  if (!issueDate) return '';
  
  if (issueDate.type === 'single') {
    return issueDate.dates && issueDate.dates[0] 
      ? new Date(issueDate.dates[0] as string | number | Date).toISOString() 
      : '';
  }
  
  if (issueDate.type === 'multiple') {
    return (issueDate.dates as any[])
      .map(d => {
        if (d && typeof d === 'object' && 'date' in d) {
          return new Date((d as { date: string | number | Date }).date).toISOString();
        } else {
          return new Date(d as string | number | Date).toISOString();
        }
      })
      .join('; ');
  }
  
  if (issueDate.type === 'range') {
    const start = issueDate.startDate 
      ? new Date(issueDate.startDate as string | number | Date).toISOString() 
      : '';
    const end = issueDate.endDate 
      ? new Date(issueDate.endDate as string | number | Date).toISOString() 
      : '';
    return start && end ? `${start} to ${end}` : start || end;
  }
  
  return '';
};
