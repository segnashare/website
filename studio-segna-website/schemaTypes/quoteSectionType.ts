import {defineField, defineType} from '@sanity/types'
import {motionPresetField} from './objects/motionPresetField'
import {sectionIntroCtaFields} from './objects/sectionIntroCtaFields'
import {sectionVisibilityFieldset, sectionVisibilityFields} from './objects/sectionVisibilityFields'

export function plainTextFromBlocks(body: unknown, maxLen: number): string {
  if (!Array.isArray(body)) return ''
  let out = ''
  for (const block of body) {
    if (!block || typeof block !== 'object' || (block as {_type?: string})._type !== 'block') continue
    const children = (block as {children?: unknown[]}).children
    if (!Array.isArray(children)) continue
    for (const span of children) {
      if (span && typeof span === 'object' && 'text' in span && typeof (span as {text: unknown}).text === 'string') {
        out += (span as {text: string}).text
      }
    }
    out += ' '
    if (out.length >= maxLen) break
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** Citation pleine largeur (fond + typo configurables côté site). */
export const quoteSectionType = defineType({
  name: 'quoteSection',
  title: 'Citation',
  type: 'object',
  fieldsets: [sectionVisibilityFieldset],
  fields: [
    defineField({
      name: 'body',
      title: 'Contenu',
      type: 'blockContent',
      description:
        'Mise en forme : gras, italique, listes, liens, images. Encadré noir : sélectionner du texte → icône surligneur « Encadré noir » → recliquer sur la même icône pour retirer (ou Cmd+Z).',
      validation: (rule) => rule.required(),
    }),
    ...sectionIntroCtaFields(),
    defineField({
      name: 'backgroundColor',
      title: 'Couleur de fond (CSS)',
      type: 'string',
      description: 'Ex. #ffffff, rgb(255 250 245), transparent',
      initialValue: '#ffffff',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'textColor',
      title: 'Couleur du texte (CSS, optionnel)',
      type: 'string',
      description: 'Laisser vide pour le noir par défaut du thème.',
    }),
    defineField({
      name: 'typographyPreset',
      title: 'Police',
      type: 'string',
      initialValue: 'serif',
      options: {
        layout: 'radio',
        list: [
          {title: 'Serif Segna (Playfair) — titres de section', value: 'serif'},
          {title: 'Sans-serif (interface)', value: 'sans'},
          {title: 'Personnalisée (CSS)', value: 'custom'},
        ],
      },
    }),
    defineField({
      name: 'fontFamilyCustom',
      title: 'Famille de polices (CSS)',
      type: 'string',
      description: 'Ex. "DM Sans", system-ui, sans-serif — uniquement si « Personnalisée ».',
      hidden: ({parent}) => parent?.typographyPreset !== 'custom',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as {typographyPreset?: string}
          if (parent?.typographyPreset !== 'custom') return true
          return value?.trim() ? true : 'Renseignez une pile de polices CSS'
        }),
    }),
    motionPresetField(),
    ...sectionVisibilityFields(),
  ],
  preview: {
    select: {
      body: 'body',
    },
    prepare({body}) {
      const excerpt = plainTextFromBlocks(body, 120)
      return {
        title: 'Citation',
        subtitle: excerpt ? (excerpt.length > 80 ? `${excerpt.slice(0, 80)}…` : excerpt) : undefined,
      }
    },
  },
})
