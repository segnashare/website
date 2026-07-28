import {defineField, defineType} from '@sanity/types'

/** Identifiant stable de l’auteur par défaut (référencé par les posts). */
export const DEFAULT_AUTHOR_DOCUMENT_ID = 'author-claire-marie-lerebourg'

export const authorType = defineType({
  name: 'author',
  title: 'Auteur',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Nom',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Rôle / titre',
      type: 'string',
      description: 'Optionnel. Ex. Rédactrice mode.',
    }),
    defineField({
      name: 'bio',
      title: 'Bio courte',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
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
  preview: {
    select: {title: 'name', subtitle: 'role', media: 'photo'},
  },
})
