import {defineArrayMember, defineField, defineType} from '@sanity/types'

const footerLinkRow = defineArrayMember({
  type: 'object',
  name: 'footerLink',
  title: 'Lien',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'href',
      title: 'URL ou chemin',
      type: 'string',
      description: 'Ex. /catalogue, https://…',
      initialValue: '',
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'href'},
  },
})

const footerSocialLinkRow = defineArrayMember({
  type: 'object',
  name: 'footerSocialLink',
  title: 'Réseau social',
  fields: [
    defineField({
      name: 'icon',
      title: 'Icône (SVG)',
      description: 'SVG monochrome (idéalement noir) : affiché seul, sans cadre ni fond.',
      type: 'file',
      options: {
        accept: '.svg,image/svg+xml',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'href',
      title: 'URL du profil ou de la page',
      type: 'string',
      description: 'https://… ou chemin interne.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Libellé (accessibilité)',
      type: 'string',
      description: 'Ex. « Instagram » — pour les lecteurs d’écran.',
    }),
  ],
  preview: {
    select: {title: 'label', href: 'href'},
    prepare({title, href}) {
      return {title: title?.trim() || 'Réseau social', subtitle: href}
    },
  },
})

const footerColumnRow = defineArrayMember({
  type: 'object',
  name: 'footerColumn',
  title: 'Colonne',
  fields: [
    defineField({
      name: 'title',
      title: 'Titre de la section',
      description: 'Ex. Index, Ressources, Légal',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'links',
      title: 'Liens',
      type: 'array',
      of: [footerLinkRow],
      validation: (rule) => rule.min(1).error('Ajoutez au moins un lien dans la colonne.'),
    }),
  ],
  preview: {
    select: {title: 'title', links: 'links'},
    prepare({title, links}) {
      const n = Array.isArray(links) ? links.length : 0
      return {title: title || 'Colonne', subtitle: `${n} lien${n > 1 ? 's' : ''}`}
    },
  },
})

/** Singleton — pied de page modulaire (logo, couleurs, colonnes de liens). */
export const websiteFooterType = defineType({
  name: 'websiteFooter',
  title: 'Pied de page (site)',
  type: 'document',
  fields: [
    defineField({
      name: 'logoSvg',
      title: 'Logo (fichier SVG)',
      description: 'Vectoriel net sur tous les écrans (comme le header).',
      type: 'file',
      options: {
        accept: '.svg,image/svg+xml',
      },
    }),
    defineField({
      name: 'logoImage',
      title: 'Logo (image)',
      description: 'PNG / JPG / WebP si vous n’avez pas de SVG.',
      type: 'image',
      options: {hotspot: false},
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
      initialValue: '#f9f7f2',
      description: 'Format hex. Ex. fond crème #f9f7f2 (type HomeExchange).',
    }),
    defineField({
      name: 'textColor',
      title: 'Couleur du texte et des liens',
      type: 'string',
      initialValue: '#4a4642',
      description: 'Texte principal du pied de page.',
    }),
    defineField({
      name: 'columnHeadingColor',
      title: 'Couleur des titres de colonne',
      type: 'string',
      description: 'Optionnel — sinon teinte atténuée par rapport au texte.',
    }),
    defineField({
      name: 'columns',
      title: 'Colonnes de liens',
      type: 'array',
      of: [footerColumnRow],
      description: 'Chaque colonne = un titre (ex. Index) + une liste de liens (label + URL).',
    }),
    defineField({
      name: 'copyrightLine',
      title: 'Copyright',
      type: 'string',
      description: 'Sous le logo, en petit texte. Ex. Copyright © 2026 Segna | Tous droits réservés',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Réseaux sociaux',
      type: 'array',
      of: [footerSocialLinkRow],
      description:
        'Ordre = ordre d’affichage. Pour chaque ligne : uploadez un SVG noir, indiquez l’URL du profil.',
    }),
    defineField({
      name: 'legalLinks',
      title: 'Liens légaux (bas de page)',
      type: 'array',
      of: [footerLinkRow],
      description:
        'CGU, Politique de confidentialité, Mentions légales… Une rangée de liens sous le bloc principal, séparés par des points.',
    }),
    defineField({
      name: 'body',
      title: 'Ancien contenu (non affiché sur le site)',
      type: 'blockContent',
      hidden: true,
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Pied de page'}
    },
  },
})
