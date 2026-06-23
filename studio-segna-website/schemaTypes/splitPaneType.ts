import {defineArrayMember, defineField, defineType} from '@sanity/types'

/**
 * Une colonne du bloc « deux colonnes » : texte (avec option 2 onglets), image ou vidéo.
 */
export const splitPaneType = defineType({
  name: 'splitPane',
  title: 'Colonne (texte, image ou vidéo)',
  type: 'object',
  fields: [
    defineField({
      name: 'contentKind',
      title: 'Type de contenu',
      type: 'string',
      initialValue: 'text',
      options: {
        layout: 'radio',
        list: [
          {title: 'Texte', value: 'text'},
          {title: 'Image', value: 'image'},
          {title: 'Vidéo', value: 'video'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'mediaFrameFormat',
      title: 'Format du cadre (image ou vidéo)',
      type: 'string',
      initialValue: 'portrait',
      description:
        'Proportion du cadre dans la colonne : paysage (16∶9), carré (1∶1) ou portrait (3∶4). Le média remplit le cadre en « cover ».',
      options: {
        layout: 'radio',
        list: [
          {title: 'Petit rectangle (paysage)', value: 'landscape'},
          {title: 'Carré', value: 'square'},
          {title: 'Grand rectangle (portrait)', value: 'portrait'},
        ],
      },
      hidden: ({parent}) => parent?.contentKind !== 'image' && parent?.contentKind !== 'video',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Texte alternatif',
        }),
      ],
      hidden: ({parent}) => parent?.contentKind !== 'image',
    }),
    defineField({
      name: 'videoFile',
      title: 'Fichier vidéo',
      type: 'file',
      options: {
        accept: 'video/*',
      },
      hidden: ({parent}) => parent?.contentKind !== 'video',
    }),
    defineField({
      name: 'videoUrl',
      title: 'URL vidéo',
      type: 'url',
      description:
        'Lien direct vers un fichier .mp4 ou page YouTube/Vimeo. Si un fichier est uploadé ci-dessus, il est utilisé en priorité.',
      hidden: ({parent}) => parent?.contentKind !== 'video',
    }),
    defineField({
      name: 'videoPoster',
      title: 'Image de garde (avant lecture)',
      type: 'image',
      options: {hotspot: true},
      description:
        'Affichée avec le bouton « Lire » ; la vidéo ne se charge qu’au clic. Pour YouTube sans image : une vignette du service est utilisée automatiquement.',
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Texte alternatif',
        }),
      ],
      hidden: ({parent}) => parent?.contentKind !== 'video',
    }),
    defineField({
      name: 'heading',
      title: 'Titre',
      type: 'string',
      hidden: ({parent}) => parent?.contentKind !== 'text',
    }),
    defineField({
      name: 'headingSubtitle',
      title: 'Sous-titre (sous le titre, au-dessus des onglets / du texte)',
      type: 'text',
      rows: 3,
      description: 'Optionnel. S’affiche dans la colonne texte entre le titre et les onglets ou le corps.',
      hidden: ({parent}) => parent?.contentKind !== 'text',
    }),
    defineField({
      name: 'dualTabsEnabled',
      title: 'Deux états cliquables (ex. Abonnement / Location)',
      type: 'boolean',
      initialValue: false,
      hidden: ({parent}) => parent?.contentKind !== 'text',
    }),
    defineField({
      name: 'tab1Label',
      title: 'Libellé — état 1',
      type: 'string',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'tab1Body',
      title: 'Contenu — état 1',
      type: 'blockContent',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'tab2Label',
      title: 'Libellé — état 2',
      type: 'string',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'tab2Body',
      title: 'Contenu — état 2',
      type: 'blockContent',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'body',
      title: 'Contenu (sans onglets)',
      type: 'blockContent',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'cta1Label',
      title: 'Bouton — état 1 (libellé)',
      type: 'string',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'cta1Href',
      title: 'Bouton — état 1 (lien)',
      type: 'string',
      description: 'URL absolue (https://…) ou chemin interne (ex. /aide/…).',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'cta2Label',
      title: 'Bouton — état 2 (libellé)',
      type: 'string',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'cta2Href',
      title: 'Bouton — état 2 (lien)',
      type: 'string',
      description: 'URL absolue (https://…) ou chemin interne (ex. /aide/…).',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || !parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Bouton — libellé (sans onglets)',
      type: 'string',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'ctaHref',
      title: 'Bouton — lien (sans onglets)',
      type: 'string',
      description: 'URL absolue (https://…) ou chemin interne (ex. /aide/…).',
      hidden: ({parent}) =>
        parent?.contentKind !== 'text' || parent?.dualTabsEnabled,
    }),
    defineField({
      name: 'helpArticleRefs',
      title: 'Articles d’aide (Q/R)',
      description:
        'Articles du centre d’aide : leurs Q/R s’affichent sous le texte, avec un lien vers chaque article.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'helpArticle'}],
        }),
      ],
      hidden: ({parent}) => parent?.contentKind !== 'text',
    }),
  ],
  preview: {
    select: {kind: 'contentKind', title: 'heading'},
    prepare({kind, title}) {
      const k = kind === 'image' ? 'Image' : kind === 'video' ? 'Vidéo' : 'Texte'
      return {title: `${k}${title ? ` — ${title}` : ''}`}
    },
  },
})
