<script setup lang="ts">
/**
 * The teacher's side: review a sent take, or note impressions from a live
 * lesson — the same note either way. Rubric, timestamped comments, skills that
 * need work and suggested practice; a judged item also becomes evidence.
 */
import { computed, ref } from 'vue'

import RatingButtons from '@/spikes/practice/components/RatingButtons.vue'
import { itemByKey, items, STUDENT_ID, TEACHER_ID } from '@/spikes/practice/fixtures/catalog'
import { graph, nodeName } from '@/spikes/practice/fixtures/graph'
import type { MasteryLevel, Rating, RubricCriterion, TeacherNote, TimestampedComment } from '@/spikes/practice/model'
import { isLive } from '@/spikes/practice/teacherNotes'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const spike = usePracticeSpike()

const sent = computed(() => spike.state.takes.filter((t) => t.sent_for_review))
const takeId = ref<string | null>(null)
const take = computed(() => sent.value.find((t) => t.take_id === takeId.value) ?? null)
const itemKey = ref<string | null>(null)
const judgedKey = computed(() => take.value?.item_key ?? itemKey.value)

const rating = ref<Rating | null>(null)
const bpm = ref<number | null>(null)
const verified = ref(false)
const CRITERIA: { key: RubricCriterion; label: string }[] = [
  { key: 'timing', label: 'Timing' },
  { key: 'clean_notes', label: 'Clean notes' },
  { key: 'tension', label: 'Relaxed (no tension)' },
  { key: 'dynamics', label: 'Dynamics' },
]
const rubric = ref<Partial<Record<RubricCriterion, 1 | 2 | 3 | 4 | 5>>>({})
const comments = ref<TimestampedComment[]>([])
const commentText = ref('')
const video = ref<HTMLVideoElement | null>(null)
const summary = ref('')
const needsWork = ref<string[]>([])
const suggested = ref<string[]>([])

const suggestable = items.filter((i) => i.kind !== 'fretboard_cell')

function addComment() {
  if (!commentText.value.trim()) return
  comments.value.push({ at_seconds: Math.round(video.value?.currentTime ?? 0), text: commentText.value.trim() })
  commentText.value = ''
}

function selectTake(id: string | null) {
  takeId.value = id
  bpm.value = take.value?.bpm ?? null
}

const savedAt = ref<number | null>(null)
const targetLevel = ref<MasteryLevel>('accurate')

/** Where a note stands: still steering sessions, met, closed, or expired. */
function noteStatus(n: TeacherNote): string {
  if (n.closed_at) return 'closed by the teacher'
  if (!isLive(n, spike.now.value)) return 'expired'
  const open = spike.openFor(n)
  const names = [...open.item_keys.map((k) => itemByKey(k)?.label ?? k), ...open.node_ids.map(nodeName)]
  return names.length ? `steering: ${names.join(', ')} (until ${n.target_level})` : `goal met (${n.target_level})`
}

function save() {
  const note: TeacherNote = {
    teacher_note_id: spike.newId('note'),
    student_id: STUDENT_ID,
    teacher_id: TEACHER_ID,
    created_at: spike.clock(),
    take_id: takeId.value,
    item_key: judgedKey.value,
    rating: rating.value,
    bpm: bpm.value,
    verified: verified.value,
    rubric: { ...rubric.value },
    comments: [...comments.value],
    summary: summary.value,
    needs_work: { skill_ids: [...needsWork.value], concept_ids: [] },
    suggested_item_keys: [...suggested.value],
    target_level: targetLevel.value,
    closed_at: null,
  }
  const review =
    judgedKey.value && rating.value
      ? {
          evidence_id: spike.newId('ev'),
          student_id: STUDENT_ID,
          item_key: judgedKey.value,
          occurred_at: note.created_at,
          session_id: null,
          source: 'teacher_reviewed' as const,
          teacher_note_id: note.teacher_note_id,
          rating: rating.value,
          bpm: bpm.value,
          changes_per_minute: null,
          verified: verified.value,
        }
      : null
  spike.addNote(note, review)
  savedAt.value = Date.now()
  rating.value = null
  verified.value = false
  rubric.value = {}
  comments.value = []
  summary.value = ''
  needsWork.value = []
  suggested.value = []
}

const skills = graph.nodes.filter((n) => n.kind === 'skill' && n.parent_id !== null)
</script>

