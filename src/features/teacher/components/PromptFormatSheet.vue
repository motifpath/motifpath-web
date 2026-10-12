<script setup lang="ts">
import { Bold, Italic } from 'lucide-vue-next'

import type { HeadingLevel, PromptCommands, TextAlignment } from '@/features/teacher/composables/usePromptCommands'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import ColorPalette from '@/shared/components/ColorPalette.vue'
import IconButton from '@/shared/components/IconButton.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * Everything in today's toolbar that isn't an insert, on a phone. A choice applies at once to the
 * selection and the sheet stays open for the next one.
 */
defineProps<{ open: boolean; commands: PromptCommands }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()

const HEADINGS: { level: HeadingLevel; key: 'heading1' | 'heading2' | 'heading3' }[] = [
  { level: 1, key: 'heading1' },
  { level: 2, key: 'heading2' },
  { level: 3, key: 'heading3' },
]
const ALIGNMENTS: { align: TextAlignment; key: 'alignLeft' | 'alignCenter' | 'alignRight' | 'alignJustify' }[] = [
  { align: 'left', key: 'alignLeft' },
  { align: 'center', key: 'alignCenter' },
  { align: 'right', key: 'alignRight' },
  { align: 'justify', key: 'alignJustify' },
]
const SECTION = 'text-xs font-semibold uppercase tracking-wide text-ink-muted'
</script>

<template>
  <OverlayPanel :open="open" :title="t('promptEditor.format')" @close="emit('close')">
    <div data-test="prompt-format-sheet" class="flex flex-col gap-4">
      <section class="flex flex-col gap-1">
        <h3 :class="SECTION">{{ t('promptEditor.style') }}</h3>
        <div class="flex flex-wrap gap-x-2">
          <ChoiceChip
            data-test="prompt-format-paragraph"
            :label="t('promptEditor.paragraph')"
            :selected="commands.isActive('paragraph')"
            @toggle="commands.setParagraph()"
          />
          <ChoiceChip
            v-for="heading in HEADINGS"
            :key="heading.level"
            :data-test="`prompt-format-h${heading.level}`"
            :label="t(`promptEditor.${heading.key}`)"
            :selected="commands.isActive('heading', { level: heading.level })"
            @toggle="commands.toggleHeading(heading.level)"
          />
        </div>
      </section>

      <section class="flex flex-col gap-1">
        <h3 :class="SECTION">{{ t('promptEditor.marks') }}</h3>
        <div class="flex flex-wrap items-center gap-x-2">
          <IconButton
            data-test="prompt-format-bold"
            :label="t('promptEditor.bold')"
            :pressed="commands.isActive('bold')"
            @click="commands.toggleBold()"
          >
            <Bold :size="20" aria-hidden="true" />
          </IconButton>
          <IconButton
            data-test="prompt-format-italic"
            :label="t('promptEditor.italic')"
            :pressed="commands.isActive('italic')"
            @click="commands.toggleItalic()"
          >
            <Italic :size="20" aria-hidden="true" />
          </IconButton>
          <ChoiceChip
            data-test="prompt-format-strike"
            :label="t('promptEditor.strikethrough')"
            :selected="commands.isActive('strike')"
            @toggle="commands.toggleStrike()"
          />
          <ChoiceChip
            data-test="prompt-format-highlight"
            :label="t('promptEditor.highlight')"
            :selected="commands.isActive('highlight')"
            @toggle="commands.toggleHighlight()"
          />
        </div>
      </section>

      <section data-test="prompt-format-text-colour" class="flex flex-col gap-2">
        <h3 :class="SECTION">{{ t('promptEditor.textColour') }}</h3>
        <ColorPalette :model-value="commands.currentTextStyle('color')" @select="commands.setFontColor" />
      </section>

      <section data-test="prompt-format-background" class="flex flex-col gap-2">
        <h3 :class="SECTION">{{ t('promptEditor.background') }}</h3>
        <ColorPalette :model-value="commands.currentTextStyle('backgroundColor')" @select="commands.setBackgroundColor" />
      </section>

      <section class="flex flex-col gap-1">
        <h3 :class="SECTION">{{ t('promptEditor.alignAndLists') }}</h3>
        <div class="flex flex-wrap gap-x-2">
          <ChoiceChip
            v-for="alignment in ALIGNMENTS"
            :key="alignment.align"
            :data-test="`prompt-format-align-${alignment.align}`"
            :label="t(`promptEditor.${alignment.key}`)"
            :selected="commands.isActive({ textAlign: alignment.align })"
            @toggle="commands.setAlign(alignment.align)"
          />
          <ChoiceChip
            data-test="prompt-format-bullet-list"
            :label="`• ${t('promptEditor.bullets')}`"
            :selected="commands.isActive('bulletList')"
            @toggle="commands.toggleBulletList()"
          />
          <ChoiceChip
            data-test="prompt-format-ordered-list"
            :label="t('promptEditor.numbers')"
            :selected="commands.isActive('orderedList')"
            @toggle="commands.toggleOrderedList()"
          />
        </div>
      </section>
    </div>
  </OverlayPanel>
</template>
