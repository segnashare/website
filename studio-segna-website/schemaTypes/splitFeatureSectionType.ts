import {defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

export const splitFeatureSectionType = defineType({
  name: 'splitFeatureSection',
  title: 'Section deux colonnes (texte / image / vidéo)',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'splitRatio',
      title: 'Largeur des colonnes (gauche : droite)',
      type: 'string',
      initialValue: '50-50',
      options: {
        layout: 'radio',
        list: [
          {title: '1/3 & 2/3', value: '33-67'},
          {title: '2/3 & 1/3', value: '67-33'},
          {title: '50 / 50', value: '50-50'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'contentWidth',
      title: 'Largeur des colonnes (contenu)',
      type: 'string',
      initialValue: 'full',
      description:
        'Le fond de section reste sur toute la largeur. « Avec marges » : le bloc deux colonnes occupe environ **88 %** de la largeur (plafonné à ~92 rem), marges latérales réduites.',
      options: {
        layout: 'radio',
        list: [
          {title: 'Pleine largeur (bords écran)', value: 'full'},
          {title: 'Avec marges (contenu centré)', value: 'inset'},
        ],
      },
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Couleur de fond (section)',
      type: 'string',
      description: 'Ex. #000000 ou rgb(20,18,16). Sert surtout aux colonnes texte.',
      initialValue: '#0a0a0a',
    }),
    defineField({
      name: 'foregroundColor',
      title: 'Couleur du texte (colonnes texte)',
      type: 'string',
      initialValue: '#faf8f5',
    }),
    defineField({
      name: 'leftPane',
      title: 'Colonne gauche',
      type: 'splitPane',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'rightPane',
      title: 'Colonne droite',
      type: 'splitPane',
      validation: (rule) => rule.required(),
    }),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {
      lh: 'leftPane.heading',
      rh: 'rightPane.heading',
      lk: 'leftPane.contentKind',
      rk: 'rightPane.contentKind',
      ratio: 'splitRatio',
    },
    prepare({lh, rh, lk, rk, ratio}) {
      const kind = (k?: string) => (k === 'image' ? 'Image' : k === 'video' ? 'Vidéo' : 'Texte')
      const bits = [
        lh?.trim() && `${kind(lk)} : ${lh.trim()}`,
        rh?.trim() && `${kind(rk)} : ${rh.trim()}`,
      ].filter(Boolean) as string[]
      const ratioLabel =
        ratio === '33-67' ? '1/3 · 2/3' : ratio === '67-33' ? '2/3 · 1/3' : '50 / 50'
      const joined = bits.join(' · ')
      const subtitle =
        joined.length > 0
          ? joined.length > 115
            ? `${joined.slice(0, 115)}…`
            : joined
          : ratioLabel
      return {
        title: 'Deux colonnes',
        subtitle,
      }
    },
  },
})
