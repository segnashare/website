import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {horizontalScrollMotionFields} from './objects/horizontalScrollMotionFields'
import {motionPresetField} from './objects/motionPresetField'
import {sectionIntroCtaFields} from './objects/sectionIntroCtaFields'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

const catalogImageFields = [
  defineField({
    name: 'alt',
    title: 'Texte alternatif',
    type: 'string',
    description: 'Décrivez la photo pour l’accessibilité et le référencement.',
  }),
]

/** Une carte du carrousel horizontal (même champs texte / lien que le puzzle catalogue). */
export const horizontalScrollCardType = defineType({
  name: 'horizontalScrollCard',
  title: 'Carte (scroll horizontal)',
  type: 'object',
  fields: [
    defineField({
      name: 'frameFormat',
      title: 'Format du cadre',
      type: 'string',
      initialValue: 'portrait',
      options: {
        layout: 'radio',
        list: [
          {title: 'Portrait (3:4)', value: 'portrait'},
          {title: 'Carré (1:1)', value: 'square'},
          {title: 'Paysage (16:9)', value: 'landscape'},
        ],
      },
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
      fields: catalogImageFields,
    }),
    defineField({
      name: 'title',
      title: 'Titre (sur la photo)',
      type: 'string',
      description: 'Ligne principale en gras, en bas à gauche de l’image (comme le puzzle catalogue).',
    }),
    defineField({
      name: 'subtitle',
      title: 'Sous-titre',
      type: 'text',
      rows: 2,
      description: 'Ligne secondaire sous le titre.',
    }),
    defineField({
      name: 'backQuote',
      title: 'Citation au verso (sans lien)',
      type: 'blockContent',
      description:
        'Sans lien : la carte peut se retourner (si « Retournement des cartes » est activé sur le bandeau) pour afficher cette citation. Incompatible avec le champ « Lien ».',
      hidden: ({parent}) => Boolean(typeof parent?.href === 'string' && parent.href.trim()),
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {href?: string}
          const hasQuote = Array.isArray(value) && value.length > 0
          const hasHref = typeof parent?.href === 'string' && parent.href.trim().length > 0
          if (hasQuote && hasHref) {
            return 'Retirez le lien ou la citation au verso (un seul des deux).'
          }
          return true
        }),
    }),
    defineField({
      name: 'href',
      title: 'Lien (facultatif)',
      type: 'string',
      description:
        'URL absolue ou chemin interne (ex. /catalogue). Si renseigné, la carte est cliquable et la citation au verso est masquée.',
      hidden: ({parent}) => Array.isArray(parent?.backQuote) && parent.backQuote.length > 0,
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {backQuote?: unknown[]}
          const hasHref = typeof value === 'string' && value.trim().length > 0
          const hasQuote = Array.isArray(parent?.backQuote) && parent.backQuote.length > 0
          if (hasQuote && hasHref) {
            return 'Retirez le lien ou la citation au verso (un seul des deux).'
          }
          if (!hasHref) return true
          if (value!.trim().startsWith('/')) return true
          if (/^https?:\/\//i.test(value!.trim())) return true
          return 'Utilisez un chemin qui commence par / ou une URL https://…'
        }),
    }),
  ],
  preview: {
    select: {title: 'title', media: 'image', frameFormat: 'frameFormat', href: 'href', backQuote: 'backQuote'},
    prepare({title, media, frameFormat, href, backQuote}) {
      const fmt =
        frameFormat === 'square' ? 'Carré' : frameFormat === 'landscape' ? 'Paysage' : 'Portrait'
      const hasHref = typeof href === 'string' && href.trim().length > 0
      const hasQuote = Array.isArray(backQuote) && backQuote.length > 0
      const mode = hasHref ? 'Lien' : hasQuote ? 'Verso citation' : 'Sans action'
      return {
        title: title?.trim() || 'Carte',
        subtitle: `${fmt} · ${mode}`,
        media,
      }
    },
  },
})

export const horizontalScrollCardsSectionType = defineType({
  name: 'horizontalScrollCardsSection',
  title: 'Bandeau défilant (cartes éditoriales)',
  type: 'object',
  description:
    'Cartes avec images / textes saisis à la main (éditorial). Pour Best-sellers ou listes d’articles catalogue, utilisez plutôt « Bandeau / grille catalogue (pièces BO) ».',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'heading',
      title: 'Titre de section',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'introCtaLabel',
      title: 'Lien à droite du titre — libellé',
      type: 'string',
      description:
        'Ex. « Découvrez la sélection ». À droite du titre, avec une flèche. Compléter par l’URL ci-dessous.',
    }),
    defineField({
      name: 'introCtaHref',
      title: 'Lien à droite du titre — URL',
      type: 'string',
      description: 'Chemin interne ou https. Les deux champs (libellé + URL) sont nécessaires pour afficher le lien.',
    }),
    defineField({
      name: 'lead',
      title: 'Sous-titre',
      type: 'text',
      rows: 3,
      description: 'Texte d’introduction sous le titre (citation).',
    }),
    ...sectionIntroCtaFields(),
    defineField({
      name: 'surfaceTheme',
      title: 'Fond du bandeau',
      type: 'string',
      initialValue: 'light',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Clair (fond blanc, texte foncé)',
            value: 'light',
          },
          {
            title: 'Sombre (fond noir, texte clair)',
            value: 'dark',
          },
        ],
      },
    }),
    motionPresetField(),
    ...horizontalScrollMotionFields(),
    defineField({
      name: 'cardSize',
      title: 'Taille des cartes',
      type: 'string',
      initialValue: 'large',
      options: {
        layout: 'radio',
        list: [
          {title: 'Grand (actuel)', value: 'large'},
          {title: 'Petit (−30 % en diagonale, puis −15 %)', value: 'small'},
        ],
      },
      description: 'Format type Airbnb : image puis texte en dessous. « Petit » réduit les cadres carrés d’environ 30 % en diagonale.',
    }),
    defineField({
      name: 'cardFlipEnabled',
      title: 'Retournement des cartes',
      type: 'boolean',
      initialValue: true,
      description:
        'Si activé, les cartes sans lien mais avec une « Citation au verso » se retournent au survol (ou au tap) sur le site.',
    }),
    defineField({
      name: 'items',
      title: 'Cartes',
      type: 'array',
      of: [defineArrayMember({type: 'horizontalScrollCard'})],
      validation: (rule) => rule.min(1).error('Ajoutez au moins une carte.'),
    }),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      items: 'items',
      surfaceTheme: 'surfaceTheme',
      scrollMotion: 'scrollMotion',
      cardFlipEnabled: 'cardFlipEnabled',
    },
    prepare({heading, items, surfaceTheme, scrollMotion, cardFlipEnabled}) {
      const n = Array.isArray(items) ? items.length : 0
      const tone = surfaceTheme === 'dark' ? 'Sombre' : 'Clair'
      const motion = scrollMotion === 'auto_loop' ? 'Boucle auto' : 'Manuel'
      const flip = cardFlipEnabled === false ? 'Flip off' : 'Flip on'
      const meta = [tone, motion, flip, n ? `${n} carte${n > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')
      return {
        title: 'Bandeau défilant',
        subtitle: heading?.trim() ? `${heading.trim()} · ${meta}` : meta || undefined,
      }
    },
  },
})
