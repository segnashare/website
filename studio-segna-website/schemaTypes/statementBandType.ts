import {defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

/** Bandeau titre + accroche (pleine largeur côté site). */
export const statementBandType = defineType({
  name: 'statementBand',
  title: 'Bandeau accroche',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Sur-titre',
      type: 'string',
      description: 'Petit texte au-dessus du titre (optionnel).',
    }),
    defineField({
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lead',
      title: 'Texte d’accroche',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'tone',
      title: 'Fond',
      type: 'string',
      initialValue: 'default',
      options: {
        layout: 'radio',
        list: [
          {title: 'Neutre clair', value: 'default'},
          {title: 'Gris doux', value: 'muted'},
          {title: 'Contraste sombre', value: 'contrast'},
        ],
      },
    }),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {
      bandTitle: 'title',
      eyebrow: 'eyebrow',
    },
    prepare({bandTitle, eyebrow}) {
      const sub = [eyebrow?.trim(), bandTitle?.trim()].filter(Boolean).join(' · ')
      return {
        title: 'Bandeau accroche',
        subtitle: sub || undefined,
      }
    },
  },
})
