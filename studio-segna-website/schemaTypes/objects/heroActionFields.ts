import {defineField} from '@sanity/types'

export const HERO_ACTION_LAYOUTS = [
  {title: 'Barre de recherche seule', value: 'search_only'},
  {title: 'Un bouton seul', value: 'single_cta'},
  {title: 'Bouton + barre de recherche', value: 'cta_and_search'},
  {title: 'Deux boutons (couleurs inversées)', value: 'dual_cta'},
] as const

export type HeroActionLayout = (typeof HERO_ACTION_LAYOUTS)[number]['value']

function layoutUsesSearch(layout?: string) {
  return layout === 'search_only' || layout === 'cta_and_search'
}

function layoutUsesPrimaryCta(layout?: string) {
  return layout === 'single_cta' || layout === 'cta_and_search' || layout === 'dual_cta'
}

function layoutUsesSecondaryCta(layout?: string) {
  return layout === 'dual_cta'
}

const hrefValidation = (rule: {custom: (fn: (value: unknown) => true | string) => unknown}) =>
  rule.custom((value) => {
    const v = typeof value === 'string' ? value.trim() : ''
    if (!v) return true
    if (v.startsWith('/')) return true
    if (/^https?:\/\//i.test(v)) return true
    return 'Utilisez un chemin qui commence par / (ex. /catalogue) ou une URL https://…'
  })

/** Zone hero sous le chapô : recherche, 1 CTA, 2 CTAs ou combinaison bouton + recherche. */
export const heroActionFields = () => [
  defineField({
    name: 'heroActionLayout',
    title: 'Zone d’action hero',
    type: 'string',
    initialValue: 'search_only',
    options: {
      layout: 'radio',
      list: [...HERO_ACTION_LAYOUTS],
    },
  }),
  defineField({
    name: 'heroCtaLabel',
    title: 'CTA principal — libellé',
    type: 'string',
    description: 'Bouton plein blanc (sur hero sombre). Obligatoire pour les modes avec bouton.',
    hidden: ({parent}) => !layoutUsesPrimaryCta(parent?.heroActionLayout),
  }),
  defineField({
    name: 'heroCtaHref',
    title: 'CTA principal — lien',
    type: 'string',
    hidden: ({parent}) => !layoutUsesPrimaryCta(parent?.heroActionLayout),
    validation: hrefValidation,
  }),
  defineField({
    name: 'heroSecondaryCtaLabel',
    title: 'CTA secondaire — libellé',
    type: 'string',
    description: 'Bouton contour (couleur inversée par rapport au principal).',
    hidden: ({parent}) => !layoutUsesSecondaryCta(parent?.heroActionLayout),
  }),
  defineField({
    name: 'heroSecondaryCtaHref',
    title: 'CTA secondaire — lien',
    type: 'string',
    hidden: ({parent}) => !layoutUsesSecondaryCta(parent?.heroActionLayout),
    validation: hrefValidation,
  }),
  defineField({
    name: 'heroCtaPosition',
    title: 'Position du bouton (mode bouton + recherche)',
    type: 'string',
    initialValue: 'right',
    options: {
      layout: 'radio',
      list: [
        {title: 'À droite de la recherche', value: 'right'},
        {title: 'À gauche de la recherche', value: 'left'},
      ],
    },
    hidden: ({parent}) => parent?.heroActionLayout !== 'cta_and_search',
  }),
  defineField({
    name: 'heroStagedSearchPlaceholder',
    title: 'Barre de recherche — texte indicatif',
    type: 'string',
    description: 'Libellé affiché dans la barre (ex. Que souhaitez-vous porter ?).',
    initialValue: 'Que souhaitez-vous porter ?',
    hidden: ({parent}) => !layoutUsesSearch(parent?.heroActionLayout),
  }),
  defineField({
    name: 'heroStagedSearchButtonLabel',
    title: 'Barre de recherche — libellé bouton (accessibilité)',
    type: 'string',
    initialValue: 'Rechercher',
    hidden: ({parent}) => !layoutUsesSearch(parent?.heroActionLayout),
  }),
]
