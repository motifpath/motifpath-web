import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  conciergeNumber,
  conciergeWhatsAppUrl,
  lessonReference,
  practiceReference,
} from '@/features/student/utils/conciergeLink'

const NODE_ID = '3eb9ccc1-102f-81ee-8405-dc6fdbc5211b'
const EXERCISE_ID = '5c20a7e4-9b1d-4f0e-a3c2-7d8e9f001122'

describe('lessonReference', () => {
  it('is L- and the first 8 characters of the content node id', () => {
    expect(lessonReference(NODE_ID)).toBe('L-3eb9ccc1')
  })

  it('is lowercase whatever the id casing', () => {
    expect(lessonReference(NODE_ID.toUpperCase())).toBe('L-3eb9ccc1')
  })
})

describe('practiceReference', () => {
  it('is X- and the node and exercise prefixes joined by a slash', () => {
    expect(practiceReference(NODE_ID, EXERCISE_ID)).toBe('X-3eb9ccc1/5c20a7e4')
  })
})

describe('conciergeNumber', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is the configured number', () => {
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', '+55 11 91234-5678')

    expect(conciergeNumber()).toBe('+55 11 91234-5678')
  })

  it.each(['', '   ', '+ -'])('is null when the configured value %j holds no digits', (value) => {
    vi.stubEnv('VITE_CONCIERGE_WHATSAPP_NUMBER', value)

    expect(conciergeNumber()).toBeNull()
  })
})

describe('conciergeWhatsAppUrl', () => {
  it('links to the number digits only, with the message URL-encoded as text', () => {
    const message = "Hi! I'm Ana Souza.\nRef: L-3eb9ccc1"

    expect(conciergeWhatsAppUrl('+55 11 91234-5678', message)).toBe(
      `https://wa.me/5511912345678?text=${encodeURIComponent(message)}`,
    )
  })

  it.each([undefined, '', '   ', '+ -'])('is null when the number %j has no digits', (number) => {
    expect(conciergeWhatsAppUrl(number, 'Hi!')).toBeNull()
  })
})
