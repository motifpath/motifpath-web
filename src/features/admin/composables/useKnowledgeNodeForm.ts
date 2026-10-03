import { computed, ref, watch, type Ref } from 'vue'

import { OFFERED_LANGUAGE_CODES } from '@/i18n'
import { isValidKey, suggestKey } from '@/features/admin/utils/knowledgeMap'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeNodeKind = components['schemas']['KnowledgeNodeKind']
type CreateKnowledgeNodeRequest = components['schemas']['CreateKnowledgeNodeRequest']
type UpdateKnowledgeNodeRequest = components['schemas']['UpdateKnowledgeNodeRequest']

function perLanguage(values: Record<string, string> | null | undefined): Record<string, string> {
  return Object.fromEntries(OFFERED_LANGUAGE_CODES.map((code) => [code, values?.[code] ?? '']))
}

function trimmed(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([code, value]) => [code, value.trim()]))
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id))
}

/**
 * The create/edit form for one knowledge node. With no `node` it creates one
 * of `kind` under `parent`; the key follows the English name until the admin
 * edits it. With a `node` it edits that node, whose key never changes.
 */
export function useKnowledgeNodeForm(options: {
  kind: Ref<KnowledgeNodeKind>
  node: Ref<KnowledgeNode | null>
  parent: Ref<KnowledgeNode | null>
  existingKeys: Ref<string[]>
}) {
  const { kind, node, parent, existingKeys } = options

  const key = ref('')
  const keyEdited = ref(false)
  const names = ref(perLanguage(null))
  const descriptions = ref(perLanguage(null))
  const instrumentIds = ref<string[]>([])
  const instrumentsEdited = ref(false)

  const isCreating = computed(() => node.value === null)

  function reset() {
    key.value = node.value?.key ?? ''
    keyEdited.value = false
    names.value = perLanguage(node.value?.names)
    descriptions.value = perLanguage(node.value?.descriptions)
    instrumentIds.value = [...(node.value?.instrument_ids ?? parent.value?.instrument_ids ?? [])]
    instrumentsEdited.value = false
  }

  // A new node starts on its parent's instruments, and keeps following the
  // parent the admin picks until they choose instruments themselves.
  watch(parent, (next) => {
    if (isCreating.value && !instrumentsEdited.value) instrumentIds.value = [...(next?.instrument_ids ?? [])]
  })

  function setEnglishName(value: string) {
    names.value = { ...names.value, en: value }
    if (isCreating.value && !keyEdited.value) key.value = suggestKey(value)
  }

  function setKey(value: string) {
    key.value = value
    keyEdited.value = true
  }

  function setInstrumentIds(ids: string[]) {
    instrumentIds.value = ids
    instrumentsEdited.value = true
  }

  /** The instruments a node may have under its parent, or null when the parent is for every instrument. */
  const allowedInstrumentIds = computed(() => {
    const parentIds = parent.value?.instrument_ids ?? []
    return parentIds.length === 0 ? null : parentIds
  })

  const keyError = computed<'invalid' | 'taken' | null>(() => {
    if (!isCreating.value || key.value === '') return null
    if (!isValidKey(key.value)) return 'invalid'
    return existingKeys.value.includes(key.value) ? 'taken' : null
  })

  const namesComplete = computed(() => Object.values(names.value).every((name) => name.trim() !== ''))

  const descriptionFilled = computed(() => Object.values(descriptions.value).map((d) => d.trim() !== ''))
  const descriptionsIncomplete = computed(
    () => descriptionFilled.value.some(Boolean) && !descriptionFilled.value.every(Boolean),
  )

  /** What the form changes relative to `base`'s saved values — empty when nothing differs. */
  function changesAgainst(base: KnowledgeNode | null): UpdateKnowledgeNodeRequest {
    if (!base) return {}
    const request: UpdateKnowledgeNodeRequest = {}
    const nextNames = trimmed(names.value)
    if (OFFERED_LANGUAGE_CODES.some((code) => nextNames[code] !== (base.names[code] ?? ''))) {
      request.names = nextNames
    }
    const nextDescriptions = trimmed(descriptions.value)
    const before = perLanguage(base.descriptions)
    if (OFFERED_LANGUAGE_CODES.some((code) => nextDescriptions[code] !== before[code])) {
      request.descriptions = descriptionFilled.value.some(Boolean) ? nextDescriptions : null
    }
    if (!sameIds(instrumentIds.value, base.instrument_ids)) request.instrument_ids = [...instrumentIds.value]
    return request
  }

  const updateRequest = computed(() => changesAgainst(node.value))

  const isDirty = computed(() => {
    if (!isCreating.value) return Object.keys(updateRequest.value).length > 0
    return (
      key.value !== '' ||
      Object.values(names.value).some((name) => name.trim() !== '') ||
      descriptionFilled.value.some(Boolean) ||
      instrumentsEdited.value
    )
  })

  // A reload of the same node (after any write to the map) must not wipe the
  // admin's unsaved edits. The form takes the reloaded values when it shows a
  // different node, held no edits, or already matches them (it was just saved).
  watch(
    node,
    (next, previous) => {
      const unchanged = (base: KnowledgeNode | null | undefined) =>
        base !== undefined && Object.keys(changesAgainst(base)).length === 0
      if (previous === undefined || next?.node_id !== previous?.node_id || unchanged(previous) || unchanged(next)) {
        reset()
      }
    },
    { immediate: true },
  )

  const canSave = computed(
    () =>
      isDirty.value &&
      namesComplete.value &&
      !descriptionsIncomplete.value &&
      (!isCreating.value || (key.value !== '' && keyError.value === null)),
  )

  function createRequest(): CreateKnowledgeNodeRequest {
    const request: CreateKnowledgeNodeRequest = {
      kind: kind.value,
      key: key.value,
      names: trimmed(names.value),
      instrument_ids: [...instrumentIds.value],
    }
    if (descriptionFilled.value.some(Boolean)) request.descriptions = trimmed(descriptions.value)
    if (parent.value) request.parent_id = parent.value.node_id
    return request
  }

  return {
    key,
    names,
    descriptions,
    instrumentIds,
    isCreating,
    allowedInstrumentIds,
    keyError,
    descriptionsIncomplete,
    isDirty,
    canSave,
    setEnglishName,
    setKey,
    setInstrumentIds,
    reset,
    createRequest,
    updateRequest,
  }
}
