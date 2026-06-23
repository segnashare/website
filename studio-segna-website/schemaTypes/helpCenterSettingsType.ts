import {defineField, defineType} from '@sanity/types'

export const helpCenterSettingsType = defineType({
  name: 'helpCenterSettings',
  title: 'Centre d’aide — réglages',
  type: 'document',
  fields: [
    defineField({
      name: 'landingHeroTitle',
      title: 'Accueil aide — titre principal',
      type: 'string',
      description: 'Ex. : Bonjour, comment pouvons-nous vous aider ?',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'landingHeroSubtitle',
      title: 'Accueil aide — sous-titre (optionnel)',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'headerBrandLabel',
      title: 'En-tête — nom de marque',
      type: 'string',
      initialValue: 'Segna',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'headerHelpLabel',
      title: 'En-tête — libellé « centre d’aide »',
      type: 'string',
      initialValue: 'Centre d’aide',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'searchPlaceholder',
      title: 'Placeholder champ recherche',
      type: 'string',
      initialValue: 'Rechercher',
    }),
    defineField({
      name: 'searchResultsTitle',
      title: 'Titre page résultats de recherche',
      type: 'string',
      initialValue: 'Résultats de recherche',
    }),
    defineField({
      name: 'accentHex',
      title: 'Couleur d’accent (hex)',
      type: 'string',
      description: 'Ex. #4a2c5a — liens, fil d’Ariane, pastilles.',
      initialValue: '#4a2c5a',
      validation: (rule) =>
        rule.custom((val) => {
          if (val == null || val === '') return true
          return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(val)) ? true : 'Hex attendu : #rgb ou #rrggbb'
        }),
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Centre d’aide — réglages'}
    },
  },
})
