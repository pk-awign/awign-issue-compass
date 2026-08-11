import Papa from 'papaparse';

/**
 * Other Tickets CSV parsing & validation (local only — no Supabase writes).
 *
 * Inspected source headers (Google Sheet / Escalation Infra export):
 * Category, Created Date, Ticket ID, CX Owner, User name, Resource ID,
 * Exam Date, Shift, Role, Type of Exam, Attendnace Copy Available,
 * Link to Attendance Copy, Issue Description, Assignee, TC code,
 * Internal Remark 1, Status (To be updated by Assignee), CX Status,
 * Internal Remark 2
 *
 * Mapped to other_tickets columns (migration 20260811132600_create_other_tickets.sql).
 */

/** Exact CSV header → other_tickets column (or normalized helper). */
export const OTHER_TICKETS_CSV_HEADER_MAP = {
  'Category': 'category',
  'Created Date': 'created_at_raw',
  'Ticket ID': 'ticket_number',
  'CX Owner': 'cx_owner',
  'User name': 'user_name',
  'Resource ID': 'resource_id',
  'Exam Date': 'exam_date_raw',
  'Shift': 'shift',
  'Role': 'role',
  'Type of Exam': 'type_of_exam',
  // Source header spelling as in the sheet
  'Attendnace Copy Available': 'attendance_copy_available',
  'Link to Attendance Copy': 'link_to_attendance_copy',
  'Issue Description': 'description',
  'Assignee': 'assignee',
  'TC code': 'tc_code',
  'Internal Remark 1': 'internal_remark_1',
  'Status (To be updated by Assignee)': 'assignee_status',
  'CX Status': 'cx_status',
  'Internal Remark 2': 'internal_remark_2',
} as const;

export type OtherTicketsCsvHeader = keyof typeof OTHER_TICKETS_CSV_HEADER_MAP;

/** Headers required for a valid Other Tickets CSV. */
export const OTHER_TICKETS_CSV_REQUIRED_HEADERS: OtherTicketsCsvHeader[] = ['Ticket ID'];

/** Expected (known) headers — all mapped source columns. */
export const OTHER_TICKETS_CSV_EXPECTED_HEADERS: OtherTicketsCsvHeader[] = Object.keys(
  OTHER_TICKETS_CSV_HEADER_MAP
) as OtherTicketsCsvHeader[];

export type OtherTicketsCsvIssueSeverity = 'error' | 'warning';

export interface OtherTicketsCsvIssue {
  severity: OtherTicketsCsvIssueSeverity;
  code: string;
  message: string;
  rowNumber?: number;
  column?: string;
}

/**
 * One parsed source row. All original CSV columns are retained in `raw`.
 * Mapped fields are convenience copies for future import — nothing is dropped.
 */
export interface OtherTicketsCsvParsedRow {
  /** 1-based data row number (excluding header). */
  rowNumber: number;
  /** Whether this row passed row-level required checks (has Ticket ID). */
  isValid: boolean;
  rowErrors: OtherTicketsCsvIssue[];
  /** Full original header → cell value map (every CSV column preserved). */
  raw: Record<string, string>;
  /** Mapped / normalized convenience fields aligned to other_tickets meanings. */
  ticket_number: string;
  category: string;
  created_at_raw: string;
  cx_owner: string;
  user_name: string;
  resource_id: string;
  exam_date_raw: string;
  shift: string;
  role: string;
  type_of_exam: string;
  attendance_copy_available: string;
  link_to_attendance_copy: string;
  description: string;
  assignee: string;
  tc_code: string;
  internal_remark_1: string;
  assignee_status: string;
  cx_status: string;
  internal_remark_2: string;
}

export interface OtherTicketsCsvValidationResult {
  valid: boolean;
  fileName: string;
  fileSize: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  uniqueTicketIds: number;
  /** Count of Ticket IDs that appear more than once (expected; not an error). */
  duplicateTicketIds: number;
  missingRequiredColumns: string[];
  unknownColumns: string[];
  duplicateHeaders: string[];
  errors: OtherTicketsCsvIssue[];
  warnings: OtherTicketsCsvIssue[];
  /** All parsed rows including invalid ones — source rows are not discarded. */
  rows: OtherTicketsCsvParsedRow[];
  /** Only rows with a valid Ticket ID (still one row per source line — not deduped). */
  importableRows: OtherTicketsCsvParsedRow[];
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').trim();
}

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/csv'
  );
}

function emptyMappedFields() {
  return {
    ticket_number: '',
    category: '',
    created_at_raw: '',
    cx_owner: '',
    user_name: '',
    resource_id: '',
    exam_date_raw: '',
    shift: '',
    role: '',
    type_of_exam: '',
    attendance_copy_available: '',
    link_to_attendance_copy: '',
    description: '',
    assignee: '',
    tc_code: '',
    internal_remark_1: '',
    assignee_status: '',
    cx_status: '',
    internal_remark_2: '',
  };
}

