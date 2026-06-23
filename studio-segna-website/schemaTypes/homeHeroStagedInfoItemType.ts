import {defineField, defineType} from '@sanity/types'

/** Une pastille icône + texte pour la ligne d’infos sous la recherche (max 2). */
export const homeHeroStagedInfoItemType = defineType({
  name: 'homeHeroStagedInfoItem',
  title: 'Info (icône + texte)',
  type: 'object',
  fields: [
    defineField({
      name: 'icon',
      title: 'Icône',
      type: 'image',
      description: 'Petit picto (PNG, SVG ou WebP), affiché à gauche du texte.',
      options: {hotspot: false},
    }),
    defineField({
      name: 'text',
      title: 'Texte',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {text: 'text'},
    prepare({text}) {
      return {title: text || 'Info'}
    },
  },
})
