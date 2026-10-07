import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CourseFilters from './CourseFilters.vue'

const meta = {
  title: 'Selection/CourseFilters',
  component: CourseFilters,
  args: { hasActiveFilters: false, searchText: '', levels: [], skillIds: [], conceptIds: [] },
  parameters: { docs: { description: { component: 'Loads its options from the API; until Storybook has a mock API it shows its loading or error state.' } } },
} satisfies Meta<typeof CourseFilters>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Compact: Story = { args: { compact: true } }
export const WithAllFilters: Story = { args: { instrumentFilter: true, languageFilter: true, hasActiveFilters: true } }
