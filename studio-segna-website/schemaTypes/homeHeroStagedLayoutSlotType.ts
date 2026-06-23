import {defineField, defineType} from '@sanity/types'

/**
 * Cadre positionné en CSS (%, vh, px, auto) — utilisé pour bureau et mobile du hero multi-états.
 */
export const homeHeroStagedLayoutSlotType = defineType({
  name: 'homeHeroStagedLayoutSlot',
  title: 'Cadre (CSS)',
  type: 'object',
  options: {collapsible: true, collapsed: false},
  fields: [
    defineField({
      name: 'top',
      title: 'top',
      type: 'string',
      initialValue: 'auto',
      description: 'Ex. auto, 8%, 1.5rem',
    }),
    defineField({
      name: 'right',
      title: 'right',
      type: 'string',
      initialValue: 'auto',
    }),
    defineField({
      name: 'bottom',
      title: 'bottom',
      type: 'string',
      initialValue: 'auto',
    }),
    defineField({
      name: 'left',
      title: 'left',
      type: 'string',
      initialValue: 'auto',
    }),
    defineField({
      name: 'width',
      title: 'width',
      type: 'string',
      initialValue: '28%',
      description: 'Ex. 22%, 320px',
    }),
    defineField({
      name: 'height',
      title: 'height',
      type: 'string',
      initialValue: '40vh',
      description: 'Ex. 50vh, auto, 400px',
    }),
    defineField({
      name: 'objectFit',
      title: 'Remplissage (optionnel)',
      type: 'string',
      description: 'Si vide, reprend le réglage global de l’image.',
      options: {
        list: [
          {title: '(hériter)', value: ''},
          {title: 'Couvrir', value: 'cover'},
          {title: 'Contenir', value: 'contain'},
        ],
        layout: 'radio',
      },
      initialValue: '',
    }),
    defineField({
      name: 'zIndex',
      title: 'z-index',
      type: 'number',
      description: 'Optionnel ; sinon empilement selon l’ordre dans la liste.',
    }),
  ],
})
