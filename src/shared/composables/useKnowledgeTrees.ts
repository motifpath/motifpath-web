import { computed, getCurrentScope, onScopeDispose, type Ref } from 'vue'

import { toApiLanguageCode } from '@/i18n'
import { useListKnowledgeEdges } from '@/shared/composables/useListKnowledgeEdges'
import { useListKnowledgeNodes } from '@/shared/composables/useListKnowledgeNodes'
import { useScopedLocale, type LocaleOverride } from '@/shared/composables/useScopedLocale'
import { appliesSuggestions, toTreeNodes, type TreeNode } from '@/shared/utils/skillConceptTree'

/**
 * The skill and concept trees as picker nodes, named in the UI locale (or
 * `override.locale`, e.g. a form's editing language). Given
 * the form's picked skills and concepts, it also loads the applies edges and
 * suggests the concepts the picked skills apply and the skills that apply the
 * picked concepts.
 *
 * With `refreshOnReturn`, the trees reload quietly whenever the viewer comes
 * back to the page — for authoring screens, whose missing nodes an admin adds
 * in the knowledge map in another tab.
 */
export function useKnowledgeTrees(
  picks?: { skillIds: Ref<string[]>; conceptIds: Ref<string[]> },
  override: LocaleOverride = {},
  options: { refreshOnReturn?: boolean } = {},
) {
  const locale = useScopedLocale(override)
  const {
    nodes: skills,
    isLoading: skillsLoading,
    error: skillsError,
    retry: retrySkills,
    refresh: refreshSkills,
  } = useListKnowledgeNodes('skill')
  const {
    nodes: concepts,
    isLoading: conceptsLoading,
    error: conceptsError,
    retry: retryConcepts,
    refresh: refreshConcepts,
  } = useListKnowledgeNodes('concept')

  // A return to the tab usually fires both focus and visibilitychange; one
  // reload in flight covers both.
  let refreshing = false
  async function refreshOnReturn() {
    if (refreshing || document.visibilityState === 'hidden') return
    refreshing = true
    try {
      await Promise.all([refreshSkills(), refreshConcepts()])
    } finally {
      refreshing = false
    }
  }
  if (options.refreshOnReturn) {
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    if (getCurrentScope()) {
      onScopeDispose(() => {
        window.removeEventListener('focus', refreshOnReturn)
        document.removeEventListener('visibilitychange', refreshOnReturn)
      })
    }
  }
  const applies = picks ? useListKnowledgeEdges('applies').edges : null

  const languageCode = computed(() => toApiLanguageCode(locale.value))
  const skillNodes = computed<TreeNode[]>(() => toTreeNodes(skills.value, languageCode.value))
  const conceptNodes = computed<TreeNode[]>(() => toTreeNodes(concepts.value, languageCode.value))

  const suggestedConceptIds = computed(() =>
    applies && picks ? appliesSuggestions(applies.value, picks.skillIds.value, 'concepts') : [],
  )
  const suggestedSkillIds = computed(() =>
    applies && picks ? appliesSuggestions(applies.value, picks.conceptIds.value, 'skills') : [],
  )

  const namesById = computed(
    () => new Map([...skillNodes.value, ...conceptNodes.value].map((node) => [node.id, node.name])),
  )

  /** A skill's or concept's name in the UI locale, or '' while unknown. */
  function nodeName(id: string): string {
    return namesById.value.get(id) ?? ''
  }

  return {
    skillNodes,
    conceptNodes,
    skillsLoading,
    conceptsLoading,
    skillsError,
    conceptsError,
    retrySkills,
    retryConcepts,
    suggestedSkillIds,
    suggestedConceptIds,
    nodeName,
  }
}
