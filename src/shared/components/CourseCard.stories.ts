import type { Meta, StoryObj } from '@storybook/vue3-vite'

import CourseCard from './CourseCard.vue'

const meta = {
  title: 'Cards & progress/CourseCard',
  component: CourseCard,
  args: {
    title: 'Triads for the working guitarist',
    summary: 'Major and minor triads in every region of the neck, then use them in songs.',
    createdBy: { user_id: '00000000-0000-4000-8000-000000000002', display_name: 'Ana Souza' },
    level: 'early_intermediate',
    checkpointCount: 4,
    lessonCount: 12,
    language: 'en',
    to: { name: 'course-catalog' },
  },
} satisfies Meta<typeof CourseCard>

export default meta
type Story = StoryObj<typeof meta>

export const Course: Story = {}
export const Path: Story = { args: { kind: 'path', checkpointCount: undefined } }
export const Minimal: Story = { args: { summary: undefined, createdBy: undefined, level: undefined, lessonCount: undefined } }
export const LongPortuguese: Story = {
  args: {
    title: 'Tríades para o violonista que toca na noite e precisa de repertório',
    summary: 'Tríades maiores e menores em todas as regiões do braço, depois aplicadas em músicas brasileiras.',
    language: 'pt_BR',
  },
}
