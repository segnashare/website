import {defineField, defineType} from '@sanity/types'
import {pageSectionsField} from './pageSectionsField'

export const newsroomPageType = defineType({
  name: 'newsroomPage',
  title: 'Page Newsroom',
  type: 'document',
  fields: [
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seoMetadata',
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero - Titre',
      type: 'text',
      rows: 2,
      description: 'Entrée = passage à la ligne dans le titre affiché sur le site.',
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
    pageSectionsField(),
    defineField({
      name: 'highlightedPost',
      title: 'Post mis en avant',
      type: 'reference',
      to: [{type: 'post'}],
      description: 'Optionnel. Sélectionnez un post à mettre en avant en haut de page.',
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
