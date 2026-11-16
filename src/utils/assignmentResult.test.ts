import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeAssignmentResult } from './assignmentResult';

describe('summarizeAssignmentResult', () => {
  it('reports resolver failure clearly when approver was not attempted', () => {
    const outcome = summarizeAssignmentResult(
      { attempted: true, success: false },
      { attempted: false, success: true }
    );

    assert.equal(outcome.kind, 'error');
    assert.equal(outcome.message, 'Failed to assign resolver');
    assert.notEqual(outcome.message, 'Only approver assignments succeeded');
  });

  it('succeeds when only resolver was attempted and succeeded', () => {
    const outcome = summarizeAssignmentResult(
      { attempted: true, success: true },
      { attempted: false, success: true }
    );

    assert.deepEqual(outcome, {
      kind: 'success',
      message: 'Assignments updated successfully',
    });
  });

  it('reports partial success only when both roles were attempted', () => {
    const outcome = summarizeAssignmentResult(
      { attempted: true, success: false },
      { attempted: true, success: true }
    );

    assert.deepEqual(outcome, {
      kind: 'error',
      message: 'Only approver assignments succeeded',
    });
  });
});
