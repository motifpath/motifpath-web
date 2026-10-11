import { onBeforeUnmount, onMounted } from 'vue'

interface OptionKeysSource {
  /** The options in the order they are shown; key 1 is the first. */
  options: () => readonly { option_id: string }[]
  /** Whether several options can be chosen, so a key adds or removes one instead of replacing. */
  multiple: () => boolean
  selected: () => readonly string[]
  /** Whether the options take no choice now (answered, or missing their stimulus). */
  locked: () => boolean
  choose: (optionIds: string[]) => void
}

/**
 * Number keys 1–9 choose an exercise's options, so a keyboard can answer too. A key some other
 * control already handled is left alone.
 */
export function useOptionKeys(source: OptionKeysSource): void {
  function onKeydown(event: KeyboardEvent) {
    if (source.locked() || event.defaultPrevented || !/^[1-9]$/.test(event.key)) return
    const option = source.options()[Number(event.key) - 1]
    if (!option) return
    const id = option.option_id
    const selected = source.selected()
    if (!source.multiple()) source.choose([id])
    else source.choose(selected.includes(id) ? selected.filter((chosenId) => chosenId !== id) : [...selected, id])
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
