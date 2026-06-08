/** Taille des cartes dans les bandeaux horizontaux (`large` = actuel, `small` = −30 % en diagonale). */
export type ScrollCardSize = 'large' | 'small'

export function normalizeScrollCardSize(size: ScrollCardSize | undefined | null): ScrollCardSize {
  return size === 'small' ? 'small' : 'large'
}
