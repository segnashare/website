import type {SchemaTypeDefinition} from '@sanity/types'
import {blockContentType} from './blockContentType'
import {helpArticleType} from './helpArticleType'
import {helpCategoryType} from './helpCategoryType'
import {helpSectionType} from './helpSectionType'
import {helpCenterHubSectionType} from './helpCenterHubSectionType'
import {helpCenterSettingsType} from './helpCenterSettingsType'
import {homeHeroStagedLayoutSlotType} from './homeHeroStagedLayoutSlotType'
import {homeHeroStagedImageType} from './homeHeroStagedImageType'
import {homeHeroStagedInfoItemType} from './homeHeroStagedInfoItemType'
import {homeHeroStagedStateFrameLayoutType} from './homeHeroStagedStateFrameLayoutType'
import {homeHeroStagedStateType} from './homeHeroStagedStateType'
import {homeHeroStatePresetType} from './homeHeroStatePresetType'
import {homeHeroStatePresetRefType} from './homeHeroStatePresetRefType'
import {homePageType} from './homePageType'
import {marketingPageType} from './marketingPageType'
import {newsroomPageType} from './newsroomPageType'
import {postType} from './postType'
import {richTextSectionType} from './richTextSectionType'
import {sectionBlockType} from './sectionBlockType'
import {splitFeatureSectionType} from './splitFeatureSectionType'
import {splitPaneType} from './splitPaneType'
import {quoteSectionType} from './quoteSectionType'
import {catalogPuzzleSectionType, catalogPuzzleTileType} from './catalogPuzzleSectionType'
import {
  horizontalScrollCardType,
  horizontalScrollCardsSectionType,
} from './horizontalScrollCardsSectionType'
import {catalogBrandPageType} from './catalogBrandPageType'
import {websiteDbCatalogItemType, websiteDbCatalogSectionType} from './websiteDbCatalogSectionType'
import {statementBandType} from './statementBandType'
import {
  triptychCardCycleStateType,
  triptychCardType,
  triptychSectionType,
} from './triptychSectionType'
import {threeStepCardType, threeStepCardsSectionType} from './threeStepCardsSectionType'
import {twoColumnTableRowType, twoColumnTableSectionType} from './twoColumnTableSectionType'
import {seoObjectType} from './objects/seoObjectType'
import {websiteFooterType} from './websiteFooterType'
import {websiteHeaderNavType} from './websiteHeaderNavType'
import {websiteSiteSettingsType} from './websiteSiteSettingsType'

export const schemaTypes: SchemaTypeDefinition[] = [
  blockContentType,
  seoObjectType,
  sectionBlockType,
  splitPaneType,
  splitFeatureSectionType,
  richTextSectionType,
  twoColumnTableRowType,
  twoColumnTableSectionType,
  statementBandType,
  catalogPuzzleTileType,
  catalogPuzzleSectionType,
  horizontalScrollCardType,
  horizontalScrollCardsSectionType,
  websiteDbCatalogItemType,
  websiteDbCatalogSectionType,
  catalogBrandPageType,
  quoteSectionType,
  websiteSiteSettingsType,
  websiteHeaderNavType,
  websiteFooterType,
  helpCenterHubSectionType,
  helpCenterSettingsType,
  helpCategoryType,
  helpSectionType,
  helpArticleType,
  postType,
  homeHeroStagedLayoutSlotType,
  homeHeroStagedStateFrameLayoutType,
  homeHeroStagedImageType,
  threeStepCardType,
  threeStepCardsSectionType,
  triptychCardCycleStateType,
  triptychCardType,
  triptychSectionType,
  homeHeroStagedInfoItemType,
  homeHeroStagedStateType,
  homeHeroStatePresetType,
  homeHeroStatePresetRefType,
  homePageType,
  marketingPageType,
  newsroomPageType,
]
