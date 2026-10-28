/**
 * Practice sound is the point of the app, so it must play with the iPhone's silent switch on.
 * WebKit sets the OS audio session itself, from what the page plays: Web Audio alone counts as
 * ambient sound, which the silent switch mutes, whatever category the app chose at launch.
 * Declaring the page's sound as playback makes WebKit pick a category the switch doesn't mute.
 * Only WebKit offers `navigator.audioSession`, and TypeScript's DOM types don't declare it yet.
 */
export function playThroughSilentSwitch(browser: object = navigator): void {
  const session: unknown = Reflect.get(browser, 'audioSession')
  if (typeof session === 'object' && session !== null) Reflect.set(session, 'type', 'playback')
}
