import {defineField, defineType} from '@sanity/types'
import {LinkIcon} from '@sanity/icons'

/**
 * Membre de tableau `heroStates[]` qui référence un état du référentiel
 * (`homeHeroStatePreset`) au lieu d'embarquer ses champs inline.
 *
 * Permet de réutiliser un état déjà défini sans tout ressaisir. Le frontend
 * résout la référence via une projection GROQ qui aplatit les champs comme
 * pour un état inline (cf. `homeHeroStatesGroq`).
 */
export const homeHeroStatePresetRefType = defineType({
  name: 'homeHeroStatePresetRef',
  title: 'État hero (réutiliser un préréglage)',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'preset',
      title: 'Préréglage',
      type: 'reference',
      to: [{type: 'homeHeroStatePreset'}],
      description:
        'Choisissez un état défini dans « Référentiel — États hero ». Toutes les modifications du préréglage seront répercutées partout où il est utilisé.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'preset.title',
      label: 'preset.label',
      subtitle: 'preset.backgroundColor',
    },
    prepare({title, label, subtitle}) {
      const main = title || label || 'Préréglage non choisi'
      return {
        title: `↪ ${main}`,
        subtitle: subtitle || undefined,
      }
    },
  },
})
