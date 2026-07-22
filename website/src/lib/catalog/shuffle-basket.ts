import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'

/** Budget SegnaX : 400 € de pièces (= 400 crédits à 1 € / crédit). */
export const SHUFFLE_BASKET_BUDGET_EURO = 400
/** Cible souple : on pousse le panier vers ~300 € sans plancher rigide. */
export const SHUFFLE_BASKET_SOFT_TARGET_EURO = 300
export const SHUFFLE_BASKET_MIN_ITEMS = 1
export const SHUFFLE_BASKET_MAX_ITEMS = 5
/** Sur téléphone : 4 pièces max (grille 2×2). */
export const SHUFFLE_BASKET_MAX_ITEMS_MOBILE = 4

export type ShuffleBasketItem = MarketingCatalogGridItem & {
  price_points: number
}

function itemEuro(item: Pick<MarketingCatalogGridItem, 'price_points'>): number {
  const n = item.price_points
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return 0
  return Math.trunc(n)
}

function categoryKey(item: MarketingCatalogGridItem): string {
  const id = item.item_category_id?.trim()
  if (id) return id
  const label = item.category_label?.trim().toLowerCase()
  if (label) return `label:${label}`
  return `item:${item.id}`
}

/** Sacs / chaussures / bijoux / ceintures / accessoires — à inclure plus souvent. */
function isAccentCategoryLabel(label: string | null | undefined): boolean {
  const t = (label ?? '').trim().toLowerCase()
  if (!t) return false
  return /sac|chauss|bijou|ceinture|accessoire|bandouli|talon|mocassin|pantoufle|besace|cartable|fourre-tout/.test(
    t,
  )
}

