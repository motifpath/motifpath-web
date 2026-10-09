import { delay, http, HttpResponse, type HttpHandler, type JsonBodyType } from 'msw'

import * as fixtures from './fixtures'

/**
 * The core API as stories see it. Each entry is named so a story can replace
 * one endpoint — `parameters.msw.handlers.instruments` — and keep the rest.
 * Paths start with `*` so they match whatever base URL the build points at.
 */
export const endpoints = {
  // Before `diagram`: `/diagrams/creators` would otherwise match `/diagrams/:diagram_id`.
  creators: '*/creators',
  instruments: '*/instruments',
  voices: '*/voices',
  diagram: '*/diagrams/:diagram_id',
  knowledgeNodes: '*/knowledge-nodes',
  knowledgeEdges: '*/knowledge-edges',
  practiceOverview: '*/students/me/practice-overview',
  practiceSummary: '*/students/me/practice-summary',
} as const

type Endpoint = keyof typeof endpoints

/** Answers `endpoint` with `body`. */
export function respondWith(endpoint: Endpoint, body: JsonBodyType): HttpHandler {
  return http.get(endpoints[endpoint], () => HttpResponse.json(body))
}

/** Answers `endpoint` with a server error, for a story's error state. */
export function failing(endpoint: Endpoint): HttpHandler {
  return http.get(endpoints[endpoint], () => HttpResponse.json({ message: 'Mock server error' }, { status: 500 }))
}

/** Never answers `endpoint`, for a story's loading state. */
export function pending(endpoint: Endpoint): HttpHandler {
  return http.get(endpoints[endpoint], async () => {
    await delay('infinite')
    return new HttpResponse(null, { status: 204 })
  })
}

export const defaultHandlers: Record<Endpoint, HttpHandler> = {
  creators: respondWith('creators', fixtures.creators),
  instruments: respondWith('instruments', fixtures.instruments),
  voices: respondWith('voices', fixtures.voices),
  diagram: http.get(endpoints.diagram, ({ params }) =>
    params.diagram_id === fixtures.diagram.diagram_id
      ? HttpResponse.json(fixtures.diagram)
      : HttpResponse.json({ message: 'Diagram not found' }, { status: 404 }),
  ),
  knowledgeNodes: http.get(endpoints.knowledgeNodes, ({ request }) =>
    HttpResponse.json(new URL(request.url).searchParams.get('kind') === 'concept' ? fixtures.conceptNodes : fixtures.skillNodes),
  ),
  knowledgeEdges: respondWith('knowledgeEdges', []),
  practiceOverview: respondWith('practiceOverview', fixtures.practiceOverview),
  practiceSummary: respondWith('practiceSummary', fixtures.practiceSummary),
}
