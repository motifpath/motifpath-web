<script setup lang="ts">
/**
 * One song chart's editor, for a new chart or an existing one: its details, its lyrics and
 * chords, and everything done to it from here (importing and exporting ChordPro, confirming the
 * rights, publishing, withdrawing, its revisions). A new chart exists once it's first saved, and
 * leaving with unsaved changes asks first.
 */
import { Download, Eye, FileUp, Save, Send, Undo2 } from 'lucide-vue-next'
import { computed, ref, toRef } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import SongChartLyricsEditor from '@/features/admin/components/songChartEditor/SongChartLyricsEditor.vue'
import { useSongChartEditor } from '@/features/admin/composables/useSongChartEditor'
import AppBar from '@/shared/components/AppBar.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import LanguageSelect from '@/shared/components/LanguageSelect.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useTypedT } from '@/shared/composables/useTypedT'
import { downloadText, fileSlug } from '@/shared/utils/downloadText'
import { formatDate } from '@/shared/utils/formatDate'

const props = withDefaults(defineProps<{ songChartId?: string | null }>(), { songChartId: null })

const { t, locale } = useTypedT()
const date = (iso: string) => formatDate(iso, locale.value)
const { isCompact } = useIsCompact()
const router = useRouter()
const editor = useSongChartEditor(toRef(props, 'songChartId'))
const { chart, details, body, revisions, isDirty, isLoading, isBusy, loadError, notFound, fieldErrors, importWarnings, importError, publishRefusal } =
  editor

const statusText = computed(() => {
  const c = chart.value
  if (!c) return t('songChartList.status.draft')
  if (c.status === 'published' && c.published_revision) return t('songChartList.publishedAt', { revision: c.published_revision.revision_number })
  return t(`songChartList.status.${c.status}`)
})

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

