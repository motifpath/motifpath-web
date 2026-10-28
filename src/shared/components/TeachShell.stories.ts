import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { useCurrentUserStore } from '@/stores/currentUser'

import TeachShell from './TeachShell.vue'

const PAGE = `
  <main class="mx-auto flex w-full max-w-[880px] flex-col gap-3 px-4 py-8">
    <h1 class="text-[28px] font-bold text-ink">Song charts</h1>
    <p v-for="n in 6" :key="n" class="rounded-2xl border border-border bg-surface-raised p-4 text-sm text-ink-muted">Row {{ n }}</p>
  </main>`

const meta = {
  title: 'Teach/TeachShell',
  component: TeachShell,
  args: { section: 'admin-song-charts', bar: 'back' },
  decorators: [
    () => ({
      setup() {
        useCurrentUserStore().profile = {
          user_id: '00000000-0000-4000-8000-000000000001',
          role: 'admin',
          display_name: 'Ana Souza',
          locale: { code: 'en', name: 'English' },
          email: null,
          time_zone: null,
          email_preferences: { progress_report: true, reminders: true },
          registered_at: '2026-01-01T00:00:00Z',
        }
      },
      template: '<story />',
    }),
  ],
  render: (args) => ({
    components: { TeachShell },
    setup: () => ({ args }),
    template: `<TeachShell v-bind="args">${PAGE}</TeachShell>`,
  }),
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Teach: a sidebar of sections on a wide screen; a bar back to Teach home on a phone or a tablet. No learner navigation.' } },
  },
} satisfies Meta<typeof TeachShell>

export default meta
type Story = StoryObj<typeof meta>

export const SectionPage: Story = {}
export const TeachHome: Story = { args: { section: null, bar: 'home' } }
