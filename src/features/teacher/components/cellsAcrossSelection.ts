import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { CellSelection, cellAround } from '@tiptap/pm/tables'

/**
 * Turns a text selection that runs from one table cell into another into a selection of those
 * cells, so Merge and the other cell commands can act on it.
 *
 * A mouse drag across cells already selects cells, but a touch screen has no such drag: a long
 * press and a drag of the selection handles reach the editor as a text selection instead, which
 * the table plugin would otherwise shrink back into the first cell. Runs before that plugin.
 */
export const CellsAcrossSelection = Extension.create({
  name: 'cellsAcrossSelection',
  // Ahead of the table extension, whose own pass would collapse the selection first.
  priority: 200,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('cellsAcrossSelection'),
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some((tr) => tr.selectionSet)) return null
          const { selection } = state
          if (!(selection instanceof TextSelection)) return null

          const $anchorCell = cellAround(selection.$anchor)
          const $headCell = cellAround(selection.$head)
          if (!$anchorCell || !$headCell || $anchorCell.pos === $headCell.pos) return null
          // Both ends must sit in the same table: the cell's parent row's parent.
          if ($anchorCell.node(-1) !== $headCell.node(-1)) return null

          return state.tr.setSelection(new CellSelection($anchorCell, $headCell))
        },
      }),
    ]
  },
})
