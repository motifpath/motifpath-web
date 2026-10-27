import type { Meta, StoryObj } from '@storybook/vue3-vite'

import UnsubscribeScreen from './UnsubscribeScreen.vue'

const meta = {
  title: 'Auth/UnsubscribeScreen',
  component: UnsubscribeScreen,
  parameters: { layout: 'fullscreen' },
  args: { state: 'done', kind: 'progress_report' },
} satisfies Meta<typeof UnsubscribeScreen>

export default meta
type Story = StoryObj<typeof meta>

/** Opened from a progress report: that kind is off, and nothing is said of the other. */
export const ProgressReportsOff: Story = {}
/** Opened from a reminder. */
export const RemindersOff: Story = { args: { kind: 'reminders' } }
/** While the link is used. */
export const Working: Story = { args: { state: 'working', kind: null } }
/** An altered or cut-off link: nothing changed, and the settings are still one tap away. */
export const BrokenLink: Story = { args: { state: 'broken', kind: null } }
/** The server couldn't be reached: nothing changed, and trying again may work. */
export const CouldNotReach: Story = { args: { state: 'failed', kind: null } }
export const LongPortuguese: Story = { args: { kind: 'reminders' }, globals: { locale: 'pt-BR' } }
