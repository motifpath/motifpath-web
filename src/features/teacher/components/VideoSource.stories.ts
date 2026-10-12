import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import VideoSource from './VideoSource.vue'

const MB = 1024 * 1024

const meta = {
  title: 'Authoring/VideoSource',
  component: VideoSource,
  args: { state: { status: 'idle' } },
  decorators: [() => ({ template: '<div class="max-w-[22rem] p-4"><story /></div>' })],
} satisfies Meta<typeof VideoSource>

export default meta
type Story = StoryObj<typeof meta>

/** No video yet: the card is the file picker, with the format and the limit. */
export const Empty: Story = {}

/** Straight to storage, with the bar and × to cancel. */
export const Uploading: Story = {
  args: { state: { status: 'uploading', fileName: 'open-chords-lesson.mp4', loaded: 490 * MB, total: 980 * MB } },
}

/** The card stands for the video; ⋮ opens Play · Replace · Use a link instead · Remove. */
export const Uploaded: Story = {
  args: {
    state: { status: 'uploaded', fileName: 'open-chords-lesson.mp4', total: 980 * MB, objectUrl: 'https://media.test/lessons/a.mp4' },
  },
}

/** A video uploaded in an earlier visit: only its URL is known. */
export const Stored: Story = { args: { state: { status: 'stored' } } }

/** The menu of an uploaded video. */
export const StoredMenu: Story = {
  args: { state: { status: 'stored' } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Video options' }))
    const menu = within(document.body).getByRole('dialog', { name: 'Video' })
    await expect(within(menu).getByRole('button', { name: 'Remove' })).toBeVisible()
  },
}

/** The upload stopped: ↻ starts it again from the beginning. */
export const Failed: Story = {
  args: { state: { status: 'failed', fileName: 'open-chords-lesson.mp4', total: 980 * MB } },
}

/** Refused before anything was sent: not an MP4. */
export const RefusedFormat: Story = {
  args: { state: { status: 'refused', fileName: 'lesson.mov', size: 300 * MB, reason: 'format' } },
}

/** Refused before anything was sent: over 1 GB. */
export const RefusedSize: Story = {
  args: { state: { status: 'refused', fileName: 'long-lesson.mp4', size: 1.4 * 1024 * MB, reason: 'size' } },
}

export const UploadingDarkPortuguese: Story = { ...Uploading, globals: { theme: 'dark', locale: 'pt-BR' } }
export const FailedDark: Story = { ...Failed, globals: { theme: 'dark' } }
