import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AppButton from './AppButton.vue'
import StateBlock from './StateBlock.vue'

const meta = {
  title: 'States/StateBlock',
  component: StateBlock,
  args: {
    kind: 'empty',
    title: 'No courses yet',
    message: 'Courses you enrol in show up here, with where you stopped.',
  },
  render: (args) => ({
    components: { StateBlock, AppButton },
    setup: () => ({ args }),
    template: `
      <StateBlock v-bind="args">
        <template v-if="args.kind !== 'offline'" #action><AppButton>Find a course</AppButton></template>
      </StateBlock>`,
  }),
} satisfies Meta<typeof StateBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Locked: Story = {
  args: {
    kind: 'locked',
    title: 'This step opens later',
    message: 'Finish step 8, “Inversions on the top strings”, first. Steps open one by one.',
  },
}
export const NotFound: Story = {
  args: {
    kind: 'notFound',
    title: "This course isn't available",
    message: 'It may have been retired or replaced. Others on the same skills are in Discover.',
  },
}
/** A step with no version in the student's language, and the language it can be opened in. */
export const Language: Story = {
  args: {
    kind: 'language',
    title: 'Not in Portuguese yet',
    message: 'This lesson is only in English for now. Watch it in English — finishing it opens the next step.',
  },
}
/** Offline recovers by itself, so it has no action. */
export const Offline: Story = {
  args: { kind: 'offline', title: "You're offline", message: 'Discover needs a connection. Pages you already opened still work.' },
}
export const LongPortuguese: Story = {
  args: { title: 'Nenhum curso ainda', message: 'Os cursos em que você se inscrever aparecem aqui, com o ponto onde você parou.' },
}
