import { onBeforeUnmount, watch } from 'vue'

import { useMediaQuery } from '@/shared/composables/useMediaQuery'

/** How long a right answer's feedback stays before the session moves on. */
const AUTO_ADVANCE_MS = 900

/**
 * Moves a practice item on after its feedback: a right answer by itself after a moment (or on
 * Continue when the student asks for reduced motion), a wrong one only on Continue, so the student
 * sees where the mistake was. `next` is Continue, and moves on once however often it's pressed.
 */
export function useAdvanceAfterAnswer(answer: () => { correct: boolean } | null, advance: () => void) {
  const { matches: reducedMotion } = useMediaQuery('(prefers-reduced-motion: reduce)')

  let advanceTimer: ReturnType<typeof setTimeout> | undefined
  let movedOn = false

  function next() {
    clearTimeout(advanceTimer)
    if (movedOn) return
    movedOn = true
    advance()
  }

  watch(
    answer,
    (given) => {
      clearTimeout(advanceTimer)
      movedOn = false
      // Whether motion is reduced is only known once mounted, so it is read when the moment is up.
      if (given?.correct) advanceTimer = setTimeout(() => !reducedMotion.value && next(), AUTO_ADVANCE_MS)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => clearTimeout(advanceTimer))

  return { next }
}