function isAccentItem(item: MarketingCatalogGridItem): boolean {
  return isAccentCategoryLabel(item.category_label)
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

function isEligible(item: MarketingCatalogGridItem): item is ShuffleBasketItem {
  if (item.isSold) return false
  const euro = itemEuro(item)
  return euro > 0 && euro <= SHUFFLE_BASKET_BUDGET_EURO
}

/** Score souple : privilégie ~300–400 €, pénalise légèrement les paniers trop légers. */
function scoreBasketTotal(total: number): number {
  if (total <= 0 || total > SHUFFLE_BASKET_BUDGET_EURO) return Number.NEGATIVE_INFINITY
  if (total >= SHUFFLE_BASKET_SOFT_TARGET_EURO) {
    // Au-dessus de 300 € : plus on se rapproche de 400, mieux c’est (légèrement).
    return total + (total - SHUFFLE_BASKET_SOFT_TARGET_EURO) * 0.2
  }
  const gap = SHUFFLE_BASKET_SOFT_TARGET_EURO - total
  return total - gap * 1.35
}

/** Tirage biaisé vers les pièces plus chères qui tiennent dans le reste du budget. */
function pickBiasedToValue(candidates: ShuffleBasketItem[], remaining: number): ShuffleBasketItem | null {
  const fit = candidates.filter((item) => itemEuro(item) <= remaining)
  if (fit.length === 0) return null
  if (fit.length === 1) return fit[0]!

  const weights = fit.map((item) => Math.pow(itemEuro(item), 1.4))
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * sum
  for (let i = 0; i < fit.length; i++) {
    r -= weights[i]!
    if (r <= 0) return fit[i]!
  }
  return fit[fit.length - 1]!
}

/**
 * Construit un panier aléatoire :
 * - 1 à maxItems pièces (5 desktop, 4 mobile)
 * - une seule pièce par catégorie
 * - somme des prix d’achat ≤ 400 €
 * - poussée souple vers ~300 €+
 * - le nombre de pièces varie d’un tirage à l’autre quand c’est possible
 */
export function drawShuffleBasket(
  pool: MarketingCatalogGridItem[],
  opts?: {previousCount?: number | null; maxItems?: number},
): ShuffleBasketItem[] {
  const eligible = pool.filter(isEligible)
  if (eligible.length === 0) return []

  const byCategory = new Map<string, ShuffleBasketItem[]>()
  for (const item of eligible) {
    const key = categoryKey(item)
    const list = byCategory.get(key)
    if (list) list.push(item)
    else byCategory.set(key, [item])
  }

  for (const list of byCategory.values()) {
    list.sort((a, b) => itemEuro(b) - itemEuro(a))
  }

  const categoryKeys = [...byCategory.keys()]
  const maxCap = Math.min(
    Math.max(SHUFFLE_BASKET_MIN_ITEMS, opts?.maxItems ?? SHUFFLE_BASKET_MAX_ITEMS),
    SHUFFLE_BASKET_MAX_ITEMS,
  )
  const maxFeasible = Math.min(maxCap, categoryKeys.length, eligible.length)
  if (maxFeasible < SHUFFLE_BASKET_MIN_ITEMS) return []

  const previous = opts?.previousCount ?? null
  const sizes = Array.from({length: maxFeasible}, (_, i) => i + 1)

  type Candidate = {basket: ShuffleBasketItem[]; total: number; score: number; count: number}
  const candidates: Candidate[] = []

  for (const targetCount of sizes) {
    const attempts = targetCount === previous ? 12 : 28
    for (let attempt = 0; attempt < attempts; attempt++) {
      const basket = tryDrawCount(byCategory, categoryKeys, targetCount, {
        // ~1 tirage sur 2 : forcer au moins 1 sac / chaussure / accessoire si possible
        preferAccent: Math.random() < 0.55,
      })
      if (!basket?.length) continue
      const total = shuffleBasketTotalEuro(basket)
      const hasAccent = basket.some(isAccentItem)
      candidates.push({
        basket,
        total,
        score: scoreBasketTotal(total) + (hasAccent ? 28 : 0),
        count: basket.length,
      })
    }
  }

  if (candidates.length === 0) return []

  candidates.sort((a, b) => b.score - a.score)

  // Parmi les meilleurs scores, préfère un effectif différent du tirage précédent.
  const topBand = candidates[0]!.score
  const nearBest = candidates.filter((c) => c.score >= topBand - 35)
  const varied = previous != null ? nearBest.filter((c) => c.count !== previous) : nearBest
  const poolPick = varied.length > 0 ? varied : nearBest
  // Petit aléa parmi le top pour garder de la surprise.
  const pick = poolPick[Math.floor(Math.random() * Math.min(5, poolPick.length))]!
  return shuffleInPlace([...pick.basket])
}

function tryDrawCount(
  byCategory: Map<string, ShuffleBasketItem[]>,
  categoryKeys: string[],
  targetCount: number,
  opts?: {preferAccent?: boolean},
): ShuffleBasketItem[] | null {
  const accentKeys = categoryKeys.filter((key) => {
    const sample = byCategory.get(key)?.[0]
    return sample ? isAccentItem(sample) : false
  })
  const otherKeys = categoryKeys.filter((key) => !accentKeys.includes(key))

  let cats: string[]
  if (opts?.preferAccent && accentKeys.length > 0 && targetCount >= 1) {
    const forced = accentKeys[Math.floor(Math.random() * accentKeys.length)]!
    const restPool = shuffleInPlace([...otherKeys, ...accentKeys.filter((k) => k !== forced)])
    cats = [forced, ...restPool.slice(0, targetCount - 1)]
    shuffleInPlace(cats)
  } else {
    cats = shuffleInPlace([...categoryKeys]).slice(0, targetCount)
  }
  if (cats.length < targetCount) return null

  const picked: ShuffleBasketItem[] = []
  let remaining = SHUFFLE_BASKET_BUDGET_EURO

  for (const cat of cats) {
    const item = pickBiasedToValue(byCategory.get(cat) ?? [], remaining)
    if (!item) return null
    picked.push(item)
    remaining -= itemEuro(item)
  }

  if (picked.length !== targetCount) return null

  // Upgrade ok, mais ne remplace pas une pièce « accent » par du non-accent.
  upgradeInPlace(picked, byCategory)

  const total = shuffleBasketTotalEuro(picked)
  if (total <= 0 || total > SHUFFLE_BASKET_BUDGET_EURO) return null
  return picked
}

function upgradeInPlace(
  picked: ShuffleBasketItem[],
  byCategory: Map<string, ShuffleBasketItem[]>,
): void {
  let total = shuffleBasketTotalEuro(picked)
  let guard = 0
  while (guard++ < 12) {
    let improved = false
    for (let i = 0; i < picked.length; i++) {
      const current = picked[i]!
      const cat = categoryKey(current)
      const room = SHUFFLE_BASKET_BUDGET_EURO - (total - itemEuro(current))
      const better = (byCategory.get(cat) ?? []).find(
        (item) =>
          item.id !== current.id &&
          itemEuro(item) > itemEuro(current) &&
          itemEuro(item) <= room,
      )
      if (!better) continue
      total = total - itemEuro(current) + itemEuro(better)
      picked[i] = better
      improved = true
    }
    if (!improved) break
  }
}

export function shuffleBasketTotalEuro(items: ShuffleBasketItem[]): number {
  return items.reduce((sum, item) => sum + itemEuro(item), 0)
}
