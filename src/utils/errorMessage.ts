/** Best-effort message from thrown values (Error, PostgrestError-like objects, strings). */
export function getErrorMessage(error: unknown, fallback = 'unknown error'): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; error_description?: unknown; details?: unknown };
    for (const key of ['message', 'error_description', 'details'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return fallback;
}
