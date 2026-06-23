import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {ComposeIcon} from '@sanity/icons'
import {HeroStateFrameBoardInput} from '../components/HeroStateFrameBoardInput'

/**
 * Référentiel d'états du hero multi-états : un document standalone que les pages
 * (`homePage`, `marketingPage`) peuvent réutiliser via `homeHeroStatePresetRef`.
 *
 * Permet aux éditeurs de définir un état une seule fois (ex. « Bleu nuit + 3 photos »)
 * et de l'appliquer sur plusieurs pages sans avoir à le ressaisir.
 */
export const homeHeroStatePresetType = defineType({
  name: 'homeHeroStatePreset',
  title: 'État hero (référentiel)',
  type: 'document',
  icon: ComposeIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Nom du préréglage (studio)',
      type: 'string',
      description:
        'Nom court pour retrouver ce préréglage dans la liste et lors de la réutilisation sur une page (ex. « Bleu nuit — 3 photos »).',
      validation: (rule) => rule.required().min(2).max(80),
    }),
    defineField({
      name: 'label',
      title: 'Libellé interne (optionnel)',
      type: 'string',
      description:
        'Libellé secondaire repris dans les pages quand l\u2019état est utilisé. Si vide, le « Nom du préréglage » est utilisé.',
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Couleur de fond',
      type: 'string',
      description: 'CSS couleur, ex. #3d4f6a ou rgb(45 55 90)',
      validation: (rule) =>
        rule.custom((value) => (value?.trim() ? true : 'Indiquez une couleur de fond')),
    }),
    defineField({
      name: 'durationMs',
      title: 'Durée affichage (ms)',
      type: 'number',
      initialValue: 5000,
      validation: (rule) =>
        rule.custom((value) => {
          const n = typeof value === 'number' ? value : Number(value)
          if (!Number.isFinite(n)) return 'Indiquez une durée (ms)'
          if (n < 1500 || n > 120000) return 'Entre 1500 et 120000 ms'
          return true
        }),
    }),
    defineField({
      name: 'images',
      title: 'Images (max 5)',
      type: 'array',
      validation: (rule) => rule.max(5),
      of: [defineArrayMember({type: 'homeHeroStagedImage'})],
    }),
    defineField({
      name: 'frameLayout',
      title: 'Mise en page globale (cadres)',
      type: 'homeHeroStagedStateFrameLayout',
      description:
        'Positionne tous les cadres d\u2019un coup (bureau = bandeau large ; mobile = bandeau paysage ~16:9). Le rognage dans le cadre se règle par image : recadrage Sanity + « Couvrir », ou « Contenir » pour tout montrer.',
      components: {input: HeroStateFrameBoardInput},
    }),
  ],
  preview: {
    select: {
      title: 'title',
      label: 'label',
      subtitle: 'backgroundColor',
      media: 'images.0.image',
    },
    prepare({title, label, subtitle, media}) {
      const main = title || label || 'État sans nom'
      const sub = [label && label !== title ? label : null, subtitle]
        .filter(Boolean)
        .join(' • ')
      return {
        title: main,
        subtitle: sub || undefined,
        media,
      }
    },
  },
})
