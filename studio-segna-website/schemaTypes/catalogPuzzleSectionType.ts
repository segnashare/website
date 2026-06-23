import {defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

const catalogImageFields = [
  defineField({
    name: 'alt',
    title: 'Texte alternatif',
    type: 'string',
    description: 'Décrivez la photo pour l’accessibilité et le référencement.',
  }),
]

/** Une case de la grille catalogue (image + texte + lien). */
export const catalogPuzzleTileType = defineType({
  name: 'catalogPuzzleTile',
  title: 'Carte catalogue',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: {hotspot: true},
      description:
        'Dans l’éditeur d’image : **cadrez** la zone utile (rectangle) et le **point focal** (croix). Les aperçus 3:4 / carré / 16:9 sont indicatifs ; sur le site les cadres ont des ratios variables (souvent très hauts) : le cadre définit l’image chargée, le point focal ce qui reste visible au centre lors du recadrage.',
      fields: catalogImageFields,
    }),
    defineField({
      name: 'title',
      title: 'Titre (sur la photo)',
      type: 'string',
      description: 'Ligne principale en gras, en bas à gauche de l’image.',
    }),
    defineField({
      name: 'subtitle',
      title: 'Sous-titre',
      type: 'text',
      rows: 2,
      description: 'Ligne secondaire, plus légère, sous le titre.',
    }),
    defineField({
      name: 'href',
      title: 'Lien',
      type: 'string',
      description: 'URL absolue ou chemin interne (ex. /catalogue/vetements).',
    }),
  ],
  preview: {
    select: {title: 'title', media: 'image'},
    prepare({title, media}) {
      return {
        title: title?.trim() || 'Carte catalogue',
        media,
      }
    },
  },
})

/**
 * Grille type « puzzle » sur 4 niveaux : gauche 1 + 1 + 2, droite 3 + 1.
 * Les champs de tuiles correspondent aux emplacements dans la grille.
 */
export const catalogPuzzleSectionType = defineType({
  name: 'catalogPuzzleSection',
  title: 'Grille catalogue (puzzle)',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Sur-titre (désactivé)',
      type: 'string',
      description: 'Non affiché sur le site. Conservé pour compatibilité avec d’anciens contenus.',
      hidden: true,
    }),
    defineField({
      name: 'heading',
      title: 'Titre de section',
      type: 'string',
      description: 'Optionnel. Si vide, seule la grille est affichée.',
    }),
    defineField({
      name: 'introCtaLabel',
      title: 'Lien à droite du titre — libellé',
      type: 'string',
      description:
        'Ex. « Découvrez la sélection ». S’affiche à droite du titre, avec une flèche. Renseignez aussi l’URL ci-dessous.',
    }),
    defineField({
      name: 'introCtaHref',
      title: 'Lien à droite du titre — URL',
      type: 'string',
      description: 'Chemin interne (ex. /catalogue) ou URL https. Obligatoire pour afficher le libellé comme lien.',
    }),
    defineField({
      name: 'lead',
      title: 'Texte d’introduction',
      type: 'text',
      rows: 3,
      description: 'Sous le titre de section.',
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Couleur de fond',
      type: 'string',
      description: 'Optionnel (ex. #f9f7f2). Laissez vide pour le fond crème par défaut du site.',
    }),
    defineField({
      name: 'surfaceTheme',
      title: 'Couleur du texte du bandeau (titre + chapô)',
      type: 'string',
      description:
        'Laissez « Auto » pour deviner selon la luminosité du fond. Sinon forcez clair (texte noir) ou sombre (texte blanc).',
      initialValue: 'auto',
      options: {
        layout: 'radio',
        list: [
          {title: 'Auto (selon la couleur de fond)', value: 'auto'},
          {title: 'Clair sur fond clair (texte foncé)', value: 'light'},
          {title: 'Clair sur fond sombre (texte blanc)', value: 'dark'},
        ],
      },
    }),
    motionPresetField(),
    defineField({
      name: 'leftTop',
      title: 'Gauche — niveau 1 (haut)',
      type: 'catalogPuzzleTile',
    }),
    defineField({
      name: 'leftMiddle',
      title: 'Gauche — niveau 2',
      type: 'catalogPuzzleTile',
    }),
    defineField({
      name: 'leftBottomLeft',
      title: 'Gauche — niveau 3 (colonne gauche)',
      type: 'catalogPuzzleTile',
    }),
    defineField({
      name: 'leftBottomRight',
      title: 'Gauche — niveau 3 (colonne droite)',
      type: 'catalogPuzzleTile',
    }),
    defineField({
      name: 'rightTall',
      title: 'Droite — grande carte (niveaux 1 à 3)',
      type: 'catalogPuzzleTile',
    }),
    defineField({
      name: 'rightBottom',
      title: 'Droite — niveau 4 (bas)',
      type: 'catalogPuzzleTile',
    }),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {heading: 'heading', lead: 'lead'},
    prepare({heading, lead}) {
      const sub =
        [heading?.trim(), lead?.trim()?.slice(0, 72)].filter(Boolean).join(' · ') || '6 emplacements'
      return {
        title: 'Grille catalogue (puzzle)',
        subtitle: sub,
      }
    },
  },
})
