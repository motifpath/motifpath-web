<script setup lang="ts">
/**
 * One part of a course in its outline: done (a check), current (highlighted, its number) or
 * upcoming (muted). Tapping it unfolds its lesson titles. The outline only shows them; lessons open
 * from My path, so the slot holds the way there. A finished course's lessons open for review: its
 * `lessons` slot puts rows that open them in place of the titles.
 */
import { computed } from 'vue'

import { foldCurrentLessons, type OutlinePart } from '@/features/student/utils/courseOutline'
import Icon from '@/shared/components/Icon.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(defineProps<{ part: OutlinePart; expanded?: boolean }>(), { expanded: false })
const emit = defineEmits<{ toggle: [] }>()

const { t } = useTypedT()

const meta = computed(() => {
  const { part } = props
  const name = t('partRow.part', { position: part.position })
  if (part.state === 'current' && part.lessonsDone !== null) {
    return `${name} · ${t('partRow.lessonsDone', { completed: part.lessonsDone, count: part.lessonCount })}`
  }
  const lessons = `${name} · ${t('partRow.lessons', { count: part.lessonCount })}`
  return part.state === 'done' ? `${lessons} · ${t('partRow.done')}` : lessons
})

const lines = computed(() => foldCurrentLessons(props.part.lessons))
const listId = computed(() => `part-${props.part.position}-lessons`)
</script>

<template>
  <div
    data-test="part-row"
    :data-state="part.state"
    :aria-current="part.state === 'current' ? 'step' : undefined"
    class="rounded-lg"
    :class="part.state === 'current' && 'bg-accent-muted'"
  >
    <button
      type="button"
      data-test="part-toggle"
      :aria-expanded="expanded ? 'true' : 'false'"
      :aria-controls="expanded ? listId : undefined"
      class="flex min-h-16 w-full items-center gap-3 rounded-lg px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      @click="emit('toggle')"
    >
      <span
        v-if="part.state === 'done'"
        data-test="part-done"
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-muted text-success"
      >
        <Icon name="check" :size="16" />
      </span>
      <span
        v-else
        data-test="part-marker"
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums"
        :class="part.state === 'current' ? 'bg-accent text-accent-fg' : 'bg-surface-sunken text-ink-muted'"
      >
        {{ part.position }}
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span
          data-test="part-title"
          class="text-base font-semibold"
          :class="part.state === 'upcoming' ? 'text-ink-muted' : 'text-ink'"
        >
          {{ part.title }}
        </span>
        <span
          data-test="part-meta"
          class="text-xs"
          :class="part.state === 'current' ? 'text-accent-text' : 'text-ink-muted'"
        >
          {{ meta }}
        </span>
      </span>
      <span class="shrink-0 text-ink transition-transform" :class="expanded && 'rotate-180'">
        <Icon name="chevron-down" :size="20" />
      </span>
    </button>

    <div v-if="expanded && $slots.lessons" :id="listId" data-test="part-lessons" class="flex flex-col pb-2 pl-6">
      <slot name="lessons" />
    </div>
    <div v-else-if="expanded" class="flex flex-col gap-3 pb-4 pl-14 pr-3">
      <ul :id="listId" data-test="part-lessons" class="flex flex-col gap-1.5 text-sm">
        <template v-for="(line, index) in lines" :key="index">
          <li
            v-if="line.kind === 'lesson'"
            data-test="part-lesson"
            class="flex items-start gap-2 text-ink"
            :class="line.done === false && 'pl-5'"
          >
            <span
              v-if="line.done"
              data-test="lesson-done"
              role="img"
              :aria-label="t('partRow.lessonDone')"
              class="mt-0.5 flex w-4 shrink-0 justify-center text-ink-muted"
            >
              <Icon name="check" :size="14" />
            </span>
            <span :class="line.done && 'text-ink-muted'">{{ line.title }}</span>
          </li>
          <li v-else-if="line.kind === 'more-done'" class="pl-5 text-ink-muted">
            {{ t('partRow.moreDone', { count: line.count }) }}
          </li>
          <li v-else class="pl-5 text-ink-muted">{{ t('partRow.more', { count: line.count }) }}</li>
        </template>
      </ul>
      <slot />
    </div>
  </div>
</template>
