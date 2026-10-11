import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FirstRun from './FirstRun.vue'

const meta = {
  title: 'Pages/FirstRun',
  component: FirstRun,
} satisfies Meta<typeof FirstRun>

export default meta
type Story = StoryObj<typeof meta>

/** A brand-new student's home: two questions before Where to start. */
export const Questions: Story = {}
export const QuestionsDarkPortuguese: Story = { globals: { theme: 'dark', locale: 'pt-BR' } }
