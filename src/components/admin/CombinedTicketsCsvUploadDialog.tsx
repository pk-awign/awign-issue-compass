import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  OtherTicketsCsvValidationService,
  type OtherTicketsCsvValidationResult,
} from '@/services/otherTicketsCsvValidationService';
import {
  OtherTicketsImportService,
  type OtherTicketsImportSuccess,
} from '@/services/otherTicketsImportService';

type UploadStep = 'select' | 'preview' | 'confirm';

interface CombinedTicketsCsvUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful DB import so the dashboard can refresh from Supabase. */
  onImportSuccess?: (result: OtherTicketsImportSuccess) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

/**
 * Connects the existing CSV upload/validation UI to OtherTicketsImportService.
 * Does not redesign the dialog layout beyond wiring Import + confirmation copy.
 */
export const CombinedTicketsCsvUploadDialog: React.FC<
  CombinedTicketsCsvUploadDialogProps
> = ({ open, onOpenChange, onImportSuccess }) => {
  const { user, isSuperAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInFlightRef = useRef(false);
  const dragDepthRef = useRef(0);
  const [step, setStep] = useState<UploadStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [validation, setValidation] = useState<OtherTicketsCsvValidationResult | null>(
    null
  );

  const resetState = () => {
    setStep('select');
    setSelectedFile(null);
    setIsDragging(false);
    setIsValidating(false);
    setIsImporting(false);
    setImportError(null);
    setValidation(null);
    importInFlightRef.current = false;
    dragDepthRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isImporting || importInFlightRef.current) return;
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const acceptFile = (file: File | null) => {
    setValidation(null);
    setImportError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isCsvFile(file)) {
      toast.error('Please select a .csv file');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    if (fileInputRef.current) {
      // Keep the native input in sync when possible (drag-drop does not set it).
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      } catch {
        // Some browsers may block programmatic FileList assignment; selection state still works.
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0] ?? null);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    if (event.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0] ?? null;
    acceptFile(file);
  };

  const handleContinueFromSelect = async () => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can import Other Tickets CSV.');
      onOpenChange(false);
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    setIsValidating(true);
    setImportError(null);
    try {
      const result = await OtherTicketsCsvValidationService.validateFile(selectedFile);
      setValidation(result);
      setStep('preview');

      if (!result.valid) {
        toast.error('CSV validation failed. Review the issues below.');
      } else if (result.unknownColumns.length > 0) {
        toast.error(
          `Unknown/unmapped columns: ${result.unknownColumns.join(', ')}. Import is blocked.`
        );
      } else if (result.warnings.length > 0) {
        toast.warning('CSV validated with warnings.');
      } else {
        toast.success('CSV validated successfully.');
      }
    } catch (err) {
      console.error('[CSV Upload] Validation failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to parse CSV');
      setValidation(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinueFromPreview = () => {
    if (!validation?.valid) {
      toast.error('Fix validation errors before continuing');
      return;
    }
    if (validation.unknownColumns.length > 0) {
      toast.error(
        `Unknown/unmapped columns must be resolved first: ${validation.unknownColumns.join(', ')}`
      );
      return;
    }

    // Preflight schema mapping so Import is not offered for unmappable values
    try {
      OtherTicketsImportService.buildImportRows(validation);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'CSV values cannot be mapped for database import';
      toast.error(message);
      setImportError(message);
      return;
    }

    setImportError(null);
    setStep('confirm');
  };

  const handleImportClick = async () => {
    if (importInFlightRef.current || isImporting) {
      return;
    }
    if (!isSuperAdmin) {
      const message = 'Only Super Admins can import Other Tickets CSV.';
      setImportError(message);
      toast.error(message);
      return;
    }
    if (!selectedFile || !validation?.valid) {
      toast.error('Validated CSV required before import');
      return;
    }
    if (validation.unknownColumns.length > 0) {
      toast.error(
        `Unknown/unmapped columns must be resolved first: ${validation.unknownColumns.join(', ')}`
      );
      return;
    }

    importInFlightRef.current = true;
    setIsImporting(true);
    setImportError(null);

    try {
      const result = await OtherTicketsImportService.importValidatedCsv({
        file: selectedFile,
        validation,
        uploadedBy: user?.id ?? null,
        isSuperAdmin,
      });

      if (!result.success) {
        const message =
          result.code === 'DUPLICATE_FILE'
            ? 'This CSV has already been imported.'
            : result.message;
        setImportError(message);
        toast.error(message);
        return;
      }

      toast.success('Import succeeded', {
        description: [
          `${result.importedRows} source row(s) imported`,
          `${result.uniqueTicketIds} unique Ticket ID(s)`,
          result.batchId ? `Batch ${result.batchId}` : null,
          result.fileName ? `File: ${result.fileName}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      });
      onImportSuccess?.(result);
      resetState();
      onOpenChange(false);
    } catch (err) {
      console.error('[CSV Upload] Import failed:', err);
      const message = err instanceof Error ? err.message : 'Import failed';
      setImportError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
      importInFlightRef.current = false;
    }
  };

  const canContinueFromPreview = Boolean(
    isSuperAdmin && validation?.valid && validation.unknownColumns.length === 0
  );
  const canImport =
    isSuperAdmin &&
    canContinueFromPreview &&
    Boolean(selectedFile) &&
    !isImporting &&
    !importInFlightRef.current;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-h-[90vh]">
        <div className="shrink-0 px-6 pt-6 pb-3 pr-12">
          <DialogHeader>
            <DialogTitle>Upload Other Tickets CSV</DialogTitle>
            <DialogDescription>
              {step === 'select' && 'Select a CSV file containing Other Tickets source rows.'}
              {step === 'preview' &&
                'Review local validation results. Nothing has been imported.'}
              {step === 'confirm' &&
                'Review the summary, then Import to write source rows into other_tickets.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {step === 'select' && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div
                className={cn(
                  'rounded-lg border border-dashed p-6 text-center space-y-3 transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25'
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {isDragging ? 'Drop CSV file here' : 'Drag and drop a CSV file here'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepted format: .csv only
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="sr-only"
                  tabIndex={-1}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </Button>
              </div>

              {selectedFile && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <FileSpreadsheet className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-all">{selectedFile.name}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Size: {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 px-2"
                      onClick={() => {
                        acceptFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleContinueFromSelect}
                disabled={!selectedFile || isValidating}
              >
                {isValidating ? 'Validating…' : 'Continue'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div className="rounded-md border p-3 text-sm space-y-2">
                <p className="font-medium">File</p>
                <p className="text-muted-foreground break-all">
                  {validation?.fileName ?? selectedFile?.name ?? 'No file selected'}
                </p>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    Size: {formatFileSize(selectedFile.size)}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Validation summary</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total source rows</p>
                    <p className="font-semibold mt-1">{validation?.totalRows ?? '—'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Unique Ticket IDs</p>
                    <p className="font-semibold mt-1">{validation?.uniqueTicketIds ?? '—'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Duplicate Ticket IDs</p>
                    <p className="font-semibold mt-1">
                      {validation?.duplicateTicketIds ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Invalid rows</p>
                    <p className="font-semibold mt-1">{validation?.invalidRows ?? '—'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Valid rows</p>
                    <p className="font-semibold mt-1">{validation?.validRows ?? '—'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Missing Ticket IDs</p>
                    <p className="font-semibold mt-1">
                      {validation
                        ? validation.errors.filter((e) => e.code === 'MISSING_TICKET_ID')
                            .length
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {validation && validation.errors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-2 max-h-32 overflow-y-auto">
                  <p className="font-medium text-destructive">Errors</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    {validation.errors.slice(0, 50).map((err, idx) => (
                      <li key={`err-${idx}`}>{err.message}</li>
                    ))}
                    {validation.errors.length > 50 && (
                      <li>…and {validation.errors.length - 50} more</li>
                    )}
                  </ul>
                </div>
              )}

              {validation && validation.warnings.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm space-y-2 max-h-32 overflow-y-auto">
                  <p className="font-medium text-amber-800">Warnings</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-amber-900">
                    {validation.warnings.slice(0, 30).map((warn, idx) => (
                      <li key={`warn-${idx}`}>{warn.message}</li>
                    ))}
                    {validation.warnings.length > 30 && (
                      <li>…and {validation.warnings.length - 30} more</li>
                    )}
                  </ul>
                </div>
              )}

              {!canContinueFromPreview && (
                <p className="text-sm text-destructive">
                  Import is disabled until validation passes with zero invalid rows and no
                  unknown columns.
                </p>
              )}

              {importError && <p className="text-sm text-destructive">{importError}</p>}
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinueFromPreview} disabled={!canContinueFromPreview}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Import confirmation</p>
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <p className="text-xs text-muted-foreground">File name</p>
                  <p className="font-semibold break-all">
                    {validation?.fileName ?? selectedFile?.name ?? '—'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total source rows</p>
                    <p className="font-semibold mt-1">{validation?.totalRows ?? '—'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Unique Ticket IDs</p>
                    <p className="font-semibold mt-1">{validation?.uniqueTicketIds ?? '—'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Duplicate Ticket IDs</p>
                    <p className="font-semibold mt-1">
                      {validation?.duplicateTicketIds ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Rows to be imported</p>
                    <p className="font-semibold mt-1">{validation?.validRows ?? '—'}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Duplicate Ticket IDs will be grouped into one ticket in the dashboard, while all
                source rows will be preserved in the database.
              </p>

              {isImporting && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Importing source rows into the database…</span>
                </div>
              )}

              {importError && !isImporting && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {importError}
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button onClick={handleImportClick} disabled={!canImport}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing…
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
