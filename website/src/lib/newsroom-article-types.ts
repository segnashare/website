/** Types d’articles Newsroom (filtre catalogue-like). */
export const NEWSROOM_ARTICLE_TYPES = [
  {id: 'blog_mode', label: 'Articles blog Mode'},
  {id: 'segna', label: 'Articles Segna'},
  {id: 'communaute', label: 'Articles Communauté'},
  {id: 'presse', label: 'Articles Presse'},
  {id: 'tendances', label: 'Articles Tendances'},
] as const

export type NewsroomArticleTypeId = (typeof NEWSROOM_ARTICLE_TYPES)[number]['id']

export const NEWSROOM_SORT_OPTIONS = [
  {id: 'recent', label: 'Plus récents'},
  {id: 'oldest', label: 'Plus anciens'},
  {id: 'title_asc', label: 'Titre : A → Z'},
  {id: 'title_desc', label: 'Titre : Z → A'},
] as const

export type NewsroomSortId = (typeof NEWSROOM_SORT_OPTIONS)[number]['id']

export function isNewsroomArticleTypeId(value: string | null | undefined): value is NewsroomArticleTypeId {
  return NEWSROOM_ARTICLE_TYPES.some((t) => t.id === value)
}

export function isNewsroomSortId(value: string | null | undefined): value is NewsroomSortId {
  return NEWSROOM_SORT_OPTIONS.some((s) => s.id === value)
}

export function newsroomArticleTypeLabel(id: string | null | undefined): string | null {
  if (!id) return null
  return NEWSROOM_ARTICLE_TYPES.find((t) => t.id === id)?.label ?? null
}
