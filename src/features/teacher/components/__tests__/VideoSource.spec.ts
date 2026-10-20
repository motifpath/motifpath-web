import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import VideoSource from '@/features/teacher/components/VideoSource.vue'

const MB = 1024 * 1024

function pickFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change'))
}

describe('VideoSource', () => {
  it('offers an upload, with the format and the limit, when there is no video', () => {
    const wrapper = mount(VideoSource, { props: { state: { status: 'idle' } } })

    expect(wrapper.get('[data-test="video-source-title"]').text()).toBe('Upload a video')
    expect(wrapper.get('[data-test="video-source-meta"]').text()).toBe('MP4 (H.264) · up to 1 GB')
    expect(wrapper.get('[data-test="video-source-file-input"]').attributes('accept')).toBe('video/mp4,.mp4')
  })

  it('emits the chosen file', () => {
    const wrapper = mount(VideoSource, { props: { state: { status: 'idle' } } })
    const file = new File(['x'], 'open-chords-lesson.mp4', { type: 'video/mp4' })

    pickFile(wrapper.get<HTMLInputElement>('[data-test="video-source-file-input"]').element, file)

    expect(wrapper.emitted('choose')).toEqual([[file]])
  })

  it('shows the upload’s progress and lets it be cancelled', async () => {
    const wrapper = mount(VideoSource, {
      props: { state: { status: 'uploading', fileName: 'open-chords-lesson.mp4', loaded: 490 * MB, total: 980 * MB } },
    })

    expect(wrapper.get('[data-test="video-source-title"]').text()).toBe('open-chords-lesson.mp4')
    expect(wrapper.get('[data-test="video-source-meta"]').text()).toBe('490 of 980 MB · 50%')
    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('50')
    expect(wrapper.find('[data-test="video-source-file-input"]').exists()).toBe(false)

    await wrapper.get('[data-test="video-source-cancel"]').trigger('click')

    expect(wrapper.get('[data-test="video-source-cancel"]').attributes('aria-label')).toBe('Cancel upload')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('says the upload stopped and offers to try again', async () => {
    const wrapper = mount(VideoSource, {
      props: { state: { status: 'failed', fileName: 'open-chords-lesson.mp4', total: 980 * MB } },
    })

    expect(wrapper.get('[data-test="video-source-meta"]').text()).toBe('Upload stopped. Check your connection and try again.')

    await wrapper.get('[data-test="video-source-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('refuses a file that is not an MP4, and lets another be chosen', () => {
    const wrapper = mount(VideoSource, {
      props: { state: { status: 'refused', fileName: 'lesson.mov', size: 300 * MB, reason: 'format' } },
    })

    expect(wrapper.get('[data-test="video-source-title"]').text()).toBe('lesson.mov can’t be uploaded')
    expect(wrapper.get('[data-test="video-source-meta"]').text()).toBe(
      'Only MP4 (H.264), up to 1 GB. On an iPhone, set Camera › Formats › Most Compatible.',
    )
    expect(wrapper.find('[data-test="video-source-file-input"]').exists()).toBe(true)
  })

  it('refuses a file over 1 GB, saying how big it is', () => {
    const wrapper = mount(VideoSource, {
      props: { state: { status: 'refused', fileName: 'long-lesson.mp4', size: 1.4 * 1024 * MB, reason: 'size' } },
    })

    expect(wrapper.get('[data-test="video-source-meta"]').text()).toBe('long-lesson.mp4 is 1.4 GB; the limit is 1 GB.')
  })

  it('stands for the uploaded video, with its size', () => {
    const wrapper = mount(VideoSource, {
      props: {
        state: { status: 'uploaded', fileName: 'open-chords-lesson.mp4', total: 980 * MB, objectUrl: 'https://media.test/lessons/a.mp4' },
      },
    })

    expect(wrapper.get('[data-test="video-source-title"]').text()).toBe('open-chords-lesson.mp4')
    expect(wrapper.get('[data-test="video-source-meta"]').text()).toBe('MP4 · 980 MB · uploaded')
  })

  it('names a video uploaded earlier, whose file name is no longer known', () => {
    const wrapper = mount(VideoSource, { props: { state: { status: 'stored' } } })

    expect(wrapper.get('[data-test="video-source-title"]').text()).toBe('Uploaded video')
    expect(wrapper.get('[data-test="video-source-meta"]').text()).toBe('MP4 · uploaded')
  })

  it.each([
    ['video-source-play', 'play'],
    ['video-source-use-link', 'useLink'],
    ['video-source-remove', 'remove'],
  ] as const)('its menu’s %s action emits %s and closes the menu', async (testId, event) => {
    const wrapper = mount(VideoSource, { props: { state: { status: 'stored' } }, attachTo: document.body })

    await wrapper.get('[data-test="video-source-more"]').trigger('click')
    const item = document.body.querySelector<HTMLButtonElement>(`[data-test="${testId}"]`)
    item?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted(event)).toHaveLength(1)
    expect(document.body.querySelector('[data-test="video-source-menu"]')).toBeNull()
    wrapper.unmount()
  })

  it('its menu replaces the video with another file', async () => {
    const wrapper = mount(VideoSource, { props: { state: { status: 'stored' } }, attachTo: document.body })
    const file = new File(['x'], 'new-take.mp4', { type: 'video/mp4' })

    await wrapper.get('[data-test="video-source-more"]').trigger('click')
    const input = document.body.querySelector<HTMLInputElement>('[data-test="video-source-replace-input"]')
    if (input) pickFile(input, file)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('choose')).toEqual([[file]])
    expect(document.body.querySelector('[data-test="video-source-menu"]')).toBeNull()
    wrapper.unmount()
  })
})
