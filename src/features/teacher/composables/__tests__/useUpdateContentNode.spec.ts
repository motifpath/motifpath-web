import { describe, expect, it, vi } from 'vitest'

const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT }, eventApi: {} }),
}))

import { useUpdateContentNode } from '@/features/teacher/composables/useUpdateContentNode'

const classification = { skill_ids: ['s-1'], concept_ids: ['c-1'], difficulty_level: 'beginner' as const }

describe('useUpdateContentNode', () => {
  it('puts the request and returns the updated content node', async () => {
    const contentNode = { content_node_id: 'cn-1', title: 't' }
    PUT.mockResolvedValueOnce({ data: contentNode, error: undefined, response: { status: 200 } })

    const { updateContentNode } = useUpdateContentNode()
    const request = { title: 't', classification, language_codes: ['any'], instrument_ids: [] }

    const result = await updateContentNode('cn-1', request)

    expect(PUT).toHaveBeenCalledWith('/content-nodes/{content_node_id}', {
      params: { path: { content_node_id: 'cn-1' } },
      body: request,
    })
    expect(result).toEqual(contentNode)
  })

  it('throws with the server error message when update fails', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 400 } })

    const { updateContentNode } = useUpdateContentNode()

    await expect(
      updateContentNode('cn-1', { title: 't', classification, language_codes: ['any'], instrument_ids: [] }),
    ).rejects.toThrow('Boom')
  })

  it('throws a fallback message when the server gives no error message', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } })

    const { updateContentNode } = useUpdateContentNode()

    await expect(
      updateContentNode('cn-1', { title: 't', classification, language_codes: ['any'], instrument_ids: [] }),
    ).rejects.toThrow('Failed to update the content node')
  })
})
