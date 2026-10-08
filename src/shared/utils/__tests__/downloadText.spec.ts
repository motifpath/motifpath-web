import { afterEach, describe, expect, it, vi } from 'vitest'

const createObjectURL = vi.fn((blob: Blob) => (blob.size >= 0 ? 'blob:chart' : ''))
const revokeObjectURL = vi.fn()
vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

import { downloadText, fileSlug } from '@/shared/utils/downloadText'

afterEach(() => vi.restoreAllMocks())

/** A blob's text; jsdom's Blob has no text(). */
function readText(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsText(blob)
  })
}

describe('fileSlug', () => {
  it.each([
    ['Amazing Grace', 'amazing-grace'],
    ['Ciranda, Cirandinha', 'ciranda-cirandinha'],
    ['Oh! Susanna', 'oh-susanna'],
    ['Asa Branca (ao vivo)', 'asa-branca-ao-vivo'],
    ['Pé de Pano', 'pe-de-pano'],
    ['!!!', 'untitled'],
  ])('names "%s" as %s', (title, slug) => {
    expect(fileSlug(title)).toBe(slug)
  })
})

describe('downloadText', () => {
  it('saves the text as a file with the given name', async () => {
    const clicked: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download)
    })

    downloadText('amazing-grace.cho', '{title: Amazing Grace}\n')

    const blob = createObjectURL.mock.calls[0]![0]
    expect(await readText(blob)).toBe('{title: Amazing Grace}\n')
    expect(clicked).toEqual(['amazing-grace.cho'])
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:chart')
  })
})
