import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PageBackBar from './PageBackBar.vue'

const meta = {
  title: 'Navigation/PageBackBar',
  component: PageBackBar,
  args: { title: 'Major triads', to: { name: 'path' }, backLabel: 'Back to My path' },
} satisfies Meta<typeof PageBackBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** A long path title stays on one line. */
export const LongPortuguese: Story = {
  args: { title: 'Tríades maiores nas cordas agudas e suas inversões', backLabel: 'Voltar para Minha trilha' },
}
