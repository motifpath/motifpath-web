import { mergeAttributes, Node, VueNodeViewRenderer } from '@tiptap/vue-3'

import PromptDiagramNodeView from '@/features/teacher/components/PromptDiagramNodeView.vue'

export interface PromptDiagramNodeOptions {
  /** Called with the node's document position when its edit button is pressed. */
  onEdit: (pos: number) => void
}

/** Reads a JSON-valued data attribute back into an attr, or null when it's missing or unreadable. */
function jsonAttribute(element: HTMLElement, name: string): unknown {
  const raw = element.getAttribute(name)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function jsonAttributeSpec(attr: 'diagramRef' | 'diagramStackRef', htmlName: string) {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => jsonAttribute(element, htmlName),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes[attr] ? { [htmlName]: JSON.stringify(attributes[attr]) } : {},
  }
}

/**
 * A prebuilt diagram embedded in rich text, as the student-side renderer
 * reads it: a `diagram` block node whose `diagramRef` (or, for a stack,
 * `diagramStackRef`) attr carries the reference. An atom — the diagram is
 * edited through its own picker, never as text.
 */
export const PromptDiagramNode = Node.create<PromptDiagramNodeOptions>({
  name: 'diagram',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { onEdit: () => {} }
  },

  addAttributes() {
    return {
      diagramRef: jsonAttributeSpec('diagramRef', 'data-diagram-ref'),
      diagramStackRef: jsonAttributeSpec('diagramStackRef', 'data-diagram-stack-ref'),
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-diagram]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-diagram': '' }, HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(PromptDiagramNodeView)
  },
})
