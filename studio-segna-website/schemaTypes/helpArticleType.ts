import {defineArrayMember, defineField, defineType} from '@sanity/types'

export const helpArticleType = defineType({
  name: 'helpArticle',
  title: 'Aide — article',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Section',
      description: 'Niveau 1. Obligatoire pour tous les articles.',
      type: 'reference',
      to: [{type: 'helpCategory'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'section',
      title: 'Sous-section',
      description:
        'Optionnel. Si renseigné, l’article est rangé sous cette sous-section (URL à 3 segments). Laisser vide pour un article directement sous la section (URL à 2 segments).',
      type: 'reference',
      to: [{type: 'helpSection'}],
    }),
    defineField({
      name: 'sortOrder',
      title: 'Ordre (sous-section ou racine de la section)',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'excerpt',
      title: 'Extrait (liste & recherche)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(400),
    }),
    defineField({
      name: 'isFeatured',
      title: 'Mettre en avant (étoile)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Dernière mise à jour',
      type: 'date',
    }),
    defineField({
      name: 'body',
      title: 'Contenu',
      type: 'blockContent',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'qaItems',
      title: 'Questions / réponses',
      description:
        'Q/R affichées sur cette page. Pour les pages marketing (blocs texte + image, 2 colonnes), référencez cet article : les mêmes entrées s’affichent avec un lien vers l’article.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (rule) => rule.required().max(200),
            }),
            defineField({
              name: 'answer',
              title: 'Réponse',
              type: 'blockContent',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {q: 'question'},
            prepare({q}) {
              const t = (q || '').trim() || 'Sans titre'
              return {title: t.length > 72 ? `${t.slice(0, 72)}…` : t}
            },
          },
        }),
      ],
    }),
  ],
  validation: (rule) =>
    rule.custom(async (doc, context) => {
      const d = doc as {
        section?: {_ref?: string}
        category?: {_ref?: string}
      }
      const sectionRef = d?.section?._ref
      const catRef = d?.category?._ref
      if (!sectionRef || !catRef) return true
      const client = context.getClient({apiVersion: '2025-01-01'})
      const parentCat = await client.fetch<string | null>(
        `*[_type == "helpSection" && _id == $id][0].category._ref`,
        {id: sectionRef},
      )
      if (parentCat && parentCat !== catRef) {
        return 'La sous-section choisie n’appartient pas à la section indiquée.'
      }
      return true
    }),
  orderings: [
    {
      title: 'Ordre (section / sous-section)',
      name: 'sortOrderAsc',
      by: [{field: 'sortOrder', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'title', cat: 'category.title', sub: 'section.title'},
    prepare({title, cat, sub}) {
      const trail = [cat, sub].filter(Boolean).join(' › ')
      return {title: title ?? 'Sans titre', subtitle: trail}
    },
  },
})
