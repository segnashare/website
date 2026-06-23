import {
  AddCircleIcon,
  CogIcon,
  ComposeIcon,
  DocumentIcon,
  DocumentTextIcon,
  DocumentsIcon,
  EarthGlobeIcon,
  HomeIcon,
  MarkerIcon,
} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'

const API_VERSION = '2025-01-01'

type HelpCategoryRow = {_id: string; title: string}
type HelpSectionRow = {_id: string; title: string; categoryId: string}

const WEBSITE_SETTINGS_ID = 'websiteSiteSettings'
const WEBSITE_HEADER_NAV_ID = 'websiteHeaderNav'
const WEBSITE_FOOTER_ID = 'websiteFooter'

export const deskStructure: StructureResolver = (S, context) => {
  const client = context.getClient({apiVersion: API_VERSION})

  return S.list()
    .title('Contenu')
    .items([
      S.listItem()
        .title('Site web')
        .icon(DocumentsIcon)
        .id('desk-site')
        .child(
          S.list()
            .title('Site web')
            .items([
              S.listItem()
                .title('Réglages & navigation')
                .icon(CogIcon)
                .id('desk-site-settings-group')
                .child(
                  S.list()
                    .title('Réglages & navigation')
                    .items([
                      S.listItem()
                        .title('Réglages site web')
                        .icon(EarthGlobeIcon)
                        .id('desk-website-site-settings')
                        .child(
                          S.document()
                            .schemaType('websiteSiteSettings')
                            .documentId(WEBSITE_SETTINGS_ID)
                            .title('Réglages site web'),
                        ),
                      S.listItem()
                        .title('Header & navigation (site)')
                        .icon(MarkerIcon)
                        .id('desk-website-header-nav')
                        .child(
                          S.document()
                            .schemaType('websiteHeaderNav')
                            .documentId(WEBSITE_HEADER_NAV_ID)
                            .title('Header & navigation'),
                        ),
                      S.listItem()
                        .title('Pied de page (site)')
                        .icon(DocumentTextIcon)
                        .id('desk-website-footer')
                        .child(
                          S.document()
                            .schemaType('websiteFooter')
                            .documentId(WEBSITE_FOOTER_ID)
                            .title('Pied de page'),
                        ),
                      S.divider(),
                      S.documentTypeListItem('homeHeroStatePreset')
                        .title('Référentiel — États hero')
                        .icon(ComposeIcon)
                        .id('desk-website-hero-state-presets'),
                    ]),
                ),
              S.divider(),
              S.listItem()
                .title('Pages')
                .icon(DocumentsIcon)
                .id('desk-site-main-pages')
                .child(
                  S.list()
                    .title('Pages')
                    .items([
                      S.documentTypeListItem('homePage')
                        .title("Pages d'accueil")
                        .icon(HomeIcon)
                        .id('desk-main-home-list'),
                      S.documentTypeListItem('newsroomPage')
                        .title('Newsroom')
                        .icon(DocumentIcon)
                        .id('desk-main-newsroom-list'),
                      S.divider(),
                      S.documentTypeListItem('marketingPage')
                        .title('Pages marketing (site)')
                        .icon(DocumentsIcon)
                        .id('desk-main-marketing-pages-list'),
                    ]),
                ),
              S.divider(),
              S.listItem()
                .title('Posts & contenus listables')
                .icon(AddCircleIcon)
                .id('desk-site-posts-group')
                .child(
                  S.list()
                    .title('Posts & contenus listables')
                    .items([
                      S.documentTypeListItem('post').title('Posts'),
                      S.documentTypeListItem('catalogBrandPage').title('Marques'),
                    ]),
                ),
            ]),
        ),

      S.listItem()
        .title("Centre d'aide")
        .icon(DocumentTextIcon)
        .id('desk-help-center')
        .child(async () => {
          const [categories, sections] = await Promise.all([
            client.fetch<HelpCategoryRow[]>(
              `*[_type == "helpCategory"]|order(sortOrder asc, title asc){_id, title}`,
            ),
            client.fetch<HelpSectionRow[]>(
              `*[_type == "helpSection"]|order(sortOrder asc, title asc){_id, title, "categoryId": category._ref}`,
            ),
          ])

          const nestedByCategory = categories.map((cat) => {
            const catSections = sections.filter((sec) => sec.categoryId === cat._id)
            const sectionItems = catSections.map((sec) =>
              S.listItem()
                .title(sec.title)
                .id(`help-sec-${sec._id}`)
                .child(
                  S.list()
                    .title(sec.title)
                    .items([
                      S.listItem()
                        .title('Modifier la sous-section')
                        .id(`help-sec-edit-${sec._id}`)
                        .child(
                          S.document().schemaType('helpSection').documentId(sec._id).title(sec.title),
                        ),
                      S.divider(),
                      S.listItem()
                        .title('Articles')
                        .id(`help-sec-articles-${sec._id}`)
                        .child(
                          S.documentList()
                            .title('Articles')
                            .schemaType('helpArticle')
                            .filter('_type == "helpArticle" && section._ref == $sid')
                            .params({sid: sec._id})
                            .defaultOrdering([
                              {field: 'sortOrder', direction: 'asc'},
                              {field: 'title', direction: 'asc'},
                            ]),
                        ),
                      S.listItem()
                        .title('Nouvel article')
                        .icon(AddCircleIcon)
                        .id(`help-new-article-sec-${sec._id}`)
                        .child(
                          S.document()
                            .schemaType('helpArticle')
                            .initialValueTemplate('help-article-from-section', {
                              categoryId: cat._id,
                              sectionId: sec._id,
                            }),
                        ),
                    ]),
                ),
            )

            return S.listItem()
              .title(cat.title)
              .id(`help-cat-${cat._id}`)
              .child(
                S.list()
                  .title(cat.title)
                  .items([
                    S.listItem()
                      .title('Modifier la section')
                      .id(`help-cat-edit-${cat._id}`)
                      .child(
                        S.document().schemaType('helpCategory').documentId(cat._id).title(cat.title),
                      ),
                    S.divider(),
                    ...sectionItems,
                    S.listItem()
                      .title('Toutes les sous-sections (liste)')
                      .id(`help-sections-flat-${cat._id}`)
                      .child(
                        S.documentList()
                          .title(`Sous-sections — ${cat.title}`)
                          .schemaType('helpSection')
                          .filter('_type == "helpSection" && category._ref == $cid')
                          .params({cid: cat._id})
                          .defaultOrdering([
                            {field: 'sortOrder', direction: 'asc'},
                            {field: 'title', direction: 'asc'},
                          ]),
                      ),
                    S.listItem()
                      .title('Nouvelle sous-section')
                      .icon(AddCircleIcon)
                      .id(`help-new-section-${cat._id}`)
                      .child(
                        S.document()
                          .schemaType('helpSection')
                          .initialValueTemplate('help-section-from-category', {categoryId: cat._id}),
                      ),
                    S.divider(),
                    S.listItem()
                      .title('Articles à la racine')
                      .id(`help-articles-root-${cat._id}`)
                      .child(
                        S.documentList()
                          .title('Articles à la racine')
                          .schemaType('helpArticle')
                          .filter(
                            '_type == "helpArticle" && category._ref == $cid && !defined(section)',
                          )
                          .params({cid: cat._id})
                          .defaultOrdering([
                            {field: 'sortOrder', direction: 'asc'},
                            {field: 'title', direction: 'asc'},
                          ]),
                      ),
                    S.listItem()
                      .title('Nouvel article (racine)')
                      .icon(AddCircleIcon)
                      .id(`help-new-article-root-${cat._id}`)
                      .child(
                        S.document()
                          .schemaType('helpArticle')
                          .initialValueTemplate('help-article-from-category', {categoryId: cat._id}),
                      ),
                  ]),
              )
          })

          return S.list()
            .title("Centre d'aide")
            .items([
              S.listItem()
                .title('Réglages')
                .icon(CogIcon)
                .id('help-settings')
                .child(
                  S.document()
                    .schemaType('helpCenterSettings')
                    .documentId('helpCenterSettings')
                    .title("Centre d'aide — réglages"),
                ),
              S.divider(),
              ...nestedByCategory,
              S.listItem()
                .title('Nouvelle section')
                .icon(AddCircleIcon)
                .id('help-new-category')
                .child(S.document().schemaType('helpCategory').title('Nouvelle section')),
              S.divider(),
              S.listItem()
                .title('Toutes les sections')
                .id('help-flat-categories')
                .child(
                  S.documentList()
                    .title('Aide — sections')
                    .filter('_type == "helpCategory"')
                    .defaultOrdering([{field: 'sortOrder', direction: 'asc'}]),
                ),
              S.listItem()
                .title('Toutes les sous-sections')
                .id('help-flat-sections')
                .child(
                  S.documentList()
                    .title('Aide — sous-sections')
                    .filter('_type == "helpSection"')
                    .defaultOrdering([
                      {field: 'sortOrder', direction: 'asc'},
                      {field: 'title', direction: 'asc'},
                    ]),
                ),
              S.listItem()
                .title('Tous les articles')
                .id('help-flat-articles')
                .child(
                  S.documentList()
                    .title('Aide — articles')
                    .filter('_type == "helpArticle"')
                    .defaultOrdering([
                      {field: 'sortOrder', direction: 'asc'},
                      {field: 'title', direction: 'asc'},
                    ]),
                ),
            ])
        }),
    ])
}
