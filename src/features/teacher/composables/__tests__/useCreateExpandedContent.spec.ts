import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useCreateExpandedContent } from '@/features/teacher/composables/useCreateExpandedContent'

describe('useCreateExpandedContent', () => {
  it('posts the request and returns the created item', async () => {
    const item = { expanded_content_id: 'ec-1' }
    POST.mockResolvedValueOnce({ data: item, error: undefined, response: { status: 201 } })

    const { createExpandedContent } = useCreateExpandedContent()
    const request = { content_type: 'image' as const, media_url: 'https://cdn.example.com/x.png', trigger_at_seconds: 10, hide_at_seconds: 20 }

    const result = await createExpandedContent('cn-1', request)

    expect(POST).toHaveBeenCalledWith('/content-nodes/{content_node_id}/expanded-content', {
      params: { path: { content_node_id: 'cn-1' } },
      body: request,
    })
    expect(result).toEqual(item)
  })

  it('throws with the server error message when creation fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { createExpandedContent } = useCreateExpandedContent()

    await expect(
      createExpandedContent('cn-1', { content_type: 'image', media_url: 'https://cdn.example.com/x.png', trigger_at_seconds: 10, hide_at_seconds: 20 }),
    ).rejects.toThrow('Boom')
  })

  it('throws a fallback message when the server gives no error message', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { createExpandedContent } = useCreateExpandedContent()

    await expect(
      createExpandedContent('cn-1', { content_type: 'image', media_url: 'https://cdn.example.com/x.png', trigger_at_seconds: 10, hide_at_seconds: 20 }),
    ).rejects.toThrow('Failed to create the expanded content item')
  })
})
