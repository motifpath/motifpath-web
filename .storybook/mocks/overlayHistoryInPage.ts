import type * as OverlayHistory from '@/shared/composables/useOverlayHistory'

/*
 * Overlay history for story tests that share a page: layers open and close as usual but leave the
 * browser history alone. Every story file's frame in one page shares a single session history, so
 * the Back a closing layer takes would step back whichever frame navigated last, under another
 * file's story mid-test. Back closing a layer is tested where the real one runs, one file at a time.
 */

export const installOverlayHistory: typeof OverlayHistory.installOverlayHistory = () => {}

export const useOverlayHistory: typeof OverlayHistory.useOverlayHistory = () => {}
