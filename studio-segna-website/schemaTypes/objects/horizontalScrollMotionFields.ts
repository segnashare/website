import {defineField} from '@sanity/types'

export const horizontalScrollMotionFields = () => [
  defineField({
    name: 'scrollMotion',
    title: 'Défilement',
    type: 'string',
    initialValue: 'manual',
    options: {
      layout: 'radio',
      list: [
        {title: 'Manuel (glisser)', value: 'manual'},
        {title: 'Automatique en boucle', value: 'auto_loop'},
      ],
    },
    description: 'En boucle, les cartes défilent en continu : la première suit la dernière.',
  }),
  defineField({
    name: 'scrollDirection',
    title: 'Sens du défilement',
    type: 'string',
    initialValue: 'to-left',
    options: {
      layout: 'radio',
      list: [
        {title: 'Vers la gauche (droite → gauche)', value: 'to-left'},
        {title: 'Vers la droite (gauche → droite)', value: 'to-right'},
      ],
    },
    hidden: ({parent}) => parent?.scrollMotion !== 'auto_loop',
  }),
  defineField({
    name: 'scrollSpeed',
    title: 'Vitesse',
    type: 'string',
    initialValue: 'normal',
    options: {
      layout: 'radio',
      list: [
        {title: 'Lente', value: 'slow'},
        {title: 'Normale', value: 'normal'},
        {title: 'Rapide', value: 'fast'},
      ],
    },
    hidden: ({parent}) => parent?.scrollMotion !== 'auto_loop',
  }),
]
