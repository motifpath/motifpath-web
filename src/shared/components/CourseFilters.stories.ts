import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { failing, respondWith } from '@/shared/testUtils/msw/handlers'

import CourseFilters from './CourseFilters.vue'

const meta = {
  title: 'Selection/CourseFilters',
  component: CourseFilters,
  args: { hasActiveFilters: false, searchText: '', levels: [], skillIds: [], conceptIds: [], instrumentFilter: true },
} satisfies Meta<typeof CourseFilters>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Compact: Story = { args: { compact: true } }
export const WithAllFilters: Story = { args: { languageFilter: true, hasActiveFilters: true } }

/** No instruments, skills, concepts or teachers to filter by yet. */
export const Empty: Story = {
  parameters: {
    msw: {
      handlers: {
        instruments: respondWith('instruments', []),
        knowledgeNodes: respondWith('knowledgeNodes', []),
        creators: respondWith('creators', []),
      },
    },
  },
}

/** Every option list fails to load. */
export const Failed: Story = {
  parameters: {
    msw: {
      handlers: {
        instruments: failing('instruments'),
        knowledgeNodes: failing('knowledgeNodes'),
        knowledgeEdges: failing('knowledgeEdges'),
        creators: failing('creators'),
      },
    },
  },
}
