import { mergeAttributes, Node, VueNodeViewRenderer } from '@tiptap/vue-3'

import PromptSongChartNodeView from '@/features/teacher/components/PromptSongChartNodeView.vue'

export interface PromptSongChartNodeOptions {
  /** Called with the node's position when the author asks to replace its chart. */
  onReplace: (pos: number) => void
}

/**
 * A published song chart embedded in lesson content, as the student-side renderer reads it: a
 * `songChart` block node whose `songChartId` attr names the chart. An atom — the chart is picked,
 * never edited as text.
 */
export const PromptSongChartNode = Node.create<PromptSongChartNodeOptions>({
  name: 'songChart',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { onReplace: () => {} }
  },

  addAttributes() {
    return {
      songChartId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-song-chart-id'),
        renderHTML: (attributes: Record<string, unknown>) =>
          typeof attributes.songChartId === 'string' ? { 'data-song-chart-id': attributes.songChartId } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-song-chart-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(PromptSongChartNodeView)
  },
})
