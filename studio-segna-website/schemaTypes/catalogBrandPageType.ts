import {defineField, defineType} from '@sanity/types'

/**
 * Texte éditorial par marque (URL `/catalogue/[slug-marque]` et intersections).
 * Le slug doit correspondre à `item_brands.slug` dans la base Segna.
 */
export const catalogBrandPageType = defineType({
  name: 'catalogBrandPage',
  title: 'Marque (catalogue)',
  type: 'document',
  fields: [
    defineField({
      name: 'internalTitle',
      title: 'Nom interne (Studio)',
      description: 'Repère pour les éditeurices ; n’apparaît pas sur le site.',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'brandSlug',
      title: 'Slug marque (base Segna)',
      description:
        'Identique au `slug` de la marque dans Segna (`item_brands.slug`), tel que dans l’URL du site : ex. `apc`, `maison-margiela`. Vérifiez la valeur dans le back-office / la base si besoin.',
      type: 'string',
      validation: (r) =>
        r
          .required()
          .lowercase()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
            name: 'slug',
            invert: false,
          })
          .custom(async (value, context) => {
            const slug = String(value || '')
              .trim()
              .toLowerCase()
            if (!slug) return true
            const {document, getClient} = context
            const client = getClient({apiVersion: '2025-01-01'})
            const rawId = typeof document?._id === 'string' ? document._id : ''
            if (!rawId) return true
            /** Paire brouillon / publié : même slug sur les deux `_id` → exclure les deux du décompte. */
            const draftId = rawId.startsWith('drafts.') ? rawId : `drafts.${rawId}`
            const publishedId = rawId.startsWith('drafts.') ? rawId.slice('drafts.'.length) : rawId
            const pair = [...new Set([draftId, publishedId].filter((x) => x.length > 0))]
            const n = await client.fetch<number>(
              `count(*[_type == "catalogBrandPage" && lower(brandSlug) == $slug && !(_id in $pair)])`,
              {slug, pair},
            )
            return n === 0 ? true : 'Une autre fiche utilise déjà ce slug.'
          }),
    }),
    defineField({
      name: 'headline',
      title: 'Titre affiché',
      description:
        'Ex. « A.P.C. POUR FEMMES ». Laisser vide pour afficher uniquement le nom catalogue issu de la base.',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {title: 'internalTitle', slug: 'brandSlug'},
    prepare({title, slug}) {
      return {title: title || 'Marque', subtitle: slug ? String(slug) : undefined}
    },
  },
})
