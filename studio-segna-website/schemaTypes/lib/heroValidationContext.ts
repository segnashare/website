/**
 * Le type `homeHeroStagedState` (et images) sert au hero accueil / pages marketing.
 * Quand `heroPresentation` n’est pas `multi_state`, les anciennes entrées `heroStates[]`
 * ne doivent pas bloquer la publication.
 *
 * `homeHeroStagedImage` sert aussi au tryptique : on ne se base sur le document que si
 * le champ validé est sous `heroStates` (voir `validationPathIncludesHeroStates`).
 */
export function documentUsesHeroMultiState(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false
  return (doc as {heroPresentation?: string}).heroPresentation === 'multi_state'
}

export function validationPathIncludesHeroStates(context: {path?: readonly unknown[]}): boolean {
  const p = context.path
  if (!Array.isArray(p)) return false
  return p.includes('heroStates')
}
