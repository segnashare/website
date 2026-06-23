import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

const sectionBlockDualRow = defineArrayMember({
  type: 'object',
  name: 'sectionBlockDualRow',
  title: 'Bloc image + texte',
  fields: [
    defineField({
      name: 'mediaPosition',
      title: 'Position de l’image',
      type: 'string',
      initialValue: 'left',
      options: {
        layout: 'radio',
        list: [
          {title: 'Image à gauche', value: 'left'},
          {title: 'Image à droite', value: 'right'},
        ],
      },
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'imageFormat',
      title: 'Format de l’image',
      type: 'string',
      initialValue: 'landscape',
      description: 'Cadre affiché (image recadrée, plus compacte qu’avant).',
      options: {
        layout: 'radio',
        list: [
          {title: 'Carré', value: 'square'},
          {title: 'Paysage', value: 'landscape'},
          {title: 'Portrait', value: 'portrait'},
        ],
      },
    }),
    defineField({
      name: 'body',
      title: 'Texte',
      type: 'blockContent',
      description: 'Titres, listes, gras, encadré… comme dans la section deux colonnes.',
    }),
  ],
  preview: {
    select: {media: 'image'},
    prepare({media}) {
      return {title: 'Image + texte', media}
    },
  },
})

/**
 * Bloc « titre + sous-titre + image » ou mode avancé : deux onglets + rangées image + texte riche.
 */
export const sectionBlockType = defineType({
  name: 'sectionBlock',
  title: 'Bloc texte + image',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text',
      title: 'Sous-titre / texte d’accompagnement',
      type: 'text',
      rows: 5,
      description:
        'Optionnel. Affiché sous le titre (même style que le bandeau défilant). En mode deux états : intro commune au-dessus des onglets.',
    }),
    defineField({
      name: 'dualTabsEnabled',
      title: 'Deux états cliquables (ex. Abonnement / Location)',
      type: 'boolean',
      initialValue: false,
      description:
        'Si activé : deux onglets, chacun avec une liste de blocs « image + texte » (comme une page type HomeExchange). L’image simple ci-dessous est masquée.',
    }),
    defineField({
      name: 'tab1Label',
      title: 'Libellé — état 1',
      type: 'string',
      hidden: ({parent}) => !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'tab2Label',
      title: 'Libellé — état 2',
      type: 'string',
      hidden: ({parent}) => !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'state1Rows',
      title: 'Rangées — état 1',
      type: 'array',
      of: [sectionBlockDualRow],
      description: 'Ajoutez une ou plusieurs rangées (image + zone de texte).',
      hidden: ({parent}) => !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'state2Rows',
      title: 'Rangées — état 2',
      type: 'array',
      of: [sectionBlockDualRow],
      description: 'Même principe que l’état 1.',
      hidden: ({parent}) => !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'image',
      title: 'Image (mode simple)',
      type: 'image',
      options: {hotspot: true},
      description: 'Une image à côté du sous-titre. Masquée si « deux états » est activé.',
      hidden: ({parent}) => Boolean(parent?.dualTabsEnabled),
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Couleur de fond',
      type: 'string',
      description:
        'Optionnel (ex. #0a0a0a, #f5f2ec). Si renseigné, le bandeau s’étend en pleine largeur ; le contenu reste aligné sur les marges 80 % comme le catalogue.',
    }),
    defineField({
      name: 'textOnBackground',
      title: 'Couleur du texte sur le fond',
      type: 'string',
      initialValue: 'dark',
      options: {
        layout: 'radio',
        list: [
          {title: 'Texte noir (fonds clairs)', value: 'dark'},
          {title: 'Texte blanc (fonds foncés)', value: 'light'},
        ],
      },
    }),
    motionPresetField(),
    defineField({
      name: 'helpArticleRefs',
      title: 'Articles d’aide (Q/R)',
      description:
        'Références vers des articles du centre d’aide : leurs questions / réponses s’affichent en accordéon, avec un lien vers l’article.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'helpArticle'}],
        }),
      ],
    }),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {
      blockTitle: 'title',
      media: 'image',
      dual: 'dualTabsEnabled',
    },
    prepare({blockTitle, media, dual}) {
      return {
        title: dual ? 'Bloc texte + image (2 états)' : 'Bloc texte + image',
        subtitle: blockTitle?.trim() || undefined,
        media,
      }
    },
  },
})
