import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeEdge = components['schemas']['KnowledgeEdge']
type MasteryLevel = components['schemas']['MasteryLevel']
type CreateKnowledgeNodeRequest = components['schemas']['CreateKnowledgeNodeRequest']
type UpdateKnowledgeNodeRequest = components['schemas']['UpdateKnowledgeNodeRequest']
type CreateKnowledgeEdgeRequest = components['schemas']['CreateKnowledgeEdgeRequest']
type FieldError = components['schemas']['ValidationError']['errors'][number]

/**
 * What a write to the map came to. A refused write keeps the HTTP status (0
 * when the request never got an answer) so the screen can tell a rule the
 * server enforces — shown next to the control — from an outage.
 */
export type WriteOutcome<T> =
  | { ok: true; data: T | undefined }
  | { ok: false; status: number; message: string; fields: FieldError[] }

function isFieldErrorList(value: unknown): value is FieldError[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'object' && entry !== null && 'field' in entry && 'reason' in entry)
  )
}

function refusal(status: number, error: unknown): WriteOutcome<never> {
  const body = typeof error === 'object' && error !== null ? error : {}
  const message = 'message' in body && typeof body.message === 'string' ? body.message : ''
  const fields = 'errors' in body && isFieldErrorList(body.errors) ? body.errors : []
  return { ok: false, status, message: message.charAt(0).toUpperCase() + message.slice(1), fields }
}

/**
 * The whole knowledge map — both trees and every link — and the admin writes
 * that change it. Each successful write reloads the map, so every view of it
 * stays consistent with what the server holds.
 */
export function useKnowledgeMap() {
  const { coreApi } = useApi()

  const nodes = ref<KnowledgeNode[]>([])
  const edges = ref<KnowledgeEdge[]>([])
  const isLoading = ref(true)
  const loadFailed = ref(false)

  // Reloads can overlap (one per write); only the latest one started may
  // update the map, so a slow older answer never brings back stale links.
  let latestReload = 0

  async function reload() {
    const reloadNumber = ++latestReload
    isLoading.value = true
    const [nodeResult, edgeResult] = await Promise.all([
      coreApi.GET('/knowledge-nodes', {}),
      coreApi.GET('/knowledge-edges', {}),
    ])
    if (reloadNumber !== latestReload) return
    loadFailed.value = !nodeResult.data || !edgeResult.data
    if (nodeResult.data && edgeResult.data) {
      nodes.value = nodeResult.data
      edges.value = edgeResult.data
    }
    isLoading.value = false
  }

  async function write<T>(
    perform: () => Promise<{ data?: T; error?: unknown; response: Response }>,
  ): Promise<WriteOutcome<T>> {
    let result: Awaited<ReturnType<typeof perform>>
    try {
      result = await perform()
    } catch {
      return refusal(0, null)
    }
    if (result.error !== undefined || result.response.status >= 400) {
      return refusal(result.response.status, result.error)
    }
    await reload()
    return { ok: true, data: result.data }
  }

  void reload()

  return {
    nodes,
    edges,
    isLoading,
    loadFailed,
    reload,
    createNode: (request: CreateKnowledgeNodeRequest) =>
      write(() => coreApi.POST('/knowledge-nodes', { body: request })),
    updateNode: (nodeId: string, request: UpdateKnowledgeNodeRequest) =>
      write(() =>
        coreApi.PATCH('/knowledge-nodes/{node_id}', { params: { path: { node_id: nodeId } }, body: request }),
      ),
    deleteNode: (nodeId: string) =>
      write(() => coreApi.DELETE('/knowledge-nodes/{node_id}', { params: { path: { node_id: nodeId } } })),
    createEdge: (request: CreateKnowledgeEdgeRequest) =>
      write(() => coreApi.POST('/knowledge-edges', { body: request })),
    updateEdgeLevel: (edgeId: string, level: MasteryLevel) =>
      write(() =>
        coreApi.PATCH('/knowledge-edges/{edge_id}', { params: { path: { edge_id: edgeId } }, body: { level } }),
      ),
    deleteEdge: (edgeId: string) =>
      write(() => coreApi.DELETE('/knowledge-edges/{edge_id}', { params: { path: { edge_id: edgeId } } })),
  }
}
