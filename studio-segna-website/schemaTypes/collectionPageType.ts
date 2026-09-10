import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {pageSectionsField} from './pageSectionsField'

export const COLLECTION_PAGE_ID = 'collectionPage'

export const collectionPageType = defineType({
  name: 'collectionPage',
  title: 'Page Collection',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seoMetadata',
    }),
    defineField({
      name: 'collectionTargeting',
      title: 'Ciblage collection',
      type: 'array',
      description:
        'Frame en haut de /catalogue : chaque entrée a un titre, une photo, un sous-titre (affiché à la sélection) et des filtres. Ajoutez « Tout voir » sans filtres, puis Nouveautés, etc.',
      of: [defineArrayMember({type: 'collectionTargetingLook'})],
      validation: (rule) =>
        rule.custom((looks) => {
          if (!Array.isArray(looks) || looks.length === 0) return true
          const slugs = looks
            .map((row) => {
              if (!row || typeof row !== 'object') return ''
              const slug = (row as {slug?: {current?: string}}).slug
              return typeof slug?.current === 'string' ? slug.current.trim().toLowerCase() : ''
            })
            .filter(Boolean)
          if (new Set(slugs).size !== slugs.length) {
            return 'Chaque ciblage doit avoir un identifiant URL unique.'
          }
          return true
        }),
    }),
    pageSectionsField({
      description:
        'Blocs optionnels sous la grille catalogue. Réordonnez par glisser-déposer. Publiez pour voir sur le site.',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Collection',
        subtitle: '/catalogue',
      }
    },
  },
})
