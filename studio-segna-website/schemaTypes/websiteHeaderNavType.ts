import {defineArrayMember, defineField, defineType} from '@sanity/types'

/**
 * Singleton — header : logo SVG, navigation, CTA. Contact et réseaux : document « Pied de page ».
 */
export const websiteHeaderNavType = defineType({
  name: 'websiteHeaderNav',
  title: 'Header & navigation (site)',
  type: 'document',
  initialValue: {
    navItems: [
      {label: 'Comment ça marche ?', href: '#'},
      {label: 'Catalogue', href: '#'},
      {label: 'Communauté', href: '#'},
      {label: 'Notre mission', href: '#'},
    ],
    secondaryCta: {
      label: 'Se connecter',
      url: 'https://app.segnashare.com/auth',
    },
    primaryCta: {
      label: 'Essai gratuit',
      url: 'https://app.segnashare.com/auth',
    },
  },
  fields: [
    defineField({
      name: 'segnaLogo',
      title: 'Logo Segna',
      description: 'Fichier vectoriel SVG (recommandé pour netteté sur tous les écrans).',
      type: 'file',
      options: {
        accept: '.svg,image/svg+xml',
      },
    }),
    defineField({
      name: 'navItems',
      title: 'Navigation',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'navItem',
          title: 'Élément de navigation',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'href',
              title: 'Lien (href)',
              type: 'string',
              initialValue: '',
            }),
          ],
          preview: {
            select: {title: 'label', subtitle: 'href'},
          },
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'secondaryCta',
      title: 'CTA secondaire',
      description: 'Lien texte entre la navigation et le bouton principal (ex. Se connecter).',
      type: 'object',
      fields: [
        defineField({
          name: 'label',
          title: 'Label',
          type: 'string',
        }),
        defineField({
          name: 'url',
          title: 'URL ou chemin',
          type: 'string',
          description: 'URL absolue ou chemin interne (ex. /auth, https://…)',
        }),
      ],
    }),
    defineField({
      name: 'primaryCta',
      title: 'CTA principal',
      description: 'Bouton plein à droite (ex. Essai gratuit).',
      type: 'object',
      fields: [
        defineField({
          name: 'label',
          title: 'Label',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'url',
          title: 'URL',
          type: 'url',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Header & navigation'}
    },
  },
})