function mapRawRow(
  raw: Record<string, string>
): ReturnType<typeof emptyMappedFields> {
  const mapped = emptyMappedFields();
  for (const [header, field] of Object.entries(OTHER_TICKETS_CSV_HEADER_MAP)) {
    if (Object.prototype.hasOwnProperty.call(raw, header)) {
      (mapped as Record<string, string>)[field] = raw[header] ?? '';
    }
  }
  return mapped;
}

function analyzeHeaders(headers: string[]): {
  missingRequiredColumns: string[];
  unknownColumns: string[];
  duplicateHeaders: string[];
  errors: OtherTicketsCsvIssue[];
  warnings: OtherTicketsCsvIssue[];
} {
  const errors: OtherTicketsCsvIssue[] = [];
  const warnings: OtherTicketsCsvIssue[] = [];
  const normalized = headers.map(normalizeHeader);

  const seen = new Map<string, number>();
  const duplicateHeaders: string[] = [];
  for (const h of normalized) {
    if (!h) continue;
    const count = (seen.get(h) || 0) + 1;
    seen.set(h, count);
    if (count === 2) duplicateHeaders.push(h);
  }
  for (const h of duplicateHeaders) {
    errors.push({
      severity: 'error',
      code: 'DUPLICATE_HEADER',
      message: `Duplicate CSV header: "${h}"`,
      column: h,
    });
  }

  const headerSet = new Set(normalized.filter(Boolean));
  const missingRequiredColumns = OTHER_TICKETS_CSV_REQUIRED_HEADERS.filter(
    (h) => !headerSet.has(h)
  );
  for (const h of missingRequiredColumns) {
    errors.push({
      severity: 'error',
      code: 'MISSING_REQUIRED_COLUMN',
      message: `Missing required column: "${h}"`,
      column: h,
    });
  }

  const expectedSet = new Set<string>(OTHER_TICKETS_CSV_EXPECTED_HEADERS);
  const unknownColumns = normalized.filter((h) => h && !expectedSet.has(h));
  for (const h of unknownColumns) {
    warnings.push({
      severity: 'warning',
      code: 'UNKNOWN_COLUMN',
      message: `Unknown/unmapped column will be preserved in raw data but is not mapped to other_tickets: "${h}"`,
      column: h,
    });
  }

  const missingOptional = OTHER_TICKETS_CSV_EXPECTED_HEADERS.filter(
    (h) => !OTHER_TICKETS_CSV_REQUIRED_HEADERS.includes(h) && !headerSet.has(h)
  );
  for (const h of missingOptional) {
    warnings.push({
      severity: 'warning',
      code: 'MISSING_OPTIONAL_COLUMN',
      message: `Expected source column missing: "${h}"`,
      column: h,
    });
  }

  return { missingRequiredColumns, unknownColumns, duplicateHeaders, errors, warnings };
}

