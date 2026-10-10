<script setup lang="ts">
import { computed, defineAsyncComponent, h, onBeforeUnmount, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ArticleLesson from '@/features/student/components/ArticleLesson.vue'
import CuePanel from '@/features/student/components/CuePanel.vue'
import SendToTeacher from '@/features/student/components/SendToTeacher.vue'
import { useCourseCompletionRedirect } from '@/features/student/composables/useCourseCompletionRedirect'
import { useLessonCompletionSync } from '@/features/student/composables/useLessonCompletionSync'
import { useLessonNode } from '@/features/student/composables/useLessonNode'
import { useLessonTracking } from '@/features/student/composables/useLessonTracking'
import { useStepWording } from '@/features/student/composables/useStepWording'
import { activeCue } from '@/features/student/utils/activeCue'
import { stepAfter, type MyPathStep } from '@/features/student/utils/myPath'
import { lessonReference } from '@/features/student/utils/conciergeLink'
import { Check } from 'lucide-vue-next'

import AppButton from '@/shared/components/AppButton.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import NextStepCard from '@/shared/components/NextStepCard.vue'
import PageBackBar from '@/shared/components/PageBackBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import SongChartScreen from '@/shared/components/songChart/SongChartScreen.vue'
import { SONG_CHART_OPENER } from '@/shared/components/songChart/songChartOpener'
import { useMediaQuery } from '@/shared/composables/useMediaQuery'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()

// Short in height only (a phone in landscape): there the video fills the screen top to bottom.
const { matches: isShortHeight } = useMediaQuery('(max-height: 500px)')

// Vue Router types a param as `string | string[]` (array only for a
// repeatable segment, which `:nodeId` isn't) — narrow instead of asserting.
// A computed, so a route change that reuses this component (same route
// record, new :nodeId) still reloads the lesson.
const nodeId = computed(() => {
  const raw = route.params.nodeId
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})

// A language-locked step opened from My path names the language the student chose to open it in.
const language = computed(() => {
  const raw = route.query.language
  return typeof raw === 'string' ? raw : undefined
})

const lesson = useLessonNode(nodeId, { language: () => language.value })
useCourseCompletionRedirect(lesson.completedCourseEnrollmentId)
const { complete } = useLessonTracking(lesson)
const wording = useStepWording()

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

/**
 * Where the lesson is after its video ends. `practise`: the lesson has a challenge, which finishes
 * the step. `saving`: the step is done and its completion is being recorded, so the next step has
 * opened by the time the student taps it. `done`: the next step is one tap away.
 */
type HandOff = 'none' | 'practise' | 'saving' | 'done'
const handOff = ref<HandOff>('none')

// Completion is final (there is no event to un-complete a step), so
// reopening a completed lesson is for reference only: the video plays like
// any other lesson's, but nothing here is ever reported again.
const isReview = computed(() => lesson.status.value === 'completed')
const isArticle = computed(() => lesson.node.value?.content_type === 'article')
const articleBody = computed(() => (isArticle.value ? (lesson.node.value?.rich_content ?? null) : null))
const cue = computed(() => activeCue(lesson.cues.value, playbackSeconds.value))
const mediaUrl = computed(() => lesson.node.value?.media_url ?? '')
// Any lesson the student may open can be asked about — including one whose
// video is missing or whose content type has no screen yet.
const canAskTeacher = computed(() => ['ready', 'no-media'].includes(lesson.state.value))

const stepMeta = computed(() => {
  const step = lesson.step.value
  if (!step) return null
  const values = { position: step.position, total: lesson.total.value, kind: wording.kindLabel(step) }
  return isReview.value ? t('nodeView.stepMetaDone', values) : t('nodeView.stepMeta', values)
})

/**
 * A step locked behind an earlier one opens from the step the student can do now. Going there never
 * picks a language: a language-locked step explains itself and lets the student choose.
 */
const lockedContent = computed(() => {
  const current = lesson.current.value
  return current
    ? {
        message: t('nodeView.locked.message', { position: current.position, title: current.title }),
        action: { label: t('nodeView.locked.action', { position: current.position }), to: { name: 'node', params: { nodeId: current.contentNodeId } } },
      }
    : { message: t('nodeView.locked.messageNoCurrent'), action: { label: t('nodeView.locked.actionNoCurrent'), to: { name: 'path' } } }
})

/** A language-locked step opens in a language it has, chosen here rather than assumed. */
const languageContent = computed(() => {
  const step = lesson.step.value
  if (!step) return null
  return {
    title: t('pathView.language.title', { ownLanguage: wording.ownLanguage() }),
    message: t(`pathView.language.message.${step.kind}`, { language: wording.language(step)?.name ?? '' }),
    action: wording.startAction(step),
  }
})

/**
 * The step after this one, as its card offers it: read from the path re-read once this step was
 * recorded, which knows what it opened (a step only in another language, say). Without that read,
 * the path the lesson loaded with, where that step still waits behind this one and is offered as the
 * lesson it now is.
 */
const recordedNext = ref<MyPathStep | null>(null)
const handOffNext = computed(() => recordedNext.value ?? lesson.next.value)
const nextAction = computed(() => (handOffNext.value ? wording.startAction(handOffNext.value) : null))

// The practice actions sit in a bar at the foot of the screen, where the floating ask-your-teacher
// button would otherwise cover them.
// An article has none: its actions sit at the end of the text, where reading leads.
const showsActionBar = computed(
  () =>
    !isArticle.value &&
    ((isReview.value && lesson.hasChallenge.value) || (handOff.value === 'practise' && !playbackFailed.value)),
)

/** What Mark as done says it will do: mark this step done and, when there is one, open the next. */
const markAsDoneHint = computed(() => {
  const position = lesson.step.value?.position
  if (position === undefined) return null
  const next = lesson.next.value
  return next
    ? t('nodeView.articleEnd.marksDoneAndOpens', { position, next: next.position })
    : t('nodeView.articleEnd.marksDone', { position })
})

// Bumped on every fresh viewing, so a completion still being recorded for an earlier one
// doesn't hand off from a lesson the student has since moved on from.
let viewing = 0

function resetPlayback(): void {
  viewing += 1
  playbackSeconds.value = 0
  playbackFailed.value = false
  handOff.value = 'none'
  recordedNext.value = null
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
  playbackFailed.value = false
  playerKey.value += 1
}

const { waitForCompletion } = useLessonCompletionSync()

// Set once the student has navigated away, so a completion still being
// recorded doesn't change a screen they have left.
let left = false
onBeforeUnmount(() => {
  left = true
})

/**
 * The end of the video is the end of the lesson: it is reported once, and the screen hands off.
 * With a challenge, practice finishes the step. Without one, the step is done: the completion is
 * recorded before the next step is offered, so that step has opened by the time the student taps
 * it — and a lesson that finished the course goes straight to the course-completed screen, even
 * if the student left meanwhile, since the read that discovered it is the only one that will ever
 * report it.
 */
async function onEnded(): Promise<void> {
  if (isReview.value || handOff.value !== 'none') return
  const myViewing = viewing
  const hasChallenge = lesson.hasChallenge.value
  handOff.value = hasChallenge ? 'practise' : 'saving'

  await complete()
  if (hasChallenge || myViewing !== viewing) return

  const outcome = await waitForCompletion(nodeId.value)
  if (outcome.kind === 'course-completed') {
    await router.replace({ name: 'course-completed', params: { enrollmentId: outcome.enrollmentId } })
  } else if (!left && myViewing === viewing) {
    if (outcome.kind === 'recorded' && outcome.view) recordedNext.value = stepAfter(outcome.view, nodeId.value)
    handOff.value = 'done'
  }
}

/**
 * Mark as done at the end of an article: the completion is recorded before the next step opens, so
 * that step has opened by the time the student lands on it. The next step is the one the path has
 * once this step is recorded, opened without choosing a language, so a step only in another
 * language explains itself. After the last step, or when no path is left, it goes to My path; a
 * lesson that finished the course goes to the course-completed screen, even if the student left.
 */
async function markAsDone(): Promise<void> {
  if (isReview.value || handOff.value !== 'none') return
  const myViewing = viewing
  handOff.value = 'saving'

  await complete()
  if (myViewing !== viewing) return

  const outcome = await waitForCompletion(nodeId.value)
  if (outcome.kind === 'course-completed') {
    await router.replace({ name: 'course-completed', params: { enrollmentId: outcome.enrollmentId } })
    return
  }
  if (left || myViewing !== viewing) return
  const next =
    outcome.kind === 'recorded' ? (outcome.view ? stepAfter(outcome.view, nodeId.value) : null) : lesson.next.value
  await router.push(next ? { name: 'node', params: { nodeId: next.contentNodeId } } : { name: 'path' })
}

/** Practise this at the end of an article: the reading is reported, and the challenge finishes the step. */
async function practiseArticle(): Promise<void> {
  if (isReview.value || handOff.value !== 'none') return
  handOff.value = 'saving'
  await complete()
  if (!left) await router.push({ name: 'practice', params: { nodeId: nodeId.value } })
}
</script>

<template>
  <!-- A page pushed onto My path: its back bar takes the top of the screen, so the page pulls up
       over the shell's top padding. -->
  <section data-test="node" class="-mt-5 flex flex-col gap-4 sm:-mt-8">
    <PageBackBar
      :title="lesson.pathTitle.value ?? t('nav.myPath')"
      :to="{ name: 'path' }"
      :back-label="t('nodeView.backToMyPath')"
    />

    <template v-if="lesson.state.value === 'loading'">
      <h1 class="sr-only">{{ t('nodeView.heading') }}</h1>
      <LoadingSkeleton data-test="loading" :shape="lesson.step.value?.kind === 'article' ? 'lines' : 'video'" />
    </template>

    <template v-else-if="lesson.state.value === 'error'">
      <h1 class="sr-only">{{ t('nodeView.heading') }}</h1>
      <LoadFailed data-test="error" :message="t('nodeView.errorMessage')" @retry="lesson.retry()" />
    </template>

    <template v-else-if="lesson.state.value === 'locked'">
      <h1 class="sr-only">{{ t('nodeView.heading') }}</h1>
      <StateBlock data-test="locked" kind="locked" :title="t('nodeView.locked.title')" :message="lockedContent.message">
        <template #action>
          <PrimaryButton as="RouterLink" :to="lockedContent.action.to" data-test="locked-action">
            {{ lockedContent.action.label }}
          </PrimaryButton>
        </template>
      </StateBlock>
    </template>

    <template v-else-if="lesson.state.value === 'language-locked'">
      <h1 class="sr-only">{{ t('nodeView.heading') }}</h1>
      <StateBlock
        v-if="languageContent"
        data-test="language-locked"
        kind="language"
        :title="languageContent.title"
        :message="languageContent.message"
      >
        <template #action>
          <PrimaryButton as="RouterLink" :to="languageContent.action.to" data-test="language-action">
            {{ languageContent.action.label }}
          </PrimaryButton>
        </template>
      </StateBlock>
    </template>

    <template v-else-if="lesson.state.value === 'not-found'">
      <h1 class="sr-only">{{ t('nodeView.heading') }}</h1>
      <StateBlock data-test="not-found" kind="notFound" :title="t('nodeView.notFound.title')" :message="t('nodeView.notFound.message')">
        <template #action>
          <PrimaryButton as="RouterLink" :to="{ name: 'path' }" data-test="not-found-action">
            {{ t('nodeView.notFound.action') }}
          </PrimaryButton>
        </template>
      </StateBlock>
    </template>

    <!-- One reading column, as wide as a tablet's, on every screen from a tablet up: the cue sits
         under the video at the video's width. A phone turned sideways keeps the whole width, as
         the video fills its height with the cue beside it. -->
    <div
      v-else
      data-test="lesson-layout"
      class="flex flex-col gap-4"
      :class="isShortHeight ? null : ['mx-auto w-full', isArticle ? 'max-w-[35rem]' : 'max-w-[38.75rem]']"
    >
      <template v-if="lesson.state.value === 'ready' && !isArticle">
        <!-- A playback failure says so where the video was, but does not unmount the player below
             it (v-show, not v-if): the video engine still needs a fresh provider on retry, but the
             player itself, and the aside slot the cue's aria-live region lives in, must stay
             mounted throughout — an announcement region that's removed and re-added is typically
             read as silent by a screen reader. -->
        <LoadFailed
          v-if="playbackFailed"
          data-test="playback-error"
          :message="t('nodeView.playbackError')"
          @retry="retryPlayback()"
        />

        <!-- The cue lives inside LessonPlayer's aside slot (not beside it as a
             separate element) so it is still shown when the player goes
             fullscreen — the Fullscreen API only renders an element's own
             descendants. Beside the video on a phone turned sideways and in
             fullscreen, stacked below it otherwise.

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
            @ended="onEnded()"
            @error="playbackFailed = true"
          >
            <template v-if="lesson.cues.value.length > 0" #aside>
              <div data-test="cue-region" aria-live="polite" class="empty:hidden">
                <CuePanel v-if="cue" :cue="cue" />
              </div>
            </template>
          </LessonPlayer>
        </div>
      </template>

      <!-- The title block: no length — the player shows the time once it loads. -->
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold text-ink">{{ lesson.node.value?.title ?? t('nodeView.heading') }}</h1>
        <p v-if="stepMeta" data-test="step-meta" class="text-xs text-ink-muted">{{ stepMeta }}</p>
      </div>

      <LoadFailed
        v-if="lesson.state.value === 'no-media'"
        :data-test="isArticle ? 'no-text' : 'no-video'"
        :message="isArticle ? t('nodeView.noText') : t('nodeView.noVideo')"
        @retry="lesson.retry()"
      />

      <template v-else-if="articleBody">
        <ArticleLesson :document="articleBody" :cues="lesson.cues.value" />

        <!-- The hand-off sits at the end of the text, where reading leads, never in a bar. -->
        <div
          v-if="!isReview || lesson.hasChallenge.value"
          data-test="article-end"
          class="flex max-w-prose flex-col gap-3 border-t border-border pt-4"
        >
          <AppButton
            v-if="isReview"
            variant="secondary"
            :to="{ name: 'practice', params: { nodeId } }"
            data-test="practise-again"
            block
          >
            {{ t('nodeView.practiseAgain') }}
          </AppButton>
          <template v-else>
            <p class="text-base font-semibold text-ink">{{ t('nodeView.articleEnd.title') }}</p>
            <AppButton
              :data-test="lesson.hasChallenge.value ? 'practise-this' : 'mark-as-done'"
              :busy="handOff === 'saving'"
              block
              @click="lesson.hasChallenge.value ? practiseArticle() : markAsDone()"
            >
              {{ lesson.hasChallenge.value ? t('nodeView.practiseThis') : t('nodeView.articleEnd.markAsDone') }}
            </AppButton>
            <p v-if="lesson.hasChallenge.value" class="text-xs text-ink-muted">{{ t('nodeView.tryIt.messageArticle') }}</p>
            <p v-else-if="markAsDoneHint" class="text-xs text-ink-muted">{{ markAsDoneHint }}</p>
            <!-- Mounted from the start, so the saving is announced; the busy button already shows it. -->
            <p data-test="hand-off-status" role="status" class="sr-only">
              <template v-if="handOff === 'saving'">{{ t('nodeView.savingProgress') }}</template>
            </p>
          </template>
        </div>
      </template>

      <template v-else-if="!playbackFailed">
        <div v-if="handOff === 'practise'" data-test="try-it" class="flex flex-col gap-1 rounded-lg bg-accent-muted px-4 py-3">
          <p class="text-sm font-semibold text-ink">{{ t('nodeView.tryIt.title') }}</p>
          <p class="text-sm text-ink-muted">{{ t('nodeView.tryIt.message') }}</p>
        </div>

        <!-- One live region, mounted from the start and only its text swapped: a region that is
             added already holding its message is typically read as silent. Until there is
             something to say it stays in the accessibility tree but takes no room. -->
        <p
          v-if="handOff !== 'practise'"
          data-test="hand-off-status"
          role="status"
          class="flex items-center gap-2"
          :class="{
            'sr-only': handOff === 'none',
            'text-sm text-ink-muted': handOff === 'saving',
            'text-base font-semibold text-success': handOff === 'done',
          }"
        >
          <span v-if="handOff === 'saving'" data-test="saving-progress">{{ t('nodeView.savingProgress') }}</span>
          <template v-else-if="handOff === 'done'">
            <Check :size="20" aria-hidden="true" /><span data-test="step-done">{{ t('nodeView.stepDone') }}</span>
          </template>
        </p>

        <div v-if="handOff === 'done'" class="flex flex-col gap-4">
          <NextStepCard
            v-if="handOffNext && nextAction"
            :eyebrow="t('pathView.upNext', { position: handOffNext.position, total: lesson.total.value })"
            :title="handOffNext.title"
            :kind="handOffNext.kind"
            :kind-label="wording.kindLabel(handOffNext)"
            :action-label="nextAction.label"
            :to="nextAction.to"
          />
          <AppButton variant="tertiary" :to="{ name: 'path' }" data-test="back-to-my-path" block>
            {{ t('nodeView.backToMyPath') }}
          </AppButton>
        </div>
      </template>

      <!-- The practice action sits in the thumb zone at the foot of the screen. -->
      <div
        v-if="showsActionBar"
        class="sticky bottom-0 -mx-4 border-t border-border bg-surface px-4 pt-3 pb-safe"
      >
        <PrimaryButton
          v-if="!isReview"
          as="RouterLink"
          :to="{ name: 'practice', params: { nodeId } }"
          data-test="practise-this"
          class="w-full"
        >
          {{ t('nodeView.practiseThis') }}
        </PrimaryButton>
        <AppButton
          v-else
          variant="secondary"
          :to="{ name: 'practice', params: { nodeId } }"
          data-test="practise-again"
          block
        >
          {{ t('nodeView.practiseAgain') }}
        </AppButton>
      </div>
    </div>

    <div v-if="openSongChartId" data-test="song-chart-overlay" class="fixed inset-0 z-50 overflow-y-auto bg-surface">
      <SongChartScreen :song-chart-id="openSongChartId" @close="openSongChartId = null" />
    </div>

    <!-- Floats higher, clear of the practice bar, and on a screen short in height (a phone in
         landscape), where the video's own control bar sits in its corner. -->
    <SendToTeacher
      v-if="canAskTeacher"
      :reference="lessonReference(nodeId)"
      :path-title="lesson.pathTitle.value"
      :lesson-title="lesson.node.value?.title"
      :raised="isShortHeight || showsActionBar"
    />
  </section>
</template>
