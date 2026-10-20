import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useSaveBlockers } from '@/shared/composables/useSaveBlockers'

describe('useSaveBlockers', () => {
  it('shows nothing until Save is tapped', () => {
    const missing = ref([{ field: 'skills', label: 'Add a skill' }])
    const { shown } = useSaveBlockers(missing)

    expect(shown.value).toEqual([])
  })

  it('a Save with something missing is refused, shows what, and asks the list to come into view', () => {
    const missing = ref([{ field: 'skills', label: 'Add a skill' }])
    const { shown, reveal, readyToSave } = useSaveBlockers(missing)

    expect(readyToSave()).toBe(false)
    expect(shown.value).toEqual([{ field: 'skills', label: 'Add a skill' }])
    expect(reveal.value).toBe(1)

    readyToSave()
    expect(reveal.value).toBe(2)
  })

  it('the list follows what is still missing, and goes once nothing is', () => {
    const missing = ref([
      { field: 'skills', label: 'Add a skill' },
      { field: 'concepts', label: 'Add a concept' },
    ])
    const { shown, readyToSave } = useSaveBlockers(missing)
    readyToSave()

    missing.value = [{ field: 'concepts', label: 'Add a concept' }]
    expect(shown.value.map((item) => item.label)).toEqual(['Add a concept'])

    missing.value = []
    expect(shown.value).toEqual([])
  })

  it('a Save with nothing missing goes ahead', () => {
    const { shown, readyToSave } = useSaveBlockers(ref([]))

    expect(readyToSave()).toBe(true)
    expect(shown.value).toEqual([])
  })
})
