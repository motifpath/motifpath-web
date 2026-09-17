import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PromptRenderer from '@/shared/components/PromptRenderer.vue'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']

function doc(content: PromptDocument['content']): PromptDocument {
  return { type: 'doc', content }
}

describe('PromptRenderer', () => {
  it('renders a single unformatted paragraph', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          { type: 'paragraph', content: [{ type: 'text', text: 'What note is this?' }] },
        ]),
      },
    })

    expect(wrapper.text()).toContain('What note is this?')
  })

  it('renders a heading at its level', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Circle of fifths' }],
          },
        ]),
      },
    })

    const heading = wrapper.get('h2')
    expect(heading.text()).toBe('Circle of fifths')
  })

  it('applies bold, italic, strike, and highlight marks', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
              { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
              { type: 'text', text: 'strike', marks: [{ type: 'strike' }] },
              { type: 'text', text: 'highlight', marks: [{ type: 'highlight' }] },
            ],
          },
        ]),
      },
    })

    expect(wrapper.find('.font-bold').text()).toBe('bold')
    expect(wrapper.find('.italic').text()).toBe('italic')
    expect(wrapper.find('.line-through').text()).toBe('strike')
    expect(wrapper.find('.bg-accent-muted').text()).toBe('highlight')
  })

  it('applies a textStyle mark\'s font color and background color as inline style', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Circle of fifths',
                marks: [{ type: 'textStyle', attrs: { color: '#6d28e0', backgroundColor: '#f3ecff' } }],
              },
            ],
          },
        ]),
      },
    })

    const span = wrapper.get('span')
    expect(span.attributes('style')).toContain('color: rgb(109, 40, 224)')
    expect(span.attributes('style')).toContain('background-color: rgb(243, 236, 255)')
  })

  it('renders a link mark as an anchor with its href', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'circle of fifths',
                marks: [{ type: 'link', attrs: { href: 'https://example.com/circle-of-fifths' } }],
              },
            ],
          },
        ]),
      },
    })

    const link = wrapper.get('a')
    expect(link.text()).toBe('circle of fifths')
    expect(link.attributes('href')).toBe('https://example.com/circle-of-fifths')
  })

  it('renders bullet and ordered lists with their items', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Major keys' }] }],
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step one' }] }],
              },
            ],
          },
        ]),
      },
    })

    expect(wrapper.get('ul li').text()).toBe('Major keys')
    expect(wrapper.get('ol li').text()).toBe('Step one')
  })

  it('renders a table with its header and cell text', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'text', text: 'Key' }] },
                  { type: 'tableCell', content: [{ type: 'text', text: 'C major' }] },
                ],
              },
            ],
          },
        ]),
      },
    })

    expect(wrapper.get('table th').text()).toBe('Key')
    expect(wrapper.get('table td').text()).toBe('C major')
  })

  it("applies a table cell's background color and border color as inline style", () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: { backgroundColor: '#f3ecff', borderColor: 'transparent' },
                    content: [{ type: 'text', text: 'C major' }],
                  },
                ],
              },
            ],
          },
        ]),
      },
    })

    const style = wrapper.get('table td').attributes('style')
    expect(style).toContain('background-color: rgb(243, 236, 255)')
    expect(style).toContain('border-color: transparent')
  })

  it('renders an image with its src and alt', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'image',
            attrs: { src: 'https://cdn.example.com/circle-of-fifths.png', alt: 'Circle of fifths diagram' },
          },
        ]),
      },
    })

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('https://cdn.example.com/circle-of-fifths.png')
    expect(img.attributes('alt')).toBe('Circle of fifths diagram')
  })
})
