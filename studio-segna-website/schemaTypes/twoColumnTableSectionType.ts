import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {TwoColumnTableSectionInput} from '../components/TwoColumnTableSectionInput'
import {motionPresetField} from './objects/motionPresetField'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

export const twoColumnTableRowType = defineType({
  name: 'twoColumnTableRow',
  title: 'Ligne',
  type: 'object',
  fields: [
    defineField({
      name: 'firstCell',
      title: 'Colonne 1',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'secondCell',
      title: 'Colonne 2',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {firstCell: 'firstCell', secondCell: 'secondCell'},
    prepare({firstCell, secondCell}) {
      const a = typeof firstCell === 'string' ? firstCell.trim() : ''
      const b = typeof secondCell === 'string' ? secondCell.trim() : ''
      return {
        title: a ? a.slice(0, 72) + (a.length > 72 ? '…' : '') : 'Ligne',
        subtitle: b ? b.slice(0, 80) + (b.length > 80 ? '…' : '') : undefined,
      }
    },
  },
})

export const twoColumnTableSectionType = defineType({
  name: 'twoColumnTableSection',
  title: 'Tableau (2 colonnes)',
  type: 'object',
  components: {input: TwoColumnTableSectionInput},
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'heading',
      title: 'Titre de section (optionnel)',
      type: 'string',
    }),
    defineField({
      name: 'intro',
      title: 'Texte au-dessus du tableau (optionnel)',
      type: 'text',
      rows: 4,
      description: 'Ex. phrase d’introduction avant le tableau.',
    }),
    defineField({
      name: 'firstColumnHeader',
      title: 'En-tête — colonne 1',
      type: 'string',
      initialValue: 'Type de cookie',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'secondColumnHeader',
      title: 'En-tête — colonne 2',
      type: 'string',
      initialValue: 'Description',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'rows',
      title: 'Lignes du tableau',
      type: 'array',
      description:
        'Vous pouvez aussi remplir via le bloc « Coller un tableau » en haut (Excel, Sheets, tableau web).',
      of: [defineArrayMember({type: 'twoColumnTableRow'})],
      validation: (rule) => rule.required().min(1),
    }),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      firstColumnHeader: 'firstColumnHeader',
      rows: 'rows',
    },
    prepare({heading, firstColumnHeader, rows}) {
      const n = Array.isArray(rows) ? rows.length : 0
      const sub = [firstColumnHeader?.trim(), n ? `${n} ligne${n > 1 ? 's' : ''}` : null]
        .filter(Boolean)
        .join(' · ')
      return {
        title: heading?.trim() || 'Tableau (2 colonnes)',
        subtitle: sub || undefined,
      }
    },
  },
})
