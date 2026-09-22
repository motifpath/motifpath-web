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
// Bumped after a playback failure; LessonPlayer keys just its video provider
// on this, not itself, so the player and its aside slot — the aria-live
// region a cue lives in — stay mounted across the reset.
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

// A reload, or a different lesson, starts a fresh viewing. A node change
// always makes useLessonNode's own watcher call load(), which synchronously
// sets state to 'loading' — so watching state alone already covers a node
// change too; a separate watch(nodeId, ...) would only ever fire redundantly
// alongside this one.
watch([nodeId, () => lesson.state.value], ([, state], [, previousState]) => {
  if (state === 'loading' && previousState !== 'loading') resetPlayback()
})

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

    <template v-else>
      <!-- A playback failure shows an error, but does not unmount the player
           below it (v-show, not v-if): the video engine still needs a fresh
           provider on retry, but the player itself, and the aside slot the
           cue's aria-live region lives in, must stay mounted throughout — an
           announcement region that's removed and re-added is typically read
           as silent by a screen reader. -->
      <StateError
        v-if="playbackFailed"
        data-test="playback-error"
        :message="t('nodeView.playbackError')"
        @retry="retryPlayback()"
      />

      <!-- The cue lives inside LessonPlayer's aside slot (not beside it as a
           separate element) so it is still shown when the player goes
           fullscreen — the Fullscreen API only renders an element's own
           descendants. Stacked below the video in portrait, beside it in
           landscape.

           The slot is provided whenever this lesson has any cues at all, not
           only while one is active: an aria-live region has to stay mounted
           for a screen reader to announce what changes inside it later — one
           that's added already full of content, or removed and re-added each
           time, is typically read as silent. CuePanel itself still renders
           nothing between cues, via the empty:hidden rule below. -->
      <div v-show="!playbackFailed" data-test="lesson">
        <LessonPlayer
          :reset-token="playerKey"
          :src="mediaUrl"
          @time="playbackSeconds = $event"
          @ended="videoEnded = true"
          @error="playbackFailed = true"
        >
          <template v-if="lesson.cues.value.length > 0" #aside>
            <div data-test="cue-region" aria-live="polite" class="empty:hidden">
              <CuePanel v-if="cue" :cue="cue" />
            </div>
          </template>
        </LessonPlayer>
      </div>

      <!-- A completed step is reviewed, not finished, so practice is offered
           right away rather than waiting for the video to end. -->
      <div
        v-if="!playbackFailed && isReview && lesson.hasChallenge.value"
        class="flex flex-wrap items-center gap-4"
      >
        <RouterLink
          data-test="practice-link"
          :to="{ name: 'practice', params: { nodeId } }"
          class="text-sm font-medium text-accent-text underline"
        >
          {{ t('nodeView.practiceLink') }}
        </RouterLink>
      </div>

      <div
        v-else-if="!playbackFailed && !isReview && videoEnded"
        class="flex flex-wrap items-center gap-4"
      >
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
