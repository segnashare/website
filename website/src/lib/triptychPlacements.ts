import type {CSSProperties} from 'react'
import type {HomeHeroStagedImage, HomeHeroStagedState, TriptychCardCycleState} from '@/lib/sanity'
import {resolveStagedImageSlotStyle} from '@/lib/homeStagedPlacements'

/**
 * Collage d’images dans une carte tryptique (positions en % du cadre),
 * secours si la mise en page Sanity n’est pas renseignée ou renverrait des `vh` du hero.
 */
export function triptychImageSlotStyle(stackIndex: number): CSSProperties {
  const presets: CSSProperties[] = [
    {position: 'absolute', top: '8%', left: '4%', width: '56%', height: '52%', zIndex: 2},
    {position: 'absolute', top: '16%', right: '2%', width: '48%', height: '48%', zIndex: 3},
    {position: 'absolute', bottom: '6%', left: '10%', width: '72%', height: '42%', zIndex: 1},
  ]
  return presets[stackIndex % 3]!
}

function styleUsesViewportUnits(s: CSSProperties): boolean {
  const check = (v: unknown) => typeof v === 'string' && /\bvh\b|\bvw\b/.test(v)
  return (
    check(s.height) ||
    check(s.top) ||
    check(s.bottom) ||
    check(s.minHeight) ||
    check(s.maxHeight)
  )
}

/**
 * Applique les cadres Sanity (comme le hero). Si le résolveur retombe sur le repli « hero » en `vh`,
 * on utilise les positions % du tryptique pour rester cohérent dans le cadre carte.
 */
export function resolveTriptychImageSlotStyle(
  img: HomeHeroStagedImage,
  stackIndex: number,
  isNarrow: boolean,
  state: TriptychCardCycleState,
): CSSProperties {
  const heroLike = {
    _key: state._key,
    label: '',
    backgroundColor: state.backgroundColor,
    durationMs: state.durationMs,
    images: state.images,
    frameLayout: state.frameLayout ?? null,
  } as HomeHeroStagedState

  const resolved = resolveStagedImageSlotStyle(img, stackIndex, isNarrow, heroLike)
  if (styleUsesViewportUnits(resolved)) {
    return triptychImageSlotStyle(stackIndex)
  }
  return resolved
}
