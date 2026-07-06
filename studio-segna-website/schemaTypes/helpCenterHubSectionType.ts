import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

/**
 * Bloc FAQ marketing : colonne gauche (titre, texte, CTA), colonne droite (Q/R d’articles d’aide).
 */
export const helpCenterHubSectionType = defineType({
  name: 'helpCenterHubSection',
  title: 'FAQ (deux colonnes)',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'hubBackgroundColor',
      title: 'Couleur de fond (pleine largeur)',
      type: 'string',
      description: 'Ex. #f0f4f8 ou #f5f2ec — bandeau sur toute la largeur de l’écran.',
      initialValue: '#f0f4f8',
      validation: (rule) =>
        rule.custom((val) => {
          if (val == null || val === '') return true
          return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(val)) ? true : 'Hex attendu : #rgb ou #rrggbb'
        }),
    }),
    defineField({
      name: 'hubTextColor',
      title: 'Couleur du texte',
      type: 'string',
      initialValue: 'black',
      options: {
        layout: 'radio',
        list: [
          {title: 'Noir (fond clair) — CTA blanc sur foncé', value: 'black'},
          {title: 'Blanc (fond foncé) — CTA noir sur clair', value: 'white'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'hubTitle',
      title: 'Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'hubIntro',
      title: 'Sous-titre / texte d’introduction',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'helpHubCtaLabel',
      title: 'Libellé du bouton (CTA)',
      type: 'string',
      description: 'Affiché sous le texte d’introduction (ex. Voir tout le centre d’aide).',
      initialValue: 'Voir tout le centre d’aide',
    }),
    defineField({
      name: 'helpHubCtaHref',
      title: 'Lien du CTA',
      type: 'string',
      initialValue: 'https://help.segnashare.com',
      description: 'URL du centre d’aide (ex. https://help.segnashare.com).',
    }),
    defineField({
      name: 'helpArticlePaths',
      title: 'Articles d’aide (Q/R)',
      description:
        'Chemins vers le centre d’aide (projet FAQ séparé). Ex. compte/connexion ou livraison/suivi/delais',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) =>
            rule.custom((val) => {
              const t = String(val ?? '').trim()
              if (!t) return 'Chemin requis'
              if (/\s/.test(t)) return 'Pas d’espaces — utiliser des /'
              return true
            }),
        }),
      ],
    }),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {hubTitle: 'hubTitle'},
    prepare({hubTitle}) {
      return {
        title: 'FAQ (deux colonnes)',
        subtitle: hubTitle?.trim() || undefined,
      }
    },
  },
})
