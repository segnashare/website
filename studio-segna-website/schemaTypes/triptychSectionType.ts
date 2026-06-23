import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {HeroStateFrameBoardInput} from '../components/HeroStateFrameBoardInput'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

/** Un état du carrousel dans une carte tryptique (fond + images en collage). */
export const triptychCardCycleStateType = defineType({
  name: 'triptychCardCycleState',
  title: 'État (fond + images)',
  type: 'object',
  fields: [
    defineField({
      name: 'backgroundColor',
      title: 'Couleur de fond',
      type: 'string',
      description: 'CSS, ex. #c45c4a',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'durationMs',
      title: 'Durée affichage (ms)',
      type: 'number',
      initialValue: 5000,
      validation: (rule) => rule.required().min(1500).max(60000),
    }),
    defineField({
      name: 'images',
      title: 'Images (max 3, collage)',
      type: 'array',
      validation: (rule) => rule.max(3),
      of: [defineArrayMember({type: 'homeHeroStagedImage'})],
    }),
    defineField({
      name: 'frameLayout',
      title: 'Mise en page globale (cadres)',
      type: 'homeHeroStagedStateFrameLayout',
      description:
        'Une seule vue au ratio carte (3:4), identique au rendu site. Les mêmes cadres sont appliqués partout (pas de variante mobile/desktop).',
      components: {input: HeroStateFrameBoardInput},
      options: {singleTriptychViewport: true},
    }),
  ],
  preview: {
    select: {subtitle: 'backgroundColor'},
    prepare({subtitle}) {
      return {title: 'État tryptique', subtitle: subtitle || undefined}
    },
  },
})

export const triptychCardType = defineType({
  name: 'triptychCard',
  title: 'Carte tryptique',
  type: 'object',
  fields: [
    defineField({
      name: 'presentation',
      title: 'Type de média',
      type: 'string',
      initialValue: 'static_image',
      options: {
        layout: 'radio',
        list: [
          {title: 'Image fixe (plein cadre)', value: 'static_image'},
          {title: 'Fond coloré + images + transition', value: 'color_cycle'},
        ],
      },
    }),
    defineField({
      name: 'staticImage',
      title: 'Image',
      type: 'image',
      options: {hotspot: true, crop: true},
      hidden: ({parent}) => parent?.presentation !== 'static_image',
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {presentation?: string}
          if (parent?.presentation !== 'static_image') return true
          return value?.asset ? true : 'Image requise'
        }),
    }),
    defineField({
      name: 'staticObjectFit',
      title: 'Remplissage',
      type: 'string',
      initialValue: 'cover',
      hidden: ({parent}) => parent?.presentation !== 'static_image',
      options: {
        layout: 'radio',
        list: [
          {title: 'Couvrir', value: 'cover'},
          {title: 'Contenir', value: 'contain'},
        ],
      },
    }),
    defineField({
      name: 'cycleStates',
      title: 'Séquence (états)',
      type: 'array',
      of: [defineArrayMember({type: 'triptychCardCycleState'})],
      hidden: ({parent}) => parent?.presentation !== 'color_cycle',
      validation: (rule) =>
        rule.custom((states, context) => {
          const parent = context.parent as {presentation?: string}
          if (parent?.presentation !== 'color_cycle') return true
          if (!Array.isArray(states) || states.length < 1) {
            return 'Ajoutez au moins un état'
          }
          return true
        }),
    }),
    defineField({
      name: 'frameTitle',
      title: 'Titre dans le cadre',
      type: 'string',
      description: 'Affiché en blanc, centré (Playfair sur le site).',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'caption',
      title: 'Texte sous le cadre',
      type: 'blockContent',
      description: 'Gras, italique, liens… pour mettre en avant certains mots.',
    }),
    defineField({
      name: 'href',
      title: 'Lien (carte cliquable)',
      type: 'string',
      description: 'URL absolue (https://…) ou chemin interne (ex. /newsroom). Vide = pas de lien.',
    }),
  ],
  preview: {
    select: {title: 'frameTitle', subtitle: 'presentation'},
    prepare({title, subtitle}) {
      return {
        title: title || 'Carte',
        subtitle: subtitle === 'color_cycle' ? 'Transition' : 'Image fixe',
      }
    },
  },
})

export const triptychSectionType = defineType({
  name: 'triptychSection',
  title: 'Tryptique (3 cartes)',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'heading',
      title: 'Titre de section (optionnel)',
      type: 'string',
    }),
    defineField({
      name: 'cardStageTransitionMs',
      title: 'Durée animation (cartes « transition »)',
      type: 'number',
      description: 'Même principe que le hero multi-états : glissement des images (ms).',
      initialValue: 650,
      validation: (rule) => rule.min(200).max(3000),
    }),
    defineField({
      name: 'cards',
      title: 'Les 3 cartes',
      type: 'array',
      validation: (rule) =>
        rule.custom((cards) => {
          if (!Array.isArray(cards) || cards.length !== 3) {
            return 'Ajoutez exactement 3 cartes'
          }
          return true
        }),
      of: [defineArrayMember({type: 'triptychCard'})],
    }),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {heading: 'heading', card0: 'cards.0.frameTitle'},
    prepare({heading, card0}) {
      const sub = [heading?.trim(), card0?.trim()].filter(Boolean).join(' · ') || '3 cartes'
      return {
        title: 'Tryptique (3 cartes)',
        subtitle: sub,
      }
    },
  },
})
