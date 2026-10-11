<script setup lang="ts">
/**
 * One song chart's editor, for a new chart or an existing one: its details, its lyrics and
 * chords, and everything done to it from here (importing and exporting ChordPro, confirming the
 * rights, publishing, withdrawing, its revisions). A new chart exists once it's first saved, and
 * leaving with unsaved changes asks first.
 */
import { ChevronRight, Download, Eye, FileUp } from 'lucide-vue-next'
import { computed, ref, toRef, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import SongChartLyricsEditor from '@/features/admin/components/songChartEditor/SongChartLyricsEditor.vue'
import SongChartStatusPanel from '@/features/admin/components/songChartEditor/SongChartStatusPanel.vue'
import { publishBlockers } from '@/features/admin/utils/publishBlockers'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import { useChordLookup } from '@/shared/composables/useChordLookup'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { lineSegments } from '@/shared/utils/songChartReading'
import { useSongChartEditor } from '@/features/admin/composables/useSongChartEditor'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import LanguageSelect from '@/shared/components/LanguageSelect.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { downloadText, fileSlug } from '@/shared/utils/downloadText'
import { formatDate } from '@/shared/utils/formatDate'
import TeachShell from '@/shared/components/TeachShell.vue'

const props = withDefaults(defineProps<{ songChartId?: string | null }>(), { songChartId: null })

const { t, locale } = useTypedT()
const date = (iso: string) => formatDate(iso, locale.value)
const router = useRouter()
const editor = useSongChartEditor(toRef(props, 'songChartId'))
const { chart, details, body, revisions, isDirty, isLoading, isBusy, loadError, notFound, fieldErrors, importWarnings, importError, publishRefusal } =
  editor

const { sizeClass } = useSizeClass()
/** On a phone the editor is the maintenance tier: status, details and rights work; chords wait. */
const compact = computed(() => sizeClass.value === 'compact')

// Every chord in the lyrics is checked, so the status can list the ones that stop publishing,
// whether or not the lyrics editor is on screen.
const { lookUp, checkOf } = useChordLookup()
const writtenSymbols = computed(() =>
  body.value.content.flatMap((s) => s.content.flatMap((line) => (line.type === 'lyricLine' ? line.content.flatMap((r) => (r.marks ?? []).map((m) => m.attrs.writtenSymbol)) : []))),
)
watch(writtenSymbols, (symbols) => new Set(symbols).forEach(lookUp), { immediate: true })
const blockers = computed(() => publishBlockers(body.value, details.rightsConfirmed, checkOf))

/** An emptied optional field is not set, rather than set to nothing. */
function inputValue(event: Event): string | null {
  return event.target instanceof HTMLInputElement && event.target.value !== '' ? event.target.value : null
}

function onKeyInput(event: Event) {
  details.concertKey = inputValue(event)
}

function onTempoInput(event: Event) {
  const value = inputValue(event)
  details.tempoBpm = value === null ? null : Number(value)
}

async function save() {
  const wasNew = !chart.value
  if ((await editor.save()) === 'saved' && wasNew && chart.value) {
    await router.replace({ name: 'admin-song-chart', params: { songChartId: chart.value.song_chart_id } })
  }
}

// ── Importing and exporting ChordPro ─────────────────────────────────────────

const importOpen = ref(false)
const importText = ref('')
const confirmingReplace = ref(false)

function openImport() {
  importText.value = ''
  importError.value = null
  importOpen.value = true
}

function readImport() {
  if (body.value.content.length > 0) {
    confirmingReplace.value = true
    return
  }
  void runImport()
}

async function runImport() {
  confirmingReplace.value = false
  if ((await editor.readChordPro(importText.value)) === 'read') importOpen.value = false
}

async function exportChordPro() {
  const text = await editor.exportChordPro()
  if (text !== null) downloadText(`${fileSlug(details.title)}.cho`, text)
}

// ── Publishing and withdrawing ───────────────────────────────────────────────

const withdrawOpen = ref(false)
const withdrawReason = ref('')

async function withdraw() {
  if ((await editor.withdraw(withdrawReason.value.trim())) === 'withdrawn') withdrawOpen.value = false
}

// ── Leaving ──────────────────────────────────────────────────────────────────

const leaving = ref<((leave: boolean) => void) | null>(null)

onBeforeRouteLeave((to) => {
  // Saving a new chart moves to its own address; nothing is lost.
  if (!isDirty.value || (to.name === 'admin-song-chart' && !props.songChartId)) return true
  return new Promise<boolean>((resolve) => {
    leaving.value = (leave) => {
      leaving.value = null
      resolve(leave)
    }
  })
})

const inputClass = 'h-12 rounded-xl border border-border bg-surface-sunken px-3 text-base text-ink'
const actionClass = 'flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50'
const cardClass = 'flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4'
const eyebrowClass = 'text-xs font-semibold uppercase tracking-wider text-ink-muted'
</script>

<template>
  <TeachShell section="admin-song-charts" bar="none">
  <div class="flex flex-1 flex-col bg-surface">
    <div class="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-4 px-4 pb-20 pt-4 lg:px-10 lg:pt-8">
      <LoadingSkeleton v-if="isLoading" />
      <StateBlock v-else-if="notFound" kind="notFound" :title="t('songChartPreview.notFoundHeading')" :message="t('songChartPreview.notFoundMessage')" />
      <LoadFailed v-else-if="loadError" :message="t('songChartPreview.loadFailed')" @retry="editor.load" />

      <template v-else>
        <header class="flex items-end gap-3">
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <RouterLink :to="{ name: 'admin-song-charts' }" class="flex items-center gap-1 self-start text-sm font-medium text-accent-text hover:underline">
              {{ t('songChartList.heading') }}<ChevronRight :size="14" aria-hidden="true" />
            </RouterLink>
            <h1 class="truncate text-[28px] font-bold leading-[34px] text-ink">{{ details.title || t('songChartEditorView.untitled') }}</h1>
            <p v-if="isDirty" data-test="unsaved" class="text-xs text-ink-muted">{{ t('songChartEditorView.unsaved') }}</p>
          </div>
          <button type="button" data-test="save" class="h-12 shrink-0 rounded-full bg-accent px-6 text-base font-semibold text-accent-fg disabled:opacity-50" :disabled="isBusy" @click="save">
            {{ t('songChartEditorView.save') }}
          </button>
        </header>

        <section v-if="publishRefusal" data-test="publish-refusal" class="rounded-2xl border border-danger bg-danger-muted px-4 py-3 text-sm text-ink">
          <p class="font-semibold">{{ t('songChartEditorView.refused') }}</p>
          <ul class="list-disc pl-5">
            <li v-for="reason in publishRefusal.reasons" :key="reason" data-test="refusal-reason">{{ t(`songChartEditorView.refusal.${reason}`) }}</li>
          </ul>
          <p v-if="publishRefusal.anchor_warnings.length" class="mt-1">
            {{ publishRefusal.anchor_warnings.map((w) => w.written_symbol).join(', ') }}
          </p>
        </section>

        <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <!-- The side column comes first on a phone: status, then what to do. -->
          <aside class="flex flex-col gap-3 lg:order-2">
            <SongChartStatusPanel :chart="chart" :blockers="blockers" :busy="isBusy" @publish="editor.publish" @withdraw="withdrawOpen = true" />

            <section :class="cardClass">
              <label class="flex items-start gap-3 text-sm text-ink">
                <input v-model="details.rightsConfirmed" data-test="rights-confirmed" type="checkbox" class="mt-0.5 size-5 shrink-0 accent-accent" />
                {{ t('songChartEditorView.rightsConfirmed') }}
              </label>
              <p v-if="chart?.draft.rights_confirmation" data-test="rights-confirmation" class="text-xs text-ink-muted">
                {{ t('songChartEditorView.rightsConfirmedBy', { name: chart.draft.rights_confirmation.confirmed_by.display_name, date: date(chart.draft.rights_confirmation.confirmed_at) }) }}
              </p>
              <p v-else class="text-xs text-ink-muted">{{ t('songChartEditorView.rightsNote') }}</p>
            </section>

            <RouterLink
              v-if="chart"
              data-test="preview"
              :to="{ name: 'admin-song-chart-preview', params: { songChartId: chart.song_chart_id } }"
              class="flex h-10 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-accent-text hover:underline"
            >
              <Eye :size="18" aria-hidden="true" />{{ t('songChartEditorView.preview') }}
            </RouterLink>

            <section :class="cardClass">
              <h2 :class="eyebrowClass">{{ t('songChartEditorView.revisions') }}</h2>
              <p v-if="revisions.length === 0" class="text-sm text-ink-muted">{{ t('songChartEditorView.noRevisions') }}</p>
              <p v-for="r in revisions" :key="r.revision_number" data-test="revision" :data-revision="r.revision_number" class="text-sm text-ink">
                {{ t('songChartEditorView.revision', { revision: r.revision_number, name: r.published_by.display_name, date: date(r.published_at) }) }}
              </p>
            </section>

            <section :class="cardClass">
              <h2 :class="eyebrowClass">ChordPro</h2>
              <div class="flex flex-wrap gap-2">
                <button type="button" data-test="import" :class="actionClass" @click="openImport">
                  <FileUp :size="18" aria-hidden="true" />{{ t('songChartEditorView.import') }}
                </button>
                <button v-if="chart" type="button" data-test="export" :class="actionClass" @click="exportChordPro">
                  <Download :size="18" aria-hidden="true" />{{ t('songChartEditorView.export') }}
                </button>
              </div>
            </section>
          </aside>

          <div class="flex min-w-0 flex-col gap-4 lg:order-1">
            <section :class="cardClass" class="sm:grid sm:grid-cols-2 sm:gap-4" :aria-label="t('songChartEditorView.details')">
              <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                {{ t('songChartEditorView.title') }}
                <input v-model="details.title" data-test="title" type="text" maxlength="200" :class="inputClass" />
                <span v-if="fieldErrors.title" data-test="error-title" class="text-xs text-danger">{{ t('songChartEditorView.needed') }}</span>
              </label>
              <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                {{ t('songChartEditorView.artist') }}
                <input v-model="details.artist" data-test="artist" type="text" maxlength="200" :class="inputClass" />
                <span v-if="fieldErrors.artist" data-test="error-artist" class="text-xs text-danger">{{ t('songChartEditorView.needed') }}</span>
              </label>
              <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                {{ t('songChartEditorView.language') }}
                <LanguageSelect
                  :model-value="details.language || null"
                  data-test="language"
                  :empty-label="t('songChartEditorView.chooseLanguage')"
                  @update:model-value="(code) => (details.language = code ?? '')"
                />
                <span v-if="fieldErrors.language" data-test="error-language" class="text-xs text-danger">{{ t('songChartEditorView.needed') }}</span>
              </label>
              <div class="grid grid-cols-3 gap-3">
                <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                  {{ t('songChartEditorView.key') }}
                  <input :value="details.concertKey ?? ''" data-test="concert-key" type="text" maxlength="3" :class="inputClass" @input="onKeyInput" />
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                  {{ t('songChartEditorView.capo') }}
                  <input v-model.number="details.capoFret" data-test="capo" type="number" min="0" max="12" :class="inputClass" />
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                  {{ t('songChartEditorView.tempo') }}
                  <input :value="details.tempoBpm ?? ''" data-test="tempo" type="number" min="20" max="300" :class="inputClass" @input="onTempoInput" />
                </label>
              </div>
              <p
                v-for="(reason, field) in fieldErrors"
                v-show="!['title', 'artist', 'language', 'body'].includes(String(field))"
                :key="field"
                class="text-xs text-danger sm:col-span-2"
              >
                {{ field }}: {{ reason }}
              </p>
            </section>

            <section :class="cardClass">
              <h2 class="text-base font-semibold text-ink">{{ t('songChartEditor.lyricsLabel') }}</h2>
              <template v-if="compact">
                <InlineNotice data-test="larger-screen-notice" tone="unavailable" :message="t('songChartEditorView.largerScreen')" />
                <div data-test="lyrics-read-only" class="flex flex-col gap-3">
                  <section v-for="(section, i) in body.content" :key="i" class="flex flex-col gap-1">
                    <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ section.attrs.label ?? t(`songChart.sectionKind.${section.attrs.kind}`) }}</h3>
                    <template v-for="(line, j) in section.content" :key="j">
                      <p v-if="line.type === 'comment'" class="text-sm italic text-ink-muted">{{ line.content.map((c) => c.text).join('') }}</p>
                      <p v-else class="flex flex-wrap items-end text-base text-ink">
                        <span v-for="(segment, k) in lineSegments(line)" :key="k" class="inline-flex flex-col whitespace-pre">
                          <span class="h-6 text-sm font-semibold text-accent-text">{{ segment.anchor?.writtenSymbol ?? '' }}</span>
                          <span class="leading-6">{{ segment.text }}</span>
                        </span>
                      </p>
                    </template>
                  </section>
                </div>
              </template>
              <SongChartLyricsEditor v-else v-model="body" />
              <span v-if="fieldErrors.body" data-test="error-body" class="text-xs text-danger">{{ t('songChartEditorView.lyricsNeeded') }}</span>
            </section>

            <section v-if="importWarnings.length" data-test="import-warnings" :class="cardClass" class="text-sm text-ink-muted">
              <h2 class="font-semibold text-ink">{{ t('songChartEditorView.skipped') }}</h2>
              <p v-for="w in importWarnings" :key="`${w.line}-${w.kind}`">
                {{ t('songChartEditorView.skippedLine', { line: w.line }) }} <code class="text-ink">{{ w.text }}</code> — {{ t(`songChartEditorView.importWarning.${w.kind}`) }}
              </p>
            </section>
          </div>
        </div>
      </template>
    </div>

    <ModalOverlay :open="importOpen" panel-class="flex w-[min(560px,calc(100vw-32px))] flex-col gap-3 rounded-xl bg-surface-raised p-5 shadow-level2" @close="importOpen = false">
      <h2 class="text-base font-bold text-ink">{{ t('songChartEditorView.importHeading') }}</h2>
      <p class="text-sm text-ink-muted">{{ t('songChartEditorView.importHint') }}</p>
      <textarea v-model="importText" data-test="chordpro-text" rows="12" :class="`${inputClass} font-mono`" />
      <p v-if="importError" data-test="chordpro-error" class="text-sm text-danger">{{ importError }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" :class="actionClass" @click="importOpen = false">{{ t('confirmDialog.cancel') }}</button>
        <button
          type="button"
          data-test="chordpro-read"
          class="rounded-md bg-accent px-3.5 py-1.5 text-[0.8125rem] font-semibold text-accent-fg disabled:opacity-50"
          :disabled="!importText.trim() || isBusy"
          @click="readImport"
        >
          {{ t('songChartEditorView.importAction') }}
        </button>
      </div>
    </ModalOverlay>

    <ModalOverlay :open="withdrawOpen" panel-class="flex w-[min(440px,calc(100vw-32px))] flex-col gap-3 rounded-xl bg-surface-raised p-5 shadow-level2" @close="withdrawOpen = false">
      <h2 class="text-base font-bold text-ink">{{ t('songChartEditorView.withdrawHeading') }}</h2>
      <p class="text-sm text-ink-muted">{{ t('songChartEditorView.withdrawHint') }}</p>
      <textarea v-model="withdrawReason" data-test="withdraw-reason" rows="3" maxlength="2000" :class="inputClass" />
      <div class="flex justify-end gap-2">
        <button type="button" :class="actionClass" @click="withdrawOpen = false">{{ t('confirmDialog.cancel') }}</button>
        <button
          type="button"
          data-test="withdraw-confirm"
          class="rounded-md bg-danger px-3.5 py-1.5 text-[0.8125rem] font-semibold text-danger-fg disabled:opacity-50"
          :disabled="!withdrawReason.trim() || isBusy"
          @click="withdraw"
        >
          {{ t('songChartEditorView.withdraw') }}
        </button>
      </div>
    </ModalOverlay>

    <ConfirmDialog
      :open="confirmingReplace"
      :title="t('songChartEditorView.replaceHeading')"
      :message="t('songChartEditorView.replaceMessage')"
      :confirm-label="t('songChartEditorView.replace')"
      @confirm="runImport"
      @cancel="confirmingReplace = false"
    />
    <ConfirmDialog
      :open="leaving !== null"
      :title="t('songChartEditorView.leaveHeading')"
      :message="t('songChartEditorView.leaveMessage')"
      :confirm-label="t('songChartEditorView.discard')"
      @confirm="leaving?.(true)"
      @cancel="leaving?.(false)"
    />
  </div>
  </TeachShell>
</template>
