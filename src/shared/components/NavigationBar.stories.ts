import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import NavigationBar from './NavigationBar.vue'

const meta = {
  title: 'Navigation/NavigationBar',
  component: NavigationBar,
  args: { current: 'home' },
  globals: { viewport: { value: 'compact' } },
} satisfies Meta<typeof NavigationBar>

export default meta
type Story = StoryObj<typeof meta>

const destinations = (canvasElement: HTMLElement) =>
  Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-test="nav-destination"]'))

export const Home: Story = {
  // A thumb needs at least 48 px each way.
  play: async ({ canvasElement }) => {
    for (const link of destinations(canvasElement)) {
      const { width, height } = link.getBoundingClientRect()
      await expect(width).toBeGreaterThanOrEqual(48)
      await expect(height).toBeGreaterThanOrEqual(48)
    }
  },
}
export const Practice: Story = { args: { current: 'practice' } }
export const MyPath: Story = { args: { current: 'myPath' } }
export const Learning: Story = { args: { current: 'learning' } }
export const Discover: Story = { args: { current: 'discover' } }
/** A page outside the five (credits): nothing is marked. */
export const NoneCurrent: Story = { args: { current: null } }

/** Início · Praticar · Trilha · Aprender · Explorar, each on one line on a 360 px phone. */
export const LongPortuguese: Story = {
  globals: { locale: 'pt-BR' },
  render: (args) => ({
    components: { NavigationBar },
    setup: () => ({ args }),
    template: '<div class="w-[360px]"><NavigationBar v-bind="args" /></div>',
  }),
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('nav')!
    await expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth)
    for (const link of destinations(canvasElement)) {
      const label = link.lastElementChild as HTMLElement
      await expect(label.getClientRects()).toHaveLength(1)
      await expect(label.scrollWidth).toBeLessThanOrEqual(link.clientWidth)
    }
  },
}
