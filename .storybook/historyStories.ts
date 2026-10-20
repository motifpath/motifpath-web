/**
 * Stories that drive the browser's real history (Back, a router on createWebHistory). In one page,
 * every story file's frame shares a single session history, so a Back in one file can undo another
 * file's navigation and reload its frame mid-test. These run in a page of their own, one at a time.
 */
const NAMES = 'LearnerShell,OverlayLayer,PageBackBar,ToolsMenu'

/** The history stories, relative to the repo root. */
export const HISTORY_STORIES = `src/shared/components/{${NAMES}}.stories.ts`

/** Every other story file. */
export const OTHER_STORIES = [`src/!(shared)/**/*.stories.ts`, `src/shared/!(components)/**/*.stories.ts`, `src/shared/components/**/!(${NAMES.replaceAll(',', '|')}).stories.ts`]
