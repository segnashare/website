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

const WEBSITE_SETTINGS_ID = 'websiteSiteSettings'
const WEBSITE_HEADER_NAV_ID = 'websiteHeaderNav'
const WEBSITE_FOOTER_ID = 'websiteFooter'

export const deskStructure: StructureResolver = (S) => {
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
                      S.documentTypeListItem('author').title('Auteurs'),
                      S.documentTypeListItem('catalogBrandPage').title('Marques'),
                    ]),
                ),
            ]),
        ),
    ])
}
