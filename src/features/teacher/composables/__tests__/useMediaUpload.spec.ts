import { beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'

describe('useMediaUpload', () => {
  beforeEach(() => {
    POST.mockReset()
    fetchMock.mockReset()
  })

  it('requests an upload URL, PUTs the file, and returns the object_url', async () => {
    POST.mockResolvedValueOnce({
      data: {
        upload_url: 'https://storage.example.com/put?sig=1',
        object_url: 'https://cdn.example.com/library/abc.png',
        expires_at: '2026-01-01T00:00:00Z',
      },
      error: undefined,
      response: { status: 201 },
    })
    fetchMock.mockResolvedValueOnce({ ok: true })

    const { upload } = useMediaUpload()
    const file = new File(['data'], 'diagram.png', { type: 'image/png' })

    const objectUrl = await upload(file, 'image')

    expect(POST).toHaveBeenCalledWith('/media/upload-url', {
      body: { purpose: 'library_asset', content_type: 'image', file_name: 'diagram.png' },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.com/put?sig=1',
      expect.objectContaining({
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'image/png' },
      }),
    )
    expect(objectUrl).toBe('https://cdn.example.com/library/abc.png')
  })

  it("PUTs with audio/mpeg for content type 'audio' — the backend signs the presigned URL against this exact fixed MIME type per category, not the file's own type", async () => {
    POST.mockResolvedValueOnce({
      data: {
        upload_url: 'https://storage.example.com/put?sig=2',
        object_url: 'https://cdn.example.com/library/clip.mp3',
        expires_at: '2026-01-01T00:00:00Z',
      },
      error: undefined,
      response: { status: 201 },
    })
    fetchMock.mockResolvedValueOnce({ ok: true })

    const { upload } = useMediaUpload()
    await upload(new File(['data'], 'clip.wav', { type: 'audio/wav' }), 'audio')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.com/put?sig=2',
      expect.objectContaining({ headers: { 'Content-Type': 'audio/mpeg' } }),
    )
  })

  it('throws when requesting the upload URL fails', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'nope' }, response: { status: 400 } })

    const { upload } = useMediaUpload()

    await expect(upload(new File(['x'], 'x.png'), 'image')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when the PUT upload fails', async () => {
    POST.mockResolvedValueOnce({
      data: { upload_url: 'https://storage.example.com/put', object_url: 'https://cdn.example.com/x.png', expires_at: '2026-01-01T00:00:00Z' },
      error: undefined,
      response: { status: 201 },
    })
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })

    const { upload } = useMediaUpload()

    await expect(upload(new File(['x'], 'x.png'), 'image')).rejects.toThrow()
  })
  it('uploads a thumbnail under the thumbnail purpose, as an image', async () => {
    POST.mockResolvedValueOnce({
      data: {
        upload_url: 'https://storage.example.com/put?sig=2',
        object_url: 'https://cdn.example.com/thumbnails/abc.png',
        expires_at: '2026-01-01T00:00:00Z',
      },
      error: undefined,
      response: { status: 201 },
    })
    fetchMock.mockResolvedValueOnce({ ok: true })

    const { uploadThumbnail } = useMediaUpload()
    const file = new File(['data'], 'cover.jpg', { type: 'image/jpeg' })

    const objectUrl = await uploadThumbnail(file)

    expect(POST).toHaveBeenCalledWith('/media/upload-url', {
      body: { purpose: 'thumbnail', content_type: 'image', file_name: 'cover.jpg' },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.com/put?sig=2',
      expect.objectContaining({ method: 'PUT', body: file, headers: { 'Content-Type': 'image/png' } }),
    )
    expect(objectUrl).toBe('https://cdn.example.com/thumbnails/abc.png')
  })
})
