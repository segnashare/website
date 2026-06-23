import {HighlightIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {QuoteHighlightAnnotation} from '../components/QuoteHighlightAnnotation'

export const blockContentType = defineType({
  name: 'blockContent',
  title: 'Contenu riche',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'Titre H1', value: 'h1'},
        {title: 'Titre H2', value: 'h2'},
        {title: 'Titre H3', value: 'h3'},
        {title: 'Citation', value: 'blockquote'},
      ],
      lists: [
        {title: 'Puces', value: 'bullet'},
        {title: 'Numérotée', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Gras', value: 'strong'},
          {title: 'Italique', value: 'em'},
          {title: 'Code', value: 'code'},
          {title: 'Souligné', value: 'underline'},
          {title: 'Barré', value: 'strike-through'},
        ],
        annotations: [
          /*
           * Annotation (pas décorateur) : le toggle on/off dans l’éditeur PTE est fiable.
           * Sans champ → pas de modale, recliquer sur l’icône retire l’encadré.
           */
          {
            name: 'quoteHighlight',
            type: 'object',
            title: 'Encadré noir',
            icon: HighlightIcon,
            fields: [
              defineField({
                name: '_applied',
                type: 'boolean',
                hidden: true,
                initialValue: true,
              }),
            ],
            components: {
              annotation: QuoteHighlightAnnotation,
            },
          },
          {
            name: 'link',
            type: 'object',
            title: 'Lien',
            fields: [
              {
                name: 'href',
                type: 'string',
                title: 'URL',
                description: 'URL absolue (https://…) ou chemin interne (ex: /aide/…)',
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      title: 'Image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Texte alternatif',
        }),
      ],
    }),
  ],
})
