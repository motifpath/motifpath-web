<script setup lang="ts">
/**
 * Writes a missing progression and tags the section with it at once, or with the existing one that
 * has the same numerals. A chord outside the key is fine and marked borrowed; only input that isn't
 * a chord is an error. Chart only, unless the admin turns on the drills.
 */
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ProgressionDrillFields from '@/features/admin/components/songChartEditor/ProgressionDrillFields.vue'
import { useCreateProgression } from '@/features/admin/composables/useCreateProgression'
import { MAX_BARS, drillsRefusal, readBars, sameNumerals, spelledBars, spellingKey } from '@/features/admin/utils/progressionDraft'
import type { SpellingKey } from '@/features/admin/utils/progressionDraft'
import AppButton from '@/shared/components/AppButton.vue'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import SwitchRow from '@/shared/components/SwitchRow.vue'
import TextField from '@/shared/components/TextField.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { ProgressionMode } from '@/shared/utils/progressionNumeral'

type Progression = components['schemas']['Progression']

const props = defineProps<{
  open: boolean
  progressions: Progression[]
  /** The chart's key as it stands in the editor. */
  chartKey: string | null
  /** The section it will tag, by name. */
  sectionName: string
  /** What the form starts from: the search, when it read as numerals. */
  numerals: string
}>()
const emit = defineEmits<{ close: []; tag: [key: string] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const toast = useToast()
const { create } = useCreateProgression()

const mode = ref<ProgressionMode>('major')
const typed = ref('')
const nicknameEn = ref('')
const nicknamePt = ref('')
const wantsDrills = ref(false)
const skillIds = ref<string[]>([])
const conceptIds = ref<string[]>([])
const busy = ref(false)
const refusal = ref('')
const conflict = ref<Progression | null>(null)

function reset() {
  mode.value = 'major'
  typed.value = props.numerals
  nicknameEn.value = ''
  nicknamePt.value = ''
  wantsDrills.value = false
  skillIds.value = []
  conceptIds.value = []
  refusal.value = ''
  conflict.value = null
}
reset()
watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)

const bars = computed(() => readBars(typed.value, mode.value))
const parsedBars = computed(() => bars.value.flatMap((bar) => (bar.parsed ? [bar.parsed] : [])))
const allRead = computed(() => bars.value.length > 0 && parsedBars.value.length === bars.value.length)
const firstBad = computed(() => bars.value.find((bar) => !bar.parsed))
const borrowed = computed(() => [...new Set(parsedBars.value.filter((bar) => bar.borrowed).map((bar) => bar.numeral))])

const numeralsError = computed(() => {
  if (firstBad.value) return t('progressionForm.notAChord', { bar: firstBad.value.written })
  return bars.value.length > MAX_BARS ? t('progressionForm.tooManyBars', { max: MAX_BARS }) : ''
})

const existing = computed(() => {
  if (!allRead.value) return null
  return conflict.value ?? sameNumerals(props.progressions, mode.value, parsedBars.value.map((bar) => bar.numeral)) ?? null
})

const drillsBlock = computed(() => drillsRefusal(mode.value, bars.value.length))
// The admin's choice outlives a refusal, which may only last while a bar is being corrected.
const inDrills = computed(() => wantsDrills.value && drillsBlock.value === null)

watch([typed, mode], () => {
  conflict.value = null
  refusal.value = ''
})

const drillsDescription = computed(() => {
  if (drillsBlock.value === 'minor') return t('progressionForm.drillsMinor')
  if (drillsBlock.value === 'bars') return t('progressionForm.drillsBars')
  return t(inDrills.value ? 'progressionForm.drillsOn' : 'progressionForm.drillsOff')
})

function keyInMode(key: SpellingKey): string {
  return mode.value === 'minor' ? t('progressionForm.keyMinor', { key: key.name }) : key.name
}

function spelling(key: SpellingKey): string {
  const chart = spelledBars(key.name, parsedBars.value)
  if (!key.relative) return t('progressionForm.inChartKey', { key: keyInMode(key), chart })
  if (borrowed.value.length) return t('progressionForm.inKey', { key: keyInMode(key), chart })
  return t('progressionForm.inRelativeKey', { key: keyInMode(key), chartKey: key.chartKey, chart })
}

function borrowedWhere(key: SpellingKey | null): string {
  if (!key) return t(mode.value === 'minor' ? 'progressionForm.minorScale' : 'progressionForm.majorScale')
  if (key.relative) return t('progressionForm.relativeKey', { key: keyInMode(key), chartKey: key.chartKey })
  return mode.value === 'minor' ? keyInMode(key) : t('progressionForm.keyMajor', { key: key.name })
}

function borrowedLine(key: SpellingKey | null): string {
  const names = borrowed.value
  if (!names.length) return ''
  const where = borrowedWhere(key)
  if (names.length === 1) return t('progressionForm.borrowedOne', { numeral: names[0] ?? '', where })
  const list = `${names.slice(0, -1).join(', ')} ${t('progressionForm.and')} ${names.at(-1) ?? ''}`
  return t('progressionForm.borrowedMany', { numerals: list, where })
}

const reading = computed(() => {
  const key = spellingKey(props.chartKey, mode.value)
  const parts = [key && allRead.value ? spelling(key) : '', borrowedLine(key), key && firstBad.value ? t('progressionForm.playsOnceValid', { key: keyInMode(key) }) : '']
  return parts.filter((part) => part !== '').join(' ')
})

