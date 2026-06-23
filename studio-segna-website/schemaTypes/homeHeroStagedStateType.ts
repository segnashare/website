import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {HeroStateFrameBoardInput} from '../components/HeroStateFrameBoardInput'
import {documentUsesHeroMultiState} from './lib/heroValidationContext'

/** Un état du hero : fond + durée + jusqu’à 5 images. */
export const homeHeroStagedStateType = defineType({
  name: 'homeHeroStagedState',
  title: 'État hero (fond + images)',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Libellé (studio)',
      type: 'string',
      description: 'Repère pour les éditeurs, non affiché sur le site.',
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Couleur de fond',
      type: 'string',
      description: 'CSS couleur, ex. #3d4f6a ou rgb(45 55 90)',
      validation: (rule) =>
        rule.custom((value, context) => {
          if (!documentUsesHeroMultiState(context.document)) return true
          return value?.trim() ? true : 'Requis lorsque le hero est en multi-états'
        }),
    }),
    defineField({
      name: 'durationMs',
      title: 'Durée affichage (ms)',
      type: 'number',
      initialValue: 5000,
      validation: (rule) =>
        rule.custom((value, context) => {
          if (!documentUsesHeroMultiState(context.document)) return true
          const n = typeof value === 'number' ? value : Number(value)
          if (!Number.isFinite(n)) return 'Indiquez une durée (ms)'
          if (n < 1500 || n > 120000) return 'Entre 1500 et 120000 ms'
          return true
        }),
    }),
    defineField({
      name: 'images',
      title: 'Images (max 5)',
      type: 'array',
      validation: (rule) => rule.max(5),
      of: [defineArrayMember({type: 'homeHeroStagedImage'})],
    }),
    defineField({
      name: 'frameLayout',
      title: 'Mise en page globale (cadres)',
      type: 'homeHeroStagedStateFrameLayout',
      description:
        'Positionne tous les cadres d’un coup (bureau = bandeau large ; mobile = bandeau paysage ~16:9). Le rognage dans le cadre se règle par image : recadrage Sanity + « Couvrir », ou « Contenir » pour tout montrer.',
      components: {input: HeroStateFrameBoardInput},
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'backgroundColor'},
    prepare({title, subtitle}) {
      return {
        title: title || 'État',
        subtitle: subtitle || undefined,
      }
    },
  },
})
