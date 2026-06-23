import {defineField, defineType} from '@sanity/types'

export const helpSectionType = defineType({
  name: 'helpSection',
  title: 'Aide — sous-section',
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
      name: 'category',
      title: 'Section parente',
      description: 'Niveau 1 de l’arborescence (document « Aide — section »).',
      type: 'reference',
      to: [{type: 'helpCategory'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Ordre (dans la section)',
      type: 'number',
      initialValue: 0,
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
    select: {title: 'title', subtitle: 'category.title', slug: 'slug.current'},
    prepare({title, subtitle, slug}) {
      return {
        title: title ?? 'Sans titre',
        subtitle: [subtitle, slug ? `/${slug}` : ''].filter(Boolean).join(' · '),
      }
    },
  },
})
