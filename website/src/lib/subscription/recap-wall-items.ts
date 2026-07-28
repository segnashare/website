import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'

const EXISTING_COUNT = 37
const NEW_COUNT = 19
const TOTAL_COUNT = EXISTING_COUNT + NEW_COUNT
const COLUMN_COUNT = 3

/** Réordonne avec un pas pour éviter les numéros proches côte à côte. */
function strideReorder(items: number[], stride: number): number[] {
  if (items.length <= 1) return items.slice()
  const out: number[] = []
  for (let start = 0; start < stride; start++) {
    for (let i = start; i < items.length; i += stride) out.push(items[i]!)
  }
  return out
}

/**
 * Motif de colonnes par rangée : 0 → 2 → 1 → 0 …
 * Compatible avec `splitIntoLanes` (`index % 3`) :
 * - 1 sac par rangée → aucun duo de sacs côte à côte à l’aplatissage
 * - dans chaque colonne, 2 pièces entre chaque sac
 * - sacs répartis ~équitablement sur les 3 colonnes
 */
function buildWellMixedFileNumbers(): string[] {
  const existing = strideReorder(
    Array.from({length: EXISTING_COUNT}, (_, i) => i + 1),
    4,
  )
  const bags = strideReorder(
    Array.from({length: NEW_COUNT}, (_, i) => EXISTING_COUNT + 1 + i),
    5,
  )

  const colPattern = [0, 2, 1] as const
  const bagAtIndex = new Set<number>()
  for (let i = 0; i < NEW_COUNT; i++) {
    bagAtIndex.add(i * COLUMN_COUNT + colPattern[i % colPattern.length]!)
  }

  const order: number[] = new Array(TOTAL_COUNT)
  let bi = 0
  let ei = 0
  for (let i = 0; i < TOTAL_COUNT; i++) {
    if (bagAtIndex.has(i) && bi < bags.length) order[i] = bags[bi++]!
    else order[i] = existing[ei++]!
  }

  return order.map((n) => String(n).padStart(2, '0'))
}

const FILE_NUMBERS = buildWellMixedFileNumbers()

/**
 * Photos éditoriales du mur récap (assets locaux `/public/recap-wall`).
 * Pas liées au catalogue / items DB.
 */
export const RECAP_WALL_ITEMS: RecapWallItem[] = FILE_NUMBERS.map((n) => ({
  id: `recap-wall-${n}`,
  title: `Pièce ${n}`,
  coverUrl: `/recap-wall/${n}.jpg`,
}))

/** Nombre total d’assets (pour preload / sanity checks). */
export const RECAP_WALL_ITEM_COUNT = TOTAL_COUNT

/** URLs à précharger en priorité (viewport mur ~3 colonnes × ~4 cartes). */
export const RECAP_WALL_PRIORITY_PRELOAD_COUNT = 18
