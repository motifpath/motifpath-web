import { ref } from 'vue'

/** A part of the account menu a link can open it on. */
export type AccountMenuView = 'emails'

// Module-level, like the toasts: the route that asks and whichever account menu the shell has
// mounted must see the same request.
const pending = ref<AccountMenuView | null>(null)

/**
 * Asks the account menu to open on one of its views, for a link that leads there (the email
 * settings link). The request waits until a mounted menu takes it, so it survives the
 * navigation that mounts the menu.
 */
export function useAccountMenuRequest() {
  function request(view: AccountMenuView): void {
    pending.value = view
  }

  function take(): AccountMenuView | null {
    const view = pending.value
    pending.value = null
    return view
  }

  return { pending, request, take }
}
