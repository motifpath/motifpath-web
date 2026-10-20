import { describe, expect, it } from 'vitest'

import { missingToPublishPath, missingToSavePath, type PathDraft } from '@/features/teacher/utils/pathRequirements'

const complete: PathDraft = {
  summary: 'Strumming from the first down stroke.',
  language: 'en',
  level: 'beginner',
  items: [
    { content_node_id: 'cn-1', title: 'Down strums' },
    { content_node_id: 'cn-2', title: 'Down-up strums' },
  ],
}

const allPublished = { published: new Set(['cn-1', 'cn-2']), known: new Set(['cn-1', 'cn-2']) }

describe('missingToSavePath', () => {
  it('needs a level and at least one lesson', () => {
    expect(missingToSavePath({ ...complete, level: null, items: [] })).toEqual(['level', 'items'])
  })

  it('needs nothing else: a draft may be saved incomplete', () => {
    expect(missingToSavePath({ ...complete, summary: '', language: null })).toEqual([])
  })
})

describe('missingToPublishPath', () => {
  it('needs nothing once complete with every lesson published', () => {
    expect(missingToPublishPath(complete, allPublished)).toEqual([])
  })

  it('needs a summary and a language, ignoring a blank summary', () => {
    expect(missingToPublishPath({ ...complete, summary: '  ', language: null }, allPublished)).toEqual([
      { kind: 'summary' },
      { kind: 'language' },
    ])
  })

  it('needs a level', () => {
    expect(missingToPublishPath({ ...complete, level: null }, allPublished)).toEqual([{ kind: 'level' }])
  })

  it('names each lesson that was never published', () => {
    const lessons = { published: new Set(['cn-1']), known: new Set(['cn-1', 'cn-2']) }

    expect(missingToPublishPath(complete, lessons)).toEqual([{ kind: 'unpublishedLesson', title: 'Down-up strums' }])
  })

  it('names no lesson whose state is not known yet', () => {
    const lessons = { published: new Set(['cn-1']), known: new Set(['cn-1']) }

    expect(missingToPublishPath(complete, lessons)).toEqual([])
  })
})
