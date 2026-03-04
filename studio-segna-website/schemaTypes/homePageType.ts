import {defineField, defineType} from 'sanity'

export const homePageType = defineType({
  name: 'homePage',
  title: 'Page d’accueil',
  type: 'document',
  initialValue: {
    brandName: 'Segna',
    navItems: [
      {label: 'Accueil', href: ''},
      {label: 'Fonctionnalites', href: ''},
      {label: 'Actualites', href: '/newsroom'},
    ],
    mobileMenuContact: {
      label: 'Contact',
      href: '#',
    },
    mobileMenuSocialLinks: [
      {label: 'X', href: 'https://x.com'},
      {label: 'Instagram', href: 'https://instagram.com'},
    ],
  },
  fields: [
    defineField({
      name: 'brandName',
      title: 'Nom de marque',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero - Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero - Sous-titre',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero - Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'primaryCta',
      title: 'CTA principal',
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
    defineField({
      name: 'navItems',
      title: 'Navigation',
      type: 'array',
      of: [
        defineField({
          name: 'navItem',
          title: 'Element de navigation',
          type: 'object',
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
          validation: (rule) =>
            rule.custom((value) => {
              if (!value || typeof value !== 'object') return true

              const label = 'label' in value && typeof value.label === 'string' ? value.label.trim().toLowerCase() : ''
              const href = 'href' in value && typeof value.href === 'string' ? value.href.trim() : ''

              if (label === 'actualites' && href !== '/newsroom') {
                return 'Pour "Actualites", le lien doit etre /newsroom.'
              }

              return true
            }),
          preview: {
            select: {
              title: 'label',
              subtitle: 'href',
            },
          },
        }),
      ],
      validation: (rule) =>
        rule.required().min(1).custom((items) => {
          if (!Array.isArray(items)) return 'Ajoutez au moins un element de navigation.'

          const hasNewsroomLink = items.some((item) => {
            if (!item || typeof item !== 'object') return false
            const label = 'label' in item && typeof item.label === 'string' ? item.label : ''
            const href = 'href' in item && typeof item.href === 'string' ? item.href : ''
            return label.trim().toLowerCase() === 'actualites' && href === '/newsroom'
          })

          return hasNewsroomLink
            ? true
            : 'Ajoutez un element "Actualites" qui pointe vers /newsroom.'
        }),
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [
        defineField({
          name: 'sectionBlock',
          title: 'Section',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Titre',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'text',
              title: 'Texte',
              type: 'text',
              rows: 5,
              validation: (rule) => rule.required(),
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
          ],
          preview: {
            select: {
              title: 'title',
              media: 'image',
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'mobileMenuContact',
      title: 'Menu mobile - Contact',
      type: 'object',
      fields: [
        defineField({
          name: 'label',
          title: 'Label',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'href',
          title: 'Lien',
          type: 'string',
          initialValue: '#',
        }),
      ],
    }),
    defineField({
      name: 'mobileMenuSocialLinks',
      title: 'Menu mobile - Reseaux',
      type: 'array',
      of: [
        defineField({
          name: 'socialLink',
          title: 'Reseau',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'href',
              title: 'Lien',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {
              title: 'label',
              subtitle: 'href',
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Home Page',
      }
    },
  },
})
