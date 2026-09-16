import { describe, expect, it } from 'vitest'

import { describeApiError } from '@/shared/utils/apiError'

describe('describeApiError', () => {
  it('returns the fallback when the error is undefined', () => {
    expect(describeApiError(undefined, 'Failed to save.')).toBe('Failed to save.')
  })

  it("capitalizes the backend's message for a plain error body", () => {
    // The backend sends lowercase, unpunctuated strings (e.g. "exercise not
    // found") — the frontend is responsible for display formatting.
    expect(describeApiError({ message: 'exercise not found' }, 'Failed to save.')).toBe('Exercise not found')
  })

  it('lists each field on its own bulleted line for a validation error body', () => {
    const error = {
      message: 'request failed validation',
      errors: [
        { field: '/prompt', reason: 'must not be empty' },
        { field: '/options', reason: 'at least one option is required' },
      ],
    }

    expect(describeApiError(error, 'Failed to save.')).toBe(
      'Request failed validation:\n• /prompt: must not be empty\n• /options: at least one option is required',
    )
  })

  it('ignores an empty validation errors array and just uses the capitalized message', () => {
    expect(describeApiError({ message: 'request failed validation', errors: [] }, 'Failed to save.')).toBe(
      'Request failed validation',
    )
  })

  it('falls back when the error body has no message', () => {
    expect(describeApiError({}, 'Failed to save.')).toBe('Failed to save.')
  })
})
