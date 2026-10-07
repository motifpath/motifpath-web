import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PrimaryButton from './PrimaryButton.vue'
import StateEmpty from './StateEmpty.vue'

const meta = {
  title: 'States/StateEmpty',
  component: StateEmpty,
  args: { heading: 'No courses yet', message: 'Courses you enrol in show up here.' },
} satisfies Meta<typeof StateEmpty>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithAction: Story = {
  render: (args) => ({
    components: { StateEmpty, PrimaryButton },
    setup: () => ({ args }),
    template: '<StateEmpty v-bind="args"><template #action><PrimaryButton>Find a course</PrimaryButton></template></StateEmpty>',
  }),
}

export const LongPortuguese: Story = {
  args: {
    heading: 'Você ainda não se matriculou em nenhum curso',
    message: 'Os cursos em que você se matricular aparecem aqui, com o seu progresso e a próxima aula a fazer.',
  },
}
