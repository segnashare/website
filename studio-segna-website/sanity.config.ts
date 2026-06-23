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
    templates: (prev) => [
      ...prev,
      {
        id: 'help-article-from-category',
        title: 'Article (section pré-remplie, sans sous-section)',
        schemaType: 'helpArticle',
        parameters: [{name: 'categoryId', type: 'string'}],
        value: (params: {categoryId?: string}) => ({
          category: {
            _type: 'reference',
            _ref: String(params?.categoryId ?? ''),
          },
        }),
      },
      {
        id: 'help-section-from-category',
        title: 'Sous-section (section pré-remplie)',
        schemaType: 'helpSection',
        parameters: [{name: 'categoryId', type: 'string'}],
        value: (params: {categoryId?: string}) => ({
          category: {
            _type: 'reference',
            _ref: String(params?.categoryId ?? ''),
          },
        }),
      },
      {
        id: 'help-article-from-section',
        title: 'Article (sous-section pré-remplie)',
        schemaType: 'helpArticle',
        parameters: [
          {name: 'categoryId', type: 'string'},
          {name: 'sectionId', type: 'string'},
        ],
        value: (params: {categoryId?: string; sectionId?: string}) => ({
          category: {
            _type: 'reference',
            _ref: String(params?.categoryId ?? ''),
          },
          section: {
            _type: 'reference',
            _ref: String(params?.sectionId ?? ''),
          },
        }),
      },
    ],
  },
})
