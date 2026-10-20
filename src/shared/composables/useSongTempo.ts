import { ref } from 'vue'

/** Where a chart has no tempo of its own, the metronome starts here. */
export const DEFAULT_SONG_TEMPO_BPM = 80

const storageKey = (songChartId: string) => `motifpath.songTempo.${songChartId}`

function remembered(songChartId: string): number | null {
  try {
    const value = Number(localStorage.getItem(storageKey(songChartId)))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/**
 * The tempo a student practises a song at: the one they last chose for it on this device, else
 * the song's own tempo, else 80 BPM. The song's tempo is the target to work up to; a song without
 * one has none. It stays on the device and is never sent.
 */
export function useSongTempo(songChartId: string, songTempo: number | null) {
  const tempo = ref(remembered(songChartId) ?? songTempo ?? DEFAULT_SONG_TEMPO_BPM)

  function setTempo(bpm: number) {
    tempo.value = bpm
    try {
      localStorage.setItem(storageKey(songChartId), String(bpm))
    } catch {
      // A device that keeps nothing still has the tempo for this reading.
    }
  }

  return { tempo, target: songTempo, setTempo }
}
