import { describe, expect, it } from 'vitest'

import {
  fitsWithin,
  isValidKey,
  refusalText,
  requiresChain,
  suggestKey,
} from '@/features/admin/utils/knowledgeMap'

function requires(from_id: string, to_id: string) {
  return { edge_id: `${from_id}-${to_id}`, from_id, to_id, type: 'requires' as const, level: 'accurate' as const }
}

describe('suggestKey', () => {
  it('turns an English name into lowercase kebab-case', () => {
    expect(suggestKey('Pre-bends & releases')).toBe('pre-bends-releases')
  })

  it('drops accents and trims separators at both ends', () => {
    expect(suggestKey('  Ré-harmonização! ')).toBe('re-harmonizacao')
  })

  it('keeps digits', () => {
    expect(suggestKey('7th chords')).toBe('7th-chords')
  })

  it('stays within the 100 characters a key may have, without a trailing dash', () => {
    const key = suggestKey(`${'a'.repeat(99)} b`)
    expect(key.length).toBeLessThanOrEqual(100)
    expect(key.endsWith('-')).toBe(false)
  })

  it('is empty for a name with nothing to keep', () => {
    expect(suggestKey('& !')).toBe('')
  })
})

describe('isValidKey', () => {
  it.each(['bends', 'pre-bends', '7th-chords'])('accepts %s', (key) => {
    expect(isValidKey(key)).toBe(true)
  })

  it.each(['', 'Bends', 'pre_bends', '-bends', 'bends-', 'pre--bends', 'a'.repeat(101)])('rejects %s', (key) => {
    expect(isValidKey(key)).toBe(false)
  })
})

describe('fitsWithin', () => {
  it('fits anything inside a parent for every instrument', () => {
    expect(fitsWithin([], [])).toBe(true)
    expect(fitsWithin(['guitar'], [])).toBe(true)
  })

  it('does not fit every instrument inside a parent for specific instruments', () => {
    expect(fitsWithin([], ['guitar'])).toBe(false)
  })

  it('fits a subset of the parent instruments', () => {
    expect(fitsWithin(['guitar'], ['guitar', 'electric'])).toBe(true)
  })

  it('does not fit an instrument the parent lacks', () => {
    expect(fitsWithin(['guitar', 'bass'], ['guitar', 'electric'])).toBe(false)
  })
})

describe('requiresChain', () => {
  it('finds a direct requires link', () => {
    expect(requiresChain([requires('vibrato', 'bends')], 'vibrato', 'bends')).toEqual(['vibrato', 'bends'])
  })

  it('finds a chain through other nodes', () => {
    const edges = [requires('vibrato', 'slides'), requires('slides', 'bends')]
    expect(requiresChain(edges, 'vibrato', 'bends')).toEqual(['vibrato', 'slides', 'bends'])
  })

  it('ignores applies links', () => {
    const edges = [{ ...requires('vibrato', 'bends'), type: 'applies' as const, level: null }]
    expect(requiresChain(edges, 'vibrato', 'bends')).toBeNull()
  })

  it('is null when there is no chain', () => {
    expect(requiresChain([requires('bends', 'vibrato')], 'vibrato', 'bends')).toBeNull()
  })

  it('finds the shortest chain', () => {
    const edges = [requires('a', 'b'), requires('b', 'c'), requires('c', 'd'), requires('a', 'd')]
    expect(requiresChain(edges, 'a', 'd')).toEqual(['a', 'd'])
  })
})

describe('refusalText', () => {
  it("is the server's message", () => {
    expect(refusalText({ ok: false, status: 409, message: 'Would create a cycle', fields: [] })).toBe('Would create a cycle')
  })

  it('adds the reason of each failing field', () => {
    expect(
      refusalText({
        ok: false,
        status: 400,
        message: 'Request failed validation',
        fields: [
          { field: '/names', reason: 'missing pt_BR' },
          { field: '/key', reason: 'must be kebab-case' },
        ],
      }),
    ).toBe('Request failed validation: missing pt_BR; must be kebab-case')
  })
})
