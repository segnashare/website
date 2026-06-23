import {defineArrayMember, defineField, defineType} from '@sanity/types'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seoMetadata',
    }),
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image de couverture',
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
      name: 'body',
      title: 'Contenu',
      type: 'blockContent',
    }),
    defineField({
      name: 'extraSections',
      title: 'Blocs sous le corps',
      type: 'array',
      description: 'Sections modulaires optionnelles après l’article principal.',
      of: [
        defineArrayMember({type: 'statementBand'}),
        defineArrayMember({type: 'sectionBlock'}),
        defineArrayMember({type: 'richTextSection'}),
      ],
    }),
  ],
})
