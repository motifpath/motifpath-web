<script setup lang="ts">
import { ref, watch } from 'vue'

import DevPanel from '@/spikes/practice/components/DevPanel.vue'
import HomeScreen from '@/spikes/practice/components/HomeScreen.vue'
import ProgressScreen from '@/spikes/practice/components/ProgressScreen.vue'
import SessionRunner from '@/spikes/practice/components/SessionRunner.vue'
import SessionSummary from '@/spikes/practice/components/SessionSummary.vue'
import TakesScreen from '@/spikes/practice/components/TakesScreen.vue'
import TeacherReviewScreen from '@/spikes/practice/components/TeacherReviewScreen.vue'
import type { KnowledgeState, Session } from '@/spikes/practice/model'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

type Screen = 'home' | 'session' | 'summary' | 'progress' | 'takes' | 'teacher'

const spike = usePracticeSpike()
const LINKABLE: Screen[] = ['home', 'progress', 'takes', 'teacher']
const screen = ref<Screen>('home')
watch(screen, (s) => {
  if (LINKABLE.includes(s)) history.replaceState(null, '', `#${s}`)
})
const session = ref<Session | null>(null)
const before = ref<Map<string, KnowledgeState>>(new Map())
const touched = ref<string[]>([])
const showDev = ref(true)

function start(instrumentInHand: boolean, minutes: number) {
  before.value = new Map(spike.states.value)
  session.value = spike.compose(instrumentInHand, minutes)
  screen.value = 'session'
}

function finished(keys: string[]) {
  touched.value = keys
  screen.value = 'summary'
}

// `#run=mind-5` or `#run=guitar-15` starts a session straight away, for walkthroughs.
function followHash() {
  const run = /^#run=(mind|guitar)-(\d+)$/.exec(window.location.hash)
  if (run) start(run[1] === 'guitar', Number(run[2]))
  const linked = window.location.hash.slice(1) as Screen
  if (LINKABLE.includes(linked)) screen.value = linked
}
followHash()
window.addEventListener('hashchange', followHash)

const tabs: { key: Screen; label: string }[] = [
  { key: 'home', label: 'Practice' },
  { key: 'progress', label: 'Progress' },
  { key: 'takes', label: 'Takes' },
  { key: 'teacher', label: 'Teacher' },
]
</script>

<template>
  <div class="min-h-screen bg-surface text-ink">
    <header class="flex items-center gap-4 border-b border-border px-4 py-3">
      <span class="font-semibold">MotifPath · practice spike</span>
      <nav v-if="screen !== 'session'" class="flex gap-3 text-sm">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          :class="screen === t.key ? 'font-semibold text-accent-text' : 'text-ink-muted'"
          @click="screen = t.key"
        >
          {{ t.label }}
        </button>
      </nav>
      <label class="ml-auto flex items-center gap-1 text-xs text-ink-muted"><input v-model="showDev" type="checkbox" /> controls</label>
    </header>
    <div class="mx-auto flex max-w-5xl flex-col gap-6 p-4 lg:flex-row">
      <main class="flex-1">
        <HomeScreen v-if="screen === 'home'" @start="start" />
        <SessionRunner v-else-if="screen === 'session' && session" :session="session" @finished="finished" @quit="screen = 'home'" />
        <SessionSummary
          v-else-if="screen === 'summary' && session"
          :session="session"
          :touched="touched"
          :before="before"
          @close="screen = 'home'"
        />
        <ProgressScreen v-else-if="screen === 'progress'" />
        <TakesScreen v-else-if="screen === 'takes'" />
        <TeacherReviewScreen v-else-if="screen === 'teacher'" />
      </main>
      <DevPanel v-if="showDev" class="lg:w-80" />
    </div>
  </div>
</template>
