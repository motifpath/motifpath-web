import { computed, ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

/**
 * The API has no dedicated skill-tag catalog — tags are just strings on
 * each Exercise. Reusing the same exercise list the authoring pool already
 * fetches (rather than adding a new endpoint) is enough to suggest tags a
 * teacher has used before, so authoring doesn't silently fork near-duplicate
 * tags ("chord-recognition" vs. "chord recognition") for no reason.
 *
 * Loading is deferred to an explicit ensureLoaded() call, triggered once
 * the teacher actually focuses the tag input, rather than fetched eagerly
 * whenever the authoring page mounts — the full exercise pool isn't needed
 * for anything else on this page.
 */
export function useSkillTagSuggestions() {
  const { coreApi } = useApi()

  const exercises = ref<Exercise[]>([])
  const isLoading = ref(false)
  let loaded = false

  async function ensureLoaded() {
    if (loaded || isLoading.value) return
    isLoading.value = true

    const { data } = await coreApi.GET('/exercises', {})
    if (data) exercises.value = data
    loaded = true
    isLoading.value = false
  }

  const availableTags = computed(() => {
    const tags = new Set<string>()
    for (const exercise of exercises.value) {
      for (const tag of exercise.skill_tags ?? []) tags.add(tag)
    }
    return [...tags].sort()
  })

  return { availableTags, isLoading, ensureLoaded }
}
