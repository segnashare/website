import {defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

/** Tirage aléatoire d’un panier SegnaX (≤ 400 €, 1–5 pièces, catégories distinctes). */
export const shuffleBasketSectionType = defineType({
  name: 'shuffleBasketSection',
  title: 'Shuffle panier (≤ 400 €)',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'heading',
      title: 'Titre (optionnel)',
      type: 'string',
      initialValue: 'Compose ton panier SegnaX',
    }),
    defineField({
      name: 'intro',
      title: 'Intro (optionnel)',
      type: 'text',
      rows: 3,
      initialValue: 'Tirage aléatoire jusqu’à 400 € de pièces — catégories mélangées, 1 à 5 articles.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Libellé du bouton',
      type: 'string',
      initialValue: 'Shuffle mon panier',
    }),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {heading: 'heading', ctaLabel: 'ctaLabel'},
    prepare({heading, ctaLabel}) {
      return {
        title: heading?.trim() || 'Shuffle panier',
        subtitle: ctaLabel?.trim() || 'Shuffle mon panier',
      }
    },
  },
})
