import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { reactive } from 'vue'
import { routeLocationKey } from 'vue-router'

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

/** The rail has no Teach, so on Medium it stays in the menu. */
export const TeacherMedium: Story = { play: openMenu, globals: { role: 'teacher', viewport: { value: 'medium' } } }

/** The "Account" row at the foot of the sidebar; on a desktop Teach is the sidebar's, not the menu's. */
export const AccountRowExpanded: Story = {
  play: openMenu,
  globals: { role: 'teacher', viewport: { value: 'expanded' } },
  render: () => ({
    components: { AccountMenu },
    template: '<div class="flex h-[30rem] w-64 flex-col justify-end"><AccountMenu entry="row" /></div>',
  }),
}

export const LongPortuguese: Story = {
  play: openMenu,
  globals: { role: 'teacher', locale: 'pt-BR', viewport: { value: 'compact' } },
}

/** Inside Teach, "Back to learning" takes Teach's place and lands on Home. */
export const InsideTeach: Story = {
  play: openMenu,
  globals: { role: 'admin', viewport: { value: 'compact' } },
  render: () => ({
    components: { AccountMenu },
    provide: { [routeLocationKey as symbol]: reactive({
        name: 'teacher-content',
        path: '/teacher/content',
        fullPath: '/teacher/content',
        params: {},
        query: {},
        hash: '',
        matched: [],
        meta: { requiresRole: ['teacher', 'admin'] },
      }) },
    template: '<div class="flex justify-end"><AccountMenu /></div>',
  }),
}
