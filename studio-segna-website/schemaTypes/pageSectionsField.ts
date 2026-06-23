import {defineArrayMember, defineField} from '@sanity/types'

/** Sections modulaires partagées entre accueil, newsroom, etc. */
export const pageSectionsField = () =>
  defineField({
    name: 'sections',
    title: 'Sections (contenu modulaire)',
    type: 'array',
    description:
      'Blocs sous le hero : FAQ (deux colonnes), 3 cartes étapes, bandeau, tryptique, grille catalogue puzzle, défilement horizontal, citation, texte + image, contenu riche, tableau deux colonnes. Réordonnez par glisser-déposer. Chaque bloc peut être limité au desktop, au mobile, ou aux deux. Sans bloc ajouté ici, rien n’apparaît sous le hero sur le site. Le site affiche la dernière version publiée : après modification, cliquez sur Publier (un brouillon non publié n’apparaît pas sur le site).',
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
    ],
  })
