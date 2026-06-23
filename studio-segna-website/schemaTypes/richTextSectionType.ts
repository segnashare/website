import {defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'
import {plainTextFromBlocks} from './quoteSectionType'

export const richTextSectionType = defineType({
  name: 'richTextSection',
  title: 'Section contenu riche',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'heading',
      title: 'Titre (optionnel)',
      type: 'string',
    }),
    defineField({
      name: 'body',
      title: 'Contenu',
      type: 'blockContent',
      validation: (rule) => rule.required(),
    }),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      body: 'body',
    },
    prepare({heading, body}) {
      const excerpt = plainTextFromBlocks(body, 90)
      const sub = [heading?.trim(), excerpt].filter(Boolean).join(' · ')
      return {
        title: 'Contenu riche',
        subtitle: sub || undefined,
      }
    },
  },
})
