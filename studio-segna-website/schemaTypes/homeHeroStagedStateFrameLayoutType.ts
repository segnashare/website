import {defineArrayMember, defineField, defineType} from '@sanity/types'

/**
 * Cadres de toutes les images d’un état (bureau + mobile).
 * L’éditeur visuel global est branché sur ce bloc au niveau de l’état.
 */
export const homeHeroStagedStateFrameLayoutType = defineType({
  name: 'homeHeroStagedStateFrameLayout',
  title: 'Mise en page globale (cadres)',
  type: 'object',
  fields: [
    defineField({
      name: 'framesDesktop',
      title: 'Cadres — bureau',
      type: 'array',
      description: 'Un cadre par image, dans le même ordre que la liste « Images ».',
      validation: (rule) => rule.max(5),
      of: [defineArrayMember({type: 'homeHeroStagedLayoutSlot'})],
    }),
    defineField({
      name: 'framesMobile',
      title: 'Cadres — mobile',
      type: 'array',
      description: 'Si vide sur petit écran, réutilise les cadres bureau.',
      validation: (rule) => rule.max(5),
      of: [defineArrayMember({type: 'homeHeroStagedLayoutSlot'})],
    }),
  ],
})
