<script setup lang="ts">
/**
 * The top of a page pushed onto another: an arrow back to that page, and its name. The arrow is
 * the only control, so its label says where it goes; the name beside it is there to be read.
 *
 * When that page is the one behind this in the browser's history, the arrow steps back, as the
 * device's own Back does: the page returns where the student left it, and Back from there doesn't
 * lead here again. Opened any other way (a link, another page), the arrow opens that page.
 */
import { ArrowLeft } from 'lucide-vue-next'
import { useRouter, type RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  /** The page this one was pushed onto, e.g. the path's title. */
  title: string
  to: RouteLocationRaw
  /** The arrow's accessible name, e.g. "Back to My path". */
  backLabel: string
}>()

const router = useRouter()

function goBack(): void {
  const behind = router.options.history.state.back
  if (typeof behind === 'string' && router.resolve(behind).name === router.resolve(props.to).name) {
    router.back()
  } else {
    void router.push(props.to)
  }
}
</script>

<template>
  <div class="flex h-14 min-w-0 items-center gap-1">
    <button
      type="button"
      :aria-label="backLabel"
      data-test="page-back"
      class="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      @click="goBack"
    >
      <ArrowLeft :size="22" aria-hidden="true" />
    </button>
    <p data-test="page-back-title" class="truncate text-base font-semibold text-ink">{{ title }}</p>
  </div>
</template>
