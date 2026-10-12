import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { ref, watch, type ShallowRef } from 'vue'

export type HeadingLevel = 1 | 2 | 3
export type TextAlignment = 'left' | 'center' | 'right' | 'justify'

/**
 * Every rich-text command the prompt editor offers, and the state its controls show (what is
 * active, what can be undone, whether the editor has focus). Today's one-row toolbar and the
 * phone's docked bar and sheets all call these, so the two presentations can't drift apart.
 *
 * `shouldFocus` says whether a command should put the cursor back in the editor first. It must
 * not while a sheet is open on a phone: focusing the editor there raises the keyboard over the
 * sheet. The selection survives without focus, so the command still applies to it.
 */
export function usePromptCommands(editor: ShallowRef<Editor | undefined>, shouldFocus: () => boolean = () => true) {
  // @tiptap/vue-3's editor ref is a plain shallowRef set once on mount — it never re-fires Vue's
  // reactivity on its own, so isActive() calls in a template (button highlighting, the table
  // controls) would never re-evaluate as the selection moves or marks toggle. Bumping this counter
  // on every transaction, and reading it in each state helper, gives templates a dependency.
  const stateTick = ref(0)
  const focused = ref(false)

  watch(
    editor,
    (current, _previous, onCleanup) => {
      if (!current) return
      const onTransaction = () => {
        stateTick.value++
      }
      const onFocus = () => {
        focused.value = true
      }
      const onBlur = () => {
        focused.value = false
      }
      current.on('transaction', onTransaction)
      current.on('focus', onFocus)
      current.on('blur', onBlur)
      onCleanup(() => {
        current.off('transaction', onTransaction)
        current.off('focus', onFocus)
        current.off('blur', onBlur)
      })
    },
    { immediate: true },
  )

  function chain() {
    const current = editor.value
    if (!current) return null
    return shouldFocus() ? current.chain().focus() : current.chain()
  }

  function isActive(nameOrAttrs: string | Record<string, unknown>, attrs?: Record<string, unknown>): boolean {
    void stateTick.value
    if (!editor.value) return false
    return typeof nameOrAttrs === 'string' ? editor.value.isActive(nameOrAttrs, attrs) : editor.value.isActive(nameOrAttrs)
  }

  function canUndo(): boolean {
    void stateTick.value
    return editor.value?.can().undo() ?? false
  }
  function canRedo(): boolean {
    void stateTick.value
    return editor.value?.can().redo() ?? false
  }

  /** Merge needs several cells selected (a drag across them); Split needs a merged cell. */
  function canMergeCells(): boolean {
    void stateTick.value
    return editor.value?.can().mergeCells() ?? false
  }
  function canSplitCell(): boolean {
    void stateTick.value
    return editor.value?.can().splitCell() ?? false
  }

  function currentCellAttrs(): Record<string, unknown> {
    if (!editor.value) return {}
    return editor.value.isActive('tableHeader') ? editor.value.getAttributes('tableHeader') : editor.value.getAttributes('tableCell')
  }
  function currentCellBackground(): string | null {
    void stateTick.value
    const color = currentCellAttrs().backgroundColor
    return typeof color === 'string' ? color : null
  }
  function currentTextStyle(key: 'color' | 'backgroundColor'): string | null {
    void stateTick.value
    const value = editor.value?.getAttributes('textStyle')[key]
    return typeof value === 'string' ? value : null
  }
  function currentLink(): string {
    void stateTick.value
    const href = editor.value?.getAttributes('link').href
    return typeof href === 'string' ? href : ''
  }

  /** The embedded block the selection is on — a diagram or a song chart — with its position. */
  function selectedBlock(): { type: 'diagram' | 'songChart'; pos: number } | null {
    void stateTick.value
    const selection = editor.value?.state.selection
    if (!(selection instanceof NodeSelection)) return null
    const name = selection.node.type.name
    if (name !== 'diagram' && name !== 'songChart') return null
    return { type: name, pos: selection.from }
  }

  return {
    focused,
    isActive,
    canUndo,
    canRedo,
    canMergeCells,
    canSplitCell,
    currentCellBackground,
    currentTextStyle,
    currentLink,
    selectedBlock,
    undo: () => chain()?.undo().run(),
    redo: () => chain()?.redo().run(),
    setParagraph: () => chain()?.setParagraph().run(),
    toggleHeading: (level: HeadingLevel) => chain()?.toggleHeading({ level }).run(),
    toggleBold: () => chain()?.toggleBold().run(),
    toggleItalic: () => chain()?.toggleItalic().run(),
    toggleStrike: () => chain()?.toggleStrike().run(),
    toggleHighlight: () => chain()?.toggleHighlight().run(),
    setFontColor: (color: string | null) => (color ? chain()?.setColor(color).run() : chain()?.unsetColor().run()),
    setBackgroundColor: (color: string | null) =>
      color ? chain()?.setBackgroundColor(color).run() : chain()?.unsetBackgroundColor().run(),
    setAlign: (align: TextAlignment) => chain()?.setTextAlign(align).run(),
    toggleBulletList: () => chain()?.toggleBulletList().run(),
    toggleOrderedList: () => chain()?.toggleOrderedList().run(),
    setLink: (href: string) => chain()?.extendMarkRange('link').setLink({ href }).run(),
    unsetLink: () => chain()?.extendMarkRange('link').unsetLink().run(),
    insertTable: () => chain()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    addColumn: () => chain()?.addColumnAfter().run(),
    deleteColumn: () => chain()?.deleteColumn().run(),
    addRow: () => chain()?.addRowAfter().run(),
    deleteRow: () => chain()?.deleteRow().run(),
    deleteTable: () => chain()?.deleteTable().run(),
    toggleHeaderRow: () => chain()?.toggleHeaderRow().run(),
    toggleHeaderColumn: () => chain()?.toggleHeaderColumn().run(),
    toggleHeaderCell: () => chain()?.toggleHeaderCell().run(),
    mergeCells: () => chain()?.mergeCells().run(),
    splitCell: () => chain()?.splitCell().run(),
    toggleCellBorder: () => {
      const hasNoBorder = currentCellAttrs().borderColor === 'transparent'
      chain()?.setCellAttribute('borderColor', hasNoBorder ? null : 'transparent').run()
    },
    setCellBackground: (color: string | null) => chain()?.setCellAttribute('backgroundColor', color).run(),
  }
}

export type PromptCommands = ReturnType<typeof usePromptCommands>