<template>
  <div class="flex flex-col gap-6">
    <section class="flex flex-col gap-3">
      <h1 class="text-xl font-semibold">Teacher — new note for Ana</h1>

      <div class="flex flex-col gap-1">
        <span class="text-sm font-semibold">About</span>
        <div class="flex flex-wrap gap-2 text-sm">
          <button type="button" class="rounded-full border border-border px-3 py-1" :class="{ 'bg-accent-muted': takeId === null }" @click="selectTake(null)">
            Live lesson (no video)
          </button>
          <button
            v-for="t in sent"
            :key="t.take_id"
            type="button"
            class="rounded-full border border-border px-3 py-1"
            :class="{ 'bg-accent-muted': takeId === t.take_id }"
            @click="selectTake(t.take_id)"
          >
            Take: {{ itemByKey(t.item_key)?.label }} · {{ t.bpm }} BPM
          </button>
        </div>
      </div>

      <template v-if="take">
        <video ref="video" :src="take.media_url" controls playsinline class="w-full rounded-lg bg-surface-sunken" />
        <div class="flex gap-2">
          <input v-model="commentText" class="flex-1 rounded-lg border border-border bg-surface p-2 text-sm" placeholder="Comment at the current moment…" @keydown.enter="addComment" />
          <button type="button" class="rounded-lg border border-border px-3 text-sm" @click="addComment">Add</button>
        </div>
      </template>
      <label v-else class="flex flex-col gap-1 text-sm">
        <span class="font-semibold">Item played (optional)</span>
        <select v-model="itemKey" class="rounded-lg border border-border bg-surface p-2">
          <option :value="null">— none: general impressions —</option>
          <option v-for="i in suggestable" :key="i.item_key" :value="i.item_key">{{ i.label }}</option>
        </select>
      </label>
      <ul v-if="comments.length" class="text-sm">
        <li v-for="(c, i) in comments" :key="i"><span class="text-ink-muted">{{ c.at_seconds }}s</span> — {{ c.text }}</li>
      </ul>

      <template v-if="judgedKey">
        <span class="text-sm font-semibold">How was it?</span>
        <RatingButtons @rate="rating = $event" />
        <p v-if="rating" class="text-sm">Rated: <strong>{{ rating }}</strong></p>
        <div class="flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2">Clean at <input v-model.number="bpm" type="number" class="w-20 rounded-lg border border-border bg-surface p-1" /> BPM</label>
          <label class="flex items-center gap-2"><input v-model="verified" type="checkbox" /> I vouch for it (verified)</label>
        </div>
      </template>

      <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div v-for="c in CRITERIA" :key="c.key" class="flex items-center justify-between gap-2">
          <span>{{ c.label }}</span>
          <span class="flex gap-1">
            <button
              v-for="v in [1, 2, 3, 4, 5] as const"
              :key="v"
              type="button"
              class="h-6 w-6 rounded-full border border-border text-xs"
              :class="{ 'bg-accent text-accent-fg': rubric[c.key] === v }"
              @click="rubric[c.key] = v"
            >
              {{ v }}
            </button>
          </span>
        </div>
      </div>

      <textarea v-model="summary" rows="2" class="rounded-lg border border-border bg-surface p-2 text-sm" placeholder="Summary for the student" />

      <div class="flex flex-col gap-1 text-sm">
        <span class="font-semibold">Needs work</span>
        <div class="flex flex-wrap gap-2">
          <label v-for="s in skills" :key="s.node_id" class="flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
            <input v-model="needsWork" type="checkbox" :value="s.node_id" /> {{ s.name }}
          </label>
        </div>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <span class="font-semibold">Suggested practice</span>
        <div class="flex flex-wrap gap-2">
          <label v-for="i in suggestable" :key="i.item_key" class="flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
            <input v-model="suggested" type="checkbox" :value="i.item_key" /> {{ i.label }}
          </label>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <span class="font-semibold">Steer sessions until it's</span>
        <select v-model="targetLevel" class="rounded-lg border border-border bg-surface p-1">
          <option value="accurate">accurate</option>
          <option value="fluent">fluent</option>
          <option value="retained">retained</option>
        </select>
      </label>

      <button type="button" class="rounded-lg bg-accent p-3 text-accent-fg" @click="save">Save note</button>
      <p v-if="savedAt" class="text-sm text-success">Saved — Ana's next session will bring it up.</p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Notes so far</h2>
      <article v-for="n in spike.notes.value" :key="n.teacher_note_id" class="flex flex-col gap-1 rounded-lg bg-surface-raised p-3 text-sm">
        <p class="text-xs text-ink-muted">
          {{ new Date(n.created_at).toLocaleDateString() }} · {{ n.take_id ? 'video review' : 'live lesson' }}
          <template v-if="n.item_key"> · {{ itemByKey(n.item_key)?.label }}</template>
          <template v-if="n.rating"> · {{ n.rating }}<template v-if="n.bpm"> at {{ n.bpm }} BPM</template></template>
          <template v-if="n.verified"> · ✓ verified</template>
        </p>
        <p>{{ n.summary }}</p>
        <p v-if="Object.keys(n.rubric).length" class="text-xs text-ink-muted">
          <template v-for="c in CRITERIA" :key="c.key"><template v-if="n.rubric[c.key]">{{ c.label }} {{ n.rubric[c.key] }}/5 · </template></template>
        </p>
        <ul v-if="n.comments.length" class="text-xs">
          <li v-for="(c, i) in n.comments" :key="i">{{ c.at_seconds }}s — {{ c.text }}</li>
        </ul>
        <p v-if="n.needs_work.skill_ids.length" class="text-xs">Needs work: {{ n.needs_work.skill_ids.map(nodeName).join(', ') }}</p>
        <p class="flex items-center gap-2 text-xs text-ink-muted">
          <span>{{ noteStatus(n) }}</span>
          <button
            v-if="!n.closed_at && isLive(n, spike.now.value)"
            type="button"
            class="rounded border border-border px-2 py-0.5"
            @click="spike.closeNote(n.teacher_note_id)"
          >
            Close
          </button>
        </p>
      </article>
      <p v-if="!spike.notes.value.length" class="text-sm text-ink-muted">No notes yet.</p>
    </section>
  </div>
</template>
