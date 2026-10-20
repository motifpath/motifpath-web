import { describe, expect, it, vi } from 'vitest'

const PUT = vi.fn()
const DELETE = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT, DELETE }, eventApi: {} }),
}))

import {
  useUpdateExpandedContent,
  useDeleteExpandedContent,
} from '@/features/teacher/composables/useUpdateExpandedContent'

describe('useUpdateExpandedContent', () => {
  it('puts the request and returns the updated item', async () => {
    const item = { expanded_content_id: 'ec-1' }
    PUT.mockResolvedValueOnce({ data: item, error: undefined, response: { status: 200 } })

    const { updateExpandedContent } = useUpdateExpandedContent()
    const request = { content_type: 'image' as const, media_url: 'https://cdn.example.com/x.png', trigger_at_seconds: 10, hide_at_seconds: 20 }

    const result = await updateExpandedContent('ec-1', request)

    expect(PUT).toHaveBeenCalledWith('/expanded-content/{expanded_content_id}', {
      params: { path: { expanded_content_id: 'ec-1' } },
      body: request,
    })
    expect(result).toEqual(item)
  })

  it('throws with the server error message when update fails', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { updateExpandedContent } = useUpdateExpandedContent()

    await expect(
      updateExpandedContent('ec-1', { content_type: 'image', media_url: 'https://cdn.example.com/x.png', trigger_at_seconds: 10, hide_at_seconds: 20 }),
    ).rejects.toThrow('Boom')
  })
})

describe('useDeleteExpandedContent', () => {
  it('deletes the item', async () => {
    DELETE.mockResolvedValueOnce({ error: undefined, response: { status: 204 } })

    const { deleteExpandedContent } = useDeleteExpandedContent()
    await deleteExpandedContent('ec-1')

    expect(DELETE).toHaveBeenCalledWith('/expanded-content/{expanded_content_id}', {
      params: { path: { expanded_content_id: 'ec-1' } },
    })
  })

  it('throws with the server error message when deletion fails', async () => {
    DELETE.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 400 } })

    const { deleteExpandedContent } = useDeleteExpandedContent()

    await expect(deleteExpandedContent('ec-1')).rejects.toThrow('Boom')
  })
})
