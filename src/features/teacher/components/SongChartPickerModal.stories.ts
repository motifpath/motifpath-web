import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { respondWith } from '@/shared/testUtils/msw/handlers'
import { makeRevisionSummary } from '@/shared/testUtils/songChart'

import SongChartPickerModal from './SongChartPickerModal.vue'

function published(id: string, title: string, artist: string, language: string) {
  return {
    song_chart_id: id,
    title,
    artist,
    language,
    status: 'published',
    rights_confirmed: true,
    published_revision_number: 1,
    published_revision: { ...makeRevisionSummary(1, title), artist, language },
    updated_by: { user_id: 'u-ana', display_name: 'Ana' },
    updated_at: '2026-10-07T12:00:00Z',
  }
}

const items = [
  published('00000000-0000-4000-8000-000000000001', 'Amazing Grace', 'John Newton', 'en'),
  published('00000000-0000-4000-8000-000000000002', 'Ciranda, Cirandinha', 'Tradicional', 'pt_BR'),
  published('00000000-0000-4000-8000-000000000003', 'Home on the Range', 'Brewster M. Higley', 'en'),
]

const meta = {
  title: 'Teacher/SongChartPickerModal',
  component: SongChartPickerModal,
  args: { open: true },
  parameters: {
    msw: { handlers: { songCharts: respondWith('songCharts', { items, total: items.length, limit: 20, offset: 0 }) } },
    docs: { description: { component: 'Insert → Song chart in an article lesson: a full-screen layer on a phone, a two-pane dialog on a wide screen.' } },
  },
} satisfies Meta<typeof SongChartPickerModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
