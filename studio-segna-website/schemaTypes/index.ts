import {type SchemaTypeDefinition} from 'sanity'
import {homePageType} from './homePageType'
import {newsroomPageType} from './newsroomPageType'
import {postType} from './postType'

export const schemaTypes: SchemaTypeDefinition[] = [postType, homePageType, newsroomPageType]
