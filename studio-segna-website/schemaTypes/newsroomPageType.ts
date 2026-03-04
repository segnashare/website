import {defineField, defineType} from 'sanity'

export const newsroomPageType = defineType({
  name: 'newsroomPage',
  title: 'Page Newsroom',
  type: 'document',
  fields: [
    defineField({
      name: 'heroTitle',
      title: 'Hero - Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero - Sous-titre',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero - Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'introText',
      title: 'Texte d’introduction',
      type: 'text',
      rows: 5,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'highlightedPost',
      title: 'Post mis en avant',
      type: 'reference',
      to: [{type: 'post'}],
      description: 'Optionnel. Selectionnez un post a mettre en avant en haut de page.',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Newsroom Page',
      }
    },
  },
})
