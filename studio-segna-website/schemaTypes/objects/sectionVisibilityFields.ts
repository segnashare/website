import {defineField} from '@sanity/types'

/** Visibilité desktop / mobile pour les blocs modulaires de page. */
export const sectionVisibilityFields = () => [
  defineField({
    name: 'showOnDesktop',
    title: 'Visible sur desktop',
    type: 'boolean',
    initialValue: true,
    fieldset: 'visibility',
    description: 'Afficher ce bloc sur écran large (≥ 768 px).',
  }),
  defineField({
    name: 'showOnMobile',
    title: 'Visible sur mobile',
    type: 'boolean',
    initialValue: true,
    fieldset: 'visibility',
    description: 'Afficher ce bloc sur téléphone et tablette (< 768 px).',
  }),
]

export const sectionVisibilityFieldset = {
  name: 'visibility',
  title: 'Visibilité par device',
  options: {collapsible: true, collapsed: false},
}