const inputClass = 'rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-ink'
const actionClass = 'flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[0.8125rem] font-semibold text-ink disabled:opacity-50'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar context="teacher" :compact="isCompact" :primary-nav-to="{ name: 'admin-song-charts' }" />

    <div class="flex flex-1 flex-col gap-6 px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
      <LoadingSkeleton v-if="isLoading" />
      <StateBlock v-else-if="notFound" kind="notFound" :title="t('songChartPreview.notFoundHeading')" :message="t('songChartPreview.notFoundMessage')" />
      <LoadFailed v-else-if="loadError" :message="t('songChartPreview.loadFailed')" @retry="editor.load" />

      <template v-else>
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col">
            <h1 class="text-lg font-bold text-ink sm:text-xl">{{ details.title || t('songChartEditorView.untitled') }}</h1>
            <p data-test="status" class="text-sm text-ink-muted">
              {{ statusText }}<span v-if="isDirty"> · {{ t('songChartEditorView.unsaved') }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-test="import" :class="actionClass" @click="openImport">
              <FileUp :size="14" aria-hidden="true" />{{ t('songChartEditorView.import') }}
            </button>
            <template v-if="chart">
              <button type="button" data-test="export" :class="actionClass" @click="exportChordPro">
                <Download :size="14" aria-hidden="true" />{{ t('songChartEditorView.export') }}
              </button>
              <RouterLink data-test="preview" :to="{ name: 'admin-song-chart-preview', params: { songChartId: chart.song_chart_id } }" :class="actionClass">
                <Eye :size="14" aria-hidden="true" />{{ t('songChartEditorView.preview') }}
              </RouterLink>
              <button v-if="chart.status === 'published'" type="button" data-test="withdraw" :class="actionClass" @click="withdrawOpen = true">
                <Undo2 :size="14" aria-hidden="true" />{{ t('songChartEditorView.withdraw') }}
              </button>
              <button type="button" data-test="publish" :class="actionClass" :disabled="isBusy" @click="editor.publish">
                <Send :size="14" aria-hidden="true" />{{ t('songChartEditorView.publish') }}
              </button>
            </template>
            <button
              type="button"
              data-test="save"
              class="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[0.8125rem] font-semibold text-accent-fg disabled:opacity-50"
              :disabled="isBusy"
              @click="save"
            >
              <Save :size="14" aria-hidden="true" />{{ t('songChartEditorView.save') }}
            </button>
          </div>
        </header>

        <section v-if="publishRefusal" data-test="publish-refusal" class="rounded-md border border-danger bg-danger-muted px-4 py-3 text-sm text-ink">
          <p class="font-semibold">{{ t('songChartEditorView.refused') }}</p>
          <ul class="list-disc pl-5">
            <li v-for="reason in publishRefusal.reasons" :key="reason" data-test="refusal-reason">{{ t(`songChartEditorView.refusal.${reason}`) }}</li>
          </ul>
          <p v-if="publishRefusal.anchor_warnings.length" class="mt-1">
            {{ publishRefusal.anchor_warnings.map((w) => w.written_symbol).join(', ') }}
          </p>
        </section>

        <section v-if="chart?.withdrawal" data-test="withdrawal" class="rounded-md bg-surface-sunken px-4 py-3 text-sm text-ink-muted">
          {{ t('songChartEditorView.withdrawnBy', { name: chart.withdrawal.withdrawn_by.display_name, date: date(chart.withdrawal.withdrawn_at), reason: chart.withdrawal.reason }) }}
        </section>

        <section class="grid gap-4 sm:grid-cols-2" :aria-label="t('songChartEditorView.details')">
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
              <input
                :value="details.concertKey ?? ''"
                data-test="concert-key"
                type="text"
                maxlength="3"
                :class="inputClass"
                @input="onKeyInput"
              />
            </label>
            <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              {{ t('songChartEditorView.capo') }}
              <input v-model.number="details.capoFret" data-test="capo" type="number" min="0" max="12" :class="inputClass" />
            </label>
            <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              {{ t('songChartEditorView.tempo') }}
              <input
                :value="details.tempoBpm ?? ''"
                data-test="tempo"
                type="number"
                min="20"
                max="300"
                :class="inputClass"
                @input="onTempoInput"
              />
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

        <section class="flex flex-col gap-2">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-ink-muted">{{ t('songChartEditor.lyricsLabel') }}</h2>
          <SongChartLyricsEditor v-model="body" />
          <span v-if="fieldErrors.body" data-test="error-body" class="text-xs text-danger">{{ t('songChartEditorView.lyricsNeeded') }}</span>
        </section>

        <section v-if="importWarnings.length" data-test="import-warnings" class="flex flex-col gap-1 text-sm text-ink-muted">
          <h2 class="font-semibold text-ink">{{ t('songChartEditorView.skipped') }}</h2>
          <p v-for="w in importWarnings" :key="`${w.line}-${w.kind}`">
            {{ t('songChartEditorView.skippedLine', { line: w.line }) }} <code class="text-ink">{{ w.text }}</code> — {{ t(`songChartEditorView.importWarning.${w.kind}`) }}
          </p>
        </section>

        <section v-if="chart?.draft.warnings.length" class="flex flex-col gap-1 text-sm">
          <h2 class="font-semibold text-ink">{{ t('songChartEditorView.chordWarnings') }}</h2>
          <p
            v-for="w in chart.draft.warnings"
            :key="w.anchor_id"
            data-test="chord-warning"
            :data-blocks="String(w.blocks_publication)"
            :class="w.blocks_publication ? 'text-danger' : 'text-ink-muted'"
          >
            <strong>{{ w.written_symbol }}</strong> — {{ t(`songChartEditorView.chordWarning.${w.warning}`) }}
            <span v-if="w.blocks_publication">({{ t('songChartEditorView.blocksPublishing') }})</span>
          </p>
        </section>

        <section class="flex flex-col gap-1 text-sm">
          <label class="flex items-center gap-2 font-semibold text-ink">
            <input v-model="details.rightsConfirmed" data-test="rights-confirmed" type="checkbox" />
            {{ t('songChartEditorView.rightsConfirmed') }}
          </label>
          <p v-if="chart?.draft.rights_confirmation" data-test="rights-confirmation" class="text-ink-muted">
            {{ t('songChartEditorView.rightsConfirmedBy', { name: chart.draft.rights_confirmation.confirmed_by.display_name, date: date(chart.draft.rights_confirmation.confirmed_at) }) }}
          </p>
        </section>

        <section v-if="revisions.length" class="flex flex-col gap-1 text-sm">
          <h2 class="font-semibold text-ink">{{ t('songChartEditorView.revisions') }}</h2>
          <p v-for="r in revisions" :key="r.revision_number" data-test="revision" :data-revision="r.revision_number" class="text-ink-muted">
            {{ t('songChartEditorView.revision', { revision: r.revision_number, name: r.published_by.display_name, date: date(r.published_at) }) }}
          </p>
        </section>
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
</template>
