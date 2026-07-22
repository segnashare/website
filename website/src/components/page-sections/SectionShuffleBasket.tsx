import {ShuffleBasketClient} from '@/components/page-sections/ShuffleBasketClient'
import type {ShuffleBasketSection} from '@/lib/sanity'

type Props = {
  section: ShuffleBasketSection
}

/** Section sync : le shell s’affiche tout de suite ; le pool catalogue charge côté client. */
export function SectionShuffleBasket({section}: Props) {
  return (
    <ShuffleBasketClient
      heading={section.heading}
      intro={section.intro}
      ctaLabel={section.ctaLabel}
    />
  )
}
