<script setup lang="ts">
import { computed, defineAsyncComponent, h, onBeforeUnmount, provide, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import CuePanel from '@/features/student/components/CuePanel.vue'
import SendToTeacher from '@/features/student/components/SendToTeacher.vue'
import { useCourseCompletionRedirect } from '@/features/student/composables/useCourseCompletionRedirect'
import { useLessonCompletionSync } from '@/features/student/composables/useLessonCompletionSync'
import { useLessonNode } from '@/features/student/composables/useLessonNode'
import { useLessonTracking } from '@/features/student/composables/useLessonTracking'
import { activeCue } from '@/features/student/utils/activeCue'
import { lessonReference } from '@/features/student/utils/conciergeLink'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import StateLocked from '@/shared/components/StateLocked.vue'
import SongChartScreen from '@/shared/components/songChart/SongChartScreen.vue'
import { SONG_CHART_OPENER } from '@/shared/components/songChart/songChartOpener'
import { useMediaQuery } from '@/shared/composables/useMediaQuery'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()

// A CSS width breakpoint alone can't tell a phone from a phone rotated to
// landscape — a rotated phone is wide, but still short. The video is the
// point of this screen, so the trimmed title and spacing apply whenever
// either dimension is small, not just a narrow width.
const { matches: isShortViewport } = useMediaQuery('(max-width: 767px), (max-height: 500px)')
// Short in height only: there the video fills the screen top to bottom.
const { matches: isShortHeight } = useMediaQuery('(max-height: 500px)')

// Vue Router types a param as `string | string[]` (array only for a
// repeatable segment, which `:nodeId` isn't) — narrow instead of asserting.
// A computed, so a route change that reuses this component (same route
// record, new :nodeId) still reloads the lesson.
const nodeId = computed(() => {
  const raw = route.params.nodeId
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})

const lesson = useLessonNode(nodeId)
useCourseCompletionRedirect(lesson.completedCourseEnrollmentId)
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

// A song chart a cue embeds opens over the lesson, with the video paused, so closing it returns
// to the same moment instead of reloading the video.
const player = ref<{ pause: () => void } | null>(null)
const openSongChartId = ref<string | null>(null)
provide(SONG_CHART_OPENER, (songChartId) => {
  player.value?.pause()
  openSongChartId.value = songChartId
})
const finishing = ref(false)

// Completion is final (there is no event to un-complete a step), so
// reopening a completed lesson is for reference only: the video plays like
// any other lesson's, but nothing here is ever reported again.
const isReview = computed(() => lesson.status.value === 'completed')
const cue = computed(() => activeCue(lesson.cues.value, playbackSeconds.value))
const mediaUrl = computed(() => lesson.node.value?.media_url ?? '')
// Any lesson the student may open can be asked about — including one whose
// video is missing or whose content type has no screen yet.
const canAskTeacher = computed(() => ['ready', 'unsupported', 'no-media'].includes(lesson.state.value))

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

const { waitForCompletion } = useLessonCompletionSync()

// Set once the student has navigated away, so a finish still in flight doesn't
// pull them back from wherever they went.
let left = false
onBeforeUnmount(() => {
  left = true
})

// Reports completion before leaving, so the event has been accepted by the
// time the next screen loads its progress. Pressing again while it is in
// flight does nothing.
//
// Going back to the path also waits for the completion to be recorded, so the
// path shows this step done — and a lesson that finished the course goes
// straight to the course-completed screen. Going to practice doesn't wait: a
// read that discovered the course completion would skip the practice.
//
// A student who left during the wait stays where they went — except on the
// course-completed screen: the read that discovered the completion was the
// only one that will ever report it.
async function finish(to: RouteLocationRaw, { awaitProgress = false } = {}): Promise<void> {
  if (finishing.value) return
  finishing.value = true
  try {
    await complete()
    const outcome = awaitProgress ? await waitForCompletion(nodeId.value) : null
    if (outcome?.kind === 'course-completed') {
      await router.replace({ name: 'course-completed', params: { enrollmentId: outcome.enrollmentId } })
    } else if (!left) {
      await router.push(to)
    }
  } finally {
    finishing.value = false
  }
}
</script>

<template>
  <!-- The page shell's own py-8 top padding is 4rem — sized for desktop; on a
       short viewport the video is the whole point of this screen, so pull the
       content up toward the header instead of losing height to it (leaves
       1rem, not the shell's usual 4rem). The title is also given noticeably
       less room than the shell's other pages use, so a long one can't push
       the video halfway down the screen. "Short" means either dimension —
       a narrow phone, or a phone rotated to landscape, is short on height
       even though it's plenty wide. -->
  <section data-test="node" class="flex flex-col gap-4" :class="isShortViewport && '-mt-7'">
    <RouterLink
      v-if="lesson.state.value !== 'locked'"
      :to="{ name: 'path' }"
      data-test="back-to-path"
      class="text-sm text-ink-muted"
    >
      {{ t('nodeView.backToPath') }}
    </RouterLink>

    <h1 class="font-semibold text-accent-text" :class="isShortViewport ? 'text-lg' : 'text-2xl'">
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
          ref="player"
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
          @click="finish({ name: 'path' }, { awaitProgress: true })"
        >
          {{ t('nodeView.markComplete') }}
        </PrimaryButton>
      </div>
    </template>

    <!-- On a screen short in height (a phone in landscape) the video fills
         the height, so its control bar —
         fullscreen button last, in the corner — sits where the floating
         button would; the button floats higher there to leave it reachable. -->
    <div v-if="openSongChartId" data-test="song-chart-overlay" class="fixed inset-0 z-50 overflow-y-auto bg-surface">
      <SongChartScreen :song-chart-id="openSongChartId" @close="openSongChartId = null" />
    </div>

    <SendToTeacher
      v-if="canAskTeacher"
      :reference="lessonReference(nodeId)"
      :path-title="lesson.pathTitle.value"
      :lesson-title="lesson.node.value?.title"
      :raised="isShortHeight"
    />
  </section>
</template>
