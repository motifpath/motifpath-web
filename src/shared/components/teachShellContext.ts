import type { InjectionKey } from 'vue'

/**
 * Provided by Teach's shell to the pages inside it, so a bar a page brings leaves out what the
 * shell already offers: the sections, the way home and, on a wide screen, the account.
 */
export const IN_TEACH_SHELL: InjectionKey<boolean> = Symbol('inTeachShell')
