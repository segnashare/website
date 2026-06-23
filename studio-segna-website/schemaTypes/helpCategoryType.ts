import {defineField, defineType} from '@sanity/types'

export const helpCategoryType = defineType({
  name: 'helpCategory',
  title: 'Aide — section',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Ordre (accueil & listes)',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'showOnHome',
      title: 'Afficher sur l’accueil aide (grille des sections)',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'description',
      title: 'Description courte (optionnel)',
      type: 'text',
      rows: 2,
    }),
  ],
  orderings: [
    {
      title: 'Ordre',
      name: 'sortOrderAsc',
      by: [{field: 'sortOrder', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Sans titre', subtitle: subtitle ? `/${subtitle}` : ''}
    },
  },
})
