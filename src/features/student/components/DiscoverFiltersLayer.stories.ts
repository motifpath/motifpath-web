import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { within } from 'storybook/test'

import DiscoverFiltersLayer from './DiscoverFiltersLayer.vue'

const meta = {
  title: 'Discover/DiscoverFiltersLayer',
  component: DiscoverFiltersLayer,
  args: {
    open: true,
    segment: 'courses',
    filters: { levels: [], skills: [], concepts: [] },
    count: (filters) => Promise.resolve(Math.max(14 - 4 * filters.levels.length, 0)),
    instruments: [
      { id: 'inst-guitar', name: 'Guitar' },
      { id: 'inst-bass', name: 'Bass' },
      { id: 'inst-ukulele', name: 'Ukulele' },
    ],
    teacherName: null,
  },
} satisfies Meta<typeof DiscoverFiltersLayer>

export default meta
type Story = StoryObj<typeof meta>

/** The bottom sheet on a phone. */
export const Compact: Story = {}

export const Chosen: Story = {
  args: {
    filters: { levels: ['beginner', 'intermediate'], instrument: 'inst-guitar', language: 'en', teacher: 'u-ana', skills: [], concepts: [] },
    teacherName: 'Ana Souza',
  },
}

/** The teacher list replaces the sheet's content. */
export const TeacherList: Story = {
  // The layer sits on <body>, outside the story's canvas.
  play: async ({ userEvent }) => {
    await userEvent.click(await within(document.body).findByRole('button', { name: /Teacher/ }))
  },
}

export const Paths: Story = { args: { segment: 'paths', count: () => Promise.resolve(1) } }

export const CountFailed: Story = { args: { count: () => Promise.resolve(null) } }

/** From a tablet up, the same fields in a 480 px dialog. */
export const Medium: Story = { globals: { viewport: { value: 'medium', isRotated: false } } }
export const Expanded: Story = { globals: { viewport: { value: 'expanded', isRotated: false } } }
