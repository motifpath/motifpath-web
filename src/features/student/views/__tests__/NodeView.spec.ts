import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type * as VueRouter from 'vue-router'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => ({ params: { nodeId: 'node-abc' } }) }
})

import NodeView from '@/features/student/views/NodeView.vue'

describe('NodeView', () => {
  it("links to this node's practice route", () => {
    const wrapper = mount(NodeView, { global: { stubs: { RouterLink: RouterLinkStub } } })

    const link = wrapper
      .findAllComponents(RouterLinkStub)
      .find((candidate) => candidate.attributes('data-test') === 'practice-link')
    expect(link?.props('to')).toEqual({ name: 'practice', params: { nodeId: 'node-abc' } })
  })
})
