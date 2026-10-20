import { beforeEach, describe, expect, it, vi } from 'vitest'

const revokeObjectURL = vi.fn()
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
  revokeObjectURL,
})

import { useOptionMediaPicker } from '@/features/teacher/composables/useOptionMediaPicker'

interface Option {
  id: string
  mediaUrl: string
}

describe('useOptionMediaPicker', () => {
  beforeEach(() => {
    revokeObjectURL.mockClear()
  })

  it('starts with no picker target open', () => {
    const { pickerTargetId } = useOptionMediaPicker<Option>(
      () => [],
      (o) => o.mediaUrl,
      vi.fn(),
      vi.fn(),
    )

    expect(pickerTargetId.value).toBeNull()
  })

  it('opens the picker for a given option id', () => {
    const { pickerTargetId, openPicker } = useOptionMediaPicker<Option>(
      () => [],
      (o) => o.mediaUrl,
      vi.fn(),
      vi.fn(),
    )

    openPicker('o1')

    expect(pickerTargetId.value).toBe('o1')
  })

  it('on pick: previews locally, defers the real upload, and closes the picker', () => {
    const onSetPreview = vi.fn()
    const onSetFile = vi.fn()
    const { pickerTargetId, openPicker, onPicked } = useOptionMediaPicker<Option>(
      () => [{ id: 'o1', mediaUrl: '' }],
      (o) => o.mediaUrl,
      onSetPreview,
      onSetFile,
    )
    openPicker('o1')
    const file = new File(['data'], 'a.png')

    onPicked(file)

    expect(onSetPreview).toHaveBeenCalledWith('o1', 'blob:a.png')
    expect(onSetFile).toHaveBeenCalledWith('o1', file)
    expect(pickerTargetId.value).toBeNull()
  })

  it('revokes the previous blob URL when replacing a local preview', () => {
    const { openPicker, onPicked } = useOptionMediaPicker<Option>(
      () => [{ id: 'o1', mediaUrl: 'blob:old.png' }],
      (o) => o.mediaUrl,
      vi.fn(),
      vi.fn(),
    )
    openPicker('o1')

    onPicked(new File(['data'], 'new.png'))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:old.png')
  })

  it('does not try to revoke a real (non-blob) CDN URL', () => {
    const { openPicker, onPicked } = useOptionMediaPicker<Option>(
      () => [{ id: 'o1', mediaUrl: 'https://cdn.example.com/a.png' }],
      (o) => o.mediaUrl,
      vi.fn(),
      vi.fn(),
    )
    openPicker('o1')

    onPicked(new File(['data'], 'new.png'))

    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('is a no-op when no picker target is open', () => {
    const onSetPreview = vi.fn()
    const onSetFile = vi.fn()
    const { onPicked } = useOptionMediaPicker<Option>(() => [], (o) => o.mediaUrl, onSetPreview, onSetFile)

    onPicked(new File(['data'], 'a.png'))

    expect(onSetPreview).not.toHaveBeenCalled()
    expect(onSetFile).not.toHaveBeenCalled()
  })
})
