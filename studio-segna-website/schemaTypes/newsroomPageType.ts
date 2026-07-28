import {defineArrayMember, defineField, defineType} from '@sanity/types'
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
      title: 'Hero — titre',
      type: 'text',
      rows: 2,
      description: 'Entrée = passage à la ligne dans le titre affiché sur le site.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero — sous-titre',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroPresentation',
      title: 'Hero — type (plein écran)',
      type: 'string',
      initialValue: 'multi_state',
      description:
        'Même système que le catalogue / l’accueil : photo plein écran, ou multi-états (couleurs + images + cadres).',
      options: {
        layout: 'radio',
        list: [
          {title: 'Photo plein écran', value: 'single_photo'},
          {title: 'Multi-états (comme le catalogue)', value: 'multi_state'},
        ],
      },
    }),
    defineField({
      name: 'heroStageTransitionMs',
      title: 'Hero — multi-états : durée animation des images (ms)',
      type: 'number',
      description:
        'Durée du mouvement des images entre deux états. La couleur de fond change sans fondu.',
      initialValue: 650,
      hidden: ({parent}) => parent?.heroPresentation !== 'multi_state',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {heroPresentation?: string}
          if (parent?.heroPresentation !== 'multi_state') return true
          const n = typeof value === 'number' ? value : Number(value)
          if (!Number.isFinite(n)) return 'Indiquez une durée en ms (ex. 650)'
          if (n < 200 || n > 3000) return 'Durée entre 200 et 3000 ms'
          return true
        }),
    }),
    defineField({
      name: 'heroStates',
      title: 'Hero — multi-états : séquence',
      type: 'array',
      of: [
        defineArrayMember({type: 'homeHeroStagedState'}),
        defineArrayMember({type: 'homeHeroStatePresetRef'}),
      ],
      description:
        'Identique au catalogue : couleur, durée, images et mise en page. Vous pouvez réutiliser un préréglage du « Référentiel — États hero ». Si vide, le site réutilise temporairement le hero du catalogue.',
      hidden: ({parent}) => parent?.heroPresentation !== 'multi_state',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero — image (mode photo plein écran)',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.heroPresentation === 'multi_state',
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'heroCtaLabel',
      title: 'Hero — libellé du bouton (optionnel)',
      type: 'string',
    }),
    defineField({
      name: 'heroCtaHref',
      title: 'Hero — lien du bouton (optionnel)',
      type: 'string',
      description: 'URL absolue ou chemin interne. Sinon le CTA principal du header est utilisé.',
      validation: (rule) =>
        rule.custom((value) => {
          const v = typeof value === 'string' ? value.trim() : ''
          if (!v) return true
          if (v.startsWith('/')) return true
          if (/^https?:\/\//i.test(v)) return true
          return 'Utilisez un chemin qui commence par / (ex. /catalogue) ou une URL https://…'
        }),
    }),
    defineField({
      name: 'introText',
      title: 'Texte d’introduction',
      type: 'text',
      rows: 5,
      description: 'Optionnel. Affiché sous le hero, au-dessus de la grille d’articles.',
    }),
    pageSectionsField(),
    defineField({
      name: 'highlightedPost',
      title: 'Post mis en avant',
      type: 'reference',
      to: [{type: 'post'}],
      description: 'Optionnel. Non utilisé dans la grille actuelle (conservé pour compatibilité).',
      hidden: true,
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
