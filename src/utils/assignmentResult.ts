export type AssignmentAttempt = {
  attempted: boolean;
  success: boolean;
};

export type AssignmentOutcome =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

/**
 * Summarize bulk resolver/approver assignment results for admin toasts.
 * Roles that were not attempted must not be reported as "succeeded".
 */
export function summarizeAssignmentResult(
  resolver: AssignmentAttempt,
  approver: AssignmentAttempt
): AssignmentOutcome {
  const resolverOk = !resolver.attempted || resolver.success;
  const approverOk = !approver.attempted || approver.success;

  if (resolverOk && approverOk && (resolver.attempted || approver.attempted)) {
    return { kind: 'success', message: 'Assignments updated successfully' };
  }

  if (resolver.attempted && resolver.success && approver.attempted && !approver.success) {
    return { kind: 'error', message: 'Only resolver assignments succeeded' };
  }

  if (approver.attempted && approver.success && resolver.attempted && !resolver.success) {
    return { kind: 'error', message: 'Only approver assignments succeeded' };
  }

  if (resolver.attempted && !resolver.success && !approver.attempted) {
    return { kind: 'error', message: 'Failed to assign resolver' };
  }

  if (approver.attempted && !approver.success && !resolver.attempted) {
    return { kind: 'error', message: 'Failed to assign approver' };
  }

  return { kind: 'error', message: 'Failed to assign tickets' };
}
