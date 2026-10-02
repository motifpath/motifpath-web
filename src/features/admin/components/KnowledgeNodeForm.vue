<script setup lang="ts">
import { computed, toRef, watch } from 'vue'

import { OFFERED_LANGUAGE_CODES } from '@/i18n'
import { useKnowledgeNodeForm } from '@/features/admin/composables/useKnowledgeNodeForm'
import InstrumentPicker from '@/shared/components/InstrumentPicker.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeNodeKind = components['schemas']['KnowledgeNodeKind']
type CreateKnowledgeNodeRequest = components['schemas']['CreateKnowledgeNodeRequest']
type UpdateKnowledgeNodeRequest = components['schemas']['UpdateKnowledgeNodeRequest']

const props = withDefaults(
  defineProps<{
    kind: KnowledgeNodeKind
    /** The node being edited, or null to create one. */
    node: KnowledgeNode | null
    /** The node's parent (or the new node's), or null for a root. */
    parent: KnowledgeNode | null
    /** Every key in use, so a new node's key is checked before saving. */
    existingKeys: string[]
    saving?: boolean
    /** The server's reason for refusing the instruments. */
    instrumentsError?: string
    /** The server's reason for refusing anything else. */
    error?: string
  }>(),
  { saving: false, instrumentsError: '', error: '' },
)
const emit = defineEmits<{
  create: [request: CreateKnowledgeNodeRequest]
  update: [request: UpdateKnowledgeNodeRequest]
  cancel: []
  changeParent: []
  dirty: [dirty: boolean]
}>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const form = useKnowledgeNodeForm({
  kind: toRef(props, 'kind'),
  node: toRef(props, 'node'),
  parent: toRef(props, 'parent'),
  existingKeys: toRef(props, 'existingKeys'),
})
const { key, names, descriptions, instrumentIds, isCreating, allowedInstrumentIds, keyError, descriptionsIncomplete } =
  form

watch(form.isDirty, (dirty) => emit('dirty', dirty))

function languageLabel(code: string): string {
  const labelKey = languageLabelKey(code)
  return labelKey ? t(labelKey) : code
}

function onName(code: string, value: string) {
  if (code === 'en') form.setEnglishName(value)
  else names.value = { ...names.value, [code]: value }
}

const instrumentsModel = computed({
  get: () => instrumentIds.value,
  set: (ids: string[]) => form.setInstrumentIds(ids),
})

function save() {
  if (!form.canSave.value) return
  if (isCreating.value) emit('create', form.createRequest())
  else emit('update', form.updateRequest.value)
}

function discard() {
  if (isCreating.value) emit('cancel')
  else form.reset()
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="save">
    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('knowledgeMap.form.keyLabel') }}</span>
      <template v-if="isCreating">
        <input
          :value="key"
          data-test="kmap-key"
          type="text"
          maxlength="100"
          autocomplete="off"
          spellcheck="false"
          :aria-invalid="keyError !== null"
          class="rounded-md border border-border bg-surface-sunken px-3 py-2 font-mono text-sm"
          @input="form.setKey(($event.target as HTMLInputElement).value)"
        />
        <p v-if="keyError" data-test="kmap-key-error" class="text-xs text-danger">
          {{ keyError === 'taken' ? t('knowledgeMap.form.keyTaken') : t('knowledgeMap.form.keyInvalid') }}
        </p>
        <p v-else class="text-xs text-ink-subtle">{{ t('knowledgeMap.form.keyHint') }}</p>
      </template>
      <template v-else>
        <code data-test="kmap-key-readonly" class="w-fit rounded bg-surface-sunken px-2 py-1 text-sm">{{ key }}</code>
        <p class="text-xs text-ink-subtle">{{ t('knowledgeMap.form.keyReadonlyNote') }}</p>
      </template>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <label v-for="code in OFFERED_LANGUAGE_CODES" :key="code" class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {{ t('knowledgeMap.form.nameLabel', { language: languageLabel(code) }) }}
        </span>
        <input
          :value="names[code]"
          :data-test="`kmap-name-${code}`"
          type="text"
          maxlength="200"
          class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
          @input="onName(code, ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="grid gap-3 sm:grid-cols-2">
        <label v-for="code in OFFERED_LANGUAGE_CODES" :key="code" class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('knowledgeMap.form.descriptionLabel', { language: languageLabel(code) }) }}
          </span>
          <textarea
            v-model="descriptions[code]"
            :data-test="`kmap-description-${code}`"
            rows="3"
            maxlength="1000"
            class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </label>
      </div>
      <p v-if="descriptionsIncomplete" data-test="kmap-descriptions-error" class="text-xs text-danger">
        {{ t('knowledgeMap.form.descriptionsIncomplete') }}
      </p>
    </div>

    <div v-if="isCreating" class="flex flex-col gap-1.5">
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('knowledgeMap.form.parentLabel') }}</span>
      <div class="flex flex-wrap items-center gap-2">
        <span data-test="kmap-parent" class="text-sm text-ink">{{
          parent ? localizedName(parent.names) : t('knowledgeMap.form.noParent')
        }}</span>
        <button
          type="button"
          data-test="kmap-change-parent"
          class="rounded-md border border-border bg-surface-raised px-2.5 py-1 text-[0.8125rem] font-semibold text-ink"
          @click="emit('changeParent')"
        >
          {{ t('knowledgeMap.form.changeParent') }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{
        t('knowledgeMap.form.instrumentsLabel')
      }}</span>
      <InstrumentPicker
        v-model="instrumentsModel"
        :allowed-ids="allowedInstrumentIds"
        :limit-reason="parent ? t('knowledgeMap.form.instrumentsLimit', { parent: localizedName(parent.names) }) : ''"
      />
      <p v-if="instrumentsError" data-test="kmap-instruments-error" role="alert" class="text-xs text-danger">
        {{ instrumentsError }}
      </p>
    </div>

    <p v-if="error" data-test="kmap-form-error" role="alert" class="text-sm text-danger">{{ error }}</p>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        data-test="kmap-save"
        :disabled="!form.canSave.value || saving"
        class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
        @click="save"
      >
        {{ saving ? t('knowledgeMap.form.saving') : t('knowledgeMap.form.save') }}
      </button>
      <button
        type="button"
        data-test="kmap-discard"
        :disabled="saving || (!isCreating && !form.isDirty.value)"
        class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
        @click="discard"
      >
        {{ isCreating ? t('knowledgeMap.form.cancel') : t('knowledgeMap.form.discard') }}
      </button>
    </div>
  </form>
</template>
