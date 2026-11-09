import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { FileText, User, Paperclip, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  type CombinedTicketRow,
  type TicketOccurrence,
} from '@/services/combinedTicketsService';
import { getStatusLabel } from '@/utils/status';
import { modalViewportClass } from '@/components/layout/mobileLayout';
import { cn } from '@/lib/utils';

interface OtherTicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: CombinedTicketRow | null;
}

function formatCategory(category: string): string {
  if (category === 'noc') return 'NOC';
  if (category === 'posh') return 'POSH';
  if (category === 'workplace_misconduct') return 'Workplace Misconduct';
  return category.replace(/_/g, ' ').toUpperCase();
}

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && String(value).trim());
}

/** CSV Exam Date = Issue Date. */
function formatIssueDate(examDate: string | null | undefined): string | null {
  if (!examDate || !String(examDate).trim()) return null;
  const raw = String(examDate).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString();
    }
  }
  return raw;
}

type DetailField = { label: string; value: string };

/**
 * Read-only Other Tickets detail.
 * Only shows fields that exist in source data — no invented labels or placeholder values.
 */
export const OtherTicketDetailsModal: React.FC<OtherTicketDetailsModalProps> = ({
  isOpen,
  onClose,
  ticket,
}) => {
  const occurrences = ticket?.occurrences ?? [];

  const descriptionRows = useMemo(() => {
    return occurrences
      .map((o) => {
        const text = (o.issueDescription || '').trim();
        if (!text) return null;
        const date = formatIssueDate(o.examDate);
        const shift = (o.shift || '').trim();
        const exam = (o.role || '').trim();
        const shiftExam = [shift, exam].filter(Boolean).join(' - ');
        const subtitle = [date, shiftExam].filter(Boolean).join(' · ');
        return {
          id: o.sourceRowId,
          text,
          subtitle: subtitle || null,
        };
      })
      .filter((row): row is { id: string; text: string; subtitle: string | null } => row !== null);
  }, [occurrences]);

  const issueDateRows = useMemo(() => {
    return occurrences
      .map((o) => {
        const date = formatIssueDate(o.examDate);
        const shift = (o.shift || '').trim();
        const exam = (o.role || '').trim();
        const shiftExam = [shift, exam].filter(Boolean).join(' - ');
        return {
          id: o.sourceRowId,
          date,
          shiftExam: shiftExam || null,
        };
      })
      .filter((row) => row.date || row.shiftExam);
  }, [occurrences]);

  const attendanceLinks = useMemo(() => {
    return occurrences
      .map((o) => {
        const url = (o.attendanceCopyLink || '').trim();
        if (!url) return null;
        const date = formatIssueDate(o.examDate);
        const shift = (o.shift || '').trim();
        const exam = (o.role || '').trim();
        const shiftExam = [shift, exam].filter(Boolean).join(' - ');
        const subtitle = [date, shiftExam].filter(Boolean).join(' · ');
        return {
          id: o.sourceRowId,
          url,
          subtitle: subtitle || null,
        };
      })
      .filter((row): row is { id: string; url: string; subtitle: string | null } => row !== null);
  }, [occurrences]);

  const basicFields = useMemo((): DetailField[] => {
    if (!ticket) return [];
    const fields: DetailField[] = [];

    if (ticket.conflictFields.includes('resourceId')) {
      if (ticket.resourceIds.length > 0) {
        fields.push({ label: 'Resource ID', value: ticket.resourceIds.join(', ') });
      }
    } else if (hasText(ticket.resourceId)) {
      fields.push({ label: 'Resource ID', value: ticket.resourceId.trim() });
    }

    if (ticket.conflictFields.includes('issueCategory')) {
      if (ticket.issueCategories.length > 0) {
        fields.push({
          label: 'Issue Category',
          value: ticket.issueCategories.map(formatCategory).join(', '),
        });
      }
    } else if (ticket.issueCategory) {
      fields.push({
        label: 'Issue Category',
        value: formatCategory(ticket.issueCategory),
      });
    }

    // CX Status = Status (prefer raw CX Status when present)
    if (hasText(ticket.cxStatus)) {
      fields.push({ label: 'Status', value: ticket.cxStatus.trim() });
    } else if (ticket.conflictFields.includes('status') && ticket.statuses.length > 0) {
      fields.push({
        label: 'Status',
        value: ticket.statuses.map(getStatusLabel).join(', '),
      });
    } else if (ticket.status) {
      fields.push({ label: 'Status', value: getStatusLabel(ticket.status) });
    }

    if (ticket.createdAt && !Number.isNaN(new Date(ticket.createdAt).getTime())) {
      fields.push({
        label: 'Created Date',
        value: format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm:ss'),
      });
    }

    return fields;
  }, [ticket]);

  const additionalFields = useMemo((): DetailField[] => {
    if (!ticket) return [];
    const fields: DetailField[] = [];

    if (hasText(ticket.userName)) {
      fields.push({ label: 'User Name', value: ticket.userName.trim() });
    }
    if (hasText(ticket.cxOwner)) {
      fields.push({ label: 'CX Owner', value: ticket.cxOwner.trim() });
    }
    if (hasText(ticket.assigneeStatus)) {
      fields.push({ label: 'Assignee Status', value: ticket.assigneeStatus.trim() });
    }
    if (hasText(ticket.category)) {
      fields.push({ label: 'Category', value: ticket.category.trim() });
    }

    // Assignee from source (only if present — do not invent "Not assigned")
    if (ticket.conflictFields.includes('resolver')) {
      if (ticket.resolvers.length > 0) {
        fields.push({ label: 'Assignee', value: ticket.resolvers.join(', ') });
      }
    } else if (hasText(ticket.resolver)) {
      fields.push({ label: 'Assignee', value: ticket.resolver.trim() });
    }

    // Occurrence-level fields that are unanimous / first non-empty across rows
    const firstWith = (getter: (o: TicketOccurrence) => string | null | undefined) => {
      for (const o of occurrences) {
        const v = getter(o);
        if (hasText(v)) return v.trim();
      }
      return null;
    };

    const tcCode = firstWith((o) => o.tcCode);
    if (tcCode) fields.push({ label: 'TC Code', value: tcCode });

    const attendance = firstWith((o) => o.attendanceCopyAvailable);
    if (attendance) fields.push({ label: 'Attendance Copy Available', value: attendance });

    return fields;
  }, [ticket, occurrences]);

  const remarks = useMemo(() => {
    const items: Array<{ label: string; text: string }> = [];
    for (const o of occurrences) {
      if (hasText(o.internalRemark1)) {
        items.push({ label: 'Comment 1', text: o.internalRemark1.trim() });
      }
      if (hasText(o.internalRemark2)) {
        items.push({ label: 'Comment 2', text: o.internalRemark2.trim() });
      }
    }
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.label}:${item.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [occurrences]);

  const categorySubtitle = ticket
    ? ticket.conflictFields.includes('issueCategory')
      ? ticket.issueCategories.map(formatCategory).join(', ')
      : formatCategory(ticket.issueCategory)
    : '';

  if (!ticket || ticket.source !== 'other_tickets') {
    return null;
  }

  const hasBasicContent =
    basicFields.length > 0 ||
    issueDateRows.length > 0 ||
    descriptionRows.length > 0 ||
    attendanceLinks.length > 0;
  const hasAdditionalContent = additionalFields.length > 0 || remarks.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          modalViewportClass,
          'max-w-4xl gap-4 overflow-hidden p-4 sm:p-6'
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Ticket Details - {ticket.ticketNumber}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-6">
          {categorySubtitle && <p className="text-gray-600">{categorySubtitle}</p>}

          {hasBasicContent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {basicFields.map((field) => (
                    <div key={field.label}>
                      <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {field.label}
                      </label>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{field.value}</p>
                    </div>
                  ))}
                </div>

                {issueDateRows.length > 0 && (
                  <div>
                    <div className="rounded-lg border overflow-hidden">
                      <div className="grid grid-cols-2 gap-4 px-3 py-2 bg-gray-50 border-b">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Issue Date(s)
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Shift - Exam
                        </span>
                      </div>
                      <div className="divide-y">
                        {issueDateRows.map((row) => (
                          <div
                            key={row.id}
                            className="grid grid-cols-2 gap-4 px-3 py-2.5 text-sm text-gray-900"
                          >
                            <span className="font-medium tabular-nums">{row.date || ''}</span>
                            <span className="text-gray-700">{row.shiftExam || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {descriptionRows.length > 0 && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Description ({descriptionRows.length})
                    </label>
                    <div className="mt-2 space-y-2">
                      {descriptionRows.map((row, index) => (
                        <div
                          key={row.id || index}
                          className="border-l-2 border-blue-500 bg-gray-50 rounded-r-lg px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500">
                              Description {index + 1}
                            </span>
                            {row.subtitle && (
                              <span className="text-xs text-gray-400">{row.subtitle}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{row.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {attendanceLinks.length > 0 && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Link to Attendance Copy ({attendanceLinks.length})
                    </label>
                    <div className="mt-2 space-y-2">
                      {attendanceLinks.map((link, index) => (
                        <div
                          key={link.id || index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <Paperclip className="h-4 w-4 text-gray-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                Attendance Copy {index + 1}
                              </p>
                              {link.subtitle && (
                                <p className="text-xs text-gray-500">{link.subtitle}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() =>
                              window.open(link.url, '_blank', 'noopener,noreferrer')
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {hasAdditionalContent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {additionalFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {additionalFields.map((field) => (
                      <div key={field.label}>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {field.label}
                        </label>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{field.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {remarks.length > 0 && (
                  <div className="mt-6">
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                      Comments
                    </label>
                    <div className="space-y-4 max-h-60 overflow-y-auto">
                      {remarks.map((remark, idx) => (
                        <div
                          key={`${remark.label}-${idx}`}
                          className="border-l-2 border-blue-500 pl-4"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{remark.label}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{remark.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