const canSubmit = computed(() => {
  if (!allRead.value || bars.value.length > MAX_BARS || busy.value) return false
  if (existing.value) return true
  return !inDrills.value || skillIds.value.length + conceptIds.value.length > 0
})

const submitLabel = computed(() =>
  existing.value ? t('progressionForm.tag', { progression: localizedName(existing.value.names) }) : t('progressionForm.createAndTag', { section: props.sectionName }),
)

function nicknames(): Record<string, string> | undefined {
  const written = Object.entries({ en: nicknameEn.value.trim(), 'pt-BR': nicknamePt.value.trim() }).filter(([, name]) => name !== '')
  return written.length ? Object.fromEntries(written) : undefined
}

/** While it is creating there is no leaving: the result tags a section, and the admin would have backed out. */
function close() {
  if (!busy.value) emit('close')
}

async function submit() {
  if (!canSubmit.value) return
  if (existing.value) {
    emit('tag', existing.value.key)
    return
  }
  busy.value = true
  refusal.value = ''
  const names = nicknames()
  const outcome = await create({
    mode: mode.value,
    bars: parsedBars.value.map((bar) => bar.numeral),
    ...(names ? { nicknames: names } : {}),
    in_drills: inDrills.value,
    ...(inDrills.value ? { skill_ids: skillIds.value, concept_ids: conceptIds.value } : {}),
  })
  busy.value = false
  if (outcome.kind === 'created') {
    toast.success(t('progressionForm.created', { progression: localizedName(outcome.progression.names), section: props.sectionName }))
    emit('tag', outcome.progression.key)
  } else if (outcome.kind === 'exists') {
    conflict.value = outcome.progression
  } else if (outcome.kind === 'not_addable') {
    refusal.value = outcome.reasons.map((reason) => t(`progressionForm.refused.${reason}`)).join(' ')
  } else {
    refusal.value = t('progressionForm.failed')
  }
}

const CHIP_CLASS = { plain: 'bg-surface-sunken text-ink-muted', borrowed: 'bg-accent-muted text-accent-text', error: 'bg-danger-muted text-danger' }
const chipKind = (bar: { parsed: { borrowed: boolean } | null }) => (!bar.parsed ? 'error' : bar.parsed.borrowed ? 'borrowed' : 'plain')
</script>

<template>
  <OverlayPanel :open="open" full-screen :title="t('progressionForm.title')" @close="close">
    <form id="progression-create-form" data-test="progression-create-form" class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold text-ink">{{ t('progressionForm.key') }}</span>
        <div role="group" :aria-label="t('progressionForm.key')" class="flex gap-2">
          <ChoiceChip data-test="mode-major" :label="t('progressionForm.major')" :selected="mode === 'major'" @toggle="mode = 'major'" />
          <ChoiceChip data-test="mode-minor" :label="t('progressionForm.minor')" :selected="mode === 'minor'" @toggle="mode = 'minor'" />
        </div>
      </div>

      <TextField v-model="typed" data-test="progression-numerals" :label="t('progressionForm.numerals')" :error="numeralsError" />

      <div v-if="bars.length" class="flex flex-col gap-2">
        <span data-test="bar-count" class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ bars.length === 1 ? t('progressionForm.oneBar') : t('progressionForm.manyBars', { count: bars.length }) }}</span>
        <ul class="flex flex-wrap gap-1.5">
          <li
            v-for="(bar, i) in bars"
            :key="i"
            data-test="numeral-chip"
            :data-kind="chipKind(bar)"
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="CHIP_CLASS[chipKind(bar)]"
          >
            {{ bar.parsed?.numeral ?? bar.written }}
          </li>
        </ul>
        <p v-if="reading && !existing" data-test="progression-reading" class="text-sm text-ink-muted">{{ reading }}</p>
      </div>

      <div v-if="existing" data-test="progression-exists" class="flex flex-col gap-1 rounded-lg bg-accent-muted p-3">
        <p class="text-sm font-semibold text-ink">{{ t('progressionForm.existsTitle') }}</p>
        <p class="text-sm text-ink-muted">{{ t('progressionForm.existsBody', { progression: localizedName(existing.names) }) }}</p>
      </div>

      <template v-else>
        <TextField v-model="nicknameEn" data-test="nickname-en" :label="t('progressionForm.nicknameEn')" />
        <TextField v-model="nicknamePt" data-test="nickname-pt" :label="t('progressionForm.nicknamePt')" />
        <div data-test="use-in-drills" class="-ml-[1.25rem] -mr-4">
          <SwitchRow :model-value="inDrills" :label="t('progressionForm.useInDrills')" :description="drillsDescription" :disabled="drillsBlock !== null" @update:model-value="wantsDrills = $event" />
        </div>
        <ProgressionDrillFields v-if="inDrills" v-model:skill-ids="skillIds" v-model:concept-ids="conceptIds" />
      </template>

      <p v-if="refusal" data-test="progression-create-error" role="alert" class="text-sm text-danger">{{ refusal }}</p>
    </form>

    <template #actions>
      <AppButton data-test="progression-cancel" variant="tertiary" :disabled="busy" @click="close">{{ t('progressionForm.cancel') }}</AppButton>
      <AppButton data-test="progression-submit" type="submit" form="progression-create-form" :disabled="!canSubmit" :busy="busy">{{ submitLabel }}</AppButton>
    </template>
  </OverlayPanel>
</template>
