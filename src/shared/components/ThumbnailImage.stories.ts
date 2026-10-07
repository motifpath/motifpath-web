import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ThumbnailImage from './ThumbnailImage.vue'

const image =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="%237C3CFF"/><circle cx="160" cy="90" r="50" fill="%23F4EEFF"/></svg>'

const meta = {
  title: 'Cards & progress/ThumbnailImage',
  component: ThumbnailImage,
  args: { url: image, sizeClass: 'h-24 w-40 rounded-md' },
} satisfies Meta<typeof ThumbnailImage>

export default meta
type Story = StoryObj<typeof meta>

export const Cover: Story = {}
export const Contain: Story = { args: { fit: 'contain' } }
export const Missing: Story = { args: { url: undefined } }
export const Broken: Story = { args: { url: 'https://invalid.example/missing.png' } }
