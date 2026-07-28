import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {DEFAULT_AUTHOR_DOCUMENT_ID} from './authorType'

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
      name: 'author',
      title: 'Auteur',
      type: 'reference',
      to: [{type: 'author'}],
      description: 'Par défaut : Claire-Marie Lerebourg. Affiché « PAR NOM » sous le hero.',
      initialValue: {
        _type: 'reference',
        _ref: DEFAULT_AUTHOR_DOCUMENT_ID,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'articleType',
      title: 'Type d’article',
      type: 'string',
      description: 'Utilisé pour les filtres de la page Newsroom.',
      options: {
        list: [
          {title: 'Articles blog Mode', value: 'blog_mode'},
          {title: 'Articles Segna', value: 'segna'},
          {title: 'Articles Communauté', value: 'communaute'},
          {title: 'Articles Presse', value: 'presse'},
          {title: 'Articles Tendances', value: 'tendances'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Chapô / extrait',
      type: 'text',
      rows: 3,
      description: 'Court texte sous la carte. Si vide, un extrait du contenu est utilisé.',
    }),
    defineField({
      name: 'image',
      title: 'Image de couverture (hero)',
      type: 'image',
      options: {hotspot: true},
      description: 'Grande image en tête de l’article (style Farfetch).',
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
        }),
      ],
      validation: (rule) => rule.required(),
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
  preview: {
    select: {
      title: 'title',
      authorName: 'author.name',
      articleType: 'articleType',
      media: 'image',
    },
    prepare({title, authorName, articleType, media}) {
      const typeLabel =
        {
          blog_mode: 'Blog Mode',
          segna: 'Segna',
          communaute: 'Communauté',
          presse: 'Presse',
          tendances: 'Tendances',
        }[articleType as string] ?? articleType
      return {
        title: title || 'Sans titre',
        subtitle: [authorName, typeLabel].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
