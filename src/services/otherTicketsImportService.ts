import { supabase } from '@/integrations/supabase/client';
import type {
  OtherTicketsCsvParsedRow,
  OtherTicketsCsvValidationResult,
} from '@/services/otherTicketsCsvValidationService';
import type { Database } from '@/integrations/supabase/types';

type TicketStatus = Database['public']['Enums']['ticket_status_new'];

/** Matches server-side chunk size in import_other_tickets_csv (migration). */
export const OTHER_TICKETS_IMPORT_BATCH_SIZE = 500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toUploadedByUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  return UUID_RE.test(value) ? value : null;
}

export type OtherTicketImportRow = {
  ticket_number: string;
  issue_category: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  resource_id: string;
  category: string | null;
  cx_owner: string | null;
  user_name: string | null;
  exam_date: string | null;
  shift: string | null;
  role: string | null;
  type_of_exam: string | null;
  attendance_copy_available: string | null;
  link_to_attendance_copy: string | null;
  assignee: string | null;
  tc_code: string | null;
  internal_remark_1: string | null;
  assignee_status: string | null;
  cx_status: string | null;
  internal_remark_2: string | null;
};

export interface OtherTicketsImportSuccess {
  success: true;
  fileName: string;
  batchId: string;
  importedRows: number;
  uniqueTicketIds: number;
  duplicateTicketIds: number;
  uploadedAt: string;
}

export interface OtherTicketsImportFailure {
  success: false;
  code: string;
  message: string;
  batchId?: string;
}

export type OtherTicketsImportResult = OtherTicketsImportSuccess | OtherTicketsImportFailure;

/** Exact label mappings from inspected CSV values → ticket_status_new */
const CX_STATUS_TO_ENUM: Record<string, TicketStatus> = {
  'ticket closed': 'resolved',
  closed: 'resolved',
  open: 'open',
  'in progress': 'in_progress',
  'in_progress': 'in_progress',
  resolved: 'resolved',
  approved: 'approved',
  'send for approval': 'send_for_approval',
  'user dependency': 'user_dependency',
  'ops dependency': 'ops_input_required',
  'ops input required': 'ops_input_required',
  'ops + user dependency': 'ops_user_dependency',
};

/** Exact label mappings from inspected CSV Category → issue_category CHECK values */
const CATEGORY_TO_ENUM: Record<string, string> = {
  'payment delay': 'payment_delay',
  payment_delay: 'payment_delay',
  'partial payment': 'partial_payment',
  partial_payment: 'partial_payment',
  'behavioral complaint': 'behavioral_complaint',
  behavioral_complaint: 'behavioral_complaint',
  'improvement request': 'improvement_request',
  improvement_request: 'improvement_request',
  'facility issue': 'facility_issue',
  facility_issue: 'facility_issue',
  'penalty issue': 'penalty_issue',
  penalty_issue: 'penalty_issue',
  malpractice: 'malpractice',
  'app issue': 'app_issue',
  app_issue: 'app_issue',
  noc: 'noc',
  posh: 'posh',
  'workplace misconduct': 'workplace_misconduct',
  workplace_misconduct: 'workplace_misconduct',
  other: 'other',
};

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/**
 * Parse source dates like "01-Apr-2026" or "10-Jan-2026" to YYYY-MM-DD.
 * Returns null if empty; throws if non-empty but unparseable.
 */
function parseSourceDate(raw: string, fieldLabel: string, rowNumber: number): string | null {
  const value = (raw || '').trim();
  if (!value) return null;

  // Already ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const m = /^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})$/.exec(value);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = MONTHS[m[2].toLowerCase()];
    const year = m[3];
    if (mon) return `${year}-${mon}-${day}`;
  }

  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  throw new Error(`Row ${rowNumber}: cannot parse ${fieldLabel} value "${value}"`);
}

function mapCategory(raw: string, rowNumber: number): string {
  const key = (raw || '').trim().toLowerCase();
  if (!key) {
    throw new Error(`Row ${rowNumber}: Category is required for import`);
  }
  const mapped = CATEGORY_TO_ENUM[key];
  if (!mapped) {
    throw new Error(
      `Row ${rowNumber}: Category "${raw}" cannot be mapped to an allowed issue_category value`
    );
  }
  return mapped;
}

function mapStatus(cxStatus: string, rowNumber: number): TicketStatus {
  const key = (cxStatus || '').trim().toLowerCase();
  if (!key) {
    throw new Error(`Row ${rowNumber}: CX Status is required for import (actual status)`);
  }
  const mapped = CX_STATUS_TO_ENUM[key];
  if (!mapped) {
    throw new Error(
      `Row ${rowNumber}: CX Status "${cxStatus}" cannot be mapped to ticket_status_new`
    );
  }
  return mapped;
}

function nullIfEmpty(value: string): string | null {
  const v = (value || '').trim();
  return v.length > 0 ? v : null;
}

