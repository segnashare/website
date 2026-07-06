import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {duplicableContentDuplicateAction} from './documentActions/duplicableContentDuplicateAction'
import {normalizePublishedId, shouldOfferCustomDuplicate, shouldStripDefaultDuplicate} from './documentActions/duplicatePolicy'
import {deskStructure} from './deskStructure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Segna website',

  projectId: '1qxhnoe8',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: deskStructure,
    }),
  ],

  /**
   * Menu « + » global : masque les templates `homePage` / `newsroomPage` pour limiter
   * les créations hors contexte. Les listes **Pages** du desk proposent toujours
   * la création et la duplication depuis la structure.
   */
  document: {
    newDocumentOptions: (prev, {creationContext}) => {
      if (creationContext.type === 'global') {
        return prev.filter(
          (item) => item.templateId !== 'homePage' && item.templateId !== 'newsroomPage',
        )
      }
      return prev
    },
    actions: (prev, context) => {
      const schemaType = context.schemaType ?? ''
      const publishedId = normalizePublishedId(context.documentId)
      if (!shouldStripDefaultDuplicate(schemaType, publishedId)) {
        return prev
      }
      const withoutDuplicate = prev.filter((Action) => Action.action !== 'duplicate')
      if (!shouldOfferCustomDuplicate(schemaType, publishedId)) {
        return withoutDuplicate
      }
      return [...withoutDuplicate, duplicableContentDuplicateAction]
    },
  },

  schema: {
    types: schemaTypes,
  },
})
