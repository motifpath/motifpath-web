<script setup lang="ts">
import { h } from 'vue'
import type { FunctionalComponent, VNode } from 'vue'

import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']
type PromptNode = components['schemas']['PromptNode']
type PromptMark = components['schemas']['PromptMark']
type PromptAttrs = PromptNode['attrs']

defineProps<{ document: PromptDocument }>()

function attrString(attrs: PromptAttrs, key: string): string | undefined {
  const value = attrs?.[key]
  return typeof value === 'string' ? value : undefined
}

function attrNumber(attrs: PromptAttrs, key: string): number | undefined {
  const value = attrs?.[key]
  return typeof value === 'number' ? value : undefined
}

function markClass(type: PromptMark['type']): string | undefined {
  switch (type) {
    case 'bold':
      return 'font-bold'
    case 'italic':
      return 'italic'
    case 'strike':
      return 'line-through'
    case 'highlight':
      return 'rounded bg-accent-muted px-0.5'
    default:
      return undefined
  }
}

function alignClass(node: PromptNode): string | undefined {
  switch (attrString(node.attrs, 'textAlign')) {
    case 'center':
      return 'text-center'
    case 'right':
      return 'text-right'
    case 'justify':
      return 'text-justify'
    default:
      return undefined
  }
}

const headingClasses: Record<number, string> = {
  1: 'text-xl font-bold',
  2: 'text-lg font-bold',
  3: 'text-base font-bold',
}

// Mirrors the protocol allowlist the editor's own Tiptap Link extension
// validates against on write (@tiptap/extension-link's isAllowedUri).
// attrs is free-form and unvalidated server-side, so a link mark's href
// could in principle be a "javascript:" URL from a hand-crafted API
// payload that never went through the editor — this is the render-side
// backstop against that, not just a UX nicety.
const SAFE_HREF_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

function isSafeHref(href: string): boolean {
  try {
    // A relative href (no scheme) resolves against the base and inherits
    // its protocol, which is safe; an absolute href with its own scheme
    // ignores the base entirely, so this correctly checks the real
    // resolved protocol either way.
    return SAFE_HREF_PROTOCOLS.includes(new URL(href, 'https://motifpath.invalid').protocol)
  } catch {
    return false
  }
}

function textStyle(marks: PromptMark[]): { color?: string; backgroundColor?: string } {
  const mark = marks.find((m) => m.type === 'textStyle')
  if (!mark) return {}
  const color = attrString(mark.attrs, 'color')
  const backgroundColor = attrString(mark.attrs, 'backgroundColor')
  return {
    ...(color ? { color } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
  }
}

function renderText(node: PromptNode): VNode {
  const marks = node.marks ?? []
  const link = marks.find((m) => m.type === 'link')
  const classes = marks.map((m) => markClass(m.type)).filter((c): c is string => !!c)
  const text = node.text ?? ''
  const style = textStyle(marks)
  const href = link ? attrString(link.attrs, 'href') : undefined

  if (href && isSafeHref(href)) {
    return h(
      'a',
      {
        href,
        class: [...classes, 'text-accent underline'],
        style,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      text,
    )
  }
  return h('span', { class: classes, style }, text)
}

function cellStyle(node: PromptNode): { backgroundColor?: string; borderColor?: string } {
  const backgroundColor = attrString(node.attrs, 'backgroundColor')
  const borderColor = attrString(node.attrs, 'borderColor')
  return {
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(borderColor ? { borderColor } : {}),
  }
}

function renderNode(node: PromptNode): VNode {
  const children = (node.content ?? []).map(renderNode)

  switch (node.type) {
    case 'heading': {
      const level = Math.min(Math.max(Math.round(attrNumber(node.attrs, 'level') ?? 1), 1), 3)
      return h(`h${level}`, { class: [headingClasses[level], alignClass(node)] }, children)
    }
    case 'paragraph':
      return h('p', { class: ['text-[15px] leading-[1.5]', alignClass(node)] }, children)
    case 'text':
      return renderText(node)
    case 'bulletList':
      return h('ul', { class: 'list-disc pl-5' }, children)
    case 'orderedList':
      return h('ol', { class: 'list-decimal pl-5' }, children)
    case 'listItem':
      return h('li', {}, children)
    case 'table':
      return h('table', { class: 'w-full border-collapse border border-border text-left' }, h('tbody', {}, children))
    case 'tableRow':
      return h('tr', {}, children)
    case 'tableHeader':
      return h(
        'th',
        {
          class: 'border border-border bg-surface-sunken px-2 py-1 font-semibold',
          colspan: attrNumber(node.attrs, 'colspan'),
          rowspan: attrNumber(node.attrs, 'rowspan'),
          style: cellStyle(node),
        },
        children,
      )
    case 'tableCell':
      return h(
        'td',
        {
          class: 'border border-border px-2 py-1',
          colspan: attrNumber(node.attrs, 'colspan'),
          rowspan: attrNumber(node.attrs, 'rowspan'),
          style: cellStyle(node),
        },
        children,
      )
    case 'image':
      return h('img', {
        src: attrString(node.attrs, 'src'),
        alt: attrString(node.attrs, 'alt') ?? '',
        class: 'my-1 max-w-full rounded-md border border-border',
      })
    default:
      // An unrecognized node type (schema drift between backend and
      // frontend deploys, or a node type the editor ships before this
      // renderer catches up) still renders its children rather than
      // silently dropping that text from the student's view.
      return h('span', {}, children)
  }
}

const PromptNodeRenderer: FunctionalComponent<{ node: PromptNode }> = (props) => renderNode(props.node)
</script>

<template>
  <div data-test="prompt-content" class="flex flex-col gap-2">
    <PromptNodeRenderer v-for="(node, i) in document.content" :key="i" :node="node" />
  </div>
</template>
