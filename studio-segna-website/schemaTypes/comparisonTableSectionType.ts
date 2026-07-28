import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionIntroCtaFields} from './objects/sectionIntroCtaFields'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

export const comparisonTableRowType = defineType({
  name: 'comparisonTableRow',
  title: 'Ligne comparatif',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Critère',
      type: 'string',
      description: 'Ex. Prix, Durée de location…',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'guestCell',
      title: 'Colonne gauche (libre-service)',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'memberCell',
      title: 'Colonne droite (abonnement)',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {label: 'label', guestCell: 'guestCell', memberCell: 'memberCell'},
    prepare({label, guestCell, memberCell}) {
      const l = typeof label === 'string' ? label.trim() : ''
      const a = typeof guestCell === 'string' ? guestCell.trim() : ''
      const b = typeof memberCell === 'string' ? memberCell.trim() : ''
      return {
        title: l || 'Ligne',
        subtitle: [a, b].filter(Boolean).map((s) => s.slice(0, 40)).join(' · ') || undefined,
      }
    },
  },
})

/** Tableau comparatif marketing (critère × 2 modes). */
export const comparisonTableSectionType = defineType({
  name: 'comparisonTableSection',
  title: 'Tableau comparatif (2 modes)',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'heading',
      title: 'Titre de section',
      type: 'string',
      initialValue: 'Deux façons de louer sur Segna',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Texte d’intro (optionnel)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'guestColumnHeader',
      title: 'En-tête — colonne gauche',
      type: 'string',
      initialValue: 'Location en libre-service (guest)',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'memberColumnHeader',
      title: 'En-tête — colonne droite',
      type: 'string',
      initialValue: 'Abonnement Segna',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'highlightMemberColumn',
      title: 'Mettre en avant la colonne abonnement',
      type: 'boolean',
      initialValue: true,
      description: 'Légère emphase visuelle sur la colonne de droite.',
    }),
    defineField({
      name: 'rows',
      title: 'Lignes',
      type: 'array',
      of: [defineArrayMember({type: 'comparisonTableRow'})],
      validation: (rule) => rule.required().min(1),
    }),
    ...sectionIntroCtaFields(),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      rows: 'rows',
    },
    prepare({heading, rows}) {
      const n = Array.isArray(rows) ? rows.length : 0
      return {
        title: heading?.trim() || 'Tableau comparatif',
        subtitle: n ? `${n} ligne${n > 1 ? 's' : ''}` : undefined,
      }
    },
  },
})
