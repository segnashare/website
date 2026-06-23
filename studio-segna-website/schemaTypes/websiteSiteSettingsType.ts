import {defineField, defineType} from '@sanity/types'

/** Singleton — valeurs par défaut SEO / site (documentId fixe dans le desk). */
export const websiteSiteSettingsType = defineType({
  name: 'websiteSiteSettings',
  title: 'Réglages site web',
  type: 'document',
  fields: [
    defineField({
      name: 'defaultSeo',
      title: 'SEO par défaut',
      type: 'seoMetadata',
      description: 'Utilisé comme repli si une page ne définit pas son propre SEO.',
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Réglages site web'}
    },
  },
})
