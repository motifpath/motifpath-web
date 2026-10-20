import { describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { useCreateContentNode } from '@/features/teacher/composables/useCreateContentNode'

const classification = { skill_ids: ['s-1'], concept_ids: ['c-1'], difficulty_level: 'beginner' as const }

describe('useCreateContentNode', () => {
  it('posts the request and returns the created content node', async () => {
    const contentNode = { content_node_id: 'cn-1', teacher: { user_id: 't-1', display_name: 'Teacher One' } }
    POST.mockResolvedValueOnce({ data: contentNode, error: undefined, response: { status: 201 } })

    const { createContentNode } = useCreateContentNode()
    const request = { title: 'Alternate picking basics', content_type: 'video' as const, classification, language_codes: ['any'], instrument_ids: [] }

    const result = await createContentNode(request)

    expect(POST).toHaveBeenCalledWith('/content-nodes', { body: request })
    expect(result).toEqual(contentNode)
  })

  it('throws with the server error message when creation fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { createContentNode } = useCreateContentNode()

    await expect(
      createContentNode({ title: 't', content_type: 'video', classification, language_codes: ['any'], instrument_ids: [] }),
    ).rejects.toThrow('Boom')
  })

  it('throws with per-field detail when the server returns a validation error', async () => {
    POST.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'request failed validation', errors: [{ field: '/title', reason: 'must not be empty' }] },
      response: { status: 422 },
    })

    const { createContentNode } = useCreateContentNode()

    await expect(
      createContentNode({ title: '', content_type: 'video', classification, language_codes: ['any'], instrument_ids: [] }),
    ).rejects.toThrow('Request failed validation:\n• /title: must not be empty')
  })

  it('throws a fallback message when the server gives no error message', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { createContentNode } = useCreateContentNode()

    await expect(
      createContentNode({ title: 't', content_type: 'video', classification, language_codes: ['any'], instrument_ids: [] }),
    ).rejects.toThrow('Failed to create the content node')
  })
})
