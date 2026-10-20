import { ref } from 'vue'

/**
 * Shared "pick a file for this option, preview it locally, defer the real
 * upload" flow behind an ImagePickerModal — used by every options editor
 * whose options carry their own media (image_choice, audio_selection, ...).
 * Only the option shape and which field on it holds the media URL differ
 * per editor; this owns the picker-target tracking, blob revocation, and
 * setPreview/setFile emission that would otherwise be copy-pasted per type.
 */
export function useOptionMediaPicker<T extends { id: string }>(
  getOptions: () => T[],
  getUrl: (option: T) => string | undefined,
  onSetPreview: (id: string, previewUrl: string) => void,
  onSetFile: (id: string, file: File) => void,
) {
  const pickerTargetId = ref<string | null>(null)

  function openPicker(id: string) {
    pickerTargetId.value = id
  }

  function onPicked(file: File) {
    if (pickerTargetId.value) {
      const targetId = pickerTargetId.value
      const previous = getOptions().find((o) => o.id === targetId)
      const previousUrl = previous ? getUrl(previous) : undefined
      if (previousUrl?.startsWith('blob:')) URL.revokeObjectURL(previousUrl)
      onSetPreview(targetId, URL.createObjectURL(file))
      onSetFile(targetId, file)
    }
    pickerTargetId.value = null
  }

  return { pickerTargetId, openPicker, onPicked }
}
