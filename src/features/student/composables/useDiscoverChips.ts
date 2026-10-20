import { computed, reactive, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { DiscoverState } from '@/features/student/utils/discoverQuery'
import { useApi } from '@/shared/composables/useApi'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

type KnowledgeNodeKind = components['schemas']['KnowledgeNodeKind']

/** An applied filter as a removable chip; the id names what × removes ("levels:beginner"). */
export interface DiscoverChip {
  id: string
  label: string
}

/**
 * Discover's applied filters as chips, in the filters' order. A teacher, skill or concept is an id
 * in the address, so its name is looked up the first time one is on — a teacher among both
 * catalogs' teachers, since one may teach only paths.
 */
export function useDiscoverChips(state: DiscoverState) {
  const { t } = useTypedT()
  const { coreApi } = useApi()
  const { localizedName } = useLocalizedName()
  const { instruments } = useListInstruments()

  const names = reactive(new Map<string, string>())
  const asked = new Set<string>()

  async function lookUpTeacher(id: string) {
    for (const url of ['/catalog/creators', '/catalog/path-creators'] as const) {
      const { data } = await coreApi.GET(url, { params: { query: {} } })
      const teacher = data?.find((creator) => creator.user_id === id)
      if (teacher) return void names.set(id, teacher.display_name)
    }
  }

  async function lookUpNodes(kind: KnowledgeNodeKind) {
    const { data } = await coreApi.GET('/knowledge-nodes', { params: { query: { kind } } })
    for (const node of data ?? []) names.set(node.node_id, localizedName(node.names))
  }

  function askOnce(key: string, look: () => Promise<void>) {
    if (asked.has(key)) return
    asked.add(key)
    void look()
  }

  watch(
    () => state.filters,
    (filters) => {
      if (filters.teacher && !names.has(filters.teacher)) {
        const teacher = filters.teacher
        askOnce(`teacher:${teacher}`, () => lookUpTeacher(teacher))
      }
      if (filters.skills.length) askOnce('skill', () => lookUpNodes('skill'))
      if (filters.concepts.length) askOnce('concept', () => lookUpNodes('concept'))
    },
    { immediate: true, deep: true },
  )

  const name = (id: string) => names.get(id) ?? '…'

  return computed<DiscoverChip[]>(() => {
    const f = state.filters
    const chips: DiscoverChip[] = f.levels.map((level) => ({ id: `levels:${level}`, label: t(`levels.${level}`) }))
    if (f.instrument) {
      const instrument = instruments.value.find((i) => i.instrument_id === f.instrument)
      chips.push({ id: 'instrument', label: instrument ? localizedName(instrument.names) : '…' })
    }
    if (f.language) {
      const key = languageLabelKey(f.language)
      chips.push({ id: 'language', label: key ? t(key) : f.language })
    }
    if (f.teacher) chips.push({ id: 'teacher', label: name(f.teacher) })
    chips.push(...f.skills.map((id) => ({ id: `skills:${id}`, label: name(id) })))
    chips.push(...f.concepts.map((id) => ({ id: `concepts:${id}`, label: name(id) })))
    return chips
  })
}
