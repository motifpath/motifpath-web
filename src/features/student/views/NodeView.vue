<script setup lang="ts">
import { computed, defineAsyncComponent, h, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import CuePanel from '@/features/student/components/CuePanel.vue'
import { useLessonNode } from '@/features/student/composables/useLessonNode'
import { useLessonTracking } from '@/features/student/composables/useLessonTracking'
import { activeCue } from '@/features/student/utils/activeCue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import StateLocked from '@/shared/components/StateLocked.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()

// Vue Router types a param as `string | string[]` (array only for a
// repeatable segment, which `:nodeId` isn't) — narrow instead of asserting.
// A computed, so a route change that reuses this component (same route
// record, new :nodeId) still reloads the lesson.
const nodeId = computed(() => {
  const raw = route.params.nodeId
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})

const lesson = useLessonNode(nodeId)
const { complete } = useLessonTracking(lesson)

// The player is a sizeable dependency that only this screen needs, so it is
// fetched when a lesson is opened rather than with the rest of the app.
const LessonPlayer = defineAsyncComponent({
  loader: () => import('@/features/student/components/LessonPlayer.vue'),
  delay: 0,
  loadingComponent: () =>
    h('div', {
      class: 'aspect-video w-full rounded-lg bg-surface-sunken',
      'data-test': 'player-loading',
    }),
  errorComponent: () =>
    h(
      'p',
      { class: 'text-ink-muted', 'data-test': 'player-load-error' },
      t('nodeView.playerLoadError'),
    ),
})

const playbackSeconds = ref(0)
const videoEnded = ref(false)
const playbackFailed = ref(false)
// Bumped to throw the player away and start a fresh one after a failure.
const playerKey = ref(0)
const finishing = ref(false)

// Completion is final (there is no event to un-complete a step), so
// reopening a completed lesson is for reference only: the video plays like
// any other lesson's, but nothing here is ever reported again.
const isReview = computed(() => lesson.status.value === 'completed')
const cue = computed(() => activeCue(lesson.cues.value, playbackSeconds.value))
const mediaUrl = computed(() => lesson.node.value?.media_url ?? '')

function resetPlayback(): void {
  playbackSeconds.value = 0
  videoEnded.value = false
  playbackFailed.value = false
  finishing.value = false
}

// A reload, or a different lesson, starts a fresh viewing.
watch([nodeId, () => lesson.state.value], ([, state], [, previousState]) => {
  if (state === 'loading' && previousState !== 'loading') resetPlayback()
})
watch(nodeId, resetPlayback)

function retryPlayback(): void {
  playbackSeconds.value = 0
  videoEnded.value = false
  playbackFailed.value = false
  playerKey.value += 1
}

// Reports completion before leaving, so the event has been accepted by the
// time the next screen loads its progress. Pressing again while it is in
// flight does nothing.
async function finish(to: RouteLocationRaw): Promise<void> {
  if (finishing.value) return
  finishing.value = true
  try {
    await complete()
    await router.push(to)
  } finally {
    finishing.value = false
  }
}
</script>

<template>
  <section data-test="node" class="flex flex-col gap-4">
    <RouterLink
      v-if="lesson.state.value !== 'locked'"
      :to="{ name: 'path' }"
      data-test="back-to-path"
      class="text-sm text-ink-muted"
    >
      {{ t('nodeView.backToPath') }}
    </RouterLink>

    <h1 class="text-2xl font-semibold text-accent-text">
      {{ lesson.node.value?.title ?? t('nodeView.heading') }}
    </h1>

    <StateLoading
      v-if="lesson.state.value === 'loading'"
      data-test="loading"
      :noun="t('nodeView.loadingNoun')"
    />

    <StateError
      v-else-if="lesson.state.value === 'error'"
      data-test="error"
      :message="t('nodeView.errorMessage')"
      @retry="lesson.retry()"
    />

    <StateLocked v-else-if="lesson.state.value === 'locked'" data-test="locked" />

    <StateEmpty
      v-else-if="lesson.state.value === 'not-found'"
      data-test="not-found"
      :heading="t('nodeView.notFoundHeading')"
      :message="t('nodeView.notFoundMessage')"
    />

    <StateError
      v-else-if="lesson.state.value === 'no-media'"
      data-test="no-video"
      :message="t('nodeView.noVideo')"
      @retry="lesson.retry()"
    />

    <div
      v-else-if="lesson.state.value === 'unsupported'"
      data-test="unsupported"
      class="flex flex-col items-start gap-2"
    >
      <p class="text-ink-muted">{{ t('nodeView.unavailable') }}</p>
      <p class="text-sm text-ink-muted">{{ t('nodeView.checkBackSoon') }}</p>
    </div>

    <StateError
      v-else-if="playbackFailed"
      data-test="playback-error"
      :message="t('nodeView.playbackError')"
      @retry="retryPlayback()"
    />

    <template v-else>
      <!-- Stacked in portrait; side by side in landscape, where the video
           shrinks to share the row with a cue only while one is showing. -->
      <div data-test="lesson" class="flex flex-col gap-4 landscape:flex-row landscape:items-start">
        <div class="min-w-0 flex-1">
          <LessonPlayer
            :key="playerKey"
            :src="mediaUrl"
            @time="playbackSeconds = $event"
            @ended="videoEnded = true"
            @error="playbackFailed = true"
          />
        </div>
        <div data-test="cue-region" aria-live="polite" class="empty:hidden landscape:w-1/3">
          <CuePanel v-if="cue" :cue="cue" />
        </div>
      </div>

      <!-- A completed step is reviewed, not finished, so practice is offered
           right away rather than waiting for the video to end. -->
      <div v-if="isReview && lesson.hasChallenge.value" class="flex flex-wrap items-center gap-4">
        <RouterLink
          data-test="practice-link"
          :to="{ name: 'practice', params: { nodeId } }"
          class="text-sm font-medium text-accent-text underline"
        >
          {{ t('nodeView.practiceLink') }}
        </RouterLink>
      </div>

      <div v-else-if="!isReview && videoEnded" class="flex flex-wrap items-center gap-4">
        <PrimaryButton
          v-if="lesson.hasChallenge.value"
          data-test="practice-link"
          :disabled="finishing"
          @click="finish({ name: 'practice', params: { nodeId } })"
        >
          {{ t('nodeView.goToPractice') }}
        </PrimaryButton>
        <PrimaryButton
          v-else
          data-test="complete"
          :disabled="finishing"
          @click="finish({ name: 'path' })"
        >
          {{ t('nodeView.markComplete') }}
        </PrimaryButton>
      </div>
    </template>
  </section>
</template>
