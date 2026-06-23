import {defineField, defineType} from '@sanity/types'

/** Bloc SEO réutilisable (pages, posts, réglages par défaut). */
export const seoObjectType = defineType({
  name: 'seoMetadata',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta titre',
      type: 'string',
      description: 'Titre pour les moteurs et les partages (sinon titre de page).',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'shareImage',
      title: 'Image de partage',
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
  ],
})
