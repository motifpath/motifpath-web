import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import { failing, respondWith } from '@/shared/testUtils/msw/handlers'

import StudentSearchField from './StudentSearchField.vue'

const camila = { user_id: '00000000-0000-4000-8000-0000000000c1', display_name: 'Camila Duarte' }

const meta = {
  title: 'Engagement/StudentSearchField',
  component: StudentSearchField,
  args: { modelValue: null },
} satisfies Meta<typeof StudentSearchField>

export default meta
type Story = StoryObj<typeof meta>

async function openList({ canvasElement }: { canvasElement: HTMLElement }) {
  await userEvent.click(within(canvasElement).getByRole('combobox'))
  await expect(await within(canvasElement).findByText('Camila Rocha')).toBeVisible()
}

export const Empty: Story = {}
export const Picked: Story = { args: { modelValue: camila } }
export const PickedLongName: Story = {
  args: { modelValue: { user_id: camila.user_id, display_name: 'Maria Eduarda Albuquerque de Souza Pinto' } },
  globals: { viewport: { value: 'compact' } },
}
export const Open: Story = { play: openList }
export const NoMatches: Story = {
  parameters: { msw: { handlers: { alphaStudents: respondWith('alphaStudents', { items: [], total: 0, limit: 20, offset: 0 }) } } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'))
    await expect(await within(canvasElement).findByRole('status')).toBeVisible()
  },
}
export const Failed: Story = {
  parameters: { msw: { handlers: { alphaStudents: failing('alphaStudents') } } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'))
    await expect(await within(canvasElement).findByRole('status')).toBeVisible()
  },
}
export const OpenDark: Story = { play: openList, globals: { theme: 'dark' } }
export const LongPortuguese: Story = { args: { modelValue: camila }, globals: { locale: 'pt-BR' } }
