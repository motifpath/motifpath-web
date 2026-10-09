import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AccountMenu from './AccountMenu.vue'

const meta = {
  title: 'Navigation/AccountMenu',
  component: AccountMenu,
  render: () => ({ components: { AccountMenu }, template: '<div class="flex justify-end"><AccountMenu /></div>' }),
} satisfies Meta<typeof AccountMenu>

export default meta
type Story = StoryObj<typeof meta>

const openMenu: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: /account menu|menu da conta/i }))
}

const openLanguage: Story['play'] = async (context) => {
  await openMenu(context)
  const { userEvent } = context
  await userEvent.click(document.querySelector<HTMLElement>('[data-test="account-language"]')!)
}

export const Closed: Story = {}

/** A bottom sheet on a phone. */
export const StudentCompact: Story = { play: openMenu, globals: { viewport: { value: 'compact' } } }

/** Teachers and admins get Teach, and their role under the name. */
export const TeacherCompact: Story = { play: openMenu, globals: { role: 'teacher', viewport: { value: 'compact' } } }

/** The Language sub-view replaces the sheet's content. */
export const LanguageCompact: Story = { play: openLanguage, globals: { viewport: { value: 'compact' } } }

/** A menu anchored to the avatar on Medium and Expanded. */
export const MenuExpanded: Story = { play: openMenu, globals: { role: 'admin', viewport: { value: 'expanded' } } }

export const LongPortuguese: Story = {
  play: openMenu,
  globals: { role: 'teacher', locale: 'pt-BR', viewport: { value: 'compact' } },
}
