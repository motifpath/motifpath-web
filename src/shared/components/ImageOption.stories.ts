import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'

import ImageOption from './ImageOption.vue'

const meta = {
  title: 'Practice/ImageOption',
  component: ImageOption,
  args: { keyHint: 1, label: 'Am' },
  render: (args) => ({
    setup: () => () =>
      h('div', { class: 'w-[165px]' }, [h(ImageOption, args, () => h('span', { class: 'text-xs text-ink-subtle' }, 'image or diagram'))]),
  }),
} satisfies Meta<typeof ImageOption>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = { args: { state: 'selected' } }
export const Right: Story = { args: { state: 'right' } }
export const Wrong: Story = { args: { state: 'wrong' } }
export const WithoutLabel: Story = { args: { label: undefined } }
