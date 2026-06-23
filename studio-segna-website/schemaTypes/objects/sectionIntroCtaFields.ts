import {defineField} from '@sanity/types'

/** Jusqu’à 2 boutons sous le chapô : principal plein, secondaire contour (noir & blanc côté site). */
export const sectionIntroCtaFields = () => [
  defineField({
    name: 'primaryCtaLabel',
    title: 'CTA principal — libellé',
    type: 'string',
    description: 'Bouton plein (noir sur fond clair). Laisser vide pour masquer.',
  }),
  defineField({
    name: 'primaryCtaHref',
    title: 'CTA principal — URL',
    type: 'string',
    description: 'Chemin interne ou https. Les deux champs (libellé + URL) sont nécessaires pour afficher le bouton.',
  }),
  defineField({
    name: 'secondaryCtaLabel',
    title: 'CTA secondaire — libellé',
    type: 'string',
    description: 'Bouton contour (vide avec bordure). Laisser vide pour masquer.',
  }),
  defineField({
    name: 'secondaryCtaHref',
    title: 'CTA secondaire — URL',
    type: 'string',
    description: 'Chemin interne ou https. Les deux champs (libellé + URL) sont nécessaires pour afficher le bouton.',
  }),
]
