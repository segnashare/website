import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {TagIcon} from '@sanity/icons'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

const sanityImageField = defineField({
  name: 'coverImage',
  title: 'Image de couverture (site)',
  type: 'image',
  description:
    'Optionnel : remplace la première photo catalogue sur la grille du site. Les photos complètes viennent toujours de la base Segna sur la fiche détail.',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      type: 'string',
      title: 'Texte alternatif',
    }),
  ],
})

/** Une pièce catalogue Segna (UUID) + mise en avant visuelle optionnelle sur le site. */
export const websiteDbCatalogItemType = defineType({
  name: 'websiteDbCatalogItem',
  title: 'Pièce catalogue (base Segna)',
  type: 'object',
  fields: [
    defineField({
      name: 'itemId',
      title: 'ID pièce (UUID)',
      type: 'string',
      description: 'Identifiant de la pièce dans l’app / Supabase (table items).',
      validation: (Rule) =>
        Rule.required().regex(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          {name: 'uuid', invert: false},
        ),
    }),
    sanityImageField,
    defineField({
      name: 'cardTitle',
      title: 'Titre carte (optionnel)',
      type: 'string',
      description: 'Surcharge le titre affiché sur la grille ; sinon titre catalogue DB.',
    }),
    defineField({
      name: 'cardSubtitle',
      title: 'Sous-titre carte (optionnel)',
      type: 'string',
      description: 'Ligne secondaire sous le titre (ex. accroche éditoriale).',
    }),
  ],
  preview: {
    select: {itemId: 'itemId', media: 'coverImage'},
    prepare({itemId, media}) {
      return {
        title: itemId ? String(itemId).slice(0, 8) + '…' : 'Pièce',
        subtitle: 'Catalogue DB',
        media,
      }
    },
  },
})

export const websiteDbCatalogSectionType = defineType({
  name: 'websiteDbCatalogSection',
  title: 'Grille — pièces catalogue (base Segna)',
  type: 'object',
  icon: TagIcon,
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'catalogMode',
      title: 'Mode catalogue',
      type: 'string',
      options: {
        list: [
          {title: 'Catalogue complet (toutes les pièces éligibles)', value: 'full_catalog'},
          {title: 'Sélection manuelle (liste d’UUID ci-dessous)', value: 'curated'},
        ],
        layout: 'radio',
      },
      initialValue: 'full_catalog',
      description:
        'En mode complet, la liste « Pièces » est ignorée : le site affiche jusqu’à 200 pièces avec filtres et tri. En mode sélection, les pièces listées apparaissent en bandeau défilant.',
    }),
    defineField({
      name: 'cardSize',
      title: 'Taille des cartes (mode sélection)',
      type: 'string',
      initialValue: 'small',
      options: {
        layout: 'radio',
        list: [
          {title: 'Grand', value: 'large'},
          {title: 'Petit (−30 % puis −15 %)', value: 'small'},
        ],
      },
      hidden: ({parent}) => parent?.catalogMode !== 'curated',
      description: 'Bandeau horizontal type Airbnb : image carrée puis titre, marque et prix en dessous.',
    }),
    defineField({
      name: 'heading',
      title: 'Titre',
      type: 'string',
      initialValue: 'Sélection',
    }),
    defineField({
      name: 'intro',
      title: 'Chapô',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'introCtaLabel',
      title: 'Libellé lien chapô',
      type: 'string',
      description: 'Ex. « Voir toutes les pièces » — affiché seulement si l’URL ci-dessous est renseignée.',
    }),
    defineField({
      name: 'introCtaHref',
      title: 'URL lien chapô',
      type: 'string',
      description: 'Chemin interne ou URL https (ex. lien vers l’app ou une autre page).',
    }),
    defineField({
      name: 'dbItems',
      title: 'Pièces (mode sélection uniquement)',
      type: 'array',
      of: [defineArrayMember({type: 'websiteDbCatalogItem'})],
      hidden: ({parent}) => parent?.catalogMode !== 'curated',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {catalogMode?: string}
          if (parent?.catalogMode !== 'curated') return true
          if (!Array.isArray(value) || value.length < 1) {
            return 'Ajoutez au moins une pièce en mode sélection.'
          }
          if (value.length > 24) return 'Maximum 24 pièces.'
          return true
        }),
    }),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {title: 'heading', dbItems: 'dbItems', catalogMode: 'catalogMode'},
    prepare({title, dbItems: items, catalogMode}) {
      const n = Array.isArray(items) ? items.length : 0
      if (catalogMode === 'curated') {
        return {title: title || 'Pièces catalogue DB', subtitle: n ? `${n} pièce(s)` : 'Sélection vide'}
      }
      return {title: title || 'Catalogue Segna', subtitle: 'Catalogue complet'}
    },
  },
})