export class OtherTicketsCsvValidationService {
  /**
   * Parse and validate an Other Tickets CSV File locally.
   * Does not write to Supabase or modify other_tickets.
   */
  static async validateFile(file: File): Promise<OtherTicketsCsvValidationResult> {
    const base: OtherTicketsCsvValidationResult = {
      valid: false,
      fileName: file?.name || '',
      fileSize: file?.size ?? 0,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      uniqueTicketIds: 0,
      duplicateTicketIds: 0,
      missingRequiredColumns: [],
      unknownColumns: [],
      duplicateHeaders: [],
      errors: [],
      warnings: [],
      rows: [],
      importableRows: [],
    };

    if (!file) {
      base.errors.push({
        severity: 'error',
        code: 'FILE_MISSING',
        message: 'No file selected',
      });
      return base;
    }

    if (!isCsvFile(file)) {
      base.errors.push({
        severity: 'error',
        code: 'FILE_NOT_CSV',
        message: 'File must have a .csv extension',
      });
      return base;
    }

    if (file.size === 0) {
      base.errors.push({
        severity: 'error',
        code: 'FILE_EMPTY',
        message: 'File is empty',
      });
      return base;
    }

    const parsed = await new Promise<Papa.ParseResult<Record<string, unknown>>>((resolve) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => normalizeHeader(header),
        complete: (result) => resolve(result),
        error: (error) => {
          resolve({
            data: [],
            errors: [{ type: 'Quotes', code: 'InvalidQuotes', message: error.message, row: 0 }],
            meta: {
              delimiter: ',',
              linebreak: '\n',
              aborted: false,
              truncated: false,
              cursor: 0,
              fields: [],
            },
          } as Papa.ParseResult<Record<string, unknown>>);
        },
      });
    });

    const headers = (parsed.meta.fields || []).map(normalizeHeader);
    if (headers.length === 0 || headers.every((h) => !h)) {
      base.errors.push({
        severity: 'error',
        code: 'NO_HEADERS',
        message: 'CSV has no readable headers',
      });
      return base;
    }

    const headerAnalysis = analyzeHeaders(headers);
    base.missingRequiredColumns = headerAnalysis.missingRequiredColumns;
    base.unknownColumns = headerAnalysis.unknownColumns;
    base.duplicateHeaders = headerAnalysis.duplicateHeaders;
    base.errors.push(...headerAnalysis.errors);
    base.warnings.push(...headerAnalysis.warnings);

    for (const pe of parsed.errors || []) {
      base.warnings.push({
        severity: 'warning',
        code: 'PARSE_WARNING',
        message: pe.message,
        rowNumber: typeof pe.row === 'number' ? pe.row + 1 : undefined,
      });
    }

    if (base.missingRequiredColumns.length > 0 || base.duplicateHeaders.length > 0) {
      // Cannot safely attribute Ticket IDs — stop row mapping but return header issues
      base.valid = false;
      base.totalRows = parsed.data?.length ?? 0;
      return base;
    }

    const rows: OtherTicketsCsvParsedRow[] = [];
    const ticketIdCounts = new Map<string, number>();

    (parsed.data || []).forEach((dataRow, index) => {
      const rowNumber = index + 1;
      const raw: Record<string, string> = {};
      for (const header of headers) {
        if (!header) continue;
        raw[header] = cellValue((dataRow as Record<string, unknown>)[header]);
      }
      // Preserve any unexpected keys Papa may have included
      for (const [key, value] of Object.entries(dataRow || {})) {
        const h = normalizeHeader(key);
        if (h && !(h in raw)) {
          raw[h] = cellValue(value);
        }
      }

      const mapped = mapRawRow(raw);
      const rowErrors: OtherTicketsCsvIssue[] = [];

      if (!mapped.ticket_number) {
        rowErrors.push({
          severity: 'error',
          code: 'MISSING_TICKET_ID',
          message: `Row ${rowNumber}: missing Ticket ID`,
          rowNumber,
          column: 'Ticket ID',
        });
      }

      const isValid = rowErrors.length === 0;
      if (isValid) {
        const id = mapped.ticket_number;
        ticketIdCounts.set(id, (ticketIdCounts.get(id) || 0) + 1);
      } else {
        base.errors.push(...rowErrors);
      }

      rows.push({
        rowNumber,
        isValid,
        rowErrors,
        raw,
        ...mapped,
      });
    });

    if (rows.length === 0) {
      base.errors.push({
        severity: 'error',
        code: 'NO_DATA_ROWS',
        message: 'CSV has headers but no data rows',
      });
    }

    const uniqueTicketIds = ticketIdCounts.size;
    let duplicateTicketIds = 0;
    for (const count of ticketIdCounts.values()) {
      if (count > 1) duplicateTicketIds += 1;
    }

    if (duplicateTicketIds > 0) {
      base.warnings.push({
        severity: 'warning',
        code: 'DUPLICATE_TICKET_IDS_EXPECTED',
        message: `${duplicateTicketIds} Ticket ID(s) appear more than once across source rows. This is expected (multiple exam/shift lines per ticket) and is not a validation error. Source rows are not deduplicated.`,
      });
    }

    const validRowsList = rows.filter((r) => r.isValid);
    const invalidCount = rows.length - validRowsList.length;

    base.totalRows = rows.length;
    base.validRows = validRowsList.length;
    base.invalidRows = invalidCount;
    base.uniqueTicketIds = uniqueTicketIds;
    base.duplicateTicketIds = duplicateTicketIds;
    base.rows = rows;
    base.importableRows = validRowsList;

    // Import is only allowed when the file/headers are OK, every data row is valid
    // (no missing Ticket IDs), and at least one row exists. Partial import is not allowed.
    const fatalErrors = base.errors.filter(
      (e) =>
        e.code === 'FILE_MISSING' ||
        e.code === 'FILE_NOT_CSV' ||
        e.code === 'FILE_EMPTY' ||
        e.code === 'NO_HEADERS' ||
        e.code === 'NO_DATA_ROWS' ||
        e.code === 'MISSING_REQUIRED_COLUMN' ||
        e.code === 'DUPLICATE_HEADER'
    );
    base.valid =
      fatalErrors.length === 0 && validRowsList.length > 0 && invalidCount === 0;

    return base;
  }
}
