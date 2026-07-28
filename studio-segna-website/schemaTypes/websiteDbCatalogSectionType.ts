import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {TagIcon} from '@sanity/icons'
import {WebsiteDbCatalogItemIdInput} from '../components/WebsiteDbCatalogItemIdInput'
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
      title: 'Pièce catalogue',
      type: 'string',
      description:
        'Recherchez une pièce du catalogue Segna (même base que le back-office). Titre, photo et prix viennent automatiquement de la base.',
      components: {input: WebsiteDbCatalogItemIdInput},
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
      description:
        'Ligne secondaire sous le titre (ex. accroche éditoriale). Non affiché sur les bandeaux défilants actuels.',
    }),
  ],
  preview: {
    select: {itemId: 'itemId', title: 'cardTitle', media: 'coverImage'},
    prepare({itemId, title, media}) {
      return {
        title: title?.trim() || (itemId ? String(itemId).slice(0, 8) + '…' : 'Pièce'),
        subtitle: 'Catalogue Segna (BO)',
        media,
      }
    },
  },
})

export const websiteDbCatalogSectionType = defineType({
  name: 'websiteDbCatalogSection',
  title: 'Bandeau / grille catalogue (pièces BO)',
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
          {title: 'Sélection de pièces (recherche dans le catalogue BO)', value: 'curated'},
        ],
        layout: 'radio',
      },
      initialValue: 'curated',
      description:
        'En mode sélection : bandeau défilant des pièces choisies (Best-sellers, moment, etc.). En mode complet : grille filtrable. N’utilisez pas le « Bandeau défilant (cartes) » éditorial pour des vrais articles catalogue.',
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
      description: 'Bandeau horizontal : image portrait + titre + taille / prix.',
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
      title: 'Pièces (mode sélection)',
      type: 'array',
      of: [defineArrayMember({type: 'websiteDbCatalogItem'})],
      hidden: ({parent}) => parent?.catalogMode !== 'curated',
      description:
        'Ajoutez des pièces via la recherche (catalogue Segna / BO). Réordonnez par glisser-déposer.',
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
    defineField({
      name: 'scrollMotion',
      title: 'Défilement',
      type: 'string',
      initialValue: 'manual',
      options: {
        layout: 'radio',
        list: [
          {title: 'Manuel (glisser)', value: 'manual'},
          {title: 'Automatique en boucle', value: 'auto_loop'},
        ],
      },
      hidden: ({parent}) => parent?.catalogMode !== 'curated',
      description: 'En boucle, les cartes défilent en continu : la première suit la dernière.',
    }),
    defineField({
      name: 'scrollDirection',
      title: 'Sens du défilement',
      type: 'string',
      initialValue: 'to-left',
      options: {
        layout: 'radio',
        list: [
          {title: 'Vers la gauche (droite → gauche)', value: 'to-left'},
          {title: 'Vers la droite (gauche → droite)', value: 'to-right'},
        ],
      },
      hidden: ({parent}) =>
        parent?.catalogMode !== 'curated' || parent?.scrollMotion !== 'auto_loop',
    }),
    defineField({
      name: 'scrollSpeed',
      title: 'Vitesse',
      type: 'string',
      initialValue: 'normal',
      options: {
        layout: 'radio',
        list: [
          {title: 'Lente', value: 'slow'},
          {title: 'Normale', value: 'normal'},
          {title: 'Rapide', value: 'fast'},
        ],
      },
      hidden: ({parent}) =>
        parent?.catalogMode !== 'curated' || parent?.scrollMotion !== 'auto_loop',
    }),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {title: 'heading', dbItems: 'dbItems', catalogMode: 'catalogMode'},
    prepare({title, dbItems: items, catalogMode}) {
      const n = Array.isArray(items) ? items.length : 0
      if (catalogMode === 'curated') {
        return {
          title: title || 'Sélection catalogue BO',
          subtitle: n ? `${n} pièce(s)` : 'Sélection vide',
        }
      }
      return {title: title || 'Catalogue Segna', subtitle: 'Catalogue complet'}
    },
  },
})