export class OtherTicketsImportService {
  static async sha256Hex(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Map every importable validation row to an other_tickets insert payload.
   * Fails the entire import preparation if any row cannot be mapped safely.
   * Does not dedupe by ticket_number — one DB row per source row.
   */
  static buildImportRows(
    validation: OtherTicketsCsvValidationResult
  ): OtherTicketImportRow[] {
    if (!validation.valid) {
      throw new Error('Validation did not pass; import is not allowed');
    }
    if (validation.invalidRows > 0) {
      throw new Error(
        `Import blocked: ${validation.invalidRows} invalid row(s). Fix or remove them before importing.`
      );
    }
    if (validation.unknownColumns.length > 0) {
      throw new Error(
        `Import blocked: unknown/unmapped CSV columns: ${validation.unknownColumns.join(', ')}`
      );
    }
    if (validation.importableRows.length === 0) {
      throw new Error('No importable rows');
    }

    return validation.importableRows.map((row) => this.mapParsedRow(row));
  }

  static mapParsedRow(row: OtherTicketsCsvParsedRow): OtherTicketImportRow {
    const issue_category = mapCategory(row.category, row.rowNumber);
    const status = mapStatus(row.cx_status, row.rowNumber);
    const createdDate = parseSourceDate(row.created_at_raw, 'Created Date', row.rowNumber);
    if (!createdDate) {
      throw new Error(`Row ${row.rowNumber}: Created Date is required for import`);
    }
    const examDate = parseSourceDate(row.exam_date_raw, 'Exam Date', row.rowNumber);

    return {
      ticket_number: row.ticket_number.trim(),
      issue_category,
      description: row.description || '',
      status,
      created_at: `${createdDate}T00:00:00.000Z`,
      resource_id: row.resource_id || '',
      category: nullIfEmpty(row.category),
      cx_owner: nullIfEmpty(row.cx_owner),
      user_name: nullIfEmpty(row.user_name),
      exam_date: examDate,
      shift: nullIfEmpty(row.shift),
      role: nullIfEmpty(row.role),
      type_of_exam: nullIfEmpty(row.type_of_exam),
      attendance_copy_available: nullIfEmpty(row.attendance_copy_available),
      link_to_attendance_copy: nullIfEmpty(row.link_to_attendance_copy),
      assignee: nullIfEmpty(row.assignee),
      tc_code: nullIfEmpty(row.tc_code),
      internal_remark_1: nullIfEmpty(row.internal_remark_1),
      assignee_status: nullIfEmpty(row.assignee_status),
      cx_status: nullIfEmpty(row.cx_status),
      internal_remark_2: nullIfEmpty(row.internal_remark_2),
    };
  }

  /**
   * Import validated CSV rows into other_tickets via atomic Postgres RPC.
   * Uses the anon Supabase client only — no service-role key in the browser.
   * Caller must be Super Admin (AuthContext); RPC also verifies users.role.
   */
  static async importValidatedCsv(params: {
    file: File;
    validation: OtherTicketsCsvValidationResult;
    uploadedBy: string | null;
    isSuperAdmin: boolean;
  }): Promise<OtherTicketsImportResult> {
    const { file, validation, uploadedBy, isSuperAdmin } = params;

    if (!isSuperAdmin) {
      return {
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Only Super Admins can import Other Tickets CSV.',
      };
    }

    let rows: OtherTicketImportRow[];
    try {
      rows = this.buildImportRows(validation);
    } catch (err) {
      return {
        success: false,
        code: 'MAPPING_FAILED',
        message: err instanceof Error ? err.message : 'Failed to map CSV rows for import',
      };
    }

    const fileHash = await this.sha256Hex(file);
    const uploadedByUuid = toUploadedByUuid(uploadedBy);
    if (!uploadedByUuid) {
      return {
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Only Super Admins can import Other Tickets CSV.',
      };
    }

    // Single atomic RPC: server inserts in chunks of OTHER_TICKETS_IMPORT_BATCH_SIZE
    // inside one Postgres transaction (no partial import; no service-role in browser).
    const { data, error } = await supabase.rpc('import_other_tickets_csv', {
      p_file_name: validation.fileName || file.name,
      p_file_hash: fileHash,
      p_uploaded_by: uploadedByUuid,
      p_unique_ticket_count: validation.uniqueTicketIds,
      p_rows: rows as unknown as Database['public']['Functions']['import_other_tickets_csv']['Args']['p_rows'],
    });

    if (error) {
      return {
        success: false,
        code: 'RPC_ERROR',
        message: error.message,
      };
    }

    const payload = (data || {}) as Record<string, unknown>;
    if (payload.success === true) {
      return {
        success: true,
        fileName: String(payload.file_name || validation.fileName || file.name),
        batchId: String(payload.batch_id || ''),
        importedRows: Number(payload.imported_rows || rows.length),
        uniqueTicketIds: Number(payload.unique_ticket_count || validation.uniqueTicketIds),
        duplicateTicketIds: validation.duplicateTicketIds,
        uploadedAt: String(payload.uploaded_at || new Date().toISOString()),
      };
    }

    return {
      success: false,
      code: String(payload.code || 'IMPORT_FAILED'),
      message: String(payload.message || 'Import failed'),
      batchId: payload.batch_id ? String(payload.batch_id) : undefined,
    };
  }
}
