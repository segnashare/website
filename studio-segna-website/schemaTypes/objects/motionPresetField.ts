import {defineField} from '@sanity/types'

export const motionPresetField = () =>
  defineField({
    name: 'motionPreset',
    title: 'Animation',
    type: 'string',
    initialValue: 'none',
    options: {
      layout: 'radio',
      list: [
        {title: 'Aucune', value: 'none'},
        {title: 'Apparition douce', value: 'fade-up'},
        {title: 'Échelonnée', value: 'stagger'},
      ],
    },
  })
