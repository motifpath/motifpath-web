import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

import PromptEditor from './PromptEditor.vue'

type PromptDocument = components['schemas']['PromptDocument']

const findTheA: PromptDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Find the A' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Tap where the A is on ' },
        { type: 'text', text: 'string 5', marks: [{ type: 'bold' }] },
        { type: 'text', text: '. Count up from the open string — every fret is one half step.' },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: ['Fret', '0', '5', '7'].map((text) => ({
            type: 'tableHeader',
            content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
          })),
        },
        {
          type: 'tableRow',
          content: ['Note', 'E', 'A', 'B'].map((text) => ({
            type: 'tableCell',
            content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
          })),
        },
      ],
    },
    {
      type: 'bulletList',
      content: ['Open string = E', '5th fret = A'].map((text) => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      })),
    },
  ],
}

const meta = {
  title: 'Teach/PromptEditor',
  component: PromptEditor,
  args: { modelValue: findTheA, label: 'Prompt shown to the student', songCharts: false },
  render: (args) => ({
    components: { PromptEditor },
    setup: () => ({ args, document: ref(args.modelValue) }),
    template: '<div class="p-4"><PromptEditor v-bind="args" v-model="document" /></div>',
  }),
} satisfies Meta<typeof PromptEditor>

export default meta
type Story = StoryObj<typeof meta>

/** Tap into the text: the bar docks above the keyboard, with Format, Insert and, in the table, Table. */
export const Phone: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } }
/** Today's one-row toolbar, from Medium up. */
export const Tablet: Story = { parameters: { viewport: { defaultViewport: 'tablet' } } }
export const Computer: Story = {}
/** An article lesson: Insert also offers a song chart. */
export const ArticleOnPhone: Story = { args: { songCharts: true }, parameters: { viewport: { defaultViewport: 'mobile1' } } }
