import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {heroActionFields} from './objects/heroActionFields'
import {pageSectionsField} from './pageSectionsField'

export const homePageType = defineType({
  name: 'homePage',
  title: 'Page d’accueil',
  type: 'document',
  fields: [
    defineField({
      name: 'seo',
      title: 'SEO (page d’accueil)',
      type: 'seoMetadata',
    }),
    defineField({
      name: 'heroPresentation',
      title: 'Type de hero',
      type: 'string',
      initialValue: 'single_photo',
      options: {
        layout: 'radio',
        list: [
          {title: 'Photo plein écran (comportement actuel)', value: 'single_photo'},
          {title: 'Multi-états (couleurs + images qui défilent)', value: 'multi_state'},
        ],
      },
    }),
    defineField({
      name: 'heroStageTransitionMs',
      title: 'Multi-états — durée animation des photos (ms)',
      type: 'number',
      description:
        'Durée du mouvement des images (bas → haut uniquement). La couleur de fond change tout de suite, sans fondu.',
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
      title: 'Multi-états — séquence',
      type: 'array',
      of: [
        defineArrayMember({type: 'homeHeroStagedState'}),
        defineArrayMember({type: 'homeHeroStatePresetRef'}),
      ],
      description:
        'Chaque état : couleur de fond, durée à l’écran, jusqu’à 5 images positionnées en CSS. Vous pouvez aussi réutiliser un préréglage du « Référentiel — États hero » via « Réutiliser un préréglage ».',
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
      name: 'heroStagedInfoItems',
      title: 'Multi-états — ligne d’infos (max 2)',
      type: 'array',
      description: 'Sous la recherche : icône + texte, séparés par une barre verticale.',
      hidden: ({parent}) => parent?.heroPresentation !== 'multi_state',
      validation: (rule) => rule.max(2),
      of: [defineArrayMember({type: 'homeHeroStagedInfoItem'})],
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero - Titre',
      type: 'text',
      rows: 2,
      description: 'Entrée = passage à la ligne dans le titre affiché sur le site.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero - Sous-titre',
      type: 'text',
      rows: 3,
      description: 'Affiché sous le titre principal, au-dessus de la zone d’action (recherche / boutons).',
    }),
    ...heroActionFields(),
    defineField({
      name: 'heroImage',
      title: 'Hero - Image (mode photo)',
      type: 'image',
      description: 'Utilisée uniquement en « Photo plein écran ».',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.heroPresentation === 'multi_state',
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {heroPresentation?: string}
          if (parent?.heroPresentation === 'multi_state') return true
          return value?.asset ? true : 'Image requise en mode photo plein écran'
        }),
    }),
    pageSectionsField(),
  ],
  preview: {
    prepare() {
      return {
        title: 'Home Page',
      }
    },
  },
})
