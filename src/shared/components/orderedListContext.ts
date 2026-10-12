import type { InjectionKey, Ref } from 'vue'

/** What an OrderedList shares with its rows so a row's handle can drag it within the list. */
export interface OrderedListContext {
  /** The row being dragged, or null. */
  draggingIndex: Readonly<Ref<number | null>>
  /** The row the dragged one would land on, or null. */
  overIndex: Readonly<Ref<number | null>>
  startDrag: (index: number, event: PointerEvent) => void
  /** Moves a row without dragging, from its menu. */
  move: (from: number, to: number) => void
}

export const ORDERED_LIST: InjectionKey<OrderedListContext> = Symbol('orderedList')
