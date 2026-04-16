import type {TriptychSection} from '@/lib/sanity'
import {TriptychCard} from './TriptychCard'
import styles from './triptych.module.css'

type Props = {
  section: TriptychSection
}

export function SectionTriptych({section}: Props) {
  const cards = section.cards ?? []
  if (cards.length === 0) return null

  const transitionMs = section.cardStageTransitionMs ?? 650

  return (
    <section className={styles.triptych} data-motion={section.motionPreset ?? 'none'}>
      <div className={styles.triptychInner}>
        {section.heading?.trim() ? (
          <h2 className={styles.triptychHeading}>{section.heading.trim()}</h2>
        ) : null}
        <div className={styles.triptychGrid}>
          {cards.map((card) => (
            <TriptychCard key={card._key} card={card} transitionMs={transitionMs} />
          ))}
        </div>
      </div>
    </section>
  )
}
