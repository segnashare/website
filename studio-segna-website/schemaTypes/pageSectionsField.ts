import {defineArrayMember, defineField} from '@sanity/types'

/** Sections modulaires partagées entre accueil, newsroom, etc. */
export const pageSectionsField = () =>
  defineField({
    name: 'sections',
    title: 'Sections (contenu modulaire)',
    type: 'array',
    description:
      'Blocs sous le hero. Pour Best-sellers / pieces du moment : utilisez « Bandeau / grille catalogue (pièces BO) » en mode sélection (recherche dans le catalogue), pas le « Bandeau défilant (cartes) » (images Sanity manuelles). Réordonnez par glisser-déposer. Publiez pour voir sur le site.',
    of: [
      defineArrayMember({type: 'helpCenterHubSection'}),
      defineArrayMember({type: 'threeStepCardsSection'}),
      defineArrayMember({type: 'statementBand'}),
      defineArrayMember({type: 'triptychSection'}),
      defineArrayMember({type: 'catalogPuzzleSection'}),
      defineArrayMember({type: 'horizontalScrollCardsSection'}),
      defineArrayMember({type: 'websiteDbCatalogSection'}),
      defineArrayMember({type: 'quoteSection'}),
      defineArrayMember({type: 'splitFeatureSection'}),
      defineArrayMember({type: 'sectionBlock'}),
      defineArrayMember({type: 'richTextSection'}),
      defineArrayMember({
        type: 'twoColumnTableSection',
        title: 'Tableau (2 colonnes)',
      }),
      defineArrayMember({
        type: 'comparisonTableSection',
        title: 'Tableau comparatif (2 modes)',
      }),
      defineArrayMember({
        type: 'shuffleBasketSection',
        title: 'Shuffle panier (≤ 400 €)',
      }),
    ],
  })
