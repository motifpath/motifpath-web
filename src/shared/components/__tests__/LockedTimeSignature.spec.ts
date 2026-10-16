import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LockedTimeSignature from '@/shared/components/LockedTimeSignature.vue'

describe('LockedTimeSignature', () => {
  it('says the bar is set by the diagram', () => {
    const line = mount(LockedTimeSignature, { props: { signature: { beats: 3, beat_value: 4 }, setBy: 'diagram' } })

    expect(line.text()).toBe('3/4 · set by the diagram')
  })

  it('says a progression plays one chord a bar', () => {
    const line = mount(LockedTimeSignature, { props: { signature: { beats: 4, beat_value: 4 }, setBy: 'progression' } })

    expect(line.text()).toBe('4/4 · one chord a bar')
  })
})
