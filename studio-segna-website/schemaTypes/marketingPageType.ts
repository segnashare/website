import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {pageSectionsField} from './pageSectionsField'

/** Routes système (hors pages marketing). */
const RESERVED_SLUGS = ['newsroom', 'aide', 'api', 'signup', 'signin', 'panier', 'abonnement']

export const marketingPageType = defineType({
  name: 'marketingPage',
  title: 'Page (site)',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titre (liste Studio)',
      type: 'string',
      description: 'Nom court pour retrouver la page dans la liste (ex. Abonnement, Tarifs).',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug URL',
      type: 'slug',
      description:
        'Définit l’URL publique : `/` + slug (ex. `location` → `/location`). Pour l’abonnement SegnaX, crée une page avec le slug `abonnement` (hero + sections ; l’offre reste gérée par le site).',
      options: {source: 'title', maxLength: 96},
      validation: (rule) =>
        rule.required().custom((value) => {
          const current =
            value && typeof value === 'object' && 'current' in value
              ? String((value as {current?: string}).current ?? '').trim()
              : ''
          if (!current) return 'Indiquez un slug.'
          if (RESERVED_SLUGS.includes(current)) {
            return `Le slug « ${current} » est réservé (route déjà utilisée par le site).`
          }
          return true
        }),
    }),
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
    }),
    defineField({
      name: 'heroPresentation',
      title: 'Hero — type (plein écran)',
      type: 'string',
      initialValue: 'single_photo',
      description:
        'Même système que l’accueil : photo plein écran, ou multi-états (couleurs + images + cadres). Le hero occupe toute la largeur du navigateur.',
      options: {
        layout: 'radio',
        list: [
          {title: 'Photo plein écran', value: 'single_photo'},
          {title: 'Multi-états (comme l’accueil)', value: 'multi_state'},
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
      // Ne pas utiliser rule.min/max seuls : Sanity valide aussi les champs masqués,
      // ce qui bloquait la publication en mode « Photo plein écran » (valeur absente).
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
        'Identique à la page d’accueil : couleur, durée, images et mise en page des cadres. Vous pouvez aussi réutiliser un préréglage du « Référentiel — États hero » via « Réutiliser un préréglage ».',
      hidden: ({parent}) => parent?.heroPresentation !== 'multi_state',
      validation: (rule) =>
        rule.custom((states, context) => {
          const parent = context.parent as {heroPresentation?: string}
          if (parent?.heroPresentation !== 'multi_state') return true
          if (!Array.isArray(states) || states.length < 1) {
            return 'Ajoutez au moins un état'
          }
          return true
        }),
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
      description: 'URL absolue ou chemin interne (ex. /newsroom). Laissez vide si vous n’utilisez pas le bouton personnalisé du hero.',
      validation: (rule) =>
        rule.custom((value) => {
          const v = typeof value === 'string' ? value.trim() : ''
          if (!v) return true
          if (v.startsWith('/')) return true
          if (/^https?:\/\//i.test(v)) return true
          return 'Utilisez un chemin qui commence par / (ex. /catalogue) ou une URL https://…'
        }),
    }),
    pageSectionsField(),
  ],
  preview: {
    select: {title: 'title', slug: 'slug.current'},
    prepare({title, slug}) {
      return {
        title: title || 'Sans titre',
        subtitle: slug ? `/${slug}` : 'Pas de slug',
      }
    },
  },
})
