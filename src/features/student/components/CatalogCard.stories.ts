import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { CatalogItem } from '@/features/student/utils/catalogItem'

import CatalogCard from './CatalogCard.vue'

const thumbnail =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g"><stop offset="0" stop-color="#d4703a"/><stop offset="1" stop-color="#7a2f12"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>',
  )

const course: CatalogItem = {
  kind: 'course',
  id: 'c-foundations',
  title: 'Guitar foundations',
  level: 'beginner',
  language: 'en',
  createdBy: { user_id: 'u-ana', display_name: 'Ana Souza' },
  instrumentIds: [],
  thumbnailUrl: thumbnail,
  partCount: 4,
  lessonCount: 44,
}

const meta = {
  title: 'Discover/CatalogCard',
  component: CatalogCard,
  args: { item: course, badge: null, layout: 'row', to: '/' },
  render: (args) => ({
    components: { CatalogCard },
    setup: () => ({ args }),
    template: `<div :class="args.layout === 'row' ? 'max-w-[35rem]' : 'w-64'"><CatalogCard v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof CatalogCard>

export default meta
type Story = StoryObj<typeof meta>

export const Row: Story = {}

export const RowInLearning: Story = { args: { badge: 'in-learning' } }

export const RowFinished: Story = { args: { badge: 'finished' } }

export const PathWithoutThumbnail: Story = {
  args: {
    item: { ...course, kind: 'path', id: 'lp-open', title: 'Open chords', thumbnailUrl: undefined, partCount: undefined, lessonCount: 9 },
  },
}

export const Tile: Story = { args: { layout: 'tile' } }

export const TileInLearning: Story = { args: { layout: 'tile', badge: 'in-learning' } }

export const TileFinished: Story = { args: { layout: 'tile', badge: 'finished' } }
