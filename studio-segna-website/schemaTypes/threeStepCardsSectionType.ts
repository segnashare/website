import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

/** Une carte « étapes » (image optionnelle + texte), distincte du tryptique. */
export const threeStepCardType = defineType({
  name: 'threeStepCard',
  title: 'Carte étape',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image (optionnelle)',
      type: 'image',
      description: 'Sans image, seuls le titre et le texte s’affichent sur le site.',
      options: {hotspot: true, crop: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
          validation: (rule) =>
            rule.custom((val, context) => {
              const img = context.parent as {asset?: {_ref?: string}} | undefined
              if (!img?.asset?._ref) return true
              return typeof val === 'string' && val.trim().length > 0
                ? true
                : 'Requis lorsqu’une image est définie'
            }),
        }),
      ],
    }),
    defineField({
      name: 'frameFormat',
      title: 'Format du cadre image',
      type: 'string',
      initialValue: 'square',
      hidden: ({parent}) => !parent?.image?.asset?._ref,
      options: {
        layout: 'radio',
        list: [
          {title: 'Carré', value: 'square'},
          {title: 'Portrait', value: 'portrait'},
          {title: 'Paysage', value: 'landscape'},
        ],
      },
      validation: (rule) =>
        rule.custom((val, context) => {
          const p = context.parent as {image?: {asset?: {_ref?: string}}} | undefined
          if (!p?.image?.asset?._ref) return true
          return val ? true : 'Choisissez un format'
        }),
    }),
    defineField({
      name: 'title',
      title: 'Titre (carte)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Texte',
      type: 'blockContent',
      description: 'Gras, italique, liens, listes… Les contenus déjà saisis en texte simple devront être recollés ou ressaisis après passage en texte riche.',
    }),
  ],
  preview: {
    select: {title: 'title', media: 'image'},
    prepare({title, media}) {
      return {
        title: title?.trim() || 'Carte',
        subtitle: 'Carte',
        media,
      }
    },
  },
})

export const threeStepCardsSectionType = defineType({
  name: 'threeStepCardsSection',
  title: '3 cartes étapes (image + texte)',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'threeStepBandColor',
      title: 'Couleur de fond (pleine largeur)',
      type: 'string',
      description: 'Ex. #f9f7f2',
      initialValue: '#f9f7f2',
      validation: (rule) =>
        rule.custom((val) => {
          if (val == null || val === '') return true
          return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(val)) ? true : 'Hex attendu : #rgb ou #rrggbb'
        }),
    }),
    defineField({
      name: 'threeStepCardsLayout',
      title: 'Style des cartes',
      type: 'string',
      initialValue: 'framed',
      options: {
        layout: 'radio',
        list: [
          {title: 'Avec encadrement (fond blanc, ombre)', value: 'framed'},
          {title: 'Sans encadrement (photo + texte sur le fond de section)', value: 'bare'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'threeStepTextColor',
      title: 'Couleur du texte (section + CTA principal)',
      type: 'string',
      initialValue: 'black',
      options: {
        layout: 'radio',
        list: [
          {title: 'Noir (fond clair) — bouton foncé', value: 'black'},
          {title: 'Blanc (fond foncé) — bouton clair', value: 'white'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'threeStepTitle',
      title: 'Titre de section',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'threeStepSubtitle',
      title: 'Sous-titre (centré sous le titre)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'threeStepItems',
      title: 'Les 3 cartes',
      type: 'array',
      of: [defineArrayMember({type: 'threeStepCard'})],
      validation: (rule) =>
        rule.custom((items) => {
          if (!Array.isArray(items) || items.length !== 3) {
            return 'Ajoutez exactement 3 cartes'
          }
          return true
        }),
    }),
    defineField({
      name: 'threeStepPrimaryCtaLabel',
      title: 'Bouton — libellé',
      type: 'string',
    }),
    defineField({
      name: 'threeStepPrimaryCtaHref',
      title: 'Bouton — lien',
      type: 'string',
      description: 'Chemin (ex. /auth) ou URL https://',
    }),
    defineField({
      name: 'threeStepSecondaryCtaLabel',
      title: 'Lien secondaire — libellé',
      type: 'string',
    }),
    defineField({
      name: 'threeStepSecondaryCtaHref',
      title: 'Lien secondaire — URL',
      type: 'string',
    }),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {t: 'threeStepTitle'},
    prepare({t}) {
      return {
        title: '3 cartes étapes',
        subtitle: t?.trim() || undefined,
      }
    },
  },
})
