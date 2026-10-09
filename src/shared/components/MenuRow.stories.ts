import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Languages, LogOut } from 'lucide-vue-next'

import MenuRow from './MenuRow.vue'

const meta = {
  title: 'Navigation/MenuRow',
  component: MenuRow,
  args: { label: 'Language', icon: Languages, value: 'English', chevron: true },
} satisfies Meta<typeof MenuRow>

export default meta
type Story = StoryObj<typeof meta>

export const WithValue: Story = {}
export const Plain: Story = { args: { label: 'Sign out', icon: LogOut, value: undefined, chevron: false } }
export const Link: Story = { args: { label: 'Teach', value: 'Authoring', to: { name: 'teacher-content' } } }
export const LongPortuguese: Story = { args: { label: 'Idioma do aplicativo', value: 'Português (Brasil)' } }
