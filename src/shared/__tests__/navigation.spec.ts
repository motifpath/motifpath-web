import { describe, expect, it } from 'vitest'

import { LEARNER_DESTINATIONS, destinationOf } from '@/shared/navigation'

describe('LEARNER_DESTINATIONS', () => {
  it('lists Home, Practice, My path, Learning and Discover, in that order', () => {
    expect(LEARNER_DESTINATIONS.map((destination) => destination.id)).toEqual([
      'home',
      'practice',
      'myPath',
      'learning',
      'discover',
    ])
  })

  it('opens Practice straight into the session setup', () => {
    expect(LEARNER_DESTINATIONS.find((destination) => destination.id === 'practice')?.to).toEqual({
      name: 'practice-session',
    })
  })

  it('opens Discover on the course catalog', () => {
    expect(LEARNER_DESTINATIONS.find((destination) => destination.id === 'discover')?.to).toEqual({
      name: 'course-catalog',
    })
  })
})

describe('destinationOf', () => {
  it.each([
    ['home', 'home'],
    ['practice-session', 'practice'],
    ['path', 'myPath'],
    ['node', 'myPath'],
    ['practice', 'myPath'],
    ['my-courses', 'learning'],
    ['course-completed', 'learning'],
    ['course-catalog', 'discover'],
    ['course-detail', 'discover'],
    ['path-catalog', 'discover'],
    ['path-detail', 'discover'],
  ])('puts the %s route under %s', (routeName, destination) => {
    expect(destinationOf(routeName)).toBe(destination)
  })

  it('puts a page outside every destination under none', () => {
    expect(destinationOf('credits')).toBeNull()
    expect(destinationOf(undefined)).toBeNull()
  })
})
