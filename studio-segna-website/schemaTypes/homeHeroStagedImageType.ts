import {defineField, defineType} from '@sanity/types'
import {documentUsesHeroMultiState, validationPathIncludesHeroStates} from './lib/heroValidationContext'

/** Image dans un état du hero animé (max 5 par état). Cadres = mise en page globale sur l’état. */
export const homeHeroStagedImageType = defineType({
  name: 'homeHeroStagedImage',
  title: 'Image hero (état)',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description:
        'Recadrage manuel : utilise l’outil image (cadrage + point chaud). Sur le site, « Couvrir » applique ce recadrage dans le cadre défini sur l’état ; « Contenir » montre toute l’image dans le cadre.',
      options: {hotspot: true, crop: true},
      validation: (rule) =>
        rule.custom((value, context) => {
          const underHeroStates = validationPathIncludesHeroStates(context)
          if (underHeroStates && !documentUsesHeroMultiState(context.document)) return true
          const asset = value && typeof value === 'object' && 'asset' in value ? (value as {asset?: unknown}).asset : null
          const ok =
            asset &&
            typeof asset === 'object' &&
            ('_ref' in asset || 'url' in asset) &&
            Boolean((asset as {_ref?: string; url?: string})._ref || (asset as {url?: string}).url)
          return ok ? true : 'Ajoutez une image'
        }),
    }),
    defineField({
      name: 'alt',
      title: 'Texte alternatif',
      type: 'string',
      validation: (rule) =>
        rule.custom((value, context) => {
          const underHeroStates = validationPathIncludesHeroStates(context)
          if (underHeroStates && !documentUsesHeroMultiState(context.document)) return true
          return value?.trim() ? true : 'Indiquez un texte alternatif'
        }),
    }),
    defineField({
      name: 'objectFit',
      title: 'Remplissage dans le cadre',
      type: 'string',
      description:
        '« Couvrir » : remplit le cadre (rognage possible, selon recadrage Sanity ci-dessus). « Contenir » : image entière visible dans le cadre (bandes possibles).',
      initialValue: 'cover',
      options: {
        list: [
          {title: 'Couvrir (rognage possible dans le cadre)', value: 'cover'},
          {title: 'Contenir (pas de rognage, image entière)', value: 'contain'},
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: {alt: 'alt', objectFit: 'objectFit', media: 'image'},
    prepare({alt, objectFit, media}) {
      const fit =
        objectFit === 'contain' ? 'Contenir dans le cadre' : 'Couvrir (rognage possible)'
      return {
        title: alt || 'Image',
        subtitle: fit,
        media,
      }
    },
  },
})
