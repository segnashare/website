import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {CatalogFacetSlugsInput} from '../components/CatalogFacetSlugsInput'
import {LookSlugInput, slugifyLookTitle} from '../components/LookSlugInput'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const collectionTargetingLookType = defineType({
  name: 'collectionTargetingLook',
  title: 'Ciblage collection',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Titre',
      type: 'string',
      description: 'Libellé de l’onglet (ex. Tout voir, Nouveautés, Robes).',
      validation: (rule) => rule.required().max(48),
    }),
    defineField({
      name: 'slug',
      title: 'Identifiant URL',
      type: 'slug',
      description: 'Clique Generate après le titre, ou laisse-le se remplir tout seul.',
      components: {input: LookSlugInput},
      options: {
        maxLength: 64,
        isUnique: () => true,
        source: (_doc, context) => {
          const parent = context.parent
          if (!parent || Array.isArray(parent)) return ''
          return typeof parent.title === 'string' ? parent.title : ''
        },
        slugify: (input) => slugifyLookTitle(input),
      },
      validation: (rule) =>
        rule.custom((value) => {
          const current =
            value && typeof value === 'object' && 'current' in value
              ? String((value as {current?: string}).current ?? '').trim()
              : ''
          if (!current) return true
          if (!slugPattern.test(current)) return 'Utilisez des minuscules, chiffres et tirets.'
          return true
        }),
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: {hotspot: true},
      description: 'Affichée dans la frame en haut de la collection.',
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
      name: 'subtitle',
      title: 'Sous-titre',
      type: 'text',
      rows: 2,
      description: 'Apparaît sous les onglets quand ce ciblage est sélectionné.',
    }),
    defineField({
      name: 'newOnly',
      title: 'Badge Nouveau',
      type: 'boolean',
      initialValue: false,
      description: 'Ne garder que les pièces avec le badge Nouveau (~20 % les plus récentes).',
    }),
    defineField({
      name: 'categorySlugs',
      title: 'Catégories',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      components: {input: CatalogFacetSlugsInput},
    }),
    defineField({
      name: 'brandSlugs',
      title: 'Marques',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      components: {input: CatalogFacetSlugsInput},
    }),
    defineField({
      name: 'materialSlugs',
      title: 'Matériaux',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      components: {input: CatalogFacetSlugsInput},
    }),
    defineField({
      name: 'colorSlugs',
      title: 'Couleurs',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      components: {input: CatalogFacetSlugsInput},
    }),
    defineField({
      name: 'tagSlugs',
      title: 'Tags',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      components: {input: CatalogFacetSlugsInput},
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'subtitle',
      media: 'image',
      newOnly: 'newOnly',
    },
    prepare({title, subtitle, media, newOnly}) {
      return {
        title: title || 'Ciblage',
        subtitle: [newOnly ? 'Nouveau' : null, subtitle].filter(Boolean).join(' · ') || 'Sans filtre',
        media,
      }
    },
  },
})
